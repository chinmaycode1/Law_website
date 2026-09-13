(() => {
    const apiBase = window.location.origin.includes('localhost') ? 'http://localhost:3000/api/admin' : '/api/admin';
    const caseLabels = {
        'criminal-defense': 'Criminal Defense',
        'white-collar': 'White-Collar Crimes',
        bail: 'Bail Matters',
        appeal: 'Appellate Advocacy',
        ndps: 'NDPS & Drug Offenses',
        other: 'Other'
    };
    const statuses = ['all', 'new', 'contacted', 'scheduled', 'resolved'];
    const state = { status: 'all', page: 1, limit: 20 };
    const elements = {
        loginPanel: document.getElementById('loginPanel'),
        loginForm: document.getElementById('loginForm'),
        adminKey: document.getElementById('adminKey'),
        loginError: document.getElementById('loginError'),
        dashboard: document.getElementById('dashboard'),
        logoutButton: document.getElementById('logoutButton'),
        statsGrid: document.getElementById('statsGrid'),
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
        scheduledAtInput: document.getElementById('scheduledAtInput'),
        scheduledNoteInput: document.getElementById('scheduledNoteInput'),
        scheduleError: document.getElementById('scheduleError'),
        saveScheduleButton: document.getElementById('saveScheduleButton'),
        toast: document.getElementById('toast'),
        toastIcon: document.getElementById('toastIcon'),
        toastMessage: document.getElementById('toastMessage')
    };
    let detailContactId = null;

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
        [['new', 'New'], ['contacted', 'Contacted'], ['scheduled', 'Scheduled'], ['resolved', 'Resolved'], ['total', 'Total']].forEach(([key, label]) => {
            const card = document.createElement('article');
            card.className = 'stat-card';
            addText(card, label, 'stat-label');
            addText(card, stats[key] || 0, 'stat-value');
            elements.statsGrid.appendChild(card);
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

    function formatDate(value) {
        return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
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

    async function changePage(page) { state.page = page; await loadLeads(); }

    async function loadStats() {
        const stats = await request('/stats');
        renderStats(stats);
        renderTabs(stats);
    }

    async function loadLeads() {
        const query = new URLSearchParams({ page: state.page, limit: state.limit });
        if (state.status !== 'all') query.set('status', state.status);
        const data = await request(`/contacts?${query.toString()}`);
        renderLeads(data);
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
    if (getKey()) showDashboard();
})();
