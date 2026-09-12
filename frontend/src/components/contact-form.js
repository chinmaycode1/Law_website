/**
 * Contact Form Component
 * Handles form submission to backend API
 */

class ContactForm {
    constructor() {
        this.form = document.getElementById('contactForm');
        this.formMessage = document.getElementById('formMessage');
        this.submitButton = this.form.querySelector('.submit-button');
        
        const API_URL = window.location.origin.includes('localhost') ? 'http://localhost:3000/api/contact' : '/api/contact';
        this.apiEndpoint = API_URL;
        
        this.init();
    }
    
    init() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        this.clearFieldErrors();

        if (this.form.elements.website.value) {
            this.showMessage('success', 'Thank you. Your message has been received.');
            return;
        }
        
        // Get form data
        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            caseType: document.getElementById('caseType').value,
            message: document.getElementById('message').value
        };
        
        // Validate
        if (!this.validateForm(formData)) {
            return;
        }
        
        // Disable button
        this.submitButton.disabled = true;
        this.submitButton.textContent = 'Sending...';
        
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showMessage('success', 'Thank you. Your message has been sent successfully. We will contact you soon.');
                this.form.reset();
            } else {
                if (Array.isArray(result.errors)) {
                    this.showFieldErrors(result.errors);
                }
                this.showMessage('error', result.message || 'Please correct the highlighted fields and try again.');
            }
        } catch (error) {
            console.error('Form submission error:', error);
            this.showMessage('error', 'An error occurred. Please try again or contact us directly via phone.');
        } finally {
            this.submitButton.disabled = false;
            this.submitButton.textContent = 'Send Message';
        }
    }
    
    validateForm(data) {
        if (!data.name || !data.email || !data.phone || !data.caseType || !data.message) {
            this.showMessage('error', 'Please fill in all required fields.');
            return false;
        }
        
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            this.showMessage('error', 'Please enter a valid email address.');
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
