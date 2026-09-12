class FAQ {
    constructor() {
        this.questions = document.querySelectorAll('.faq-question');
        this.questions.forEach((question) => question.addEventListener('click', () => this.toggle(question)));
    }

    toggle(question) {
        const answer = document.getElementById(question.getAttribute('aria-controls'));
        const isOpen = question.getAttribute('aria-expanded') === 'true';
        this.questions.forEach((item) => {
            item.setAttribute('aria-expanded', 'false');
            document.getElementById(item.getAttribute('aria-controls')).style.maxHeight = null;
        });
        if (!isOpen) {
            question.setAttribute('aria-expanded', 'true');
            answer.style.maxHeight = `${answer.scrollHeight}px`;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => new FAQ());