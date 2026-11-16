
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// MongoDB connection
let dbConnection = null;

const connectDB = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      if (!dbConnection) {
        dbConnection = mongoose.connect(process.env.MONGO_URI);
      }

      await dbConnection;
    }

    next();
  } catch (error) {
    dbConnection = null;
    console.error('MongoDB Connection Error:', error.message);

    res.status(500).json({
      message: 'Database connection failed'
    });
  }
};

app.use(connectDB);

// Test Route
app.get('/', (req, res) => {
  res.send('Blog Backend API is Running!');
});

// Auth Routes
app.use('/api/auth', require('./routes/auth'));

// Blog Routes
app.use('/api/blogs', require('./routes/blog'));

// Local development server
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export Express app for Vercel
module.exports = app;
