// ============================================
//   AZURE COGNITIVE SERVICES - CONFIGURATION
//   Keys are stored in localStorage (entered via dashboard Settings)
//   No need to hardcode anything here!
// ============================================

const AZURE_CONFIG = {
  // Keys are loaded from localStorage — set via the ⚙ Settings button on dashboard
  get translatorKey()      { return localStorage.getItem("azure_key")    || ""; },
  get translatorRegion()   { return localStorage.getItem("azure_region") || ""; },
  translatorEndpoint: "https://api.cognitive.microsofttranslator.com/",

  // Supported Language List
  supportedLanguages: [
    { code: "en",      name: "English",              flag: "🇺🇸" },
    { code: "hi",      name: "Hindi",                flag: "🇮🇳" },
    { code: "ar",      name: "Arabic",               flag: "🇸🇦" },
    { code: "zh-Hans", name: "Chinese (Simplified)", flag: "🇨🇳" },
    { code: "fr",      name: "French",               flag: "🇫🇷" },
    { code: "de",      name: "German",               flag: "🇩🇪" },
    { code: "ja",      name: "Japanese",             flag: "🇯🇵" },
    { code: "ko",      name: "Korean",               flag: "🇰🇷" },
    { code: "pt",      name: "Portuguese",           flag: "🇧🇷" },
    { code: "ru",      name: "Russian",              flag: "🇷🇺" },
    { code: "es",      name: "Spanish",              flag: "🇪🇸" },
    { code: "it",      name: "Italian",              flag: "🇮🇹" },
    { code: "tr",      name: "Turkish",              flag: "🇹🇷" },
    { code: "nl",      name: "Dutch",                flag: "🇳🇱" },
    { code: "pl",      name: "Polish",               flag: "🇵🇱" },
    { code: "sv",      name: "Swedish",              flag: "🇸🇪" },
    { code: "ur",      name: "Urdu",                 flag: "🇵🇰" },
    { code: "bn",      name: "Bengali",              flag: "🇧🇩" },
    { code: "vi",      name: "Vietnamese",           flag: "🇻🇳" },
    { code: "th",      name: "Thai",                 flag: "🇹🇭" },
  ],

  // Dashboard Settings
  dashboard: {
    maxHistoryItems: 50,
    autoDetectLanguage: true,
    defaultSourceLang: "auto",
    defaultTargetLang: "hi",
    animationsEnabled: true,
    particlesEnabled: true,
    theme: "cyber-dark",
  },

  // Rate Limiting
  rateLimit: {
    requestsPerMinute: 60,
    charactersPerRequest: 5000,
  },
};

if (typeof module !== "undefined") {
  module.exports = AZURE_CONFIG;
}
