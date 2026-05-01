const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const User = require('../models/User');

// GET /api/users — admin gets all users
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort('name');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;