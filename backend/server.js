const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
dotenv.config();
const { connectDatabase, mongoose } = require('./config/db');
const contactRoutes = require('./routes/contact');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const myRequestsRoutes = require('./routes/myRequests');
const scheduleRoutes = require('./routes/schedule');

// Load environment variables

const app = express();
const PORT = process.env.PORT || 3000;
const frontendPath = path.join(__dirname, '..', 'frontend', 'public');
const projectPath = path.join(__dirname, '..');
const configuredOrigins = (process.env.FRONTEND_URL || '').split(',').map((origin) => origin.trim()).filter(Boolean);
const allowedOrigins = new Set(configuredOrigins);
if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.add('http://localhost:3000');
}

const contentSecurityPolicy = helmet.contentSecurityPolicy.getDefaultDirectives();
function allowContentSource(directive, source) {
    if (!contentSecurityPolicy[directive]) contentSecurityPolicy[directive] = ["'self'"];
    contentSecurityPolicy[directive].push(source);
}
allowContentSource('script-src', 'https://accounts.google.com');
allowContentSource('frame-src', 'https://accounts.google.com');
allowContentSource('connect-src', 'https://accounts.google.com');
allowContentSource('style-src', 'https://fonts.googleapis.com');
allowContentSource('font-src', 'https://fonts.gstatic.com');
allowContentSource('img-src', 'https://*.googleusercontent.com');

app.use(helmet({ contentSecurityPolicy: { directives: contentSecurityPolicy } }));
app.use(morgan('dev'));
app.use(cors({ origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
}, credentials: true }));
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: true, limit: '20kb' }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/contact', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false }));
app.use('/api/contact', contactRoutes);
app.use('/api/my-requests', myRequestsRoutes);
app.use('/api', scheduleRoutes);
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
