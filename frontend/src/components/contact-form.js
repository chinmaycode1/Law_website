/**
 * Contact Form Component
 * Handles form submission with optional file attachments
 */

class ContactForm {
    constructor() {
        this.form = document.getElementById('contactForm');
        this.formMessage = document.getElementById('formMessage');
        this.submitButton = this.form.querySelector('.submit-button');
        this.fileInput = document.getElementById('attachments');
        this.fileDropArea = document.getElementById('fileDropArea');
        this.fileChipList = document.getElementById('fileChipList');
        this.attachmentError = document.getElementById('attachmentError');

        this.selectedFiles = []; // DataTransfer-backed live list
        this.MAX_FILES = 5;
        this.MAX_SIZE = 10 * 1024 * 1024; // 10 MB
        this.ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        this.ALLOWED_EXT_LABEL = 'JPEG, PNG, WebP or PDF';

        this.apiEndpoint = (window.API_BASE || '') + '/api/contact';

        this.init();
    }

    init() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.initFileHandlers();
    }

    // ── File attachment helpers ──────────────────────────────────────────

    initFileHandlers() {
        // Click on drop area opens native file picker
        this.fileDropArea.addEventListener('click', () => this.fileInput.click());
        this.fileDropArea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.fileInput.click(); }
        });

        // Native file input change
        this.fileInput.addEventListener('change', () => {
            this.addFiles(Array.from(this.fileInput.files));
            this.fileInput.value = ''; // reset so same file can be re-added after removal
        });

        // Drag-and-drop
        this.fileDropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.fileDropArea.classList.add('drag-over');
        });
        this.fileDropArea.addEventListener('dragleave', () => {
            this.fileDropArea.classList.remove('drag-over');
        });
        this.fileDropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.fileDropArea.classList.remove('drag-over');
            this.addFiles(Array.from(e.dataTransfer.files));
        });
    }

    addFiles(incoming) {
        this.clearAttachmentError();
        const errors = [];

        for (const file of incoming) {
            if (this.selectedFiles.length >= this.MAX_FILES) {
                errors.push(`You may attach a maximum of ${this.MAX_FILES} files.`);
                break;
            }
            if (!this.ALLOWED_TYPES.includes(file.type)) {
                errors.push(`"${file.name}" is not allowed — only ${this.ALLOWED_EXT_LABEL} files are accepted.`);
                continue;
            }
            if (file.size > this.MAX_SIZE) {
                errors.push(`"${file.name}" exceeds the 10 MB size limit.`);
                continue;
            }
            // Avoid duplicate names
            if (this.selectedFiles.some((f) => f.name === file.name && f.size === file.size)) continue;
            this.selectedFiles.push(file);
        }

        if (errors.length) this.showAttachmentError(errors[0]);
        this.renderChips();
    }

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.clearAttachmentError();
        this.renderChips();
    }

    renderChips() {
        this.fileChipList.replaceChildren();
        this.selectedFiles.forEach((file, index) => {
            const chip = document.createElement('span');
            chip.className = 'file-chip';

            const name = document.createElement('span');
            name.className = 'file-chip-name';
            name.textContent = file.name;
            name.title = file.name;

            const size = document.createElement('span');
            size.className = 'file-chip-size';
            size.textContent = this.formatSize(file.size);

            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'file-chip-remove';
            remove.setAttribute('aria-label', `Remove ${file.name}`);
            remove.textContent = '\u00D7'; // ×
            remove.addEventListener('click', () => this.removeFile(index));

            chip.append(name, size, remove);
            this.fileChipList.appendChild(chip);
        });
    }

    formatSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    showAttachmentError(text) {
        if (!this.attachmentError) return;
        this.attachmentError.textContent = text;
        this.attachmentError.classList.add('visible');
    }

    clearAttachmentError() {
        if (!this.attachmentError) return;
        this.attachmentError.textContent = '';
        this.attachmentError.classList.remove('visible');
    }

    // ── Form submission ──────────────────────────────────────────────────

    async handleSubmit(e) {
        e.preventDefault();
        this.clearFieldErrors();
        this.clearAttachmentError();

        // Honeypot
        if (this.form.elements.website.value) {
            this.showMessage('success', window.siteI18n.translate('form_thank_you'));
            return;
        }

        // ENFORCE: User must be signed in
        if (!window.lawAuth || !window.lawAuth.isSignedIn()) {
            this.showMessage('error', window.siteI18n.translate('form_sign_in') || 'Please sign in with Google to submit your consultation request.');
            // Scroll to sign-in notice
            const signInNotice = document.getElementById('contactSignInNotice');
            if (signInNotice) {
                signInNotice.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        // Client-side attachment validation before hitting network
        for (const file of this.selectedFiles) {
            if (!this.ALLOWED_TYPES.includes(file.type)) {
                this.showAttachmentError(`"${file.name}" has an unsupported file type.`);
                return;
            }
            if (file.size > this.MAX_SIZE) {
                this.showAttachmentError(`"${file.name}" exceeds the 10 MB size limit.`);
                return;
            }
        }
        if (this.selectedFiles.length > this.MAX_FILES) {
            this.showAttachmentError(`You may attach a maximum of ${this.MAX_FILES} files.`);
            return;
        }

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const caseType = document.getElementById('caseType').value;
        const message = document.getElementById('message').value;

        if (!this.validateForm({ name, email, phone, caseType, message })) return;

        this.submitButton.disabled = true;
        this.submitButton.textContent = window.siteI18n.translate('form_sending');

        try {
            // Always send as multipart/form-data so multer handles it consistently
            const formData = new FormData();
            formData.append('name', name);
            formData.append('email', email);
            formData.append('phone', phone);
            formData.append('caseType', caseType);
            formData.append('message', message);
            this.selectedFiles.forEach((file) => formData.append('attachments', file));

            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                credentials: 'include',
                body: formData
                // No Content-Type header — browser sets multipart boundary automatically
            });

            const result = await response.json();

            if (response.ok) {
                this.showMessage('success', window.siteI18n.translate('form_sent'));
                this.form.reset();
                this.selectedFiles = [];
                this.renderChips();
                window.lawCaseStatus?.refresh();
            } else {
                if (Array.isArray(result.errors)) this.showFieldErrors(result.errors);
                this.showMessage('error', result.message || window.siteI18n.translate('form_correct_fields'));
            }
        } catch (error) {
            console.error('Form submission error:', error);
            this.showMessage('error', window.siteI18n.translate('form_error'));
        } finally {
            this.submitButton.disabled = false;
            this.submitButton.textContent = window.siteI18n.translate('send_message');
        }
    }

    validateForm(data) {
        if (!data.name || !data.email || !data.phone || !data.caseType || !data.message) {
            this.showMessage('error', window.siteI18n.translate('form_required'));
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            this.showMessage('error', window.siteI18n.translate('form_valid_email'));
            return false;
        }
        return true;
    }

    showMessage(type, text) {
        this.formMessage.className = `form-message ${type}`;
        this.formMessage.textContent = text;
        this.formMessage.style.display = 'block';
        clearTimeout(this.messageTimeout);
        this.messageTimeout = setTimeout(() => {
            this.formMessage.style.display = 'none';
            this.formMessage.className = 'form-message';
            this.formMessage.textContent = '';
        }, 5000);
    }

    clearFieldErrors() {
        this.form.querySelectorAll('.field-error').forEach((field) => {
            field.textContent = '';
            field.classList.remove('visible');
        });
    }

    showFieldErrors(errors) {
        errors.forEach((error) => {
            const field = this.form.querySelector(`[data-error-for="${error.field}"]`);
            if (field) {
                field.textContent = error.message;
                field.classList.add('visible');
            }
        });
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ContactForm());
} else {
    new ContactForm();
}
