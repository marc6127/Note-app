const Site = require('../models/Site');
const Review = require('../models/Review');
const User = require('../models/User');
const ExcelJS = require('exceljs'); // npm install exceljs

// Liste tous les sites
exports.getSites = async (req, res) => {
  try {
    const sites = await Site.find().sort({ deliveredAt: -1 });
    res.json(sites);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Ajouter un site
exports.addSite = async (req, res) => {
  try {
    //const developer = req.user.username;
    const { name, link, description, deliveredAt, theme, developer } = req.body;
    // Vérification si un site avec même nom ET même link existe déjà
    const existingSite = await Site.findOne({ name, link });
    if (existingSite) {
      return res.status(400).json({ message: 'Ce site existe déjà (nom et URL identiques).' });
    }
    const site = new Site({ name, link, description, deliveredAt, theme, developer });
    await site.save();
    res.status(201).json(site);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Supprimer un site
exports.deleteSite = async (req, res) => {
  try {
    const site = await Site.findByIdAndDelete(req.params.id);
    if (!site) {
      return res.status(404).json({ message: 'Site non trouvé.' });
    }
    res.json({ message: 'Site supprimé avec succès.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Détails d'un site + avis
exports.getSiteDetails = async (req, res) => {
  try {
    const site = await Site.findById(req.params.id);
    if (!site) return res.status(404).json({ message: 'Site not found' });

    // Récupérer tous les avis du site
    const reviews = await Review.find({ site: site._id }).sort({ createdAt: -1 });

    // Calculer la moyenne et le nombre d'avis
    const reviewCount = reviews.length;
    const rating = reviewCount > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount)
      : 0;

    // Ajouter les champs à l'objet site (sans le modifier en base)
    const siteObj = site.toObject();
    siteObj.rating = rating;
    siteObj.reviewCount = reviewCount;

    res.json({ site: siteObj, reviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Ajouter une note/avis à un site
exports.addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const site = await Site.findById(req.params.id);
    if (!site) return res.status(404).json({ message: 'Site not found' });
    const author = req.user.username;
    const review = new Review({ site: site._id, rating, comment, author });
    await review.save();
    res.status(201).json(review);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Récupérer tous les avis du plus noté au moins noté
exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.find().sort({ rating: -1, createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Dashboard : moyenne des notes par site
exports.getDashboard = async (req, res) => {
  try {
    const stats = await Review.aggregate([
      {
        $group: {
          _id: '$site',
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'sites',
          localField: '_id',
          foreignField: '_id',
          as: 'siteInfo'
        }
      },
      { $unwind: '$siteInfo' },
      {
        $project: {
          _id: 0,
          siteId: '$siteInfo._id',
          siteName: '$siteInfo.name',
          averageRating: 1,
          reviewCount: 1
        }
      },
      { $sort: { averageRating: -1 } }
    ]);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//Statistiques du site
exports.getStats = async (req, res) => {
  try {
    // Nombre total de sites notés (ayant au moins un avis)
    const sitesNoted = await Review.distinct('site');
    const totalSitesNoted = sitesNoted.length;

    // Nombre d'utilisateurs actifs (ayant posté au moins un avis)
    const activeUsers = await Review.distinct('author');
    const totalActiveUsers = activeUsers.length;

    // Nombre total d'avis donnés
    const totalReviews = await Review.countDocuments();

    // Note moyenne globale
    const avgResult = await Review.aggregate([
      { $group: { _id: null, averageRating: { $avg: '$rating' } } }
    ]);
    const averageRating = avgResult.length > 0 ? avgResult[0].averageRating : 0;

    res.json({
      totalSitesNoted,
      totalActiveUsers,
      totalReviews,
      averageRating
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Nombre de sites par développeur
exports.getSitesCountByDeveloper = async (req, res) => {
  try {
    const stats = await Site.aggregate([
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'site',
          as: 'reviews'
        }
      },
      {
        $group: {
          _id: '$developer',
          count: { $sum: 1 },
          avgRating: { $avg: { $avg: '$reviews.rating' } }
        }
      },
      {
        $project: {
          _id: 0,
          developer: '$_id',
          count: 1,
          avgRating: { $ifNull: ['$avgRating', 0] }
        }
      },
      { $sort: { avgRating: -1 } }
    ]);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Nombre de sites par thématique
exports.getSitesCountByTheme = async (req, res) => {
  try {
    const stats = await Site.aggregate([
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'site',
          as: 'reviews'
        }
      },
      {
        $group: {
          _id: '$theme',
          count: { $sum: 1 },
          avgRating: { $avg: { $avg: '$reviews.rating' } }
        }
      },
      {
        $project: {
          _id: 0,
          theme: '$_id',
          count: 1,
          avgRating: { $ifNull: ['$avgRating', 0] }
        }
      },
      { $sort: { avgRating: -1 } }
    ]);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Filtrer les sites par thématique
exports.getSitesByTheme = async (req, res) => {
  try {
    const theme = req.params.theme;
    const sites = await Site.find({ theme: { $regex: new RegExp('^' + theme + '$', 'i') } }).sort({ deliveredAt: -1 });
    if (sites.length === 0) {
      res.status(404).json({ message: "Aucun site ne correspond a cet theme" });
    }else {
      res.json(sites);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Filtrer les sites par développeur
exports.getSitesByDeveloper = async (req, res) => {
  try {
    const developer = req.params.developer;
    const sites = await Site.find({ developer: { $regex: new RegExp('^' + developer + '$', 'i') } }).sort({ deliveredAt: -1 });
    if (sites.length === 0) {
      res.status(404).json({ message: "Ce développeur n'a conçu aucun site" });
    }else {
      res.json(sites);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Thématiques les mieux notées
exports.getTopThemes = async (req, res) => {
  try {
    const stats = await Review.aggregate([
      {
        $lookup: {
          from: 'sites',
          localField: 'site',
          foreignField: '_id',
          as: 'siteInfo'
        }
      },
      { $unwind: '$siteInfo' },
      {
        $group: {
          _id: '$siteInfo.theme',
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          theme: '$_id',
          averageRating: 1,
          reviewCount: 1
        }
      },
      { $sort: { averageRating: -1 } }
    ]);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Développeurs les mieux notés
exports.getTopDevelopers = async (req, res) => {
  try {
    const stats = await Review.aggregate([
      {
        $lookup: {
          from: 'sites',
          localField: 'site',
          foreignField: '_id',
          as: 'siteInfo'
        }
      },
      { $unwind: '$siteInfo' },
      {
        $group: {
          _id: '$siteInfo.developer',
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          developer: '$_id',
          averageRating: 1,
          reviewCount: 1
        }
      },
      { $sort: { averageRating: -1 } }
    ]);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Modifier un site
exports.updateSite = async (req, res) => {
  try {
    const site = await Site.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!site) return res.status(404).json({ message: 'Site not found' });
    res.json(site);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Modifier un avis (restriction auteur)
exports.updateReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (review.author !== req.user.username) {
      return res.status(403).json({ message: 'Vous ne pouvez modifier que vos propres avis.' });
    }
    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment;
    await review.save();
    res.json(review);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Récupérer les sites avec statistiques (moyenne des notes et nombre d'avis)
exports.getSitesWithStats = async (req, res) => {
  try {
    // Récupère le paramètre de tri depuis la query string (?sort=rating|reviews|alpha)
    const sort = req.query.sort || 'rating';
    let sortOption = {};

    if (sort === 'rating') {
      sortOption = { rating: -1 };
    } else if (sort === 'reviews') {
      sortOption = { reviewCount: -1 };
    } else if (sort === 'alpha') {
      sortOption = { name: 1 };
    }

    const stats = await Site.aggregate([
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'site',
          as: 'reviews'
        }
      },
      {
        $addFields: {
          rating: { $avg: '$reviews.rating' },
          reviewCount: { $size: '$reviews' }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          link: 1,
          description: 1,
          theme: 1,
          developer: 1,
          rating: { $ifNull: ['$rating', 0] },
          reviewCount: 1
        }
      },
      { $sort: sortOption }
    ]);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Récupérer les emails des utilisateurs ayant donné des avis >= 4.2
exports.getHighRatingEmails = async (req, res) => {
  try {
    // Trouver les auteurs d'avis >= 4.2
    const reviews = await Review.find({ rating: { $gte: 4.2 } }).distinct('author');
    // Récupérer les utilisateurs correspondants
    const users = await User.find({ username: { $in: reviews } });

    // Si l'admin veut télécharger un fichier Excel
    if (req.query.format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Emails');
      worksheet.addRow(['Nom', 'Email', 'Date d\'enregistrement']);
      users.forEach(user => {
        worksheet.addRow([
          user.username,
          user.email,
          user.createdAt ? user.createdAt.toISOString().split('T')[0] : ''
        ]);
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=emails.xlsx');
      await workbook.xlsx.write(res);
      res.end();
      return;
    }

    // Sinon, renvoyer la liste brute (pour Google Sheet ou affichage)
    res.json({
      users: users.map(user => ({
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
