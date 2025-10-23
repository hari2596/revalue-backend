const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

// Initialize express app
const app = express();

// ========== CORS Configuration ==========
const corsOptions = {
  origin: [
    'http://localhost:3000',      // Local React dev
    'http://localhost:5173',      // Vite dev port
    'https://reavalue-frontend.vercel.app'  // Production frontend
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// ========== Middleware ==========
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========== Health Check Route ==========
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Backend is running!',
    environment: process.env.NODE_ENV,
    timestamp: new Date(),
    database: 'connected'
  });
});

// ========== Routes ==========
app.use('/api/auth', require('./routes/auth'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api/transactions', require('./routes/transactions'));

// ========== Root Route ==========
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Reavalue API',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    frontend: process.env.FRONTEND_URL || 'https://reavalue-frontend.vercel.app',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      listings: '/api/listings',
      transactions: '/api/transactions'
    }
  });
});

// ========== 404 Handler ==========
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// ========== Global Error Handler ==========
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Something went wrong!';
  
  res.status(statusCode).json({ 
    message,
    status: 'error',
    ...(process.env.NODE_ENV === 'development' && { error: err.stack })
  });
});

// ========== Start Server ==========
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`📡 Server URL: ${process.env.NODE_ENV === 'production' ? process.env.RENDER_EXTERNAL_URL : `http://localhost:${PORT}`}`);
  console.log(`🌐 API Health: /api/health`);
  console.log(`📚 CORS Enabled for:`);
  corsOptions.origin.forEach(url => console.log(`   - ${url}`));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

module.exports = app;