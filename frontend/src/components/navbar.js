/**
 * Navbar Component
 * Handles scroll effects and mobile menu toggle
 */

class Navbar {
    constructor() {
        this.navbar = document.getElementById('navbar');
        this.mobileToggle = document.getElementById('mobileToggle');
        this.navLinks = document.getElementById('navLinks');
        this.links = document.querySelectorAll('.nav-link');
        
        this.init();
    }
    
    init() {
        // Scroll effect
        window.addEventListener('scroll', () => this.handleScroll());
        
        // Mobile menu toggle
        this.mobileToggle.addEventListener('click', () => this.toggleMobileMenu());
        
        // Close menu when link clicked
        this.links.forEach(link => {
            link.addEventListener('click', () => this.closeMobileMenu());
        });
        
        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => this.smoothScroll(e));
        });
        
        // Initial check
        this.handleScroll();
    }
    
    handleScroll() {
        if (window.scrollY > 50) {
            this.navbar.classList.add('scrolled');
        } else {
            this.navbar.classList.remove('scrolled');
        }
    }
    
    toggleMobileMenu() {
        this.navLinks.classList.toggle('active');
        this.mobileToggle.classList.toggle('active');
    }
    
    closeMobileMenu() {
        this.navLinks.classList.remove('active');
        this.mobileToggle.classList.remove('active');
    }
    
    smoothScroll(e) {
        e.preventDefault();
        const target = document.querySelector(e.currentTarget.getAttribute('href'));
        if (target) {
            const offsetTop = target.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new Navbar());
} else {
    new Navbar();
}
