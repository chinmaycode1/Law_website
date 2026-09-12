require('dotenv').config();

const mongoose = require('mongoose');
const Contact = require('../models/Contact');

const baseUrl = 'http://localhost:3000';
const testContact = {
    name: 'Backend Integration Test',
    email: `backend-test-${Date.now()}@example.com`,
    phone: '9876543210',
    caseType: 'other',
    message: 'This is a backend persistence integration test.'
};

async function postContact(payload) {
    const response = await fetch(`${baseUrl}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    return {
        status: response.status,
        body: await response.json()
    };
}

async function printSavedContact() {
    if (!process.env.MONGO_URI) {
        console.log('DATABASE_LOOKUP=SKIPPED (MONGO_URI is not configured)');
        return false;
    }

    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    const savedContact = await Contact.findOne({ email: testContact.email })
        .select('name caseType status createdAt -_id')
        .lean();

    if (!savedContact) {
        console.log('DATABASE_LOOKUP=FAIL (saved document not found)');
        return false;
    }

    console.log('SAVED_DOCUMENT=' + JSON.stringify(savedContact));
    return true;
}

async function run() {
    let validResponse;

    try {
        validResponse = await postContact(testContact);
        console.log('VALID_RESPONSE=' + JSON.stringify(validResponse));

        if (validResponse.status === 201) {
            try {
                await printSavedContact();
            } catch (error) {
                console.log('DATABASE_LOOKUP=FAIL (' + error.message + ')');
            }
        } else {
            console.log('DATABASE_LOOKUP=SKIPPED (valid submission was not accepted)');
        }

        const invalidResponse = await postContact({ ...testContact, phone: '12345' });
        console.log('INVALID_PHONE_RESPONSE=' + JSON.stringify(invalidResponse));
        console.log('INVALID_PHONE_EXPECTED_422=' + (invalidResponse.status === 422 ? 'PASS' : 'FAIL'));

        if (validResponse.status !== 201) {
            console.log('EMAIL_STATUS=NOT_ATTEMPTED (contact persistence failed before email notification)');
        } else if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            console.log('EMAIL_STATUS=UNKNOWN (the API does not return nodemailer delivery status; inspect server logs)');
        } else {
            console.log('EMAIL_STATUS=NOT_ATTEMPTED (EMAIL_USER/EMAIL_PASS are not configured)');
        }
    } catch (error) {
        console.error('TEST_SCRIPT_ERROR=' + error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

run();