const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const competitionService = require('../services/competitionService');

function assertValidObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest(`Invalid competition id: ${id}`, 'INVALID_ID');
  }
}

// GET /api/competitions/:id
const getCompetition = asyncHandler(async (req, res) => {
  const { id } = req.params;
  assertValidObjectId(id);

  const data = await competitionService.getCompetitionDetails(id, req.userId);
  res.status(200).json({ success: true, data });
});

// POST /api/competitions/:id/register
const registerForCompetition = asyncHandler(async (req, res) => {
  const { id } = req.params;
  assertValidObjectId(id);

  const data = await competitionService.registerForCompetition(id, req.userId);
  res.status(201).json({ success: true, data, message: 'Registration successful' });
});

// DELETE /api/competitions/:id/register
const cancelRegistration = asyncHandler(async (req, res) => {
  const { id } = req.params;
  assertValidObjectId(id);

  const data = await competitionService.cancelRegistration(id, req.userId);
  res.status(200).json({ success: true, data, message: 'Registration cancelled' });
});

module.exports = { getCompetition, registerForCompetition, cancelRegistration };
