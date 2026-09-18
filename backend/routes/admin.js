const path = require('path');
const fs = require('fs');
const express = require('express');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const Contact = require('../models/Contact');
const Schedule = require('../models/Schedule');
const AvailabilitySlot = require('../models/AvailabilitySlot');
const adminAuth = require('../middleware/adminAuth');
const { isConfigured, razorpay } = require('../config/razorpay');
const { formatDate } = require('../utils/slotDate');

const router = express.Router();
const statuses = ['new', 'contacted', 'scheduled', 'resolved'];
const contactFields = '_id name email phone caseType message status scheduledAt scheduledNote updates attachments userId createdAt updatedAt';
const scheduleStatuses = ['pending', 'confirmed', 'rescheduled', 'completed', 'cancelled'];
const scheduleFields = '_id userId caseType preferredDate preferredTime mode notes status confirmedAt adminNote payment updates slotId createdAt updatedAt';
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
        scheduledAt: contact.scheduledAt,
        scheduledNote: contact.scheduledNote,
        updates: contact.updates,
        attachments: contact.attachments || [],
        userId: contact.userId,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt
    };
}

function serializeSchedule(schedule) {
    if (!schedule) return schedule;
    return {
        _id: schedule._id,
        userId: schedule.userId,
        caseType: schedule.caseType,
        preferredDate: schedule.preferredDate,
        preferredTime: schedule.preferredTime,
        mode: schedule.mode,
        notes: schedule.notes,
        status: schedule.status,
        confirmedAt: schedule.confirmedAt,
        adminNote: schedule.adminNote,
        slotId: schedule.slotId,
        payment: schedule.payment ? {
            status: schedule.payment.status,
            paymentId: schedule.payment.paymentId,
            method: schedule.payment.method,
            amount: schedule.payment.amount,
            paidAt: schedule.payment.paidAt,
            orderId: schedule.payment.orderId
        } : undefined,
        updates: schedule.updates,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt
    };
}

function formatDateTime(date) {
    return new Date(date).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata'
    });
}

function caseStatusLabel(status) {
    return status.charAt(0).toUpperCase() + status.slice(1);
}

router.use(adminRateLimit, adminAuth);

// ── Contact routes ───────────────────────────────────────────────────────────

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

// Serve attachment files to admin
router.get('/contacts/:id/attachments/:filename', async (req, res, next) => {
    try {
        const contact = await Contact.findById(req.params.id).lean();
        if (!contact) return res.status(404).json({ error: 'Contact not found.' });

        const attachment = contact.attachments && contact.attachments.find((a) => a.filename === req.params.filename);
        if (!attachment) return res.status(404).json({ error: 'Attachment not found.' });

        const filePath = path.join(__dirname, '..', 'uploads', attachment.filename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on server.' });

        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.originalName)}"`);
        res.setHeader('Content-Type', attachment.mimetype);
        return res.sendFile(filePath);
    } catch (error) {
        return next(error);
    }
});

