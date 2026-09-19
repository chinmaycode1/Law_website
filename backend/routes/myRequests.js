const express = require('express');
const mongoose = require('mongoose');
const Contact = require('../models/Contact');
const Schedule = require('../models/Schedule');
const requireAuth = require('../middleware/requireAuth');
const { getBucket } = require('../config/gridfs');

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

// Serve attachment files from GridFS — only accessible to the user who submitted them
router.get('/:id/attachments/:gridfsId', requireAuth, async (req, res, next) => {
    try {
        const contact = await Contact.findById(req.params.id).lean();
        if (!contact) return res.status(404).json({ error: 'Request not found.' });

        // Ownership check — must be the submitting user
        if (String(contact.userId) !== String(req.user._id)) {
            return res.status(403).json({ error: 'Access denied.' });
        }

        const attachment = contact.attachments.find((a) => a.gridfsId === req.params.gridfsId);
        if (!attachment) return res.status(404).json({ error: 'Attachment not found.' });

        const bucket = getBucket();
        const objectId = new mongoose.Types.ObjectId(req.params.gridfsId);
        
        // Stream file from GridFS
        const downloadStream = bucket.openDownloadStream(objectId);
        
        downloadStream.on('error', (error) => {
            console.error('GridFS download error:', error);
            return res.status(404).json({ error: 'File not found in storage.' });
        });

        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.originalName)}"`);
        res.setHeader('Content-Type', attachment.mimetype);
        
        downloadStream.pipe(res);
    } catch (error) {
        return next(error);
    }
});

module.exports = router;