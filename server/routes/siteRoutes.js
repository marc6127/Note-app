const express = require('express');
const router = express.Router();
const passport = require('passport');
const isAdmin = require('../middleware/isAdmin');
const isUser = require('../middleware/isUser');

// Contrôleurs (à implémenter)
const {
  getSites,
  addSite,
  getSiteDetails,
  addReview,
  getDashboard,
  getSitesByTheme,
  getSitesByDeveloper,
  getTopThemes,
  getTopDevelopers,
  updateSite,
  updateReview,
  deleteSite
} = require('../controllers/reviewController');

// Liste des sites
router.get('/sites', getSites);

// Détails d'un site + avis
router.get('/sites/:id', getSiteDetails);

// Ajouter une note/avis à un site
router.post('/sites/:id/reviews', passport.authenticate('jwt', { session: false }), isUser, addReview);

// Filtrer les sites par thématique
router.get('/sites/theme/:theme', getSitesByTheme);

// Filtrer les sites par développeur
router.get('/sites/developer/:developer', getSitesByDeveloper);

// Thématiques les mieux notées
router.get('/themes/top', getTopThemes);

// Développeurs les mieux notés
router.get('/developers/top', getTopDevelopers);

// Modifier un avis (note) - restriction auteur
router.put('/sites/:siteId/reviews/:reviewId', passport.authenticate('jwt', { session: false }), isUser, updateReview);

//Routes de l'admin
router.get('/dashboard', passport.authenticate('jwt', { session: false }), isAdmin, getDashboard);
router.post('/sites', passport.authenticate('jwt', { session: false }), isAdmin, addSite);
router.put('/sites/:id', passport.authenticate('jwt', { session: false }), isAdmin, updateSite);
router.delete('/sites/:id', passport.authenticate('jwt', { session: false }), isAdmin, deleteSite);

module.exports = router;
