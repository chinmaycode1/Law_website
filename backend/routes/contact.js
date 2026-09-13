const express = require('express');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const Contact = require('../models/Contact');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
const phonePattern = /^[6-9]\d{9}$/;
const caseTypes = ['criminal-defense', 'white-collar', 'bail', 'appeal', 'ndps', 'other'];
const transporter = process.env.EMAIL_USER && process.env.EMAIL_PASS ? nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
}) : null;

function normalizePhone(value) {
    return String(value || '').replace(/[\s-]/g, '').replace(/^\+91/, '').replace(/^91(?=\d{10}$)/, '');
}

const validateContact = [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters.'),
    body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
    body('phone').customSanitizer(normalizePhone).matches(phonePattern).withMessage('Enter a valid Indian mobile number.'),
    body('caseType').isIn(caseTypes).withMessage('Select a valid case type.'),
    body('message').trim().isLength({ min: 10, max: 2000 }).withMessage('Message must be between 10 and 2000 characters.')
];

function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

router.post('/', requireAuth, validateContact, async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, errors: errors.array().map((error) => ({ field: error.path, message: error.msg })) });
    }

    try {
        const contact = await Contact.create({
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            caseType: req.body.caseType,
            message: req.body.message,
            userId: req.user._id
        });

        if (transporter) {
            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: process.env.RECIPIENT_EMAIL || process.env.EMAIL_USER,
                    subject: `New Contact Form Submission - ${contact.caseType}`,
                    html: `<h2>New Contact Form Submission</h2><p><strong>Name:</strong> ${escapeHtml(contact.name)}</p><p><strong>Email:</strong> ${escapeHtml(contact.email)}</p><p><strong>Phone:</strong> ${escapeHtml(contact.phone)}</p><p><strong>Case Type:</strong> ${escapeHtml(contact.caseType)}</p><p><strong>Message:</strong></p><p>${escapeHtml(contact.message)}</p>`
                });
            } catch (emailError) {
                console.warn('Contact saved but email notification failed:', emailError.message);
            }
        } else {
            console.warn('Contact saved without email notification because email credentials are not configured.');
        }

        return res.status(201).json({ success: true, message: 'Thank you. Your consultation request has been received.' });
    } catch (error) {
        return next(error);
    }
});

module.exports = router;