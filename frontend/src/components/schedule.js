(() => {
    const panel = document.getElementById('consultationPanel');
    if (!panel) return;

    const signIn = document.getElementById('consultationSignIn');
    const signInLink = document.getElementById('consultationSignInLink');
    const authenticated = document.getElementById('consultationAuthenticated');
    const form = document.getElementById('consultationForm');
    const list = document.getElementById('scheduleList');
    const message = document.getElementById('scheduleMessage');
    const submit = document.getElementById('scheduleSubmit');
    const apiBase = window.location.origin.includes('localhost') ? 'http://localhost:3000/api' : '/api';
    const labels = { 'criminal-defense': 'Criminal Defense', 'white-collar': 'White-Collar Crimes', bail: 'Bail Matters', appeal: 'Appeal/Revision', ndps: 'NDPS/Drug Offense', other: 'Other' };
    const modeLabels = { 'in-person': 'In-person at chamber', 'video-call': 'Video call', 'phone-call': 'Phone call' };

    function formatDate(value) {
        return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
    }

    function formatStatus(status) { return status.charAt(0).toUpperCase() + status.slice(1); }

    function paymentTag(status) {
        if (!['paid', 'refunded'].includes(status)) return null;
        const tag = document.createElement('span');
        tag.className = `payment-tag payment-${status}`;
        if (status === 'paid') {
            const check = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            check.classList.add('icon');
            check.setAttribute('aria-hidden', 'true');
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'm5 12 4 4L19 6');
            check.appendChild(path);
            tag.append(check);
        }
        tag.appendChild(document.createTextNode(status === 'paid' ? 'Paid' : 'Refunded'));
        return tag;
    }

    function clearErrors() {
        form.querySelectorAll('.field-error').forEach((field) => {
            field.textContent = '';
            field.classList.remove('visible');
        });
    }

    function showErrors(errors) {
        errors.forEach((error) => {
            const field = form.querySelector(`[data-error-for="${error.field}"]`);
            if (field) {
                field.textContent = error.message;
                field.classList.add('visible');
            }
        });
    }

    function showMessage(type, text) {
        message.className = `form-message ${type}`;
        message.textContent = text;
        message.style.display = 'block';
    }

    function renderSchedule(schedule) {
        const card = document.createElement('article');
        card.className = 'schedule-card';
        const heading = document.createElement('div');
        heading.className = 'schedule-card-heading';
        const title = document.createElement('h4');
        title.textContent = labels[schedule.caseType] || schedule.caseType;
        const status = document.createElement('span');
        status.className = `schedule-status status-${schedule.status}`;
        const dot = document.createElement('span');
        dot.className = 'status-dot';
        dot.setAttribute('aria-hidden', 'true');
        status.append(dot, document.createTextNode(formatStatus(schedule.status)));
        const badges = document.createElement('div');
        badges.className = 'schedule-card-badges';
        badges.append(status);
        const payment = paymentTag(schedule.payment?.status);
        if (payment) badges.append(payment);
        heading.append(title, badges);
        const details = document.createElement('p');
        details.className = 'schedule-card-details';
        details.textContent = `${formatDate(schedule.preferredDate)} at ${schedule.preferredTime} - ${modeLabels[schedule.mode] || schedule.mode}`;
        card.append(heading, details);
        const timeline = window.lawTimeline?.render(schedule.updates);
        if (timeline) {
            const disclosure = document.createElement('details');
            disclosure.className = 'timeline-disclosure';
            const summary = document.createElement('summary');
            summary.textContent = 'View updates';
            disclosure.append(summary, timeline);
            card.appendChild(disclosure);
        }
        return card;
    }

    function renderSchedules(schedules) {
        list.replaceChildren();
        const upcoming = schedules.filter((schedule) => ['pending', 'confirmed', 'rescheduled'].includes(schedule.status));
        if (!upcoming.length) return;
        const heading = document.createElement('h4');
        heading.className = 'schedule-list-heading';
        heading.textContent = 'Your consultation requests';
        list.appendChild(heading);
        upcoming.forEach((schedule) => list.appendChild(renderSchedule(schedule)));
    }

    async function loadSchedules() {
        try {
            const response = await fetch(`${apiBase}/my-schedules`, { credentials: 'include' });
            const body = await response.json();
            if (response.status === 401) throw new Error('Please sign in with Google to continue.');
            if (!response.ok) throw new Error(body.message || 'Could not load consultation requests.');
            renderSchedules(body.schedules || []);
        } catch (error) {
            list.replaceChildren();
            if (error.message.includes('sign in')) showMessage('error', error.message);
        }
    }

    function setTomorrowMinimum() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('preferredDate').min = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    }

    function render(user) {
        panel.hidden = false;
        signIn.hidden = Boolean(user);
        authenticated.hidden = !user;
        if (user) {
            setTomorrowMinimum();
            loadSchedules();
        }
    }

    async function submitSchedule(event) {
        event.preventDefault();
        clearErrors();
        if (!window.lawAuth?.isSignedIn()) {
            window.lawAuth?.focusSignIn();
            return;
        }
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        submit.disabled = true;
        submit.textContent = 'Preparing secure payment...';
        message.style.display = 'none';
        try {
            if (!window.Razorpay) {
                showMessage('error', 'Secure payment is temporarily unavailable. Please try again.');
                return;
            }
            const orderResponse = await fetch(`${apiBase}/payment/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            const orderBody = await orderResponse.json();
            if (orderResponse.status === 401) {
                showMessage('error', 'Your session has expired. Please sign in again.');
                window.lawAuth.focusSignIn();
                return;
            }
            if (!orderResponse.ok) {
                showMessage('error', orderBody.message || 'Secure payment is temporarily unavailable. Please try again.');
                return;
            }
            submit.textContent = 'Complete payment...';
            await new Promise((resolve) => {
                let settled = false;
                const finish = () => { if (!settled) { settled = true; resolve(); } };
                const checkout = new window.Razorpay({
                    key: orderBody.keyId,
                    order_id: orderBody.orderId,
                    amount: orderBody.amount,
                    currency: 'INR',
                    name: 'Advocate Sunil Sawargaonkar',
                    description: 'Consultation Fee',
                    prefill: { email: window.lawAuth.user.email, name: window.lawAuth.user.name },
                    theme: { color: '#d4af37' },
                    handler: async (razorpayResponse) => {
                        try {
                            const verifyResponse = await fetch(`${apiBase}/payment/verify`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify(razorpayResponse)
                            });
                            const verifyBody = await verifyResponse.json();
                            if (!verifyResponse.ok || verifyBody.verified !== true) {
                                showMessage('error', 'Payment could not be verified. If money was deducted it auto-refunds in 5–7 days.');
                                return;
                            }
                            const scheduleResponse = await fetch(`${apiBase}/schedule`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ ...Object.fromEntries(new FormData(form).entries()), paymentId: razorpayResponse.razorpay_payment_id })
                            });
                            const scheduleBody = await scheduleResponse.json();
                            if (!scheduleResponse.ok) {
                                if (Array.isArray(scheduleBody.errors)) showErrors(scheduleBody.errors);
                                showMessage('error', scheduleBody.message || 'Payment succeeded, but the request could not be sent. Please contact the office.');
                                return;
                            }
                            showMessage('success', 'Your consultation request has been received.');
                            form.reset();
                            setTomorrowMinimum();
                            await loadSchedules();
                        } catch (error) {
                            showMessage('error', 'Payment could not be verified. If money was deducted it auto-refunds in 5–7 days.');
                        } finally {
                            finish();
                        }
                    },
                    modal: { ondismiss: () => { showMessage('neutral', 'Payment cancelled. Your request was NOT sent.'); finish(); } }
                });
                checkout.open();
            });
        } catch (error) {
            showMessage('error', 'We could not submit your request. Please try again.');
        } finally {
            submit.disabled = false;
            submit.textContent = 'Pay ₹3,000 & Request Consultation';
        }
    }

    signInLink.addEventListener('click', () => window.lawAuth?.focusSignIn());
    form.addEventListener('submit', submitSchedule);
    window.lawAuth?.subscribe(render);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => render(window.lawAuth?.user));
    else render(window.lawAuth?.user);
})();