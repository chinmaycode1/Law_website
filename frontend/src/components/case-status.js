(() => {
    const section = document.getElementById('case-status');
    const list = document.getElementById('caseStatusList');
    const apiBase = window.location.origin.includes('localhost') ? 'http://localhost:3000/api' : '/api';
    const labels = { 'criminal-defense': 'practice_criminal', 'white-collar': 'practice_white_collar', bail: 'practice_bail', appeal: 'practice_appeal', ndps: 'practice_ndps', other: 'other' };
    let currentRequests = [];
    const t = (key, params) => window.siteI18n.interpolate(window.siteI18n.translate(key), params || {});

    function date(value) { const locales = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' }; return new Intl.DateTimeFormat(locales[window.siteI18n.getLanguage()], { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value)); }
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
    function renderAttachments(attachments, requestId) {
        if (!Array.isArray(attachments) || !attachments.length) return null;
        const wrap = document.createElement('div');
        wrap.className = 'case-status-attachments';
        const label = document.createElement('p');
        label.className = 'case-status-attachments-label';
        label.textContent = t('attachments_label_short');
        wrap.appendChild(label);
        const ul = document.createElement('ul');
        ul.className = 'case-status-attachment-list';
        attachments.forEach((att) => {
            const li = document.createElement('li');
            const link = document.createElement('a');
            link.href = `${apiBase}/my-requests/${encodeURIComponent(requestId)}/attachments/${encodeURIComponent(att.filename)}`;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.className = 'case-status-attachment-link';
            link.textContent = att.originalName;
            li.appendChild(link);
            ul.appendChild(li);
        });
        wrap.appendChild(ul);
        return wrap;
    }
    function render(requests) {
        list.replaceChildren();
        currentRequests = requests;
        if (!requests.length) { const empty = document.createElement('p'); empty.className = 'case-status-empty'; empty.textContent = t('case_status_empty'); list.appendChild(empty); return; }
        requests.forEach((request) => {
            const card = document.createElement('article'); card.className = 'case-status-card';
            const heading = document.createElement('div'); heading.className = 'case-status-heading';
            const title = document.createElement('h3'); title.textContent = window.siteI18n.translate(labels[request.caseType]) || request.caseType;
            const badge = document.createElement('span'); badge.className = `status-badge status-${request.status}`; badge.textContent = window.siteI18n.translate(`status_${request.status}`) || request.status;
            heading.append(title, badge);
            const submitted = document.createElement('p'); submitted.className = 'case-status-date'; submitted.textContent = t('submitted', { date: date(request.createdAt) });
            card.append(heading, submitted);
            if (request.scheduledAt) { const schedule = document.createElement('p'); schedule.className = 'case-status-schedule'; schedule.textContent = t('scheduled', { date: date(request.scheduledAt) }); card.appendChild(schedule); if (request.scheduledNote) { const note = document.createElement('p'); note.className = 'case-status-note'; note.textContent = request.scheduledNote; card.appendChild(note); } }
            const attachmentBlock = renderAttachments(request.attachments, request._id);
            if (attachmentBlock) card.appendChild(attachmentBlock);
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
    window.addEventListener('languagechange', () => render(currentRequests));
    window.lawTimeline = { render: renderTimeline, formatDate: date };
    window.lawCaseStatus = { refresh: load };
    window.lawAuth?.subscribe(load);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load); else load();
})();