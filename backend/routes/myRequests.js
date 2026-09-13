const express = require('express');
const Contact = require('../models/Contact');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
    try {
        const requests = await Contact.find({ userId: req.user._id })
            .select('_id caseType message status scheduledAt scheduledNote createdAt')
            .sort({ createdAt: -1 })
            .lean();
        return res.json({ success: true, requests });
    } catch (error) {
        return next(error);
    }
});

module.exports = router;