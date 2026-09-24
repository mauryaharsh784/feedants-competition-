const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * NOTE on `status`:
 * We persist a `status` field for convenience (listing/filtering/seed data),
 * but it must NEVER be treated as the source of truth by itself, because it
 * can go stale the instant server time crosses startAt/endAt without a write
 * happening. The real, authoritative status is always (re)computed on read
 * from `startAt`, `endAt`, `registeredCount` and `totalSpots` using server
 * time - see `services/competitionService.js#computeLifecycleStatus`.
 */
const COMPETITION_STATUSES = ['UPCOMING', 'LIVE', 'ENDED', 'FULL'];

const competitionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    prize: { type: String, required: true }, // display string, e.g. "₹ 1,500"
    entryFee: { type: String, default: '₹ 0' },
    category: { type: String, default: 'General' },

    totalSpots: { type: Number, required: true, min: 1 },
    // registeredCount is the mutable counter used for capacity checks.
    // It is ONLY ever mutated via atomic $inc operations in the service layer,
    // never re-assigned wholesale, to stay safe under concurrent writes.
    registeredCount: { type: Number, required: true, default: 0, min: 0 },

    registrationOpensAt: { type: Date }, // optional: when registration opens
    registrationClosesAt: { type: Date, required: true }, // deadline to register
    submissionStartsAt: { type: Date },
    submissionEndsAt: { type: Date },
    startAt: { type: Date, required: true }, // competition/result reveal start
    endAt: { type: Date, required: true }, // competition fully ends

    rules: { type: String, default: '' },
    judge: {
      name: String,
      title: String,
      avatar: String,
    },

    rewards: [
      {
        position: String, // e.g. "1st Winner"
        amount: String, // e.g. "₹ 550"
      },
    ],

    // Persisted for convenience only - see note above. Recomputed on every read.
    status: { type: String, enum: COMPETITION_STATUSES, default: 'UPCOMING' },
  },
  { timestamps: true }
);

// Frequently queried fields get indexes to keep lookups cheap at scale.
competitionSchema.index({ startAt: 1 });
competitionSchema.index({ endAt: 1 });
competitionSchema.index({ status: 1 });
competitionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Competition', competitionSchema);
module.exports.COMPETITION_STATUSES = COMPETITION_STATUSES;
