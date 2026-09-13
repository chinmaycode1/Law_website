const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const cookieOptions = { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 2 * 60 * 60 * 1000 };

router.post('/google', async (req, res, next) => {
    try {
        if (!req.body || typeof req.body.credential !== 'string' || !process.env.GOOGLE_CLIENT_ID || !process.env.SESSION_JWT_SECRET) {
            return res.status(400).json({ success: false, message: 'Google sign-in is not configured.' });
        }
        const ticket = await googleClient.verifyIdToken({ idToken: req.body.credential, audience: process.env.GOOGLE_CLIENT_ID });
        const payload = ticket.getPayload();
        const user = await User.findOneAndUpdate(
            { googleId: payload.sub },
            { googleId: payload.sub, email: payload.email, name: payload.name, picture: payload.picture },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );
        const token = jwt.sign({ userId: user._id.toString() }, process.env.SESSION_JWT_SECRET, { expiresIn: '2h' });
        res.cookie('session', token, cookieOptions);
        return res.json({ success: true, user: { name: user.name, email: user.email, picture: user.picture } });
    } catch (error) {
        return next(error);
    }
});

router.get('/me', requireAuth, (req, res) => res.json({ success: true, user: { name: req.user.name, email: req.user.email, picture: req.user.picture } }));

router.post('/logout', (req, res) => {
    res.clearCookie('session', { httpOnly: true, secure: true, sameSite: 'lax' });
    return res.json({ success: true });
});

module.exports = router;