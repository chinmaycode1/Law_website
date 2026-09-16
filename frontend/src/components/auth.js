(() => {
    const listeners = new Set();
    const state = { user: null };
    const apiBase = window.location.origin.includes('localhost') ? 'http://localhost:3000/api' : '/api';
    let googleClientId = '';
    let googleInitialized = false;

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
        renderAuth(state.user);
        notify();
    }

    async function signOut() {
        await fetch(`${apiBase}/auth/logout`, { method: 'POST', credentials: 'include' });
        state.user = null;
        renderAuth(state.user);
        notify();
    }

    function renderAuth(user) {
        ['googleSignIn', 'contactGoogleSignIn'].forEach((id) => {
            const container = document.getElementById(id);
            if (!container) return;
            container.replaceChildren();
            if (user) {
                const profile = document.createElement('div');
                profile.className = 'signed-in-profile';
                profile.title = user.email || user.name;
                const avatar = document.createElement('span');
                avatar.className = 'signed-in-avatar';
                avatar.textContent = (user.name || user.email || '?').trim().charAt(0).toUpperCase();
                avatar.setAttribute('aria-hidden', 'true');
                const signedIn = document.createElement('span');
                signedIn.className = 'signed-in-label';
                signedIn.textContent = user.name || user.email;
                profile.append(avatar, signedIn);
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'nav-auth-button';
                button.textContent = 'Sign out';
                button.setAttribute('aria-label', 'Sign out');
                button.addEventListener('click', signOut);
                container.append(profile, button);
            } else if (googleInitialized && window.google?.accounts?.id) {
                window.google.accounts.id.renderButton(container, { theme: 'outline', size: 'medium', shape: 'rectangular' });
            }
        });
        const nav = document.getElementById('caseStatusNav');
        if (nav) nav.hidden = !user;
    }

    function initializeGoogle() {
        if (googleInitialized || !googleClientId) return;
        if (!window.google?.accounts?.id) {
            window.setTimeout(initializeGoogle, 100);
            return;
        }
        window.google.accounts.id.initialize({ client_id: googleClientId, callback: (response) => handleCredentialResponse(response).catch((error) => showAuthError(error.message)) });
        googleInitialized = true;
        renderAuth(state.user);
    }

    function showAuthError(message) {
        const containers = ['googleSignIn', 'contactGoogleSignIn'];
        containers.forEach((id) => {
            const container = document.getElementById(id);
            if (!container || state.user) return;
            const error = document.createElement('p');
            error.className = 'auth-error';
            error.textContent = message || 'Google sign-in failed. Please try again.';
            container.appendChild(error);
        });
    }

    async function loadGoogleConfig() {
        try {
            const response = await fetch(`${apiBase}/auth/config`, { credentials: 'include' });
            const body = await response.json();
            if (!response.ok) throw new Error(body.message || 'Google sign-in is not configured.');
            googleClientId = body.googleClientId;
        } catch (error) {
            showAuthError(error.message);
        }
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
    document.addEventListener('DOMContentLoaded', async () => {
        await loadGoogleConfig();
        await restoreSession();
        initializeGoogle();
    });
})();