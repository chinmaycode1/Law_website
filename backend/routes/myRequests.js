const express = require('express');
const Contact = require('../models/Contact');
const Schedule = require('../models/Schedule');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
    try {
        const [contacts, schedules] = await Promise.all([
            Contact.find({ userId: req.user._id })
                .select('_id caseType message status scheduledAt scheduledNote updates createdAt')
                .sort({ createdAt: -1 })
                .lean(),
            Schedule.find({ userId: req.user._id })
                .sort({ createdAt: -1 })
                .lean()
        ]);
        return res.json({ success: true, contacts, schedules, requests: contacts });
    } catch (error) {
        return next(error);
    }
});

module.exports = router;