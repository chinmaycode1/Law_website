const express = require('express');
const AvailabilitySlot = require('../models/AvailabilitySlot');
const adminAuth = require('../middleware/adminAuth');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// Validate "HH:MM" 24-hour time string
function isValidTime(value) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

// Parse a YYYY-MM-DD string to midnight UTC Date
function parseDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const d = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
}

// ── Public route — unbooked slots for a given date ───────────────────────────

// GET /api/slots?date=YYYY-MM-DD
// Returns only open (isBooked: false) slots for that day. Public — no auth needed.
router.get('/', async (req, res, next) => {
    try {
        const date = parseDate(req.query.date);
        if (!date) return res.status(400).json({ error: 'Provide a valid date as ?date=YYYY-MM-DD' });

        const slots = await AvailabilitySlot.find({ date, isBooked: false })
            .select('_id date startTime endTime')
            .sort({ startTime: 1 })
            .lean();

        return res.json({ slots });
    } catch (error) {
        return next(error);
    }
});

// ── Admin routes ─────────────────────────────────────────────────────────────

// POST /api/admin/slots
// Body: { date: "YYYY-MM-DD", slots: [{ startTime, endTime }, ...] }
// Accepts an array so the admin can add a whole day's slots in one request.
router.post('/admin/slots', adminAuth, async (req, res, next) => {
    try {
        const date = parseDate(req.body.date);
        if (!date) return res.status(400).json({ error: 'Provide a valid date as "YYYY-MM-DD".' });

        const incoming = req.body.slots;
        if (!Array.isArray(incoming) || !incoming.length) {
            return res.status(400).json({ error: 'Provide a non-empty "slots" array of { startTime, endTime } objects.' });
        }

        // Validate each slot before touching the DB
        for (const slot of incoming) {
            if (!isValidTime(slot.startTime) || !isValidTime(slot.endTime)) {
                return res.status(400).json({ error: `Invalid startTime or endTime in slot: ${JSON.stringify(slot)}. Use "HH:MM" 24-hour format.` });
            }
            if (slot.startTime >= slot.endTime) {
                return res.status(400).json({ error: `startTime must be before endTime in slot: ${JSON.stringify(slot)}.` });
            }
        }

        const results = { created: [], conflicts: [] };

        for (const slot of incoming) {
            try {
                const created = await AvailabilitySlot.create({
                    date,
                    startTime: slot.startTime,
                    endTime: slot.endTime
                });
                results.created.push(created);
            } catch (err) {
                // Duplicate key error from the unique index
                if (err.code === 11000) {
                    results.conflicts.push({ startTime: slot.startTime, endTime: slot.endTime });
                } else {
                    throw err;
                }
            }
        }

        const status = results.conflicts.length > 0 && results.created.length === 0 ? 409 : 201;
        return res.status(status).json({
            created: results.created,
            conflicts: results.conflicts,
            message: results.conflicts.length
                ? `${results.conflicts.length} slot(s) already exist for that date and start time and were skipped.`
                : undefined
        });
    } catch (error) {
        return next(error);
    }
});

// GET /api/admin/slots?date=YYYY-MM-DD
// Lists all slots for a date (booked and unbooked), populates bookedBy name/email.
router.get('/admin/slots', adminAuth, async (req, res, next) => {
    try {
        const date = parseDate(req.query.date);
        if (!date) return res.status(400).json({ error: 'Provide a valid date as ?date=YYYY-MM-DD' });

        const slots = await AvailabilitySlot.find({ date })
            .populate('bookedBy', 'name email')
            .sort({ startTime: 1 })
            .lean();

        return res.json({ slots });
    } catch (error) {
        return next(error);
    }
});

// DELETE /api/admin/slots/:id
// Removes an unbooked slot. Rejects with 409 if already booked.
router.delete('/admin/slots/:id', adminAuth, async (req, res, next) => {
    try {
        const slot = await AvailabilitySlot.findById(req.params.id);
        if (!slot) return res.status(404).json({ error: 'Slot not found.' });

        if (slot.isBooked) {
            return res.status(409).json({
                error: 'This slot is already booked. Cancel the linked booking through the schedule management flow so the client is informed.'
            });
        }

        await slot.deleteOne();
        return res.status(204).send();
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
