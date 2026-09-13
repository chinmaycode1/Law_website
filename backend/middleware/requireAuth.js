const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function requireAuth(req, res, next) {
    const token = req.cookies && req.cookies.session;
    if (!token || !process.env.SESSION_JWT_SECRET) {
        return res.status(401).json({ success: false, message: 'Please sign in with Google to continue.' });
    }

    try {
        const payload = jwt.verify(token, process.env.SESSION_JWT_SECRET, { algorithms: ['HS256'] });
        const user = await User.findById(payload.userId);
        if (!user) return res.status(401).json({ success: false, message: 'Please sign in with Google to continue.' });
        req.user = user;
        return next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Please sign in with Google to continue.' });
    }
}

module.exports = requireAuth;