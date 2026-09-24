const express = require('express');
const { attachUser } = require('../middleware/auth');
const {
  getCompetition,
  registerForCompetition,
  cancelRegistration,
} = require('../controllers/competitionController');

const router = express.Router();

router.get('/:id', attachUser, getCompetition);
router.post('/:id/register', attachUser, registerForCompetition);
router.delete('/:id/register', attachUser, cancelRegistration);

module.exports = router;
