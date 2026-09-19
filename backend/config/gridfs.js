const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

let bucket;

/**
 * Initialize GridFS bucket when MongoDB connection is ready
 */
function initializeGridFS() {
    if (!bucket && mongoose.connection.readyState === 1) {
        bucket = new GridFSBucket(mongoose.connection.db, {
            bucketName: 'attachments'
        });
    }
    return bucket;
}

/**
 * Get GridFS bucket instance (lazy initialization)
 */
function getBucket() {
    if (!bucket) {
        initializeGridFS();
    }
    return bucket;
}

module.exports = {
    initializeGridFS,
    getBucket
};
