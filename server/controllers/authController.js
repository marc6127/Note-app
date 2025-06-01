const User = require('../models/User');
const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/RefreshToken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 jours en ms

function generateRefreshToken(userId) {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY);
  return new RefreshToken({ user: userId, token, expiresAt });
}

// Inscription
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const user = new User({ username, email, password });
    await user.save();
    const accessToken = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
    const refreshTokenDoc = generateRefreshToken(user._id);
    await refreshTokenDoc.save();
    res.status(201).json({
      accessToken,
      refreshToken: refreshTokenDoc.token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Connexion
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Utilisateur non trouvé' });
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Mot de passe incorrect' });
    const accessToken = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
    const refreshTokenDoc = generateRefreshToken(user._id);
    await refreshTokenDoc.save();
    res.json({
      accessToken,
      refreshToken: refreshTokenDoc.token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Inscription admin
exports.registerAdmin = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const user = new User({ username, email, password, role: 'admin' });
    await user.save();
    const accessToken = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
    const refreshTokenDoc = generateRefreshToken(user._id);
    await refreshTokenDoc.save();
    res.status(201).json({
      accessToken,
      refreshToken: refreshTokenDoc.token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Refresh token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token requis' });
    const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
    if (!tokenDoc || tokenDoc.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Refresh token invalide ou expiré' });
    }
    const user = await User.findById(tokenDoc.user);
    if (!user) return res.status(401).json({ message: 'Utilisateur non trouvé' });
    // Optionnel : Invalider l'ancien refresh token et en générer un nouveau
    await tokenDoc.deleteOne();
    const newRefreshTokenDoc = generateRefreshToken(user._id);
    await newRefreshTokenDoc.save();
    const accessToken = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
    res.json({
      accessToken,
      refreshToken: newRefreshTokenDoc.token
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token requis' });
    await RefreshToken.deleteOne({ token: refreshToken });
    res.json({ message: 'Déconnexion réussie' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}; 