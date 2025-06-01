const Site = require('../models/Site');
const Review = require('../models/Review');

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
    const reviews = await Review.find({ site: site._id }).sort({ createdAt: -1 });
    res.json({ site, reviews });
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
