// ============================================
//   AZURE COGNITIVE SERVICES — CONFIG
//   Key aur Region localStorage se aata hai
//   Pehli baar Settings modal se set karo
// ============================================

const AZURE_CONFIG = {
  // In values ko Settings modal se set karo (page pe gear icon)
  // Ya seedha yahan apni key paste karo:
  translatorKey:      localStorage.getItem("azure_key")    || "",
  translatorRegion:   localStorage.getItem("azure_region") || "eastasia",

  // Proxy endpoint — proxy-server.js ke zariye Azure tak jaata hai
  // Direct Azure endpoint mat use karo — CORS block karega
  translatorEndpoint: "/api/",

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

  dashboard: {
    maxHistoryItems:     50,
    autoDetectLanguage:  true,
    defaultSourceLang:   "auto",
    defaultTargetLang:   "hi",
    animationsEnabled:   true,
    particlesEnabled:    true,
  },

  rateLimit: {
    requestsPerMinute:    60,
    charactersPerRequest: 5000,
  },
};

if (typeof module !== "undefined") module.exports = AZURE_CONFIG;
