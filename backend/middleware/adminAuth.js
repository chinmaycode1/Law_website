const crypto = require('crypto');

function adminAuth(req, res, next) {
    const providedKey = req.headers['x-admin-key'];
    const configuredKey = process.env.ADMIN_KEY;

    if (typeof providedKey !== 'string' || !configuredKey) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const providedBuffer = Buffer.from(providedKey);
    const configuredBuffer = Buffer.from(configuredKey);
    const sameLength = providedBuffer.length === configuredBuffer.length;
    const matches = sameLength && crypto.timingSafeEqual(providedBuffer, configuredBuffer);

    if (!matches) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    return next();
}

module.exports = adminAuth;