router.patch('/contacts/:id', async (req, res, next) => {
    try {
        const keys = Object.keys(req.body || {});
        const allowedKeys = ['status', 'scheduledAt', 'scheduledNote'];
        if (!keys.length || keys.some((key) => !allowedKeys.includes(key))) {
            return res.status(400).json({ error: 'Only status, scheduledAt, or scheduledNote can be updated' });
        }

        if (Object.prototype.hasOwnProperty.call(req.body, 'status') && !statuses.includes(req.body.status)) {
            return res.status(400).json({ error: 'Only a valid status can be updated' });
        }

        let contact = await Contact.findById(req.params.id);
        if (!contact) return res.status(404).json({ error: 'Contact not found' });

        if (Object.prototype.hasOwnProperty.call(req.body, 'scheduledAt')) {
            if (req.body.scheduledAt !== null && Number.isNaN(Date.parse(req.body.scheduledAt))) {
                return res.status(400).json({ error: 'scheduledAt must be a valid date or null' });
            }
            contact.scheduledAt = req.body.scheduledAt;
        }
        if (Object.prototype.hasOwnProperty.call(req.body, 'scheduledNote')) contact.scheduledNote = req.body.scheduledNote;
        const previousStatus = contact.status;
        if (Object.prototype.hasOwnProperty.call(req.body, 'status')) contact.status = req.body.status;
        if (req.body.scheduledAt && !Object.prototype.hasOwnProperty.call(req.body, 'status') && ['new', 'contacted'].includes(contact.status)) contact.status = 'scheduled';
        if (contact.status !== previousStatus) {
            contact.updates.push({ message: `Status changed to ${caseStatusLabel(contact.status)}`, by: 'admin' });
        }
        await contact.save();

        return res.json(serializeContact(await Contact.findById(contact._id).select(contactFields).lean()));
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

// ── Schedule routes ──────────────────────────────────────────────────────────

router.get('/schedules', async (req, res, next) => {
    try {
        const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
        const filter = {};
        if (req.query.status) {
            if (!scheduleStatuses.includes(req.query.status)) return res.status(400).json({ error: 'Invalid status filter' });
            filter.status = req.query.status;
        }
        const [schedules, total] = await Promise.all([
            Schedule.find(filter)
                .select(scheduleFields)
                .populate('userId', 'name email')
                .populate('slotId', 'date startTime endTime')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Schedule.countDocuments(filter)
        ]);
        return res.json({ schedules: schedules.map(serializeSchedule), total, page, pages: Math.max(Math.ceil(total / limit), 1) });
    } catch (error) {
        return next(error);
    }
});

// POST /api/admin/assign-slot
// Assign an OPEN slot to a PENDING schedule/contact request
// Body: { scheduleId, slotId }
router.post('/assign-slot', async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { scheduleId, slotId } = req.body;
        
        if (!scheduleId || !slotId) {
            await session.abortTransaction();
            return res.status(400).json({ error: 'Both scheduleId and slotId are required' });
        }

        // Atomically claim the slot
        const slot = await AvailabilitySlot.findOneAndUpdate(
            { _id: slotId, isBooked: false },
            { 
                isBooked: true, 
                scheduleId: scheduleId,
                status: 'booked'
            },
            { new: true, session }
        ).populate('bookedBy', 'name email');

        if (!slot) {
            await session.abortTransaction();
            return res.status(409).json({ 
                error: 'Slot just taken — pick another.',
                message: 'That slot was just booked by someone else. Please select another available time.'
            });
        }

        // Update the schedule
        const schedule = await Schedule.findById(scheduleId).session(session);
        if (!schedule) {
            await session.abortTransaction();
            return res.status(404).json({ error: 'Schedule not found' });
        }

        // If schedule had a previous slot, release it
        if (schedule.slotId) {
            await AvailabilitySlot.findByIdAndUpdate(
                schedule.slotId,
                { 
                    isBooked: false, 
                    bookedBy: null, 
                    scheduleId: null,
                    status: 'available'
                },
                { session }
            );
        }

        // Update schedule with new slot info
        schedule.slotId = slot._id;
        schedule.preferredDate = slot.date;
        schedule.preferredTime = slot.startTime;
        schedule.status = 'confirmed';
        schedule.confirmedAt = new Date();
        
        const dateStr = formatDate(slot.date);
        const timeStr = slot.startTime;
        schedule.updates.push({
            message: `Consultation confirmed for ${dateStr} at ${timeStr} by admin`,
            by: 'admin'
        });

        // Update slot's bookedBy
        slot.bookedBy = schedule.userId;
        await slot.save({ session });
        await schedule.save({ session });

        await session.commitTransaction();
        
        return res.status(201).json({ 
            success: true, 
            message: 'Slot assigned successfully',
            schedule: serializeSchedule(schedule),
            slot
        });
    } catch (error) {
        await session.abortTransaction();
        return next(error);
    } finally {
        session.endSession();
    }
});

// PATCH /api/admin/schedules/:id
// Admin actions: confirm, reschedule, complete, cancel, refund
router.patch('/schedules/:id', async (req, res, next) => {
    try {
        const allowedActions = ['confirm', 'reschedule', 'complete', 'cancel', 'refund'];
        if (!req.body || !allowedActions.includes(req.body.action)) {
            return res.status(400).json({ error: 'Invalid schedule action' });
        }
        
        const schedule = await Schedule.findById(req.params.id).populate('slotId');
        if (!schedule) return res.status(404).json({ error: 'Schedule not found' });

        const { action, adminNote, newSlotId } = req.body;
        
        // Validation
        if (adminNote !== undefined && (typeof adminNote !== 'string' || adminNote.length > 500)) {
            return res.status(400).json({ error: 'adminNote must be 500 characters or fewer' });
        }
        if (action === 'reschedule') {
            if (!newSlotId) {
                return res.status(400).json({ error: 'newSlotId is required when rescheduling' });
            }
            if (typeof adminNote !== 'string' || !adminNote.trim()) {
                return res.status(400).json({ error: 'adminNote is required when rescheduling' });
            }
        }
        
        if (adminNote !== undefined) schedule.adminNote = adminNote;

        // REFUND action
        if (action === 'refund') {
            if (!isConfigured || !schedule.payment || schedule.payment.status !== 'paid' || !schedule.payment.paymentId) {
                return res.status(400).json({ error: 'Only paid consultations can be refunded' });
            }
            
            // Process refund
            await razorpay.payments.refund(schedule.payment.paymentId);
            schedule.payment.status = 'refunded';
            schedule.status = 'cancelled';
            schedule.updates.push({ message: 'Consultation cancelled and payment refunded', by: 'admin' });
            
            // Release the slot if linked
            if (schedule.slotId) {
                await AvailabilitySlot.findByIdAndUpdate(schedule.slotId, {
                    isBooked: false,
                    bookedBy: null,
                    scheduleId: null,
                    status: 'available'
                });
            }
            
            await schedule.save();
            return res.json(serializeSchedule(
                await Schedule.findById(schedule._id)
                    .select(scheduleFields)
                    .populate('userId', 'name email')
                    .populate('slotId', 'date startTime endTime')
                    .lean()
            ));
        }

        // RESCHEDULE action — use atomic slot swap
        if (action === 'reschedule') {
            const session = await mongoose.startSession();
            session.startTransaction();
            
            try {
                // Atomically claim the NEW slot
                const newSlot = await AvailabilitySlot.findOneAndUpdate(
                    { _id: newSlotId, isBooked: false },
                    { 
                        isBooked: true, 
                        bookedBy: schedule.userId, 
                        scheduleId: schedule._id,
                        status: 'booked'
                    },
                    { new: true, session }
                );

                if (!newSlot) {
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(409).json({ 
                        error: 'The new slot was just booked by someone else. Please pick another.',
                        message: 'That slot is no longer available. Please select another time.'
                    });
                }

                // Release the OLD slot if it exists
                if (schedule.slotId) {
                    await AvailabilitySlot.findByIdAndUpdate(
                        schedule.slotId,
                        {
                            isBooked: false,
                            bookedBy: null,
                            scheduleId: null,
                            status: 'available'
                        },
                        { session }
                    );
                }

                // Update the schedule
                schedule.slotId = newSlot._id;
                schedule.preferredDate = newSlot.date;
                schedule.preferredTime = newSlot.startTime;
                schedule.status = 'rescheduled';
                schedule.confirmedAt = new Date();
                
                const dateStr = formatDate(newSlot.date);
                const timeStr = newSlot.startTime;
                schedule.updates.push({
                    message: `Consultation rescheduled to ${dateStr} at ${timeStr}${adminNote ? `: ${adminNote}` : ''}`,
                    by: 'admin'
                });
                
                await schedule.save({ session });
                await session.commitTransaction();
                session.endSession();
                
            } catch (error) {
                await session.abortTransaction();
                session.endSession();
                throw error;
            }
            
            const updated = await Schedule.findById(schedule._id)
                .select(scheduleFields)
                .populate('userId', 'name email')
                .populate('slotId', 'date startTime endTime')
                .lean();
            return res.json(serializeSchedule(updated));
        }

        // CANCEL action — release the slot
        if (action === 'cancel') {
            schedule.status = 'cancelled';
            schedule.updates.push({ 
                message: `Consultation cancelled${adminNote ? `: ${adminNote}` : ''}`, 
                by: 'admin' 
            });
            
            // Release the slot if linked
            if (schedule.slotId) {
                await AvailabilitySlot.findByIdAndUpdate(schedule.slotId, {
                    isBooked: false,
                    bookedBy: null,
                    scheduleId: null,
                    status: 'available'
                });
            }
            
            await schedule.save();
            const updated = await Schedule.findById(schedule._id)
                .select(scheduleFields)
                .populate('userId', 'name email')
                .populate('slotId', 'date startTime endTime')
                .lean();
            return res.json(serializeSchedule(updated));
        }

        // COMPLETE action — mark slot as completed (never bookable again)
        if (action === 'complete') {
            schedule.status = 'completed';
            schedule.updates.push({ message: 'Consultation completed', by: 'admin' });
            
            // Mark the slot as completed (not released, never bookable again)
            if (schedule.slotId) {
                await AvailabilitySlot.findByIdAndUpdate(schedule.slotId, {
                    status: 'completed'
                });
            }
            
            await schedule.save();
            const updated = await Schedule.findById(schedule._id)
                .select(scheduleFields)
                .populate('userId', 'name email')
                .populate('slotId', 'date startTime endTime')
                .lean();
            return res.json(serializeSchedule(updated));
        }

        // CONFIRM action
        if (action === 'confirm') {
            if (!req.body.confirmedAt || Number.isNaN(Date.parse(req.body.confirmedAt))) {
                return res.status(400).json({ error: 'confirmedAt must be a valid date' });
            }
            schedule.confirmedAt = new Date(req.body.confirmedAt);
            schedule.status = 'confirmed';
            schedule.updates.push({ 
                message: `Consultation confirmed for ${formatDateTime(schedule.confirmedAt)}`, 
                by: 'admin' 
            });
            await schedule.save();
            const updated = await Schedule.findById(schedule._id)
                .select(scheduleFields)
                .populate('userId', 'name email')
                .populate('slotId', 'date startTime endTime')
                .lean();
            return res.json(serializeSchedule(updated));
        }

    } catch (error) {
        return next(error);
    }
});

// ── Stats ────────────────────────────────────────────────────────────────────

router.get('/stats', async (req, res, next) => {
    try {
        const grouped = await Contact.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        const [scheduleCounts, schedulesCount, pendingSchedules] = await Promise.all([
            Schedule.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            Schedule.countDocuments(),
            Schedule.countDocuments({ status: 'pending' })
        ]);
        const stats = { new: 0, contacted: 0, scheduled: 0, resolved: 0, total: 0, schedulesCount, pendingSchedules };
        grouped.forEach((item) => {
            if (statuses.includes(item._id)) stats[item._id] = item.count;
        });
        stats.total = stats.new + stats.contacted + stats.scheduled + stats.resolved;
        return res.json(stats);
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
