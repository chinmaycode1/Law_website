const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const Schedule = require('../models/Schedule');
const requireAuth = require('../middleware/requireAuth');
const { isConfigured, razorpay } = require('../config/razorpay');

const router = express.Router();
const caseTypes = ['criminal-defense', 'white-collar', 'bail', 'appeal', 'ndps', 'other'];
const timeSlots = ['10:00', '11:00', '12:00', '15:00', '16:00', '17:00'];
const modes = ['in-person', 'video-call', 'phone-call'];
const consultationAmount = 300000;
const scheduleRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    keyGenerator: (req) => req.user._id.toString(),
    standardHeaders: true,
    legacyHeaders: false
});

function isTomorrowOrLater(value) {
    const date = new Date(`${value}T00:00:00`);
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return !Number.isNaN(date.getTime()) && date >= tomorrow;
}

const validateSchedule = [
    body('caseType').isIn(caseTypes).withMessage('Select a valid case type.'),
    body('preferredDate').isISO8601({ strict: true }).withMessage('Choose a valid preferred date.').bail().custom(isTomorrowOrLater).withMessage('Preferred date must be tomorrow or later.'),
    body('preferredTime').isIn(timeSlots).withMessage('Select a valid preferred time.'),
    body('mode').optional().isIn(modes).withMessage('Select a valid consultation mode.'),
    body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Notes must be 500 characters or fewer.')
];

router.post('/schedule', requireAuth, scheduleRateLimit, validateSchedule, body('paymentId').isString().trim().notEmpty().withMessage('A successful payment is required.'), async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, errors: errors.array().map((error) => ({ field: error.path, message: error.msg })) });
    }

    try {
        if (!isConfigured) return res.status(503).json({ success: false, message: 'Payment service is not configured.' });
        const payment = await razorpay.payments.fetch(req.body.paymentId);
        if (!payment || payment.captured !== true || payment.amount !== consultationAmount) {
            return res.status(402).json({ success: false, message: 'A successful consultation payment is required.' });
        }
        const existingSchedule = await Schedule.findOne({ 'payment.paymentId': payment.id });
        if (existingSchedule) return res.status(409).json({ success: false, message: 'This payment has already been used.' });
        const schedule = await Schedule.create({
            userId: req.user._id,
            caseType: req.body.caseType,
            preferredDate: new Date(`${req.body.preferredDate}T00:00:00`),
            preferredTime: req.body.preferredTime,
            mode: req.body.mode || 'in-person',
            notes: req.body.notes,
            payment: {
                orderId: payment.order_id,
                paymentId: payment.id,
                amount: payment.amount,
                method: payment.method,
                status: 'paid',
                paidAt: new Date(payment.created_at ? payment.created_at * 1000 : Date.now())
            },
            updates: [{ message: 'Consultation request received - payment confirmed', by: 'system' }]
        });
        return res.status(201).json({ success: true, schedule });
    } catch (error) {
        return next(error);
    }
});

router.get('/my-schedules', requireAuth, async (req, res, next) => {
    try {
        const schedules = await Schedule.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
        return res.json({ success: true, schedules });
    } catch (error) {
        return next(error);
    }
});

module.exports = router;