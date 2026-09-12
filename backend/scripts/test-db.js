require('dotenv').config();

const mongoose = require('mongoose');

async function run() {
    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI is not configured');
        process.exitCode = 1;
        return;
    }

    try {
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
        console.log('CONNECTED database=' + mongoose.connection.name);
    } catch (error) {
        console.error('ERROR_CODE=' + (error.codeName || error.code || 'UNKNOWN'));
        console.error('ERROR_MESSAGE=' + error.message);
        if (error.reason) {
            console.error('ERROR_REASON=' + (error.reason.message || String(error.reason)));
        }
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

run();