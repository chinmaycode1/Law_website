class Testimonials {
    constructor() {
        this.cards = Array.from(document.querySelectorAll('.testimonial-card'));
        this.dots = Array.from(document.querySelectorAll('.slider-dot'));
        this.current = 0;
        this.init();
    }

    init() {
        if (!this.cards.length) return;
        document.querySelector('.slider-prev').addEventListener('click', () => this.show(this.current - 1));
        document.querySelector('.slider-next').addEventListener('click', () => this.show(this.current + 1));
        this.dots.forEach((dot, index) => dot.addEventListener('click', () => this.show(index)));
        this.timer = setInterval(() => this.show(this.current + 1), 7000);
    }

    show(index) {
        this.current = (index + this.cards.length) % this.cards.length;
        this.cards.forEach((card, cardIndex) => card.classList.toggle('active', cardIndex === this.current));
        this.dots.forEach((dot, dotIndex) => {
            dot.classList.toggle('active', dotIndex === this.current);
            dot.setAttribute('aria-selected', dotIndex === this.current ? 'true' : 'false');
        });
    }
}

document.addEventListener('DOMContentLoaded', () => new Testimonials());