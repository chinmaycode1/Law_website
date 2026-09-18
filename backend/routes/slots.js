const express = require('express');
const AvailabilitySlot = require('../models/AvailabilitySlot');
const adminAuth = require('../middleware/adminAuth');
const { parseDate, isPast, isValidTime, timeRangesOverlap, formatDate } = require('../utils/slotDate');

const router = express.Router();

// ── Public route — available slots for a given date ──────────────────────────

// GET /api/slots?date=YYYY-MM-DD
// Returns only open (isBooked: false, not past, not completed) slots for that day.
// Public — no auth needed.
router.get('/', async (req, res, next) => {
    try {
        const date = parseDate(req.query.date);
        if (!date) return res.status(400).json({ error: 'Provide a valid date as ?date=YYYY-MM-DD' });

        // Fetch all slots for this date
        const allSlots = await AvailabilitySlot.find({ date })
            .select('_id date startTime endTime isBooked status')
            .sort({ startTime: 1 })
            .lean();

        // Filter: exclude booked, completed, and past slots
        const slots = allSlots.filter(slot => {
            if (slot.isBooked || slot.status === 'completed') return false;
            if (isPast(slot.date, slot.endTime)) return false;
            return true;
        });

        return res.json({ slots });
    } catch (error) {
        return next(error);
    }
});

// ── Admin routes ─────────────────────────────────────────────────────────────

// POST /api/admin/slots
// Body: { date: "YYYY-MM-DD", slots: [{ startTime, endTime }, ...] }
// Creates slots with overlap protection.
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

        // Fetch existing slots for this date to check for overlaps
        const existingSlots = await AvailabilitySlot.find({ date }).select('startTime endTime').lean();

        const results = { created: [], conflicts: [] };

        for (const slot of incoming) {
            // Check for time range overlap with existing slots
            const overlapping = existingSlots.find(existing =>
                timeRangesOverlap(slot.startTime, slot.endTime, existing.startTime, existing.endTime)
            );

            if (overlapping) {
                results.conflicts.push({
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    reason: `Overlaps with existing slot ${overlapping.startTime}–${overlapping.endTime}`
                });
                continue;
            }

            try {
                const created = await AvailabilitySlot.create({
                    date,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    status: 'available'
                });
                results.created.push(created);
                // Add to existingSlots so subsequent slots in this batch can check against it
                existingSlots.push({ startTime: slot.startTime, endTime: slot.endTime });
            } catch (err) {
                // Duplicate key error from the unique index (race condition)
                if (err.code === 11000) {
                    results.conflicts.push({ 
                        startTime: slot.startTime, 
                        endTime: slot.endTime,
                        reason: 'Already exists (duplicate)' 
                    });
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
                ? `${results.conflicts.length} slot(s) conflicted and were skipped.`
                : undefined
        });
    } catch (error) {
        return next(error);
    }
});

// GET /api/admin/slots?date=YYYY-MM-DD
// Lists all slots for a date (booked and unbooked), populates bookedBy name/email.
// Returns computed display status: open / booked / completed / expired.
router.get('/admin/slots', adminAuth, async (req, res, next) => {
    try {
        const date = parseDate(req.query.date);
        if (!date) return res.status(400).json({ error: 'Provide a valid date as ?date=YYYY-MM-DD' });

        const slots = await AvailabilitySlot.find({ date })
            .populate('bookedBy', 'name email')
            .populate('scheduleId', 'status')
            .sort({ startTime: 1 })
            .lean();

        // Compute display status for admin view
        const enrichedSlots = slots.map(slot => {
            let displayStatus = 'open';
            
            if (slot.status === 'completed') {
                displayStatus = 'completed';
            } else if (slot.isBooked) {
                displayStatus = 'booked';
            } else if (isPast(slot.date, slot.endTime)) {
                displayStatus = 'expired';
            }

            return {
                ...slot,
                displayStatus
            };
        });

        return res.json({ slots: enrichedSlots });
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
