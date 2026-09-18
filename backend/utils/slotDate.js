/**
 * Centralized date/time utilities for the slot booking system.
 * All dates are stored as midnight-UTC Date objects.
 * All timezone-aware operations use Asia/Kolkata (IST).
 */

/**
 * Parse a YYYY-MM-DD string to midnight UTC Date
 * @param {string} value - Date string in YYYY-MM-DD format
 * @returns {Date|null} - Date object or null if invalid
 */
function parseDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const d = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Format a Date object as YYYY-MM-DD
 * @param {Date} date - Date object
 * @returns {string} - Date string in YYYY-MM-DD format
 */
function formatDate(date) {
    const d = new Date(date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Check if a slot (date + endTime) is in the past relative to IST
 * @param {Date} date - midnight UTC Date object
 * @param {string} endTime - HH:MM string in 24-hour format
 * @returns {boolean} - true if the slot has passed
 */
function isPast(date, endTime) {
    // Get current time in IST
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const nowIST = new Date(now.getTime() + istOffset);
    
    // Build the slot end datetime in IST
    const [hours, minutes] = endTime.split(':').map(Number);
    const slotDate = new Date(date);
    
    // Convert slot date (midnight UTC) to IST midnight
    const slotIST = new Date(slotDate.getTime() + istOffset);
    slotIST.setUTCHours(hours, minutes, 0, 0);
    
    return slotIST <= nowIST;
}

/**
 * Validate HH:MM 24-hour time string
 * @param {string} value - Time string
 * @returns {boolean} - true if valid
 */
function isValidTime(value) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/**
 * Check if two time ranges overlap
 * @param {string} start1 - Start time of first range (HH:MM)
 * @param {string} end1 - End time of first range (HH:MM)
 * @param {string} start2 - Start time of second range (HH:MM)
 * @param {string} end2 - End time of second range (HH:MM)
 * @returns {boolean} - true if ranges overlap
 */
function timeRangesOverlap(start1, end1, start2, end2) {
    // Two ranges overlap if one starts before the other ends
    // Range1: [start1, end1), Range2: [start2, end2)
    // They DON'T overlap only if: end1 <= start2 OR end2 <= start1
    // So they DO overlap if: start1 < end2 AND start2 < end1
    return start1 < end2 && start2 < end1;
}

module.exports = {
    parseDate,
    formatDate,
    isPast,
    isValidTime,
    timeRangesOverlap
};
