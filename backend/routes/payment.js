const crypto = require('crypto');
const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const Schedule = require('../models/Schedule');
const { isConfigured, razorpay } = require('../config/razorpay');

const router = express.Router();
const jsonParser = express.json({ limit: '20kb' });
const consultationAmount = 300000;

function signaturesMatch(expected, received) {
    if (typeof received !== 'string' || !received) return false;
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const receivedBuffer = Buffer.from(received, 'utf8');
    return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

router.post('/order', jsonParser, requireAuth, async (req, res, next) => {
    try {
        if (!isConfigured) return res.status(503).json({ success: false, message: 'Payment service is not configured.' });
        const order = await razorpay.orders.create({
            amount: consultationAmount,
            currency: 'INR',
            receipt: `consult_${req.user._id}_${Date.now()}`
        });
        return res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID });
    } catch (error) {
        return next(error);
    }
});

router.post('/verify', jsonParser, requireAuth, (req, res) => {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};
    if (!orderId || !paymentId || !signature || !process.env.RAZORPAY_KEY_SECRET) {
        return res.status(400).json({ verified: false });
    }
    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
    if (!signaturesMatch(expectedSignature, signature)) return res.status(400).json({ verified: false });
    return res.json({ verified: true });
});

router.post('/webhook', express.raw({ type: 'application/json', limit: '100kb' }), async (req, res, next) => {
    try {
        if (!process.env.RAZORPAY_WEBHOOK_SECRET) return res.status(400).json({ success: false });
        const signature = req.get('X-Razorpay-Signature');
        const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(req.body).digest('hex');
        if (!signaturesMatch(expectedSignature, signature)) return res.status(400).json({ success: false });

        const event = JSON.parse(req.body.toString('utf8'));
        if (event.event === 'payment.captured') {
            const payment = event.payload && event.payload.payment && event.payload.payment.entity;
            if (payment && payment.id) {
                await Schedule.updateOne(
                    { 'payment.paymentId': payment.id, 'payment.status': { $ne: 'paid' } },
                    { $set: { 'payment.status': 'paid', 'payment.paidAt': new Date(payment.created_at ? payment.created_at * 1000 : Date.now()), 'payment.method': payment.method } }
                );
            }
        }
        return res.json({ success: true });
    } catch (error) {
        return next(error);
    }
});

module.exports = router;