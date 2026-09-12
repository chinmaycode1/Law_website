const express = require('express');
const rateLimit = require('express-rate-limit');
const Contact = require('../models/Contact');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();
const statuses = ['new', 'contacted', 'resolved'];
const contactFields = '_id name email phone caseType message status createdAt updatedAt';
const adminRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 50,
    standardHeaders: true,
    legacyHeaders: false
});

function serializeContact(contact) {
    if (!contact) return contact;
    return {
        _id: contact._id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        caseType: contact.caseType,
        message: contact.message,
        status: contact.status,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt
    };
}

router.use(adminRateLimit, adminAuth);

router.get('/contacts', async (req, res, next) => {
    try {
        const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
        const filter = {};

        if (req.query.status) {
            if (!statuses.includes(req.query.status)) {
                return res.status(400).json({ error: 'Invalid status filter' });
            }
            filter.status = req.query.status;
        }

        const [contacts, total] = await Promise.all([
            Contact.find(filter).select(contactFields).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            Contact.countDocuments(filter)
        ]);

        return res.json({
            contacts: contacts.map(serializeContact),
            total,
            page,
            pages: Math.max(Math.ceil(total / limit), 1)
        });
    } catch (error) {
        return next(error);
    }
});

router.get('/contacts/:id', async (req, res, next) => {
    try {
        const contact = await Contact.findById(req.params.id).select(contactFields).lean();
        if (!contact) return res.status(404).json({ error: 'Contact not found' });
        return res.json(serializeContact(contact));
    } catch (error) {
        return next(error);
    }
});

router.patch('/contacts/:id', async (req, res, next) => {
    try {
        const keys = Object.keys(req.body || {});
        if (keys.length !== 1 || keys[0] !== 'status' || !statuses.includes(req.body.status)) {
            return res.status(400).json({ error: 'Only a valid status can be updated' });
        }

        const contact = await Contact.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true, runValidators: true }
        ).select(contactFields).lean();

        if (!contact) return res.status(404).json({ error: 'Contact not found' });
        return res.json(serializeContact(contact));
    } catch (error) {
        return next(error);
    }
});

router.delete('/contacts/:id', async (req, res, next) => {
    try {
        const contact = await Contact.findByIdAndDelete(req.params.id).lean();
        if (!contact) return res.status(404).json({ error: 'Contact not found' });
        return res.status(204).send();
    } catch (error) {
        return next(error);
    }
});

router.get('/stats', async (req, res, next) => {
    try {
        const grouped = await Contact.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        const stats = { new: 0, contacted: 0, resolved: 0, total: 0 };
        grouped.forEach((item) => {
            if (statuses.includes(item._id)) stats[item._id] = item.count;
        });
        stats.total = stats.new + stats.contacted + stats.resolved;
        return res.json(stats);
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
