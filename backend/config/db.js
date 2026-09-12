const mongoose = require('mongoose');

let retryTimer;

function connectDatabase() {
    if (!process.env.MONGO_URI) {
        console.warn('MONGO_URI is not configured; database persistence is unavailable.');
        return Promise.resolve();
    }

    return mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10
    }).then(() => {
        console.log('MongoDB connected');
    }).catch((error) => {
        console.error('MongoDB connection error:', error.message);
        scheduleReconnect();
    });
}

function scheduleReconnect() {
    if (retryTimer || !process.env.MONGO_URI) return;
    retryTimer = setTimeout(() => {
        retryTimer = null;
        connectDatabase();
    }, 10000);
}

mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected; retrying in 10 seconds.');
    scheduleReconnect();
});

mongoose.connection.on('error', (error) => {
    console.error('MongoDB error:', error.message);
});

module.exports = { connectDatabase, mongoose };