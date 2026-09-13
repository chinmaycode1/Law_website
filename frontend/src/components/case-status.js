(() => {
    const section = document.getElementById('case-status');
    const list = document.getElementById('caseStatusList');
    const apiBase = window.location.origin.includes('localhost') ? 'http://localhost:3000/api' : '/api';
    const labels = { 'criminal-defense': 'Criminal Defense', 'white-collar': 'White-Collar Crimes', bail: 'Bail Matters', appeal: 'Appeal/Revision', ndps: 'NDPS/Drug Offense', other: 'Other' };

    function date(value) { return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value)); }
    function renderTimeline(updates) {
        if (!Array.isArray(updates) || !updates.length) return null;
        const timeline = document.createElement('div');
        timeline.className = 'update-timeline';
        updates.forEach((update) => {
            const item = document.createElement('div');
            item.className = `timeline-item timeline-${update.by === 'admin' ? 'admin' : 'system'}`;
            const dot = document.createElement('span');
            dot.className = 'timeline-dot';
            dot.setAttribute('aria-hidden', 'true');
            const content = document.createElement('div');
            content.className = 'timeline-content';
            const text = document.createElement('p');
            text.textContent = update.message;
            const timestamp = document.createElement('time');
            timestamp.dateTime = update.at;
            timestamp.textContent = date(update.at);
            content.append(text, timestamp);
            item.append(dot, content);
            timeline.appendChild(item);
        });
        return timeline;
    }
    function render(requests) {
        list.replaceChildren();
        if (!requests.length) { const empty = document.createElement('p'); empty.className = 'case-status-empty'; empty.textContent = "You haven't submitted a request yet."; list.appendChild(empty); return; }
        requests.forEach((request) => {
            const card = document.createElement('article'); card.className = 'case-status-card';
            const heading = document.createElement('div'); heading.className = 'case-status-heading';
            const title = document.createElement('h3'); title.textContent = labels[request.caseType] || request.caseType;
            const badge = document.createElement('span'); badge.className = `status-badge status-${request.status}`; badge.textContent = request.status[0].toUpperCase() + request.status.slice(1);
            heading.append(title, badge);
            const submitted = document.createElement('p'); submitted.className = 'case-status-date'; submitted.textContent = `Submitted ${date(request.createdAt)}`;
            card.append(heading, submitted);
            if (request.scheduledAt) { const schedule = document.createElement('p'); schedule.className = 'case-status-schedule'; schedule.textContent = `Consultation scheduled for ${date(request.scheduledAt)}`; card.appendChild(schedule); if (request.scheduledNote) { const note = document.createElement('p'); note.className = 'case-status-note'; note.textContent = request.scheduledNote; card.appendChild(note); } }
            const timeline = renderTimeline(request.updates);
            if (timeline) card.appendChild(timeline);
            list.appendChild(card);
        });
    }
    async function load() {
        if (!window.lawAuth?.isSignedIn()) { section.hidden = true; return; }
        section.hidden = false;
        try { const response = await fetch(`${apiBase}/my-requests`, { credentials: 'include' }); const body = await response.json(); if (!response.ok) throw new Error(body.message); render(body.contacts || body.requests || []); } catch (error) { render([]); }
    }
    window.lawTimeline = { render: renderTimeline, formatDate: date };
    window.lawAuth?.subscribe(load);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load); else load();
})();