/* ============================================
   AZURE TRANSLATOR MODULE
   ============================================ */

class AzureTranslator {
  constructor(config) {
    this.endpoint = config.translatorEndpoint; // "/api/"
    this.rateLimit = config.rateLimit;

    this.requestCount = 0;
    this.charCount = 0;
    this.requestTimestamps = [];
    this.lastRequestTime = null;
  }

  get _key() {
    return (localStorage.getItem("azure_key") || "").trim();
  }

  get _region() {
    return (localStorage.getItem("azure_region") || "").trim();
  }

  _headers() {
    return {
      "Content-Type": "application/json; charset=UTF-8",
      "X-Azure-Key": this._key,
      "X-Azure-Region": this._region,
      "X-ClientTraceId": this._traceId(),
    };
  }

  async translate(text, targetLang, sourceLang = null) {
    if (!text?.trim()) {
      throw new Error("Text is empty.");
    }

    if (text.length > this.rateLimit.charactersPerRequest) {
      throw new Error(`Text exceeds ${this.rateLimit.charactersPerRequest} characters.`);
    }

    if (!this._key) {
      throw new Error("Azure key missing. Open Settings and paste your key.");
    }

    if (!this._region) {
      throw new Error("Azure region missing. Open Settings and enter the correct region.");
    }

    let qs = `api-version=3.0&to=${encodeURIComponent(targetLang)}`;
    if (sourceLang && sourceLang !== "auto") {
      qs += `&from=${encodeURIComponent(sourceLang)}`;
    }

    let res;
    try {
      res = await fetch(`${this.endpoint}translate?${qs}`, {
        method: "POST",
        headers: this._headers(),
        body: JSON.stringify([{ text }]),
      });
    } catch (e) {
      throw new Error("Proxy server is not running. Start it with: node proxy-server.js");
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      let message = err?.error?.message || res.statusText || "Request failed";

      if (res.status === 401) {
        message =
          "401 Unauthorized: Azure key or region is incorrect, expired, or belongs to the wrong Azure resource.";
      } else if (res.status === 403) {
        message =
          "403 Forbidden: access denied by Azure. Check resource permissions and key type.";
      } else if (res.status === 429) {
        message =
          "429 Too Many Requests: Azure rate limit reached. Try again in a moment.";
      }

      throw new Error(`Azure Error ${res.status}: ${message}`);
    }

    const data = await res.json();
    this._track(text.length);
    return this._parse(data);
  }

  async detectLanguage(text) {
    if (!this._key || !this._region) {
      return { language: "unknown", confidence: 0 };
    }

    let res;
    try {
      res = await fetch(`${this.endpoint}detect?api-version=3.0`, {
        method: "POST",
        headers: this._headers(),
        body: JSON.stringify([{ text: text.substring(0, 100) }]),
      });
    } catch (e) {
      throw new Error("Proxy server is not running.");
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Detect failed ${res.status}: ${err?.error?.message || res.statusText}`);
    }

    const data = await res.json();

    return {
      language: data[0]?.language || "unknown",
      confidence: Math.round((data[0]?.score || 0) * 100),
      isTranslationSupported: data[0]?.isTranslationSupported || false,
    };
  }

  _parse(data) {
    if (!data?.[0]) throw new Error("Invalid API response.");
    const t = data[0].translations?.[0];
    if (!t) throw new Error("Translation missing in API response.");

    return {
      translatedText: t.text,
      targetLanguage: t.to,
      sourceLanguage: data[0].detectedLanguage?.language || null,
      sourceConfidence: data[0].detectedLanguage?.score
        ? Math.round(data[0].detectedLanguage.score * 100)
        : null,
      timestamp: new Date().toISOString(),
    };
  }

  _track(chars) {
    const now = Date.now();
    this.requestCount++;
    this.charCount += chars;
    this.requestTimestamps.push(now);
    this.lastRequestTime = now;
    this.requestTimestamps = this.requestTimestamps.filter(t => now - t < 60000);
  }

  isRateLimited() {
    return this.requestTimestamps.filter(t => Date.now() - t < 60000).length >=
      this.rateLimit.requestsPerMinute;
  }

  _traceId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  getStats() {
    return {
      totalRequests: this.requestCount,
      totalChars: this.charCount,
      requestsLastMinute: this.requestTimestamps.filter(t => Date.now() - t < 60000).length,
      lastRequest: this.lastRequestTime
        ? new Date(this.lastRequestTime).toLocaleTimeString()
        : "N/A",
    };
  }
}

if (typeof module !== "undefined") module.exports = AzureTranslator;