const express = require('express');
const router = express.Router();
const jwtValidator = require('../middleware/jwtValidator');

// Route to validate JWT token and get user info
router.get('/validate-token', jwtValidator, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      roles: req.user.roles
    }
  });
});

// Protected API route example
router.get('/protected', jwtValidator, (req, res) => {
  res.json({
    message: 'This is a protected route',
    user: req.user
  });
});

module.exports = router;
