const path = require('path');
const fs = require('fs');
const express = require('express');
const Contact = require('../models/Contact');
const Schedule = require('../models/Schedule');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
    try {
        const [contacts, schedules] = await Promise.all([
            Contact.find({ userId: req.user._id })
                .select('_id caseType message status scheduledAt scheduledNote updates attachments createdAt')
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

// Serve attachment files — only accessible to the user who submitted them
router.get('/:id/attachments/:filename', requireAuth, async (req, res, next) => {
    try {
        const contact = await Contact.findById(req.params.id).lean();
        if (!contact) return res.status(404).json({ error: 'Request not found.' });

        // Ownership check — must be the submitting user
        if (String(contact.userId) !== String(req.user._id)) {
            return res.status(403).json({ error: 'Access denied.' });
        }

        const attachment = contact.attachments.find((a) => a.filename === req.params.filename);
        if (!attachment) return res.status(404).json({ error: 'Attachment not found.' });

        const filePath = path.join(__dirname, '..', 'uploads', attachment.filename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on server.' });

        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.originalName)}"`);
        res.setHeader('Content-Type', attachment.mimetype);
        return res.sendFile(filePath);
    } catch (error) {
        return next(error);
    }
});

module.exports = router;