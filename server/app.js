const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const siteRoutes = require('./routes/siteRoutes');
const authRoutes = require('./routes/authRoutes');
const passport = require('passport');
require('./config/passport')(passport);

// Charger les variables d'environnement
dotenv.config();

// Connexion à MongoDB
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// Route de test
app.get('/', (req, res) => {
  res.send('API is running...');
});

app.use('/api', siteRoutes);
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
