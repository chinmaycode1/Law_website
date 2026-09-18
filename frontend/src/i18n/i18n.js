(function () {
    const storageKey = 'siteLang';
    const supported = ['en', 'hi', 'mr'];
    const titles = { en: 'Advocate Sunil Sawargaonkar - Criminal Law Expert', hi: 'अधिवक्ता सुनील सावरगांवकर - आपराधिक कानून विशेषज्ञ', mr: 'वकील सुनील सावरगांवकर - फौजदारी कायद्याचे तज्ज्ञ' };
    const descriptions = { en: 'Senior Criminal Lawyer Sunil Sharadrao Sawargaonkar - Expert legal advocacy in criminal defense', hi: 'वरिष्ठ आपराधिक अधिवक्ता सुनील शरद्राव सावरगांवकर - आपराधिक बचाव में विशेषज्ञ कानूनी प्रतिनिधित्व', mr: 'ज्येष्ठ फौजदारी वकील सुनील शरद्राव सावरगांवकर - फौजदारी बचावातील तज्ज्ञ कायदेशीर प्रतिनिधित्व' };
    let current = 'en';

    function getLanguage() { return current; }
    function translate(key, lang = current) { return (window.siteTranslations[lang] && window.siteTranslations[lang][key]) || window.siteTranslations.en[key] || ''; }
    function interpolate(value, params) { return value.replace(/\{(\w+)\}/g, (match, key) => params[key] ?? match); }

    function applyLanguage(lang) {
        current = supported.includes(lang) ? lang : 'en';
        document.documentElement.lang = current;
        document.documentElement.classList.toggle('lang-devanagari', current !== 'en');
        document.title = translate('meta_title');
        const description = document.querySelector('meta[name="description"]');
        if (description) description.content = translate('meta_description');
        document.querySelectorAll('[data-i18n]').forEach((element) => { element.textContent = translate(element.dataset.i18n).replace(/\|/g, '\n'); });
        document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => { element.placeholder = translate(element.dataset.i18nPlaceholder); });
        document.querySelectorAll('[data-i18n-aria]').forEach((element) => { element.setAttribute('aria-label', translate(element.dataset.i18nAria)); });
        document.querySelectorAll('[data-i18n-value]').forEach((element) => { element.value = translate(element.dataset.i18nValue); });
        document.querySelectorAll('[data-lang]').forEach((button) => { button.classList.toggle('active', button.dataset.lang === current); button.setAttribute('aria-pressed', button.dataset.lang === current ? 'true' : 'false'); });
        localStorage.setItem(storageKey, current);
        window.dispatchEvent(new CustomEvent('languagechange', { detail: { lang: current } }));
    }

    function init() {
        document.querySelectorAll('[data-lang]').forEach((button) => button.addEventListener('click', () => applyLanguage(button.dataset.lang)));
        applyLanguage(localStorage.getItem(storageKey) || 'en');
    }

    window.siteI18n = { applyLanguage, getLanguage, translate, interpolate, init };
    const saved = localStorage.getItem(storageKey);
    if (supported.includes(saved)) { document.documentElement.lang = saved; if (saved !== 'en') document.documentElement.classList.add('lang-devanagari'); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();