const mongoose = require('mongoose');

const availabilitySlotSchema = new mongoose.Schema({
    date: { type: Date, required: true },        // midnight UTC, day only
    startTime: { type: String, required: true },  // "HH:MM", 24-hour
    endTime: { type: String, required: true },    // "HH:MM", 24-hour
    isBooked: { type: Boolean, default: false },
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    scheduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Schedule', default: null }
}, { timestamps: true });

// Compound unique index — the DB itself rejects duplicate slots at the same date+startTime
availabilitySlotSchema.index({ date: 1, startTime: 1 }, { unique: true });

module.exports = mongoose.model('AvailabilitySlot', availabilitySlotSchema);
