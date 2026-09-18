(() => {
    const panel = document.getElementById('consultationPanel');
    if (!panel) return;

    const signIn = document.getElementById('consultationSignIn');
    const authenticated = document.getElementById('consultationAuthenticated');
    const form = document.getElementById('consultationForm');
    const list = document.getElementById('scheduleList');
    const message = document.getElementById('scheduleMessage');
    const submit = document.getElementById('scheduleSubmit');
    const dateInput = document.getElementById('preferredDate');
    const slotList = document.getElementById('slotList');
    const slotPickerHint = document.getElementById('slotPickerHint');
    const selectedSlotInput = document.getElementById('selectedSlotId');
    const apiBase = (window.API_BASE || '') + '/api';

    const caseLabels = { 'criminal-defense': 'practice_criminal', 'white-collar': 'practice_white_collar', bail: 'practice_bail', appeal: 'practice_appeal', ndps: 'practice_ndps', other: 'other' };
    const modeLabels = { 'in-person': 'in_person', 'video-call': 'video_call', 'phone-call': 'phone_call' };

    let currentSchedules = [];
    let loadingSlotsFor = null; // date string currently being fetched
    let pollingInterval = null; // For live updates

    const t = (key) => window.siteI18n.translate(key);

    function formatDate(value) {
        return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
    }

    function formatTime(hhmm) {
        const [h, m] = hhmm.split(':').map(Number);
        const suffix = h < 12 ? 'AM' : 'PM';
        const hour = h % 12 || 12;
        return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
    }

    function formatStatus(status) { return t(`status_${status}`) || status; }

    // ── Lightweight polling for live updates ──────────────────────────────────

    function startPolling() {
        // Poll every 30 seconds when page is visible
        if (pollingInterval) return; // Already polling
        
        pollingInterval = setInterval(() => {
            if (document.visibilityState === 'visible' && window.lawAuth?.isSignedIn()) {
                loadSchedules();
            }
        }, 30000); // 30 seconds
    }

    function stopPolling() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    }

    // Refetch on window focus
    window.addEventListener('focus', () => {
        if (window.lawAuth?.isSignedIn()) {
            loadSchedules();
        }
    });

    // Stop polling when page is hidden to save resources
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            stopPolling();
        } else if (window.lawAuth?.isSignedIn()) {
            startPolling();
            loadSchedules(); // Immediate refresh when page becomes visible
        }
    });

    function clearErrors() {
        form.querySelectorAll('.field-error').forEach((f) => { f.textContent = ''; f.classList.remove('visible'); });
    }

    function showErrors(errors) {
        errors.forEach((error) => {
            const field = form.querySelector(`[data-error-for="${error.field}"]`);
            if (field) { field.textContent = error.message; field.classList.add('visible'); }
        });
    }

    function showMessage(type, text) {
        message.className = `form-message ${type}`;
        message.textContent = text;
        message.style.display = 'block';
    }

    function hideMessage() { message.style.display = 'none'; }

    // ── Slot picker ───────────────────────────────────────────────────────────

    function renderSlotButtons(slots) {
        slotList.replaceChildren();
        selectedSlotInput.value = '';

        if (!slots.length) {
            slotPickerHint.textContent = t('slot_none_available') || 'No slots available for this date.';
            slotPickerHint.style.display = 'block';
            submit.disabled = true;
            return;
        }

        slotPickerHint.style.display = 'none';
        submit.disabled = false;

        slots.forEach((slot) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'slot-btn';
            btn.textContent = `${formatTime(slot.startTime)} – ${formatTime(slot.endTime)}`;
            btn.dataset.slotId = slot._id;
            btn.addEventListener('click', () => {
                slotList.querySelectorAll('.slot-btn').forEach((b) => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedSlotInput.value = slot._id;
            });
            slotList.appendChild(btn);
        });
    }

    async function fetchSlots(dateStr) {
        if (loadingSlotsFor === dateStr) return;
        loadingSlotsFor = dateStr;

        slotList.replaceChildren();
        selectedSlotInput.value = '';
        submit.disabled = true;
        slotPickerHint.textContent = t('slot_loading') || 'Loading available slots...';
        slotPickerHint.style.display = 'block';

        try {
            const response = await fetch(`${apiBase}/slots?date=${encodeURIComponent(dateStr)}`);
            if (!response.ok) throw new Error('Failed to load slots.');
            const body = await response.json();
            renderSlotButtons(body.slots || []);
        } catch (error) {
            slotPickerHint.textContent = t('slot_load_error') || 'Could not load slots. Please try again.';
            slotPickerHint.style.display = 'block';
        } finally {
            loadingSlotsFor = null;
        }
    }

    // ── Consultation list ─────────────────────────────────────────────────────

    function renderSchedule(schedule) {
        const card = document.createElement('article');
        card.className = 'schedule-card';
        const heading = document.createElement('div');
        heading.className = 'schedule-card-heading';
        const title = document.createElement('h4');
        title.textContent = t(caseLabels[schedule.caseType]) || schedule.caseType;
        const status = document.createElement('span');
        status.className = `schedule-status status-${schedule.status}`;
        const dot = document.createElement('span');
        dot.className = 'status-dot';
        dot.setAttribute('aria-hidden', 'true');
        status.append(dot, document.createTextNode(formatStatus(schedule.status)));
        const badges = document.createElement('div');
        badges.className = 'schedule-card-badges';
        badges.append(status);
        heading.append(title, badges);
        const details = document.createElement('p');
        details.className = 'schedule-card-details';
        
        // Use linked slot data if available (canonical source), else fallback to preferredDate/Time
        let displayDate = schedule.preferredDate;
        let displayTime = schedule.preferredTime;
        
        if (schedule.slotId && schedule.slotId.date && schedule.slotId.startTime) {
            displayDate = schedule.slotId.date;
            displayTime = schedule.slotId.startTime;
        }
        
        details.textContent = window.siteI18n.interpolate(t('schedule_details'), {
            date: formatDate(displayDate),
            time: formatTime(displayTime),
            mode: t(modeLabels[schedule.mode]) || schedule.mode
        });
        card.append(heading, details);
        const timeline = window.lawTimeline?.render(schedule.updates);
        if (timeline) {
            const disclosure = document.createElement('details');
            disclosure.className = 'timeline-disclosure';
            const summary = document.createElement('summary');
            summary.textContent = t('view_updates');
            disclosure.append(summary, timeline);
            card.appendChild(disclosure);
        }
        return card;
    }

    function renderSchedules(schedules) {
        list.replaceChildren();
        const upcoming = schedules.filter((s) => ['pending', 'confirmed', 'rescheduled'].includes(s.status));
        if (!upcoming.length) return;
        const heading = document.createElement('h4');
        heading.className = 'schedule-list-heading';
        heading.textContent = t('consultation_requests');
        list.appendChild(heading);
        upcoming.forEach((s) => list.appendChild(renderSchedule(s)));
    }

    async function loadSchedules() {
        try {
            const response = await fetch(`${apiBase}/my-schedules`, { credentials: 'include' });
            const body = await response.json();
            if (response.status === 401) throw new Error('auth');
            if (!response.ok) throw new Error(body.message || 'Could not load consultations.');
            currentSchedules = body.schedules || [];
            renderSchedules(currentSchedules);
        } catch (error) {
            list.replaceChildren();
        }
    }

    function setTomorrowMinimum() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateInput.min = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    }

    function render(user) {
        panel.hidden = false;
        signIn.hidden = Boolean(user);
        authenticated.hidden = !user;
        if (user) {
            setTomorrowMinimum();
            submit.disabled = true; // disabled until a slot is chosen
            loadSchedules();
            startPolling(); // Start polling for updates
        } else {
            stopPolling(); // Stop polling when signed out
        }
    }

    // ── Form submission ───────────────────────────────────────────────────────

    async function submitSchedule(event) {
        event.preventDefault();
        clearErrors();
        hideMessage();

        if (!window.lawAuth?.isSignedIn()) {
            window.lawAuth?.focusSignIn();
            return;
        }

        if (!selectedSlotInput.value) {
            const err = form.querySelector('[data-error-for="slotId"]');
            if (err) { err.textContent = t('slot_required') || 'Please select an available time slot.'; err.classList.add('visible'); }
            return;
        }

        submit.disabled = true;
        const originalText = submit.textContent;
        submit.textContent = t('form_sending') || 'Submitting...';

        try {
            const response = await fetch(`${apiBase}/schedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    slotId: selectedSlotInput.value,
                    caseType: document.getElementById('scheduleCaseType').value,
                    mode: document.getElementById('scheduleMode').value,
                    notes: document.getElementById('scheduleNotes').value
                })
            });
            const body = await response.json();

            if (response.status === 409) {
                // Slot was taken between page-load and submit — re-fetch so client sees fresh list
                showMessage('error', body.message || t('slot_taken') || 'That slot was just booked. Please choose another.');
                await fetchSlots(dateInput.value);
                return;
            }

            if (!response.ok) {
                if (Array.isArray(body.errors)) showErrors(body.errors);
                showMessage('error', body.message || t('submit_error'));
                return;
            }

            showMessage('success', t('request_received') || 'Consultation request received.');
            form.reset();
            selectedSlotInput.value = '';
            slotList.replaceChildren();
            slotPickerHint.textContent = t('slot_pick_date') || 'Select a date above to see available times.';
            slotPickerHint.style.display = 'block';
            setTomorrowMinimum();
            await loadSchedules();
            window.lawCaseStatus?.refresh();
        } catch (error) {
            showMessage('error', t('submit_error') || 'An error occurred. Please try again.');
        } finally {
            submit.disabled = false;
            submit.textContent = originalText;
        }
    }

    // ── Event listeners ───────────────────────────────────────────────────────

    dateInput.addEventListener('change', () => {
        const val = dateInput.value;
        if (!val) return;
        fetchSlots(val);
    });

    form.addEventListener('submit', submitSchedule);
    window.addEventListener('languagechange', () => renderSchedules(currentSchedules));
    window.lawAuth?.subscribe(render);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => render(window.lawAuth?.user));
    else render(window.lawAuth?.user);
})();
