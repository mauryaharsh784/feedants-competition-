const mongoose = require('mongoose');
const Competition = require('../models/Competition');
const Participation = require('../models/Participation');
const ApiError = require('../utils/ApiError');

/**
 * Derives the REAL lifecycle status from server time + capacity, rather than
 * trusting whatever is stored on the document. A cron-free, always-correct
 * approach: every read recomputes it, so status can never silently go stale
 * between writes.
 *
 * Precedence: ENDED > FULL > LIVE > UPCOMING
 * (a competition that has ended is ENDED even if it also happened to fill up).
 */
function computeLifecycleStatus(competition, now = new Date()) {
  const { startAt, endAt, totalSpots, registeredCount } = competition;

  if (now >= new Date(endAt)) return 'ENDED';
  if (registeredCount >= totalSpots) return 'FULL';
  if (now >= new Date(startAt)) return 'LIVE';
  return 'UPCOMING';
}

function toPublicShape(competition, { isRegistered, now = new Date() }) {
  const status = computeLifecycleStatus(competition, now);
  const remainingSpots = Math.max(competition.totalSpots - competition.registeredCount, 0);

  return {
    id: competition._id.toString(),
    title: competition.title,
    description: competition.description,
    image: competition.image,
    prize: competition.prize,
    entryFee: competition.entryFee,
    category: competition.category,
    totalSpots: competition.totalSpots,
    registeredCount: competition.registeredCount,
    remainingSpots,
    registrationOpensAt: competition.registrationOpensAt,
    registrationClosesAt: competition.registrationClosesAt,
    submissionStartsAt: competition.submissionStartsAt,
    submissionEndsAt: competition.submissionEndsAt,
    startAt: competition.startAt,
    endAt: competition.endAt,
    rules: competition.rules,
    judge: competition.judge,
    rewards: competition.rewards,
    status,
    isRegistered: Boolean(isRegistered),
    serverTime: now.toISOString(),
  };
}

async function getCompetitionDetails(competitionId, userId) {
  const competition = await Competition.findById(competitionId).lean();
  if (!competition) {
    throw ApiError.notFound('Competition not found', 'COMPETITION_NOT_FOUND');
  }

  const existingParticipation = await Participation.findOne({
    competitionId,
    userId,
    status: 'ACTIVE',
  }).lean();

  return toPublicShape(competition, { isRegistered: Boolean(existingParticipation) });
}

/**
 * Registers a user for a competition in a way that stays correct under
 * heavy concurrent load. Two complementary guarantees are used together:
 *
 * 1. ATOMIC CAPACITY CHECK: the increment of `registeredCount` and the
 *    "is there still room" check happen in a SINGLE atomic findOneAndUpdate
 *    with the condition `registeredCount: { $lt: totalSpots }` baked into
 *    the filter. MongoDB guarantees this read-check-write is atomic per
 *    document, so two requests racing for the last spot can never both
 *    succeed - only one update matches the filter once the counter reaches
 *    totalSpots.
 *
 * 2. UNIQUE COMPOUND INDEX: `Participation` has a unique index on
 *    (competitionId, userId). Even if the same user double-taps "Register"
 *    and fires two near-simultaneous requests, only one insert can succeed;
 *    the second throws a duplicate key error (E11000), which we catch and
 *    translate into a friendly 409.
 *
 * A transaction ties the counter increment and the participation insert
 * together so we never end up with a bumped counter but no participation
 * record (or vice versa) if one half fails.
 */
async function registerForCompetition(competitionId, userId) {
  const now = new Date();
  const session = await mongoose.startSession();

  try {
    let resultCompetition;

    await session.withTransaction(async () => {
      const competition = await Competition.findById(competitionId).session(session);
      if (!competition) {
        throw ApiError.notFound('Competition not found', 'COMPETITION_NOT_FOUND');
      }

      const status = computeLifecycleStatus(competition, now);

      if (status === 'ENDED') {
        throw ApiError.conflict('This competition has already ended', 'COMPETITION_ENDED');
      }
      if (status === 'LIVE') {
        // Business rule: registration is only allowed before the competition starts.
        throw ApiError.conflict('Registration has closed - this competition is already live', 'COMPETITION_LIVE');
      }
      if (status === 'FULL') {
        throw ApiError.conflict('This competition is full', 'COMPETITION_FULL');
      }
      if (competition.registrationClosesAt && now > new Date(competition.registrationClosesAt)) {
        throw ApiError.conflict('The registration deadline has passed', 'REGISTRATION_CLOSED');
      }

      // Fast pre-check for a friendlier error message (not the safety guarantee itself).
      const alreadyRegistered = await Participation.findOne({
        competitionId,
        userId,
        status: 'ACTIVE',
      }).session(session);
      if (alreadyRegistered) {
        throw ApiError.conflict('You are already registered for this competition', 'ALREADY_REGISTERED');
      }

      // THE ATOMIC STEP: only succeeds if there is still room, and increments
      // in the same operation as the check - no race window between them.
      const updatedCompetition = await Competition.findOneAndUpdate(
        { _id: competitionId, registeredCount: { $lt: competition.totalSpots } },
        { $inc: { registeredCount: 1 } },
        { new: true, session }
      );

      if (!updatedCompetition) {
        // Someone else took the last spot between our read and our write.
        throw ApiError.conflict('This competition just reached full capacity', 'COMPETITION_FULL');
      }

      try {
        await Participation.create(
          [{ competitionId, userId, registeredAt: now, status: 'ACTIVE' }],
          { session }
        );
      } catch (err) {
        if (err.code === 11000) {
          // The database-level guarantee catching a race the pre-check missed.
          throw ApiError.conflict('You are already registered for this competition', 'ALREADY_REGISTERED');
        }
        throw err;
      }

      resultCompetition = updatedCompetition;
    });

    return toPublicShape(resultCompetition.toObject(), { isRegistered: true, now });
  } finally {
    await session.endSession();
  }
}

/**
 * Cancels a user's participation, if business rules allow it (only before
 * the competition goes LIVE - matches the "register only before start" rule).
 * Decrements the counter atomically in the same transaction as the
 * participation status change.
 */
async function cancelRegistration(competitionId, userId) {
  const now = new Date();
  const session = await mongoose.startSession();

  try {
    let resultCompetition;

    await session.withTransaction(async () => {
      const competition = await Competition.findById(competitionId).session(session);
      if (!competition) {
        throw ApiError.notFound('Competition not found', 'COMPETITION_NOT_FOUND');
      }

      const status = computeLifecycleStatus(competition, now);
      if (status === 'LIVE' || status === 'ENDED') {
        throw ApiError.conflict('Cannot cancel registration once the competition has started', 'CANCELLATION_NOT_ALLOWED');
      }

      const participation = await Participation.findOne({
        competitionId,
        userId,
        status: 'ACTIVE',
      }).session(session);

      if (!participation) {
        throw ApiError.notFound('You are not registered for this competition', 'NOT_REGISTERED');
      }

      participation.status = 'CANCELLED';
      await participation.save({ session });

      // Only decrement if it won't go negative (defensive; should never trigger).
      const updated = await Competition.findOneAndUpdate(
        { _id: competitionId, registeredCount: { $gt: 0 } },
        { $inc: { registeredCount: -1 } },
        { new: true, session }
      );

      resultCompetition = updated || competition;
    });

    return toPublicShape(resultCompetition.toObject(), { isRegistered: false, now });
  } finally {
    await session.endSession();
  }
}

module.exports = {
  computeLifecycleStatus,
  toPublicShape,
  getCompetitionDetails,
  registerForCompetition,
  cancelRegistration,
};
