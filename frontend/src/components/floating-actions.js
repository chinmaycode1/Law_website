class FloatingActions {
    constructor() {
        this.backToTop = document.querySelector('.back-to-top');
        window.addEventListener('scroll', () => this.update());
        this.backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        this.update();
    }

    update() {
        this.backToTop.classList.toggle('visible', window.scrollY > 600);
    }
}

document.addEventListener('DOMContentLoaded', () => new FloatingActions());