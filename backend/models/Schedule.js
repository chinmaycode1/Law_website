const mongoose = require('mongoose');

const caseTypes = ['criminal-defense', 'white-collar', 'bail', 'appeal', 'ndps', 'other'];
const timeSlots = ['10:00', '11:00', '12:00', '15:00', '16:00', '17:00'];
const modes = ['in-person', 'video-call', 'phone-call'];

const updateSchema = new mongoose.Schema({
    message: { type: String, required: true, maxlength: 300, trim: true },
    at: { type: Date, default: Date.now },
    by: { type: String, enum: ['admin', 'system'], required: true }
}, { _id: false });

const scheduleSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    caseType: { type: String, required: true, enum: caseTypes },
    preferredDate: { type: Date, required: true },
    preferredTime: { type: String, required: true, enum: timeSlots },
    mode: { type: String, enum: modes, default: 'in-person' },
    notes: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ['pending', 'confirmed', 'rescheduled', 'completed', 'cancelled'], default: 'pending' },
    confirmedAt: { type: Date },
    adminNote: { type: String, trim: true, maxlength: 500 },
    updates: { type: [updateSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Schedule', scheduleSchema);