const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, minlength: 2 },
    email: { type: String, required: true, lowercase: true, trim: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    phone: { type: String, required: true, match: /^[6-9]\d{9}$/ },
    caseType: { type: String, required: true, enum: ['criminal-defense', 'white-collar', 'bail', 'appeal', 'ndps', 'other'] },
    message: { type: String, required: true, minlength: 10, maxlength: 2000, trim: true },
    status: { type: String, enum: ['new', 'contacted', 'resolved'], default: 'new' }
}, { timestamps: true });

module.exports = mongoose.model('Contact', contactSchema);