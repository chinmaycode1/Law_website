const multer = require('multer');
const crypto = require('crypto');

const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
];

// Use memory storage - files will be uploaded to GridFS in the route handler
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(new Error(`File type ${file.mimetype} is not allowed. Only JPEG, PNG, WebP images and PDF files are accepted.`), false);
    }
    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
        files: 5 // Maximum 5 files
    }
});

module.exports = upload;
