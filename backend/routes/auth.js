const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
const googleIssuer = 'https://accounts.google.com';

function isProduction() {
    return process.env.NODE_ENV === 'production';
}

function sessionCookieOptions() {
    return { httpOnly: true, secure: isProduction(), sameSite: 'lax', maxAge: 2 * 60 * 60 * 1000, path: '/' };
}

router.get('/config', (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(503).json({ success: false, message: 'Google sign-in is not configured.' });
    }
    return res.json({ success: true, googleClientId: process.env.GOOGLE_CLIENT_ID });
});

router.post('/google', async (req, res, next) => {
    try {
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.SESSION_JWT_SECRET) {
            return res.status(503).json({ success: false, message: 'Google sign-in is not configured.' });
        }
        if (!req.body || typeof req.body.credential !== 'string' || !req.body.credential.trim()) {
            return res.status(400).json({ success: false, message: 'A Google credential is required.' });
        }
        const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        let ticket;
        try {
            ticket = await googleClient.verifyIdToken({ idToken: req.body.credential, audience: process.env.GOOGLE_CLIENT_ID });
        } catch (error) {
            return res.status(401).json({ success: false, message: 'The Google credential is invalid, expired, or intended for another client.' });
        }
        const payload = ticket.getPayload();
        if (!payload || ![googleIssuer, 'accounts.google.com'].includes(payload.iss) || !payload.sub || !payload.email || payload.email_verified !== true) {
            return res.status(401).json({ success: false, message: 'The Google credential is invalid or unverified.' });
        }
        const user = await User.findOneAndUpdate(
            { googleId: payload.sub },
            { googleId: payload.sub, email: payload.email, name: payload.name, picture: payload.picture },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );
        const token = jwt.sign({ userId: user._id.toString() }, process.env.SESSION_JWT_SECRET, { expiresIn: '2h' });
        res.cookie('session', token, sessionCookieOptions());
        return res.json({ success: true, user: { name: user.name, email: user.email, picture: user.picture } });
    } catch (error) {
        return next(error);
    }
});

router.get('/me', requireAuth, (req, res) => res.json({ success: true, user: { name: req.user.name, email: req.user.email, picture: req.user.picture } }));

router.post('/logout', (req, res) => {
    res.clearCookie('session', sessionCookieOptions());
    return res.json({ success: true });
});

module.exports = router;