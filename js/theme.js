// js/theme.js

const themeToggleButton = document.getElementById('toggleThemeBtn');
const htmlElement = document.documentElement;

export function initTheme() {
    // Prioridad: LocalStorage > Preferencia del sistema
    const savedTheme = localStorage.getItem('tema') || 'dark';
    setTheme(savedTheme);
}

export function toggleTheme() {
    const currentTheme = htmlElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

function setTheme(theme) {
    htmlElement.setAttribute('data-theme', theme);
    localStorage.setItem('tema', theme);

    if (theme === 'dark') {
        themeToggleButton.textContent = '☀ Modo Claro';
    } else {
        themeToggleButton.textContent = '☾ Modo Oscuro';
    }
}