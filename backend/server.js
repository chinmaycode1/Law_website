const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
dotenv.config();
const { connectDatabase, mongoose } = require('./config/db');
const contactRoutes = require('./routes/contact');
const adminRoutes = require('./routes/admin');

// Load environment variables

const app = express();
const PORT = process.env.PORT || 3000;
const frontendPath = path.join(__dirname, '..', 'frontend', 'public');
const projectPath = path.join(__dirname, '..');
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:8000,http://localhost:3000')
    .split(',').map((origin) => origin.trim()).filter(Boolean);

app.use(helmet());
app.use(morgan('dev'));
app.use(cors({ origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
} }));
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: true, limit: '20kb' }));

app.use('/api/contact', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false }));
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running', mongooseState: mongoose.connection.readyState });
});

app.use('/frontend/src', express.static(path.join(projectPath, 'frontend', 'src')));
app.use('/Assets', express.static(path.join(projectPath, 'Assets')));
app.use(express.static(frontendPath));

app.use((error, req, res, next) => {
    console.error('Request error:', error.message);
    const status = error.status || 500;
    res.status(status).json({ success: false, message: status === 500 ? 'An internal server error occurred.' : error.message });
});

connectDatabase();
app.listen(PORT, () => console.log(`Law website server running on http://localhost:${PORT}`));

module.exports = app;
