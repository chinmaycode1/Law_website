(() => {
    const apiBase = (window.API_BASE || '') + '/api/admin';
    const caseLabels = {
        'criminal-defense': 'Criminal Defense',
        'white-collar': 'White-Collar Crimes',
        bail: 'Bail Matters',
        appeal: 'Appellate Advocacy',
        ndps: 'NDPS & Drug Offenses',
        other: 'Other'
    };
    const statuses = ['all', 'new', 'contacted', 'scheduled', 'resolved'];
    const scheduleStatuses = ['all', 'pending', 'confirmed', 'rescheduled', 'completed', 'cancelled'];
    const state = { view: 'contacts', status: 'all', page: 1, scheduleStatus: 'all', schedulePage: 1, limit: 20 };
    const elements = {
        loginPanel: document.getElementById('loginPanel'),
        loginForm: document.getElementById('loginForm'),
        adminKey: document.getElementById('adminKey'),
        loginError: document.getElementById('loginError'),
        dashboard: document.getElementById('dashboard'),
        logoutButton: document.getElementById('logoutButton'),
        statsGrid: document.getElementById('statsGrid'),
        viewTabs: document.getElementById('viewTabs'),
        filterTabs: document.getElementById('filterTabs'),
        pageError: document.getElementById('pageError'),
        leadsContainer: document.getElementById('leadsContainer'),
        resultCount: document.getElementById('resultCount'),
        pagination: document.getElementById('pagination'),
        detailModal: document.getElementById('detailModal'),
        closeModal: document.getElementById('closeModal'),
        detailTitle: document.getElementById('detailTitle'),
        detailGrid: document.getElementById('detailGrid'),
        detailMessage: document.getElementById('detailMessage'),
        detailAttachments: document.getElementById('detailAttachments'),
        detailAttachmentList: document.getElementById('detailAttachmentList'),
        scheduledAtInput: document.getElementById('scheduledAtInput'),
        scheduledNoteInput: document.getElementById('scheduledNoteInput'),
        scheduleError: document.getElementById('scheduleError'),
        saveScheduleButton: document.getElementById('saveScheduleButton'),
        toast: document.getElementById('toast'),
        toastIcon: document.getElementById('toastIcon'),
        toastMessage: document.getElementById('toastMessage')
        ,slotManagerPanel: document.getElementById('slotManagerPanel')
        ,slotDate: document.getElementById('slotDate')
        ,slotStart: document.getElementById('slotStart')
        ,slotEnd: document.getElementById('slotEnd')
        ,addSlotBtn: document.getElementById('addSlotBtn')
        ,slotAddError: document.getElementById('slotAddError')
        ,slotDayView: document.getElementById('slotDayView')
        ,scheduleModal: document.getElementById('scheduleModal')
        ,closeScheduleModal: document.getElementById('closeScheduleModal')
        ,scheduleDetailTitle: document.getElementById('scheduleDetailTitle')
        ,scheduleDetailGrid: document.getElementById('scheduleDetailGrid')
        ,scheduleDetailNotes: document.getElementById('scheduleDetailNotes')
        ,scheduleDetailAdminNote: document.getElementById('scheduleDetailAdminNote')
        ,scheduleTimeline: document.getElementById('scheduleTimeline')
        ,scheduleActionForm: document.getElementById('scheduleActionForm')
        ,scheduleConfirmedAt: document.getElementById('scheduleConfirmedAt')
        ,scheduleAdminNote: document.getElementById('scheduleAdminNote')
        ,scheduleActionError: document.getElementById('scheduleActionError')
        ,saveScheduleAction: document.getElementById('saveScheduleAction')
    };
    let detailContactId = null;
    let detailScheduleId = null;
    let scheduleAction = null;

    function getKey() {
        return sessionStorage.getItem('adminKey');
    }

    function icon(id) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.className.baseVal = 'icon';
        svg.setAttribute('aria-hidden', 'true');
        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        use.setAttribute('href', `#icon-${id}`);
        svg.appendChild(use);
        return svg;
    }

    function addText(parent, value, className) {
        const node = document.createElement('span');
        node.textContent = value == null ? '' : String(value);
        if (className) node.className = className;
        parent.appendChild(node);
        return node;
    }

    function showLogin(message = '') {
        elements.dashboard.hidden = true;
        elements.loginPanel.hidden = false;
        elements.loginError.textContent = message;
        elements.adminKey.focus();
    }

    function showDashboard() {
        elements.loginPanel.hidden = true;
        elements.dashboard.hidden = false;
        loadDashboard();
    }

    async function request(path, options = {}) {
        const headers = { ...(options.headers || {}), 'x-admin-key': getKey() || '' };
        const response = await fetch(`${apiBase}${path}`, { ...options, headers });
        if (response.status === 401) {
            sessionStorage.removeItem('adminKey');
            showLogin('That key was not accepted. Please try again.');
            throw new Error('Unauthorized');
        }
        const body = response.status === 204 ? null : await response.json();
        if (!response.ok) throw new Error(body && (body.error || body.message) || 'Request failed');
        return body;
    }

    function clearError() {
        elements.pageError.textContent = '';
    }

    function renderStats(stats) {
        elements.statsGrid.replaceChildren();
        [['new', 'New'], ['contacted', 'Contacted'], ['scheduled', 'Scheduled'], ['resolved', 'Resolved'], ['total', 'Total'], ['pendingSchedules', 'Pending Consultations'], ['schedulesCount', 'Total Consultations']].forEach(([key, label]) => {
            const card = document.createElement('article');
            card.className = 'stat-card';
            addText(card, label, 'stat-label');
            addText(card, stats[key] || 0, 'stat-value');
            elements.statsGrid.appendChild(card);
        });
    }

    function renderViewTabs() {
        elements.viewTabs.replaceChildren();
        [['contacts', 'Contact Requests'], ['schedules', 'Consultations'], ['slots', 'Availability Slots']].forEach(([view, label]) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `view-tab${state.view === view ? ' active' : ''}`;
            button.setAttribute('aria-pressed', String(state.view === view));
            addText(button, label);
            button.addEventListener('click', async () => {
                if (state.view === view) return;
                state.view = view;
                state.page = 1;
                state.schedulePage = 1;
                renderViewTabs();
                await loadCurrentView();
            });
            elements.viewTabs.appendChild(button);
        });
    }

    function renderTabs(stats) {
        elements.filterTabs.replaceChildren();
        statuses.forEach((status) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `filter-tab${state.status === status ? ' active' : ''}`;
            button.setAttribute('aria-pressed', String(state.status === status));
            addText(button, status === 'all' ? 'All' : status[0].toUpperCase() + status.slice(1));
            addText(button, status === 'all' ? stats.total || 0 : stats[status] || 0, 'tab-count');
            button.addEventListener('click', () => {
                state.status = status;
                state.page = 1;
                loadLeads();
                renderTabs(stats);
            });
            elements.filterTabs.appendChild(button);
        });
    }

    function renderScheduleTabs() {
        elements.filterTabs.replaceChildren();
        scheduleStatuses.forEach((status) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `filter-tab${state.scheduleStatus === status ? ' active' : ''}`;
            button.setAttribute('aria-pressed', String(state.scheduleStatus === status));
            addText(button, status === 'all' ? 'All' : status[0].toUpperCase() + status.slice(1));
            button.addEventListener('click', () => { state.scheduleStatus = status; state.schedulePage = 1; renderScheduleTabs(); loadSchedules(); });
            elements.filterTabs.appendChild(button);
        });
    }

    function formatDate(value) {
        return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
    }

    function formatDateOnly(value) {
        return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
    }

    function formatFileSize(bytes) {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function statusSelect(contact) {
        const select = document.createElement('select');
        select.className = 'status-select';
        select.setAttribute('aria-label', `Status for ${contact.name}`);
        ['new', 'contacted', 'scheduled', 'resolved'].forEach((status) => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status[0].toUpperCase() + status.slice(1);
            option.selected = contact.status === status;
            select.appendChild(option);
        });
        select.addEventListener('change', async () => {
            try {
                await request(`/contacts/${encodeURIComponent(contact._id)}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: select.value })
                });
                showToast('Status updated.');
                await loadDashboard();
            } catch (error) {
                showPageError(error);
            }
        });
        return select;
    }

    function actionButton(label, id, action) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'icon-button';
        button.title = label;
        button.setAttribute('aria-label', label);
        button.appendChild(icon(id));
        button.addEventListener('click', action);
        return button;
    }

    function renderLeads(data) {
        elements.leadsContainer.replaceChildren();
        elements.resultCount.textContent = `${data.total} ${data.total === 1 ? 'lead' : 'leads'}`;
        if (!data.contacts.length) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.appendChild(icon('inbox'));
            addText(empty, 'No leads yet', 'empty-title');
            addText(empty, 'New contact enquiries will appear here.', 'empty-copy');
            elements.leadsContainer.appendChild(empty);
            renderPagination(data);
            return;
        }

        const table = document.createElement('table');
        table.className = 'leads-table';
        const head = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['Name', 'Phone', 'Email', 'Case Type', 'Date', 'Status', 'Actions'].forEach((label) => {
            const header = document.createElement('th');
            header.className = 'table-heading';
            header.scope = 'col';
            header.textContent = label;
            headerRow.appendChild(header);
        });
        head.appendChild(headerRow);
        table.appendChild(head);
        const body = document.createElement('tbody');
        data.contacts.forEach((contact) => {
            const row = document.createElement('tr');
            row.className = 'leads-row';
            row.style.cursor = 'pointer';
            row.setAttribute('title', 'View lead details');
            row.addEventListener('click', (e) => {
                // Don't trigger if user clicked the status select or action buttons
                if (e.target.closest('select') || e.target.closest('button') || e.target.closest('a')) return;
                openDetails(contact._id);
            });
            const name = document.createElement('td'); name.dataset.label = 'Name'; addText(name, contact.name, 'lead-name');
            const phone = document.createElement('td'); phone.dataset.label = 'Phone'; const phoneLink = document.createElement('a'); phoneLink.href = `tel:${encodeURIComponent(contact.phone)}`; phoneLink.textContent = contact.phone; phone.appendChild(phoneLink);
            const email = document.createElement('td'); email.dataset.label = 'Email'; const emailLink = document.createElement('a'); emailLink.href = `mailto:${encodeURIComponent(contact.email)}`; emailLink.textContent = contact.email; email.appendChild(emailLink);
            const caseType = document.createElement('td'); caseType.dataset.label = 'Case Type'; addText(caseType, caseLabels[contact.caseType] || contact.caseType);
            const date = document.createElement('td'); date.dataset.label = 'Date'; addText(date, formatDate(contact.createdAt));
            const status = document.createElement('td'); status.dataset.label = 'Status'; status.appendChild(statusSelect(contact));
            const actions = document.createElement('td'); actions.dataset.label = 'Actions'; actions.className = 'actions-cell';
            actions.appendChild(actionButton('View lead', 'eye', () => openDetails(contact._id)));
            actions.appendChild(actionButton('Delete lead', 'trash', () => deleteContact(contact._id)));
            [name, phone, email, caseType, date, status, actions].forEach((cell) => row.appendChild(cell));
            body.appendChild(row);
        });
        table.appendChild(body);
        elements.leadsContainer.appendChild(table);
        renderPagination(data);
    }

    function renderPagination(data) {
        elements.pagination.replaceChildren();
        if (data.pages <= 1) return;
        const previous = document.createElement('button'); previous.type = 'button'; previous.textContent = 'Previous'; previous.disabled = data.page <= 1; previous.addEventListener('click', () => changePage(data.page - 1)); elements.pagination.appendChild(previous);
        for (let page = 1; page <= data.pages; page += 1) { const button = document.createElement('button'); button.type = 'button'; button.textContent = page; button.className = page === data.page ? 'active' : ''; button.addEventListener('click', () => changePage(page)); elements.pagination.appendChild(button); }
        const next = document.createElement('button'); next.type = 'button'; next.textContent = 'Next'; next.disabled = data.page >= data.pages; next.addEventListener('click', () => changePage(data.page + 1)); elements.pagination.appendChild(next);
    }

    async function changePage(page) { if (state.view === 'schedules') { state.schedulePage = page; await loadSchedules(); } else { state.page = page; await loadLeads(); } }

    async function loadStats() {
        const stats = await request('/stats');
        renderStats(stats);
        renderViewTabs();
        renderTabs(stats);
    }

    async function loadLeads() {
        const query = new URLSearchParams({ page: state.page, limit: state.limit });
        if (state.status !== 'all') query.set('status', state.status);
        const data = await request(`/contacts?${query.toString()}`);
        renderLeads(data);
    }

    function renderScheduleTimeline(updates) {
        elements.scheduleTimeline.replaceChildren();
        if (!Array.isArray(updates) || !updates.length) return;
        const heading = document.createElement('span');
        heading.className = 'detail-label';
        heading.textContent = 'Updates';
        const timeline = document.createElement('div');
        timeline.className = 'admin-timeline';
        updates.forEach((update) => {
            const item = document.createElement('div');
            item.className = 'admin-timeline-item';
            const dot = document.createElement('span');
            dot.className = `admin-timeline-dot ${update.by === 'admin' ? 'admin' : 'system'}`;
            const content = document.createElement('div');
            addText(content, update.message, 'admin-timeline-message');
            addText(content, formatDate(update.at), 'admin-timeline-date');
            item.append(dot, content);
            timeline.appendChild(item);
        });
        elements.scheduleTimeline.append(heading, timeline);
    }

    function scheduleActionButton(label, iconId, action) {
        return actionButton(label, iconId, action);
    }

    function paymentTag(status) {
        if (!['paid', 'refunded'].includes(status)) return null;
        const tag = document.createElement('span');
        tag.className = `payment-tag payment-${status}`;
        addText(tag, status === 'paid' ? 'Paid' : 'Refunded');
        return tag;
    }

    function renderSchedules(data) {
        elements.leadsContainer.replaceChildren();
        elements.resultCount.textContent = `${data.total} ${data.total === 1 ? 'consultation' : 'consultations'}`;
        renderScheduleTabs();
        if (!data.schedules.length) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.appendChild(icon('inbox'));
            addText(empty, 'No consultations yet', 'empty-title');
            addText(empty, 'Consultation requests will appear here.', 'empty-copy');
            elements.leadsContainer.appendChild(empty);
            renderPagination(data);
            return;
        }
        const table = document.createElement('table');
        table.className = 'leads-table';
        const head = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['Name', 'Case Type', 'Preferred', 'Slot Status', 'Payment', 'Status', 'Actions'].forEach((label) => { 
            const header = document.createElement('th'); 
            header.className = 'table-heading'; 
            header.scope = 'col'; 
            header.textContent = label; 
            headerRow.appendChild(header); 
        });
        head.appendChild(headerRow);
        const body = document.createElement('tbody');
        data.schedules.forEach((schedule) => {
            const row = document.createElement('tr');
            const user = schedule.userId || {};
            const name = document.createElement('td'); name.dataset.label = 'Name'; addText(name, user.name || 'Unknown client', 'lead-name'); addText(name, user.email || '', 'schedule-client-email');
            const caseType = document.createElement('td'); caseType.dataset.label = 'Case Type'; addText(caseType, caseLabels[schedule.caseType] || schedule.caseType);
            const preferred = document.createElement('td'); preferred.dataset.label = 'Preferred'; addText(preferred, `${formatDateOnly(schedule.preferredDate)} at ${schedule.preferredTime}`); addText(preferred, schedule.mode, 'schedule-mode');
            
            // Slot status column
            const slotStatus = document.createElement('td'); slotStatus.dataset.label = 'Slot Status';
            if (schedule.slotId) {
                const badge = document.createElement('span');
                badge.className = 'slot-status-badge slot-booked';
                badge.textContent = 'Assigned';
                slotStatus.appendChild(badge);
                if (schedule.slotId.date && schedule.slotId.startTime) {
                    addText(slotStatus, `${formatDateOnly(schedule.slotId.date)} ${schedule.slotId.startTime}`, 'schedule-client-email');
                }
            } else {
                const badge = document.createElement('span');
                badge.className = 'slot-status-badge slot-open';
                badge.textContent = 'Not assigned';
                slotStatus.appendChild(badge);
            }
            
            const payment = document.createElement('td'); payment.dataset.label = 'Payment'; const tag = paymentTag(schedule.payment?.status); if (tag) payment.appendChild(tag); addText(payment, schedule.payment?.paymentId || 'Not recorded', 'schedule-client-email');
            const status = document.createElement('td'); status.dataset.label = 'Status'; addText(status, schedule.status, `schedule-status status-${schedule.status}`);
            const actions = document.createElement('td'); actions.dataset.label = 'Actions'; actions.className = 'actions-cell';
            actions.appendChild(scheduleActionButton('View consultation', 'eye', () => openScheduleDetails(schedule, false)));
            
            // Assign slot button for pending schedules without a slot
            if (schedule.status === 'pending' && !schedule.slotId) {
                actions.appendChild(scheduleActionButton('Assign slot', 'calendar', () => openSlotAssignment(schedule)));
            }
            
            if (['pending', 'rescheduled'].includes(schedule.status)) actions.appendChild(scheduleActionButton('Confirm consultation', 'check', () => openScheduleDetails(schedule, true, 'confirm')));
            if (['pending', 'confirmed', 'rescheduled'].includes(schedule.status)) actions.appendChild(scheduleActionButton('Reschedule consultation', 'alert', () => openScheduleDetails(schedule, true, 'reschedule')));
            if (schedule.status === 'confirmed') actions.appendChild(scheduleActionButton('Complete consultation', 'check', async () => { try { await updateSchedule(schedule._id, 'complete'); } catch (error) { showPageError(error); } }));
            if (!['completed', 'cancelled'].includes(schedule.status)) actions.appendChild(scheduleActionButton(schedule.payment?.status === 'paid' ? 'Cancel and refund consultation' : 'Cancel consultation', 'trash', () => cancelSchedule(schedule._id, schedule.payment?.status === 'paid')));
            [name, caseType, preferred, slotStatus, payment, status, actions].forEach((cell) => row.appendChild(cell));
            body.appendChild(row);
        });
        table.appendChild(body);
        elements.leadsContainer.appendChild(table);
        renderPagination(data);
    }

    async function loadSchedules() {
        const query = new URLSearchParams({ page: state.schedulePage, limit: state.limit });
        if (state.scheduleStatus !== 'all') query.set('status', state.scheduleStatus);
        const data = await request(`/schedules?${query.toString()}`);
        renderSchedules(data);
    }

    async function loadCurrentView() {
        clearError();
        // Toggle which panel is visible
        elements.leadsContainer.closest('.leads-panel').hidden = state.view === 'slots';
        elements.pagination.hidden = state.view === 'slots';
        elements.filterTabs.hidden = state.view === 'slots';
        elements.slotManagerPanel.hidden = state.view !== 'slots';
        try {
            if (state.view === 'slots') { await loadSlotManager(); }
            else if (state.view === 'schedules') await loadSchedules();
            else { await loadLeads(); renderTabs(await request('/stats')); }
        } catch (error) { showPageError(error); }
    }

    // ── Slot manager ──────────────────────────────────────────────────────────

    function formatSlotDate(date) {
        return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date));
    }

    function formatTime12(hhmm) {
        const [h, m] = hhmm.split(':').map(Number);
        const suffix = h < 12 ? 'AM' : 'PM';
        return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`;
    }

    async function loadSlotManager() {
        const dateVal = elements.slotDate.value;
        if (!dateVal) { elements.slotDayView.innerHTML = '<p class="slot-day-hint">Pick a date above to view or add slots.</p>'; return; }
        await renderSlotDayView(dateVal);
    }

    async function renderSlotDayView(dateStr) {
        elements.slotDayView.innerHTML = '<p class="slot-day-hint">Loading...</p>';
        try {
            const data = await request(`/slots?date=${encodeURIComponent(dateStr)}`);
            const slots = data.slots || [];
            elements.slotDayView.replaceChildren();

            if (!slots.length) {
                const hint = document.createElement('p');
                hint.className = 'slot-day-hint';
                hint.textContent = `No slots for ${formatSlotDate(dateStr + 'T00:00:00Z')}.`;
                elements.slotDayView.appendChild(hint);
                return;
            }

            const table = document.createElement('table');
            table.className = 'leads-table slot-table';
            const head = document.createElement('thead');
            const hr = document.createElement('tr');
            ['Time', 'Status', 'Booked by', 'Schedule', 'Actions'].forEach((label) => {
                const th = document.createElement('th'); th.className = 'table-heading'; th.scope = 'col'; th.textContent = label; hr.appendChild(th);
            });
            head.appendChild(hr); table.appendChild(head);
            const body = document.createElement('tbody');
            slots.forEach((slot) => {
                const row = document.createElement('tr');
                
                // Apply color coding based on display status
                if (slot.displayStatus === 'completed') row.style.opacity = '0.6';
                if (slot.displayStatus === 'expired') row.style.opacity = '0.5';
                
                const timeCell = document.createElement('td'); timeCell.dataset.label = 'Time';
                addText(timeCell, `${formatTime12(slot.startTime)} – ${formatTime12(slot.endTime)}`, 'lead-name');
                
                const statusCell = document.createElement('td'); statusCell.dataset.label = 'Status';
                const badge = document.createElement('span');
                badge.className = 'slot-status-badge';
                
                if (slot.displayStatus === 'completed') {
                    badge.className += ' slot-completed';
                    badge.textContent = 'Completed';
                } else if (slot.displayStatus === 'booked') {
                    badge.className += ' slot-booked';
                    badge.textContent = 'Booked';
                } else if (slot.displayStatus === 'expired') {
                    badge.className += ' slot-expired';
                    badge.textContent = 'Expired';
                } else {
                    badge.className += ' slot-open';
                    badge.textContent = 'Open';
                }
                statusCell.appendChild(badge);
                
                const bookedByCell = document.createElement('td'); bookedByCell.dataset.label = 'Booked by';
                if (slot.isBooked && slot.bookedBy) {
                    addText(bookedByCell, slot.bookedBy.name || '', 'lead-name');
                    addText(bookedByCell, slot.bookedBy.email || '', 'schedule-client-email');
                } else {
                    addText(bookedByCell, '—');
                }
                
                const scheduleCell = document.createElement('td'); scheduleCell.dataset.label = 'Schedule';
                if (slot.scheduleId) {
                    const link = document.createElement('a');
                    link.href = '#';
                    link.textContent = `View Schedule`;
                    link.addEventListener('click', async (e) => {
                        e.preventDefault();
                        try {
                            const schedData = await request(`/schedules?page=1&limit=100`);
                            const sched = schedData.schedules.find(s => s._id === slot.scheduleId._id || s._id === slot.scheduleId);
                            if (sched) {
                                state.view = 'schedules';
                                renderViewTabs();
                                await loadSchedules();
                            }
                        } catch (err) {
                            showToast('Could not load schedule.', true);
                        }
                    });
                    scheduleCell.appendChild(link);
                } else {
                    addText(scheduleCell, '—');
                }
                
                const actionsCell = document.createElement('td'); actionsCell.dataset.label = 'Actions'; actionsCell.className = 'actions-cell';
                if (!slot.isBooked && slot.displayStatus === 'open') {
                    const del = actionButton('Delete slot', 'trash', async () => {
                        if (!window.confirm('Delete this open slot?')) return;
                        try {
                            await request(`/slots/${encodeURIComponent(slot._id)}`, { method: 'DELETE' });
                            showToast('Slot deleted.');
                            await renderSlotDayView(dateStr);
                        } catch (err) {
                            showToast(err.message || 'Could not delete slot.', true);
                        }
                    });
                    actionsCell.appendChild(del);
                } else {
                    addText(actionsCell, '—');
                }
                
                [timeCell, statusCell, bookedByCell, scheduleCell, actionsCell].forEach((c) => row.appendChild(c));
                body.appendChild(row);
            });
            table.appendChild(body);
            elements.slotDayView.appendChild(table);
        } catch (err) {
            elements.slotDayView.innerHTML = `<p class="slot-day-hint" style="color:var(--danger)">Could not load slots.</p>`;
        }
    }

    async function addSlot() {
        elements.slotAddError.textContent = '';
        const dateVal = elements.slotDate.value;
        const startVal = elements.slotStart.value;
        const endVal = elements.slotEnd.value;
        if (!dateVal) { elements.slotAddError.textContent = 'Choose a date.'; return; }
        if (!startVal || !endVal) { elements.slotAddError.textContent = 'Choose start and end times.'; return; }
        if (startVal >= endVal) { elements.slotAddError.textContent = 'Start time must be before end time.'; return; }
        try {
            const result = await request('/slots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: dateVal, slots: [{ startTime: startVal, endTime: endVal }] })
            });
            if (result.conflicts && result.conflicts.length) {
                elements.slotAddError.textContent = `A slot at ${startVal} already exists for that date.`;
            } else {
                showToast('Slot added.');
            }
            await renderSlotDayView(dateVal);
        } catch (err) {
            elements.slotAddError.textContent = err.message || 'Could not add slot.';
        }
    }

    function renderScheduleDetail(schedule) {
        const user = schedule.userId || {};
        elements.scheduleDetailTitle.textContent = user.name || 'Consultation request';
        elements.scheduleDetailGrid.replaceChildren();
        const payment = schedule.payment || {};
        [['Name', user.name || 'Unknown client'], ['Email', user.email || ''], ['Case type', caseLabels[schedule.caseType] || schedule.caseType], ['Preferred', `${formatDateOnly(schedule.preferredDate)} at ${schedule.preferredTime}`], ['Mode', schedule.mode], ['Status', schedule.status], ['Received', formatDate(schedule.createdAt)], ['Payment status', payment.status || 'Not recorded'], ['Amount', payment.amount ? `₹${(payment.amount / 100).toLocaleString('en-IN')}` : 'Not recorded'], ['Payment method', payment.method || 'Not recorded'], ['Payment ID', payment.paymentId || 'Not recorded'], ['Paid date', payment.paidAt ? formatDate(payment.paidAt) : 'Not recorded']].forEach(([label, value]) => {
            const item = document.createElement('div'); item.className = 'detail-item'; addText(item, label, 'detail-label'); addText(item, value, 'detail-value'); elements.scheduleDetailGrid.appendChild(item);
        });
        elements.scheduleDetailNotes.textContent = schedule.notes || 'No notes provided.';
        elements.scheduleDetailAdminNote.textContent = schedule.adminNote || 'No admin note.';
        renderScheduleTimeline(schedule.updates);
    }

    function openScheduleDetails(schedule, actionMode, action = null) {
        detailScheduleId = schedule._id;
        scheduleAction = action;
        renderScheduleDetail(schedule);
        elements.scheduleActionForm.hidden = !actionMode;
        elements.scheduleActionError.textContent = '';
        
        // For reschedule action, show slot picker
        if (action === 'reschedule') {
            // Show reschedule UI with slot picker
            const rescheduleSection = document.createElement('div');
            rescheduleSection.className = 'reschedule-section';
            rescheduleSection.id = 'rescheduleSection';
            
            const dateLabel = document.createElement('label');
            dateLabel.textContent = 'New Date:';
            const dateInput = document.createElement('input');
            dateInput.type = 'date';
            dateInput.id = 'rescheduleDate';
            dateInput.className = 'form-input';
            
            const slotLabel = document.createElement('label');
            slotLabel.textContent = 'New Time Slot:';
            const slotSelect = document.createElement('select');
            slotSelect.id = 'rescheduleSlotSelect';
            slotSelect.className = 'form-input';
            slotSelect.innerHTML = '<option value="">-- Select a date first --</option>';
            
            const noteLabel = document.createElement('label');
            noteLabel.textContent = 'Reason for rescheduling:';
            
            rescheduleSection.append(dateLabel, dateInput, slotLabel, slotSelect, noteLabel);
            
            // Insert before admin note input
            elements.scheduleAdminNote.parentElement.insertBefore(rescheduleSection, elements.scheduleAdminNote.parentElement.firstChild);
            
            // Load slots when date changes
            dateInput.addEventListener('change', async () => {
                if (!dateInput.value) return;
                try {
                    const data = await request(`/slots?date=${encodeURIComponent(dateInput.value)}`);
                    slotSelect.innerHTML = '';
                    if (!data.slots || !data.slots.length) {
                        slotSelect.innerHTML = '<option value="">No slots available</option>';
                        return;
                    }
                    data.slots.forEach(slot => {
                        const option = document.createElement('option');
                        option.value = slot._id;
                        option.textContent = `${formatTime12(slot.startTime)} – ${formatTime12(slot.endTime)}`;
                        slotSelect.appendChild(option);
                    });
                } catch (err) {
                    slotSelect.innerHTML = '<option value="">Error loading slots</option>';
                }
            });
            
            elements.scheduleAdminNote.value = schedule.adminNote || '';
            elements.saveScheduleAction.textContent = 'Save Reschedule';
        } else {
            // Remove reschedule section if it exists
            const existing = document.getElementById('rescheduleSection');
            if (existing) existing.remove();
            
            elements.scheduleAdminNote.value = action === 'confirm' ? (schedule.adminNote || '') : '';
            elements.scheduleConfirmedAt.value = schedule.confirmedAt ? toLocalInputValue(schedule.confirmedAt) : toLocalInputValue(`${schedule.preferredDate.slice(0, 10)}T${schedule.preferredTime}:00`);
            elements.saveScheduleAction.textContent = 'Confirm Consultation';
        }
        
        elements.scheduleModal.hidden = false;
    }

    async function saveScheduleAction() {
        elements.scheduleActionError.textContent = '';
        
        if (scheduleAction === 'reschedule') {
            const dateInput = document.getElementById('rescheduleDate');
            const slotSelect = document.getElementById('rescheduleSlotSelect');
            const noteValue = elements.scheduleAdminNote.value.trim();
            
            if (!dateInput || !dateInput.value) {
                elements.scheduleActionError.textContent = 'Choose a new date.';
                return;
            }
            if (!slotSelect || !slotSelect.value) {
                elements.scheduleActionError.textContent = 'Choose a new time slot.';
                return;
            }
            if (!noteValue) {
                elements.scheduleActionError.textContent = 'Add a reason for rescheduling.';
                return;
            }
            
            try {
                await request(`/schedules/${encodeURIComponent(detailScheduleId)}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'reschedule',
                        newSlotId: slotSelect.value,
                        adminNote: noteValue
                    })
                });
                showToast('Consultation rescheduled successfully.');
                elements.scheduleModal.hidden = true;
                await loadStats();
                if (state.view === 'schedules') await loadSchedules();
            } catch (error) {
                if (error.message.includes('just booked') || error.message.includes('no longer available')) {
                    elements.scheduleActionError.textContent = 'That slot is no longer available. Please choose another time.';
                    // Refresh the slot list
                    if (dateInput.value) {
                        dateInput.dispatchEvent(new Event('change'));
                    }
                } else {
                    elements.scheduleActionError.textContent = 'Could not reschedule. Please try again.';
                }
            }
        } else if (scheduleAction === 'confirm') {
            if (!elements.scheduleConfirmedAt.value) {
                elements.scheduleActionError.textContent = 'Choose an agreed date and time.';
                return;
            }
            try {
                await updateSchedule(detailScheduleId, scheduleAction, new Date(elements.scheduleConfirmedAt.value).toISOString(), elements.scheduleAdminNote.value.trim());
                elements.scheduleModal.hidden = true;
            } catch (error) {
                elements.scheduleActionError.textContent = 'The consultation could not be updated. Please try again.';
            }
        }
    }

    async function updateSchedule(id, action, confirmedAt, adminNote) {
        const body = { action };
        if (confirmedAt) body.confirmedAt = confirmedAt;
        if (adminNote) body.adminNote = adminNote;
        await request(`/schedules/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        showToast('Consultation updated.');
        await loadStats();
        if (state.view === 'schedules') await loadSchedules();
    }

    async function cancelSchedule(id, shouldRefund = false) {
        if (!window.confirm(shouldRefund ? 'Cancel and refund this consultation?' : 'Cancel this consultation?')) return;
        const note = window.prompt('Optional cancellation note:') || '';
        try { await updateSchedule(id, shouldRefund ? 'refund' : 'cancel', null, note.trim()); } catch (error) { showPageError(error); }
    }

    // ── Slot assignment for pending schedules ────────────────────────────────

    function openSlotAssignment(schedule) {
        detailScheduleId = schedule._id;
        const user = schedule.userId || {};
        
        // Create a simple modal for slot assignment
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.id = 'assignSlotModal';
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        
        const header = document.createElement('h3');
        header.textContent = `Assign Slot to ${user.name || 'Client'}`;
        
        const info = document.createElement('p');
        info.textContent = `Case: ${caseLabels[schedule.caseType] || schedule.caseType} | Preferred: ${formatDateOnly(schedule.preferredDate)} at ${schedule.preferredTime}`;
        info.className = 'schedule-client-email';
        
        const dateLabel = document.createElement('label');
        dateLabel.textContent = 'Select Date:';
        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.className = 'form-input';
        dateInput.id = 'assignSlotDate';
        
        const slotLabel = document.createElement('label');
        slotLabel.textContent = 'Select Time Slot:';
        const slotSelect = document.createElement('select');
        slotSelect.className = 'form-input';
        slotSelect.id = 'assignSlotSelect';
        slotSelect.innerHTML = '<option value="">-- Select a date first --</option>';
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'form-error';
        errorDiv.id = 'assignSlotError';
        
        const buttonGroup = document.createElement('div');
        buttonGroup.style.display = 'flex';
        buttonGroup.style.gap = '10px';
        buttonGroup.style.marginTop = '20px';
        
        const assignBtn = document.createElement('button');
        assignBtn.type = 'button';
        assignBtn.textContent = 'Assign Slot';
        assignBtn.className = 'button-primary';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'button-secondary';
        
        buttonGroup.append(assignBtn, cancelBtn);
        content.append(header, info, dateLabel, dateInput, slotLabel, slotSelect, errorDiv, buttonGroup);
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Load slots when date changes
        dateInput.addEventListener('change', async () => {
            if (!dateInput.value) return;
            try {
                const data = await request(`/slots?date=${encodeURIComponent(dateInput.value)}`);
                slotSelect.innerHTML = '';
                if (!data.slots || !data.slots.length) {
                    slotSelect.innerHTML = '<option value="">No slots available</option>';
                    return;
                }
                data.slots.forEach(slot => {
                    const option = document.createElement('option');
                    option.value = slot._id;
                    option.textContent = `${formatTime12(slot.startTime)} – ${formatTime12(slot.endTime)}`;
                    slotSelect.appendChild(option);
                });
            } catch (err) {
                slotSelect.innerHTML = '<option value="">Error loading slots</option>';
            }
        });
        
        // Assign slot
        assignBtn.addEventListener('click', async () => {
            errorDiv.textContent = '';
            if (!slotSelect.value) {
                errorDiv.textContent = 'Please select a slot.';
                return;
            }
            
            try {
                await request('/assign-slot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        scheduleId: detailScheduleId,
                        slotId: slotSelect.value
                    })
                });
                showToast('Slot assigned successfully.');
                modal.remove();
                await loadStats();
                if (state.view === 'schedules') await loadSchedules();
            } catch (error) {
                if (error.message.includes('just taken') || error.message.includes('just booked')) {
                    errorDiv.textContent = 'That slot was just booked. Please choose another.';
                    // Refresh slots
                    if (dateInput.value) {
                        dateInput.dispatchEvent(new Event('change'));
                    }
                } else {
                    errorDiv.textContent = error.message || 'Could not assign slot. Please try again.';
                }
            }
        });
        
        // Cancel
        cancelBtn.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    }

    async function loadDashboard() {
        clearError();
        try { await Promise.all([loadStats(), loadLeads()]); } catch (error) { showPageError(error); }
    }

    async function openDetails(id) {
        try {
            const contact = await request(`/contacts/${encodeURIComponent(id)}`);
            detailContactId = contact._id;
            elements.detailTitle.textContent = contact.name;
            elements.detailGrid.replaceChildren();
            [['Name', contact.name], ['Email', contact.email], ['Phone', contact.phone], ['Case type', caseLabels[contact.caseType] || contact.caseType], ['Status', contact.status], ['Received', formatDate(contact.createdAt)]].forEach(([label, value]) => {
                const item = document.createElement('div'); item.className = 'detail-item'; addText(item, label, 'detail-label'); const valueRow = document.createElement('div'); valueRow.className = 'detail-value'; addText(valueRow, value); if (label === 'Email' || label === 'Phone') valueRow.appendChild(actionButton(`Copy ${label.toLowerCase()}`, 'copy', () => copyValue(value))); item.appendChild(valueRow); elements.detailGrid.appendChild(item);
            });
            elements.detailMessage.textContent = contact.message;

            // Render attachments
            const attachments = contact.attachments || [];
            elements.detailAttachments.hidden = attachments.length === 0;
            elements.detailAttachmentList.replaceChildren();
            attachments.forEach((att) => {
                const li = document.createElement('li');
                li.className = 'attachment-item';
                const link = document.createElement('a');
                link.href = `${apiBase}/contacts/${encodeURIComponent(contact._id)}/attachments/${encodeURIComponent(att.filename)}`;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.className = 'attachment-link';
                link.textContent = att.originalName;
                const meta = document.createElement('span');
                meta.className = 'attachment-meta';
                meta.textContent = formatFileSize(att.size);
                li.append(link, meta);
                elements.detailAttachmentList.appendChild(li);
            });

            elements.scheduledAtInput.value = contact.scheduledAt ? toLocalInputValue(contact.scheduledAt) : '';
            elements.scheduledNoteInput.value = contact.scheduledNote || '';
            elements.scheduleError.textContent = '';
            elements.detailModal.hidden = false;
        } catch (error) { showPageError(error); }
    }

    function toLocalInputValue(value) {
        const date = new Date(value);
        const pad = (number) => String(number).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    async function saveSchedule() {
        elements.scheduleError.textContent = '';
        try {
            await request(`/contacts/${encodeURIComponent(detailContactId)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scheduledAt: elements.scheduledAtInput.value ? new Date(elements.scheduledAtInput.value).toISOString() : null,
                    scheduledNote: elements.scheduledNoteInput.value.trim()
                })
            });
            showToast('Schedule updated.');
            await loadDashboard();
            await openDetails(detailContactId);
        } catch (error) {
            elements.scheduleError.textContent = 'The schedule could not be saved. Please try again.';
        }
    }

    async function copyValue(value) { try { await navigator.clipboard.writeText(value); showToast('Copied to clipboard.'); } catch (error) { showToast('Could not copy that value.', true); } }

    async function deleteContact(id) {
        if (!window.confirm('Delete this lead permanently?')) return;
        try { await request(`/contacts/${encodeURIComponent(id)}`, { method: 'DELETE' }); showToast('Lead deleted.'); await loadDashboard(); } catch (error) { showPageError(error); }
    }

    function showPageError(error) { if (error.message === 'Unauthorized') return; elements.pageError.textContent = 'The dashboard could not complete that request. Please try again.'; }

    function showToast(message, isError = false) { elements.toast.classList.toggle('error', isError); elements.toastIcon.querySelector('use').setAttribute('href', `#icon-${isError ? 'alert' : 'check'}`); elements.toastMessage.textContent = message; elements.toast.classList.add('visible'); window.setTimeout(() => elements.toast.classList.remove('visible'), 2800); }

    elements.loginForm.addEventListener('submit', (event) => { event.preventDefault(); sessionStorage.setItem('adminKey', elements.adminKey.value); elements.adminKey.value = ''; showDashboard(); });
    elements.logoutButton.addEventListener('click', () => { sessionStorage.removeItem('adminKey'); showLogin(); });
    elements.closeModal.addEventListener('click', () => { elements.detailModal.hidden = true; });
    elements.saveScheduleButton.addEventListener('click', saveSchedule);
    elements.detailModal.addEventListener('click', (event) => { if (event.target === elements.detailModal) elements.detailModal.hidden = true; });
    elements.closeScheduleModal.addEventListener('click', () => { elements.scheduleModal.hidden = true; });
    elements.saveScheduleAction.addEventListener('click', saveScheduleAction);
    elements.scheduleModal.addEventListener('click', (event) => { if (event.target === elements.scheduleModal) elements.scheduleModal.hidden = true; });
    elements.addSlotBtn.addEventListener('click', addSlot);
    elements.slotDate.addEventListener('change', () => { if (state.view === 'slots' && elements.slotDate.value) renderSlotDayView(elements.slotDate.value); });
    if (getKey()) showDashboard();
})();
