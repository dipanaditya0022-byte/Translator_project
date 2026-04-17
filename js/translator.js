/* ============================================
   AZURE TRANSLATOR MODULE
   - Proxy ke zariye Azure ko call karta hai
   - 84-character AI Foundry keys support karta hai
   - Key X-Azure-Key header mein jaati hai
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

  // Key aur region hamesha fresh localStorage se lo
  get _key()    { return (localStorage.getItem("azure_key")    || "").trim(); }
  get _region() { return (localStorage.getItem("azure_region") || "eastasia").trim(); }

  // Har request mein ye headers lagate hain
  _headers() {
    return {
      "Content-Type":      "application/json; charset=UTF-8",
      "X-Azure-Key":       this._key,
      "X-Azure-Region":    this._region,
      "X-ClientTraceId":   this._traceId(),
    };
  }

  /* ── TRANSLATE ── */
  async translate(text, targetLang, sourceLang = null) {
    if (!text?.trim()) throw new Error("Text khali hai");
    if (text.length > this.rateLimit.charactersPerRequest)
      throw new Error(`Text ${this.rateLimit.charactersPerRequest} characters se zyada hai`);
    if (!this._key) throw new Error("Azure Key missing hai — Settings mein jaake key daalo ⚙");

    let qs = `api-version=3.0&to=${targetLang}`;
    if (sourceLang && sourceLang !== "auto") qs += `&from=${sourceLang}`;

    const res = await fetch(`${this.endpoint}translate?${qs}`, {
      method:  "POST",
      headers: this._headers(),
      body:    JSON.stringify([{ text }]),
    }).catch(() => { throw new Error("Proxy server nahi chal raha! Terminal mein chalao: node proxy-server.js"); });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Azure Error ${res.status}: ${err?.error?.message || res.statusText}`);
    }

    const data = await res.json();
    this._track(text.length);
    return this._parse(data);
  }

  /* ── DETECT LANGUAGE ── */
  async detectLanguage(text) {
    if (!this._key) return { language: "unknown", confidence: 0 };

    const res = await fetch(`${this.endpoint}detect?api-version=3.0`, {
      method:  "POST",
      headers: this._headers(),
      body:    JSON.stringify([{ text: text.substring(0, 100) }]),
    }).catch(() => { throw new Error("Proxy server nahi chal raha!"); });

    if (!res.ok) throw new Error(`Detect failed: ${res.status}`);
    const data = await res.json();

    return {
      language:               data[0]?.language || "unknown",
      confidence:             Math.round((data[0]?.score || 0) * 100),
      isTranslationSupported: data[0]?.isTranslationSupported || false,
    };
  }

  /* ── PARSE RESPONSE ── */
  _parse(data) {
    if (!data?.[0]) throw new Error("Invalid API response");
    const t = data[0].translations?.[0];
    if (!t) throw new Error("Translation nahi mili response mein");

    return {
      translatedText:   t.text,
      targetLanguage:   t.to,
      sourceLanguage:   data[0].detectedLanguage?.language || null,
      sourceConfidence: data[0].detectedLanguage?.score
                          ? Math.round(data[0].detectedLanguage.score * 100)
                          : null,
      timestamp: new Date().toISOString(),
    };
  }

  /* ── UTILS ── */
  _track(chars) {
    const now = Date.now();
    this.requestCount++;
    this.charCount += chars;
    this.requestTimestamps.push(now);
    this.lastRequestTime = now;
    this.requestTimestamps = this.requestTimestamps.filter(t => now - t < 60000);
  }

  isRateLimited() {
    return this.requestTimestamps.filter(t => Date.now() - t < 60000).length
           >= this.rateLimit.requestsPerMinute;
  }

  _traceId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  getStats() {
    return {
      totalRequests:      this.requestCount,
      totalChars:         this.charCount,
      requestsLastMinute: this.requestTimestamps.filter(t => Date.now() - t < 60000).length,
      lastRequest:        this.lastRequestTime
                            ? new Date(this.lastRequestTime).toLocaleTimeString()
                            : "N/A",
    };
  }
}

if (typeof module !== "undefined") module.exports = AzureTranslator;
