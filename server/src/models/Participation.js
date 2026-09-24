const mongoose = require('mongoose');

const { Schema } = mongoose;

const PARTICIPATION_STATUSES = ['ACTIVE', 'CANCELLED'];

const participationSchema = new Schema(
  {
    competitionId: { type: Schema.Types.ObjectId, ref: 'Competition', required: true },
    userId: { type: String, required: true }, // string so it works with any auth provider/mock user
    registeredAt: { type: Date, default: Date.now },
    status: { type: String, enum: PARTICIPATION_STATUSES, default: 'ACTIVE' },
  },
  { timestamps: true }
);

// CRITICAL: this unique compound index is the database-level guarantee that a
// user can never end up with two ACTIVE participations for the same
// competition, even under heavy concurrent load. A duplicate insert attempt
// throws a MongoDB E11000 error, which the service layer turns into a clean
// 409 CONFLICT response.
participationSchema.index({ competitionId: 1, userId: 1 }, { unique: true });

// Support "does this competition have room" / "list my registrations" queries.
participationSchema.index({ competitionId: 1, status: 1 });
participationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Participation', participationSchema);
module.exports.PARTICIPATION_STATUSES = PARTICIPATION_STATUSES;
