const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Schedule = require('../models/Schedule');
const AvailabilitySlot = require('../models/AvailabilitySlot');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
const caseTypes = ['criminal-defense', 'white-collar', 'bail', 'appeal', 'ndps', 'other'];
const modes = ['in-person', 'video-call', 'phone-call'];

const scheduleRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    keyGenerator: (req) => req.user._id.toString(),
    standardHeaders: true,
    legacyHeaders: false
});

const validateSchedule = [
    body('slotId').isString().trim().notEmpty().withMessage('A valid slot must be selected.'),
    body('caseType').isIn(caseTypes).withMessage('Select a valid case type.'),
    body('mode').optional().isIn(modes).withMessage('Select a valid consultation mode.'),
    body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Notes must be 500 characters or fewer.')
];

// POST /api/schedule
// Books a slot atomically — no payment required.
router.post('/schedule', requireAuth, scheduleRateLimit, validateSchedule, async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            success: false,
            errors: errors.array().map((e) => ({ field: e.path, message: e.msg }))
        });
    }

    try {
        // Atomically claim the slot: only matches if it exists AND is not yet booked.
        // If another request claimed it between page-load and submit, this returns null.
        const slot = await AvailabilitySlot.findOneAndUpdate(
            { _id: req.body.slotId, isBooked: false },
            { isBooked: true, bookedBy: req.user._id, status: 'booked' },
            { new: true }
        );

        if (!slot) {
            return res.status(409).json({
                success: false,
                message: 'That slot was just booked by someone else. Please pick another available time.'
            });
        }

        // Create the schedule record
        const schedule = await Schedule.create({
            userId: req.user._id,
            caseType: req.body.caseType,
            preferredDate: slot.date,
            preferredTime: slot.startTime,
            mode: req.body.mode || 'in-person',
            notes: req.body.notes,
            slotId: slot._id, // Link to the slot
            updates: [{ message: 'Consultation request received', by: 'system' }]
        });

        // Link the slot back to the schedule
        slot.scheduleId = schedule._id;
        await slot.save();

        return res.status(201).json({ success: true, schedule });
    } catch (error) {
        return next(error);
    }
});

// GET /api/my-schedules
// Returns all schedules for the logged-in user WITH linked slot data (canonical source of truth)
router.get('/my-schedules', requireAuth, async (req, res, next) => {
    try {
        const schedules = await Schedule.find({ userId: req.user._id })
            .populate('slotId', 'date startTime endTime') // Populate the linked slot
            .sort({ createdAt: -1 })
            .lean();
        return res.json({ success: true, schedules });
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
