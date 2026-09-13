(() => {
    const listeners = new Set();
    const state = { user: null };
    const apiBase = window.location.origin.includes('localhost') ? 'http://localhost:3000/api' : '/api';

    function notify() { listeners.forEach((listener) => listener(state.user)); }
    function isSignedIn() { return Boolean(state.user); }
    function focusSignIn() { document.getElementById('googleSignIn')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }

    async function handleCredentialResponse(response) {
        const result = await fetch(`${apiBase}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ credential: response.credential })
        });
        const body = await result.json();
        if (!result.ok) throw new Error(body.message || 'Google sign-in failed.');
        state.user = body.user;
        notify();
    }

    async function signOut() {
        await fetch(`${apiBase}/auth/logout`, { method: 'POST', credentials: 'include' });
        state.user = null;
        notify();
    }

    function renderAuth(user) {
        ['googleSignIn', 'contactGoogleSignIn'].forEach((id) => {
            const container = document.getElementById(id);
            if (!container) return;
            container.replaceChildren();
            if (user) {
                const signedIn = document.createElement('span');
                signedIn.className = 'signed-in-label';
                signedIn.textContent = `Signed in as ${user.name}`;
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'nav-auth-button';
                button.textContent = 'Sign out';
                button.addEventListener('click', signOut);
                container.append(signedIn, button);
            } else if (window.google?.accounts?.id) {
                window.google.accounts.id.renderButton(container, { theme: 'outline', size: 'medium', shape: 'rectangular' });
            }
        });
        const nav = document.getElementById('caseStatusNav');
        if (nav) nav.hidden = !user;
    }

    function initializeGoogle() {
        const clientId = document.body.dataset.googleClientId;
        if (!clientId || clientId.startsWith('YOUR_') || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({ client_id: clientId, callback: (response) => handleCredentialResponse(response).catch(() => notify()) });
        renderAuth(state.user);
    }

    async function restoreSession() {
        try {
            const response = await fetch(`${apiBase}/auth/me`, { credentials: 'include' });
            if (response.ok) state.user = (await response.json()).user;
        } catch (error) {
            console.warn('Could not restore sign-in session.');
        }
        renderAuth(state.user);
        notify();
    }

    window.lawAuth = { get user() { return state.user; }, isSignedIn, focusSignIn, subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); } };
    document.addEventListener('DOMContentLoaded', () => { restoreSession(); window.setTimeout(initializeGoogle, 250); });
})();