export let translations = {}; // Define as a global variable and export
export let currentLang = "ko"; // Set the default language and export

export async function loadTranslations() {
  try {
    const response = await fetch('/locales/translation.json');
    translations = await response.json(); // Reassignable
    const savedLang = localStorage.getItem("preferredLang") || currentLang;
    setLanguage(savedLang);
  } catch (error) {
    console.error("Translation file load failed:", error);
  }
}

export function setLanguage(lang) {
  if (translations[lang]) {
    currentLang = lang;
    localStorage.setItem("preferredLang", lang);
    updateText();
  } else {
    console.warn(`Language '${lang}' not found in translations.`);
  }
}

export function updateText() {
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.getAttribute('data-i18n');
    if (translations[currentLang][key]) {
      element.textContent = translations[currentLang][key];
    } else {
      console.warn(`Translation for key '${key}' not found.`);
    }
  });
}

// Add event listeners to language switch buttons
document.querySelectorAll(".translate-btn").forEach((button) => {
  button.addEventListener("click", () => {
    const lang = button.dataset.lang;
    setLanguage(lang);
  });
});

// Load translations when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", async () => {
  await loadTranslations();
});
