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
  getReviews,
  getDashboard,
  getSitesByTheme,
  getSitesByDeveloper,
  getTopThemes,
  getTopDevelopers,
  updateSite,
  updateReview,
  deleteSite,
  getStats,
  getSitesCountByDeveloper,
  getSitesCountByTheme,
  getSitesWithStats,
  getHighRatingEmails
} = require('../controllers/reviewController');

// Liste des sites
router.get('/sites', getSites);

// Détails d'un site + avis
router.get('/sites/:id', getSiteDetails);

//Récuprer les avis des sites
router.get('/reviews', getReviews);

router.get('/stats', getStats);

router.get('/stats/sites-by-developer', getSitesCountByDeveloper);
router.get('/stats/sites-by-theme', getSitesCountByTheme);

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

// Nouelle route pour récupérer les sites avec les statistiques
router.get('/sites-with-stats', getSitesWithStats);

// Route pour récupérer les emails des utilisateurs ayant laissé des avis avec une note élevée
router.get('/admin/high-rating-emails', passport.authenticate('jwt', { session: false }), isAdmin, getHighRatingEmails);

module.exports = router;
