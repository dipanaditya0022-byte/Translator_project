/* ============================================
   AZURE COGNITIVE TRANSLATOR SERVICE MODULE
   Keys are passed dynamically via request headers
   (read from localStorage, set via dashboard Settings)
   ============================================ */

class AzureTranslator {
  constructor(config) {
    this.config   = config;
    this.rateLimit = config.rateLimit;

    this.useProxy  = true;
    this.proxyBase = "/api";

    // Request tracking
    this.requestCount      = 0;
    this.charCount         = 0;
    this.requestTimestamps = [];
    this.lastRequestTime   = null;
  }

  /* ── GET LIVE KEY & REGION from localStorage ── */
  get key()    { return (localStorage.getItem("azure_key")    || "").trim(); }
  get region() { return (localStorage.getItem("azure_region") || "").trim(); }

  /* ── BUILD URL ── */
  _buildUrl(azurePath, queryString) {
    if (this.useProxy) {
      return `${this.proxyBase}/${azurePath}?${queryString}`;
    }
    return `${this.config.translatorEndpoint}${azurePath}?${queryString}`;
  }

  /* ── HEADERS: key & region always sent so proxy can forward them ── */
  _headers(extra = {}) {
    const h = {
      "Content-Type":     "application/json; charset=UTF-8",
      "X-ClientTraceId":  this._generateTraceId(),
      // Proxy reads these and forwards as Ocp-Apim headers to Azure
      "X-Azure-Key":      this.key,
      "X-Azure-Region":   this.region,
    };
    return Object.assign(h, extra);
  }

  /* ── VALIDATE credentials before request ── */
  _checkCredentials() {
    if (!this.key || !this.region) {
      throw new Error(
        "Azure credentials missing! Dashboard mein ⚙ Settings button dabao aur Key + Region enter karo."
      );
    }
  }

  /* ── MAIN TRANSLATE METHOD ── */
  async translate(text, targetLang, sourceLang = null) {
    if (!text || !text.trim()) throw new Error("Input text is empty");
    if (text.length > this.rateLimit.charactersPerRequest) {
      throw new Error(`Text exceeds ${this.rateLimit.charactersPerRequest} character limit`);
    }
    this._checkCredentials();

    let qs = `api-version=3.0&to=${targetLang}`;
    if (sourceLang && sourceLang !== "auto") qs += `&from=${sourceLang}`;

    const url = this._buildUrl("translate", qs);

    try {
      const response = await fetch(url, {
        method:  "POST",
        headers: this._headers(),
        body:    JSON.stringify([{ text }]),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Azure API Error ${response.status}: ${errorData?.error?.message || response.statusText}`
        );
      }

      const data = await response.json();
      this._trackRequest(text.length);
      return this._parseResponse(data);

    } catch (error) {
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        throw new Error("Proxy server nahi chal raha! Terminal mein chalao: node proxy-server.js");
      }
      throw error;
    }
  }

  /* ── DETECT LANGUAGE ── */
  async detectLanguage(text) {
    this._checkCredentials();
    const url = this._buildUrl("detect", "api-version=3.0");

    const response = await fetch(url, {
      method:  "POST",
      headers: this._headers(),
      body:    JSON.stringify([{ text: text.substring(0, 100) }]),
    });

    if (!response.ok) throw new Error(`Detection failed: ${response.status}`);
    const data = await response.json();

    return {
      language:               data[0]?.language || "unknown",
      confidence:             Math.round((data[0]?.score || 0) * 100),
      isTranslationSupported: data[0]?.isTranslationSupported || false,
    };
  }

  /* ── TRANSLITERATE ── */
  async transliterate(text, language, fromScript, toScript) {
    this._checkCredentials();
    const qs  = `api-version=3.0&language=${language}&fromScript=${fromScript}&toScript=${toScript}`;
    const url = this._buildUrl("transliterate", qs);

    const response = await fetch(url, {
      method:  "POST",
      headers: this._headers(),
      body:    JSON.stringify([{ text }]),
    });

    if (!response.ok) throw new Error(`Transliteration failed: ${response.status}`);
    const data = await response.json();
    return data[0]?.text || text;
  }

  /* ── FETCH SUPPORTED LANGUAGES ── */
  async getSupportedLanguages() {
    const url = this._buildUrl("languages", "api-version=3.0&scope=translation");

    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) throw new Error(`Failed to fetch languages: ${response.status}`);
    const data = await response.json();

    return Object.entries(data.translation).map(([code, info]) => ({
      code,
      name:       info.name,
      nativeName: info.nativeName,
      dir:        info.dir,
    }));
  }

  /* ── PARSE RESPONSE ── */
  _parseResponse(data) {
    if (!data || !data[0]) throw new Error("Invalid API response");
    const result      = data[0];
    const translation = result.translations?.[0];
    if (!translation) throw new Error("No translation in response");

    return {
      translatedText:   translation.text,
      targetLanguage:   translation.to,
      sourceLanguage:   result.detectedLanguage?.language || null,
      sourceConfidence: result.detectedLanguage?.score
        ? Math.round(result.detectedLanguage.score * 100)
        : null,
      timestamp: new Date().toISOString(),
    };
  }

  /* ── TRACK USAGE ── */
  _trackRequest(charCount) {
    const now = Date.now();
    this.requestCount++;
    this.charCount += charCount;
    this.requestTimestamps.push(now);
    this.lastRequestTime   = now;
    this.requestTimestamps = this.requestTimestamps.filter((t) => now - t < 60000);
  }

  isRateLimited() {
    const now = Date.now();
    return this.requestTimestamps.filter((t) => now - t < 60000).length >= this.rateLimit.requestsPerMinute;
  }

  _generateTraceId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  getStats() {
    return {
      totalRequests:      this.requestCount,
      totalChars:         this.charCount,
      requestsLastMinute: this.requestTimestamps.filter((t) => Date.now() - t < 60000).length,
      lastRequest:        this.lastRequestTime
        ? new Date(this.lastRequestTime).toLocaleTimeString()
        : "N/A",
    };
  }
}

if (typeof module !== "undefined") {
  module.exports = AzureTranslator;
}
