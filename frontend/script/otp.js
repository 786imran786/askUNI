// ============================
// THEME & DESIGN LOGIC ONLY
// ============================

// Toast (UI feedback)
function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Elements
const container = document.getElementById('container');
const registerLinks = document.querySelectorAll('.register-link');
const loginLinks = document.querySelectorAll('.login-link');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const metaTheme = document.getElementById('meta-theme-color');

const THEME_KEY = 'college_portal_theme_v3';

// ============================
// APPLY THEME
// ============================
function applyTheme(mode) {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(mode);

    const modeotp = document.getElementById('modeotp'); 

    if (mode === 'dark') {
        if (modeotp) modeotp.src = "media/otp_dark.jpeg";
        

        themeIcon.className = 'fas fa-sun';
        themeToggle.setAttribute('aria-pressed', 'true');
        if (metaTheme) metaTheme.content = '#0A0F27';

        localStorage.setItem(THEME_KEY, 'dark');
    } else {
        if (modeotp) modeotp.src = "media/otp_light.jpeg";

        themeIcon.className = 'fas fa-moon';
        themeToggle.setAttribute('aria-pressed', 'false');
        if (metaTheme) metaTheme.content = '#1A237E';

        localStorage.setItem(THEME_KEY, 'light');
    }
}

// ============================
// INIT THEME
// ============================
(function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);

    if (saved === 'dark' || saved === 'light') {
        applyTheme(saved);
    } else {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            applyTheme('dark');
        } else {
            applyTheme('light');
        }
    }
})();

// ============================
// TOGGLE THEME SWITCH
// ============================
themeToggle.addEventListener('click', () => {
    const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
});

// ============================
// AUTO-DETECT SYSTEM THEME
// ============================
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem(THEME_KEY)) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });
};

// ============================
// CARD FLIP (UI Animation)
// ============================
registerLinks.forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        container.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
});

loginLinks.forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        container.classList.remove('active');
        document.body.style.overflow = '';
    });
});

// Fix scrolling on resize
window.addEventListener('resize', () => {
    if (container.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
});

console.log("Design-only JS Loaded Successfully!");
