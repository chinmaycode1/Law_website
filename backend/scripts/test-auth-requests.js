require('dotenv').config();

const assert = require('assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Contact = require('../models/Contact');

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
const testRun = Date.now();
const userA = {
    googleId: `integration-test-a-${testRun}`,
    email: `integration-test-a-${testRun}@example.com`,
    name: 'Integration Test A'
};
const userB = {
    googleId: `integration-test-b-${testRun}`,
    email: `integration-test-b-${testRun}@example.com`,
    name: 'Integration Test B'
};
const contactPayload = {
    name: 'Authenticated Integration Test',
    email: userA.email,
    phone: '9876543210',
    caseType: 'other',
    message: 'This authenticated integration test checks request ownership.'
};

function sessionCookie(user) {
    const token = jwt.sign({ userId: user._id.toString() }, process.env.SESSION_JWT_SECRET, { algorithm: 'HS256', expiresIn: '10m' });
    return `session=${token}`;
}

async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, options);
    const body = await response.json();
    return { response, body };
}

async function run() {
    assert.ok(process.env.MONGO_URI, 'MONGO_URI is required');
    assert.ok(process.env.SESSION_JWT_SECRET, 'SESSION_JWT_SECRET is required');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });

    let createdContact;
    try {
        const [createdUserA, createdUserB] = await User.create([userA, userB]);

        const unauthenticated = await request('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(contactPayload)
        });
        assert.equal(unauthenticated.response.status, 401, 'contact submission without a session must be rejected');
        console.log('UNAUTHENTICATED_CONTACT=PASS');

        const tamperedSession = await request('/api/my-requests', {
            headers: { Cookie: 'session=not-a-valid-jwt' }
        });
        assert.equal(tamperedSession.response.status, 401, 'tampered sessions must be rejected');
        console.log('TAMPERED_SESSION=PASS');

        const authenticated = await request('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: sessionCookie(createdUserA) },
            body: JSON.stringify({ ...contactPayload, userId: createdUserB._id.toString() })
        });
        assert.equal(authenticated.response.status, 201, 'authenticated contact submission must succeed');
        createdContact = await Contact.findOne({ email: contactPayload.email }).sort({ createdAt: -1 });
        assert.ok(createdContact, 'authenticated contact must be saved');
        assert.equal(createdContact.userId.toString(), createdUserA._id.toString(), 'contact ownership must come from the verified session');
        console.log('AUTHENTICATED_CONTACT_OWNERSHIP=PASS');

        const ownRequests = await request('/api/my-requests', { headers: { Cookie: sessionCookie(createdUserA) } });
        assert.equal(ownRequests.response.status, 200);
        assert.equal(ownRequests.body.requests.length, 1);
        assert.equal(ownRequests.body.requests[0]._id, createdContact._id.toString());
        console.log('OWNER_REQUEST_VISIBLE=PASS');

        const otherRequests = await request('/api/my-requests', { headers: { Cookie: sessionCookie(createdUserB) } });
        assert.equal(otherRequests.response.status, 200);
        assert.equal(otherRequests.body.requests.length, 0, 'another user must not receive the owner request');
        console.log('CROSS_USER_REQUEST_ISOLATION=PASS');
    } finally {
        if (createdContact) await Contact.deleteOne({ _id: createdContact._id });
        await User.deleteMany({ googleId: { $in: [userA.googleId, userB.googleId] } });
        await mongoose.disconnect();
    }
}

run().catch((error) => {
    console.error('AUTH_REQUEST_TEST=FAIL (' + error.message + ')');
    process.exitCode = 1;
});