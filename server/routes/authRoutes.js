const express = require('express');
const router = express.Router();
const passport = require('passport');
const { register, login, registerAdmin, refreshToken, logout } = require('../controllers/authController');

// Inscription
router.post('/register', register);

// Connexion
router.post('/login', login);

// Inscription admin
router.post('/register-admin', registerAdmin);

// Refresh token
router.post('/refresh-token', passport.authenticate('jwt', { session: false }), refreshToken);

// Logout
router.post('/logout', passport.authenticate('jwt', { session: false }), logout);

module.exports = router; 