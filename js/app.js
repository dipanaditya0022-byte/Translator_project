/* ============================================
   APP.JS - MAIN DASHBOARD CONTROLLER
   Azure Translator Dashboard v2.0
   ============================================ */

class TranslatorDashboard {
  constructor() {
    this.translator = null;
    this.history = [];
    this.langUsage = {};
    this.requestData = Array(20).fill(0);
    this.charData = Array(20).fill(0);
    this.isTranslating = false;
    this.translateDebounce = null;
    this.totalTranslations = 0;
    this.totalChars = 0;
    this.uptime = 0;
    this.els = {};

    this.init();
  }

  init() {
    document.addEventListener("DOMContentLoaded", () => {
      this.cacheElements();
      this.initTranslator();
      this.renderLanguageDropdowns();
      this.bindEvents();
      this.startUptimeClock();
      this.checkCredentialsOnLoad();
      this.animateCounters();
      this.initCharts();
      this.injectSettingsModal();
    });
  }

  cacheElements() {
    this.els = {
      sourceInput: document.getElementById("sourceInput"),
      outputText: document.getElementById("outputText"),
      sourceLangBtn: document.getElementById("sourceLangBtn"),
      targetLangBtn: document.getElementById("targetLangBtn"),
      sourceLangDD: document.getElementById("sourceLangDropdown"),
      targetLangDD: document.getElementById("targetLangDropdown"),
      swapBtn: document.getElementById("swapBtn"),
      translateBtn: document.getElementById("translateBtn"),
      charCounter: document.getElementById("charCounter"),
      confidenceBar: document.getElementById("confidenceBar"),
      confidenceValue: document.getElementById("confidenceValue"),
      detectedLang: document.getElementById("detectedLang"),
      detectedText: document.getElementById("detectedText"),
      historyList: document.getElementById("historyList"),
      langStats: document.getElementById("langStats"),
      statTranslations: document.getElementById("statTranslations"),
      statChars: document.getElementById("statChars"),
      statLanguages: document.getElementById("statLanguages"),
      statUptime: document.getElementById("statUptime"),
      metricTranslations: document.getElementById("metricTranslations"),
      metricChars: document.getElementById("metricChars"),
      metricLanguages: document.getElementById("metricLanguages"),
      metricAvgTime: document.getElementById("metricAvgTime"),
      statusDot: document.getElementById("statusDot"),
      statusText: document.getElementById("statusText"),
      toastContainer: document.getElementById("toastContainer"),
      copySourceBtn: document.getElementById("copySourceBtn"),
      clearSourceBtn: document.getElementById("clearSourceBtn"),
      copyOutputBtn: document.getElementById("copyOutputBtn"),
      speakOutputBtn: document.getElementById("speakOutputBtn"),
      reqSparkline: document.getElementById("reqSparkline"),
      charSparkline: document.getElementById("charSparkline"),
    };

    this.sourceLang = { code: "auto", name: "Auto-Detect", flag: "🔍" };
    this.targetLang =
      AZURE_CONFIG.supportedLanguages.find(
        (l) => l.code === AZURE_CONFIG.dashboard.defaultTargetLang
      ) || AZURE_CONFIG.supportedLanguages[0];
  }

  initTranslator() {
    this.translator = new AzureTranslator(AZURE_CONFIG);
  }

  checkCredentialsOnLoad() {
    const key = localStorage.getItem("azure_key") || "";
    const region = localStorage.getItem("azure_region") || "";

    if (!key || !region) {
      this.updateStatus(false, "⚙ Settings mein Azure Key enter karein");
      setTimeout(() => this.showSettingsModal(), 800);
    } else {
      this.updateStatus(true, `Credentials loaded [${region}]`);
      this.showToast("Azure credentials loaded ✓", "success");
    }
  }

  injectSettingsModal() {
    if (document.getElementById("settingsModal")) return;

    const modal = document.createElement("div");
    modal.id = "settingsModal";
    modal.innerHTML = `
      <div class="settings-overlay" id="settingsOverlay">
        <div class="settings-box">
          <div class="settings-header">
            <span class="settings-title">⚙ Azure Settings</span>
            <button class="settings-close" id="settingsClose">✕</button>
          </div>

          <div class="settings-body">
            <div class="settings-info">
              Azure Portal → Translator → Keys and Endpoint se copy karein
            </div>

            <div class="settings-field">
              <label class="settings-label">API KEY <span class="settings-required">*</span></label>
              <div class="settings-input-wrap">
                <input
                  type="password"
                  id="settingsKey"
                  class="settings-input"
                  placeholder="Paste Key 1 or Key 2"
                  autocomplete="off"
                  spellcheck="false"
                />
                <button class="settings-eye" id="toggleKeyVisibility" data-visible="false">👁</button>
              </div>
            </div>

            <div class="settings-field">
              <label class="settings-label">REGION <span class="settings-required">*</span></label>
              <input
                type="text"
                id="settingsRegion"
                class="settings-input"
                placeholder="eastasia"
                autocomplete="off"
                spellcheck="false"
              />
              <div class="settings-hint">Azure Portal mein Location/Region field dekhein</div>
            </div>

            <div class="settings-status" id="settingsSavedStatus"></div>
          </div>

          <div class="settings-footer">
            <button class="settings-btn-test" id="settingsTestBtn">🔌 Test Connection</button>
            <button class="settings-btn-save" id="settingsSaveBtn">💾 Save & Connect</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const style = document.createElement("style");
    style.textContent = `
      #settingsModal { display: none; position: fixed; inset: 0; z-index: 9999; }
      #settingsModal.open { display: block; }

      .settings-overlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.75);
        backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        padding: 1rem;
      }

      .settings-box {
        background: #061828;
        border: 1px solid rgba(0,245,255,0.35);
        border-radius: 16px;
        width: 100%; max-width: 480px;
        box-shadow: 0 0 40px rgba(0,245,255,0.15), 0 20px 60px rgba(0,0,0,0.6);
        animation: settingsFadeIn 0.25s ease;
        overflow: hidden;
      }

      @keyframes settingsFadeIn {
        from { opacity: 0; transform: scale(0.94) translateY(-10px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }

      .settings-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 1.2rem 1.5rem;
        border-bottom: 1px solid rgba(0,245,255,0.1);
        background: rgba(0,245,255,0.04);
      }

      .settings-title {
        font-family: 'Orbitron', monospace;
        font-size: 0.95rem; font-weight: 700;
        color: #00f5ff;
        letter-spacing: 2px;
        text-shadow: 0 0 10px rgba(0,245,255,0.5);
      }

      .settings-close {
        background: none; border: none; cursor: pointer;
        color: rgba(122,184,212,0.6); font-size: 1.1rem;
        width: 28px; height: 28px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s;
      }
      .settings-close:hover { color: #00f5ff; background: rgba(0,245,255,0.1); }

      .settings-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.2rem; }

      .settings-info {
        font-family: 'Share Tech Mono', monospace;
        font-size: 0.72rem; color: rgba(122,184,212,0.7);
        background: rgba(0,245,255,0.04);
        border: 1px solid rgba(0,245,255,0.1);
        border-radius: 8px; padding: 0.7rem 1rem;
        letter-spacing: 0.5px;
      }

      .settings-field { display: flex; flex-direction: column; gap: 0.4rem; }

      .settings-label {
        font-family: 'Share Tech Mono', monospace;
        font-size: 0.68rem; letter-spacing: 2px;
        color: rgba(122,184,212,0.8); text-transform: uppercase;
      }
      .settings-required { color: #ff4466; }

      .settings-input-wrap { position: relative; display: flex; align-items: center; }

      .settings-input {
        width: 100%; padding: 0.75rem 2.8rem 0.75rem 1rem;
        background: rgba(0,0,0,0.35);
        border: 1px solid rgba(0,245,255,0.2);
        border-radius: 8px; outline: none;
        font-family: 'Share Tech Mono', monospace;
        font-size: 0.82rem; color: #e0f0ff;
        transition: border-color 0.2s, box-shadow 0.2s;
        letter-spacing: 0.5px;
        box-sizing: border-box;
      }
      .settings-field > .settings-input { padding-right: 1rem; }
      .settings-input:focus {
        border-color: rgba(0,245,255,0.6);
        box-shadow: 0 0 0 3px rgba(0,245,255,0.08);
      }
      .settings-input::placeholder { color: rgba(122,184,212,0.35); }

      .settings-eye {
        position: absolute; right: 0.6rem;
        background: none; border: none; cursor: pointer;
        font-size: 0.9rem; opacity: 0.5; transition: opacity 0.2s;
        padding: 4px;
      }
      .settings-eye:hover { opacity: 1; }

      .settings-hint {
        font-family: 'Share Tech Mono', monospace;
        font-size: 0.65rem; color: rgba(122,184,212,0.45);
        padding-left: 2px;
      }

      .settings-status {
        font-family: 'Share Tech Mono', monospace;
        font-size: 0.75rem; min-height: 1.2rem;
        text-align: center; letter-spacing: 0.5px;
        transition: all 0.3s;
      }
      .settings-status.success { color: #00ff88; }
      .settings-status.error   { color: #ff4466; }

      .settings-footer {
        display: flex; gap: 0.8rem; padding: 1rem 1.5rem 1.4rem;
        border-top: 1px solid rgba(0,245,255,0.08);
      }

      .settings-btn-test, .settings-btn-save {
        flex: 1; padding: 0.7rem;
        border: none; border-radius: 8px; cursor: pointer;
        font-family: 'Orbitron', monospace;
        font-size: 0.72rem; font-weight: 600;
        letter-spacing: 1px; transition: all 0.2s;
      }

      .settings-btn-test {
        background: rgba(0,245,255,0.08);
        border: 1px solid rgba(0,245,255,0.25);
        color: #00f5ff;
      }
      .settings-btn-test:hover {
        background: rgba(0,245,255,0.15);
        box-shadow: 0 0 15px rgba(0,245,255,0.2);
      }

      .settings-btn-save {
        background: linear-gradient(135deg, rgba(0,245,255,0.25), rgba(0,128,255,0.25));
        border: 1px solid rgba(0,245,255,0.4);
        color: #00f5ff;
      }
      .settings-btn-save:hover {
        background: linear-gradient(135deg, rgba(0,245,255,0.35), rgba(0,128,255,0.35));
        box-shadow: 0 0 20px rgba(0,245,255,0.25);
        transform: translateY(-1px);
      }
    `;
    document.head.appendChild(style);

    const savedKey = localStorage.getItem("azure_key") || "";
    const savedRegion = localStorage.getItem("azure_region") || "";
    document.getElementById("settingsKey").value = savedKey;
    document.getElementById("settingsRegion").value = savedRegion;

    document.getElementById("settingsClose").addEventListener("click", () => {
      this.hideSettingsModal();
    });

    document.getElementById("settingsOverlay").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) this.hideSettingsModal();
    });

    document.getElementById("toggleKeyVisibility").addEventListener("click", () => {
      const input = document.getElementById("settingsKey");
      const btn = document.getElementById("toggleKeyVisibility");
      const isVisible = btn.dataset.visible === "true";
      input.type = isVisible ? "password" : "text";
      btn.dataset.visible = String(!isVisible);
      btn.style.opacity = isVisible ? "0.5" : "1";
    });

    document.getElementById("settingsSaveBtn").addEventListener("click", () => {
      this.saveSettings();
    });

    document.getElementById("settingsTestBtn").addEventListener("click", () => {
      this.testConnection();
    });

    ["settingsKey", "settingsRegion"].forEach((id) => {
      document.getElementById(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.saveSettings();
      });
    });

    const settingsBtn = document.querySelector('[data-tooltip="Settings"]');
    if (settingsBtn) {
      settingsBtn.onclick = () => this.showSettingsModal();
    }
  }

  showSettingsModal() {
    const modal = document.getElementById("settingsModal");
    const keyEl = document.getElementById("settingsKey");
    const regionEl = document.getElementById("settingsRegion");

    if (!modal || !keyEl || !regionEl) return;

    keyEl.value = localStorage.getItem("azure_key") || "";
    regionEl.value = localStorage.getItem("azure_region") || "";

    modal.classList.add("open");
    setTimeout(() => keyEl.focus(), 100);
  }

  hideSettingsModal() {
    document.getElementById("settingsModal")?.classList.remove("open");
  }

  saveSettings() {
    const key = document.getElementById("settingsKey").value.trim();
    const region = document.getElementById("settingsRegion").value.trim();
    const status = document.getElementById("settingsSavedStatus");

    if (!key) {
      status.textContent = "⚠ Enter API key.";
      status.className = "settings-status error";
      document.getElementById("settingsKey").focus();
      return;
    }

    if (!region) {
      status.textContent = "⚠ Enter region, for example: eastasia";
      status.className = "settings-status error";
      document.getElementById("settingsRegion").focus();
      return;
    }

    localStorage.setItem("azure_key", key);
    localStorage.setItem("azure_region", region);

    status.textContent = "✓ Saved locally. Now test connection.";
    status.className = "settings-status success";

    this.updateStatus(false, `Credentials saved [${region}]`);
    this.showToast("Credentials saved. Test connection once.", "success");
    this.updateSettingsIndicator(false);
  }

  async testConnection() {
    const key = document.getElementById("settingsKey").value.trim();
    const region = document.getElementById("settingsRegion").value.trim();
    const status = document.getElementById("settingsSavedStatus");

    if (!key || !region) {
      status.textContent = "⚠ Fill both key and region first.";
      status.className = "settings-status error";
      return;
    }

    status.textContent = "🔌 Testing connection...";
    status.className = "settings-status";

    try {
      const response = await fetch("/api/translate?api-version=3.0&to=hi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Azure-Key": key,
          "X-Azure-Region": region,
        },
        body: JSON.stringify([{ text: "Hello" }]),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.[0]?.translations?.[0]?.text) {
        localStorage.setItem("azure_key", key);
        localStorage.setItem("azure_region", region);

        status.textContent = `✓ Connected successfully. Test output: ${data[0].translations[0].text}`;
        status.className = "settings-status success";

        this.updateStatus(true, `Azure Connected ✓ [${region}]`);
        this.showToast("Azure connection successful ✓", "success");
        this.updateSettingsIndicator(true);
      } else {
        const msg = data?.error?.message || "Invalid credentials or wrong region";
        status.textContent = `✗ Error ${response.status}: ${msg}`;
        status.className = "settings-status error";
        this.updateStatus(false, "Azure auth failed — check key/region");
      }
    } catch (e) {
      status.textContent = "✗ Proxy server not running. Start: node proxy-server.js";
      status.className = "settings-status error";
      this.updateStatus(false, "Proxy server offline");
    }
  }

  updateSettingsIndicator(connected) {
    const settingsBtn = document.querySelector('[data-tooltip="Settings"]');
    if (!settingsBtn) return;

    settingsBtn.innerHTML = "⚙";
    settingsBtn.title = connected ? "Settings (Connected ✓)" : "Settings";
    settingsBtn.style.color = connected ? "#00ff88" : "";
  }

  renderLanguageDropdowns() {
    const langs = AZURE_CONFIG.supportedLanguages;

    const autoOption = `
      <div class="lang-option ${this.sourceLang.code === "auto" ? "active" : ""}"
           data-code="auto" data-name="Auto-Detect" data-flag="🔍" data-pane="source">
        <span>🔍</span><span>Auto-Detect</span>
      </div>`;

    this.els.sourceLangDD.innerHTML =
      autoOption +
      langs
        .map(
          (l) => `
      <div class="lang-option" data-code="${l.code}" data-name="${l.name}" data-flag="${l.flag}" data-pane="source">
        <span>${l.flag}</span><span>${l.name}</span>
      </div>`
        )
        .join("");

    this.els.targetLangDD.innerHTML = langs
      .map(
        (l) => `
      <div class="lang-option ${l.code === this.targetLang.code ? "active" : ""}"
           data-code="${l.code}" data-name="${l.name}" data-flag="${l.flag}" data-pane="target">
        <span>${l.flag}</span><span>${l.name}</span>
      </div>`
      )
      .join("");

    this.updateLangButtons();
  }

  updateLangButtons() {
    if (this.els.sourceLangBtn) {
      this.els.sourceLangBtn.querySelector(".lang-flag").textContent = this.sourceLang.flag;
      this.els.sourceLangBtn.querySelector(".lang-name").textContent = this.sourceLang.name;
      this.els.sourceLangBtn.querySelector(".lang-code").textContent =
        this.sourceLang.code === "auto" ? "AUTO" : this.sourceLang.code.toUpperCase();
    }

    if (this.els.targetLangBtn) {
      this.els.targetLangBtn.querySelector(".lang-flag").textContent = this.targetLang.flag;
      this.els.targetLangBtn.querySelector(".lang-name").textContent = this.targetLang.name;
      this.els.targetLangBtn.querySelector(".lang-code").textContent =
        this.targetLang.code.toUpperCase();
    }
  }

  bindEvents() {
    if (this.els.sourceInput) {
      this.els.sourceInput.addEventListener("input", () => {
        this.updateCharCounter();
        if (AZURE_CONFIG.dashboard.autoDetectLanguage) {
          clearTimeout(this.translateDebounce);
          this.translateDebounce = setTimeout(() => this.autoTranslate(), 1000);
        }
      });
    }

    if (this.els.translateBtn) {
      this.els.translateBtn.addEventListener("click", () => this.doTranslate());
    }

    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        this.doTranslate();
      }
    });

    if (this.els.swapBtn) {
      this.els.swapBtn.addEventListener("click", () => this.swapLanguages());
    }

    if (this.els.sourceLangBtn) {
      this.els.sourceLangBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleDropdown("source");
      });
    }

    if (this.els.targetLangBtn) {
      this.els.targetLangBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleDropdown("target");
      });
    }

    document.addEventListener(
      "click",
      (e) => {
        const opt = e.target.closest(".lang-option");

        if (opt) {
          e.preventDefault();
          e.stopPropagation();

          const pane = opt.dataset.pane;
          const lang = {
            code: opt.dataset.code,
            name: opt.dataset.name,
            flag: opt.dataset.flag,
          };

          if (pane === "source") {
            this.sourceLang = lang;
            this.els.sourceLangDD.querySelectorAll(".lang-option").forEach((o) => {
              o.classList.toggle("active", o.dataset.code === lang.code);
            });
          } else {
            this.targetLang = lang;
            this.els.targetLangDD.querySelectorAll(".lang-option").forEach((o) => {
              o.classList.toggle("active", o.dataset.code === lang.code);
            });
          }

          this.updateLangButtons();
          this.closeAllDropdowns();
          return;
        }

        if (!e.target.closest(".lang-selector") && !e.target.closest(".lang-dropdown")) {
          this.closeAllDropdowns();
        }
      },
      true
    );

    [this.els.sourceLangDD, this.els.targetLangDD].forEach((dd) => {
      if (!dd) return;

      dd.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });

      dd.addEventListener("click", (e) => {
        e.stopPropagation();
      });

      dd.addEventListener(
        "wheel",
        (e) => {
          e.stopPropagation();
        },
        { passive: true }
      );
    });

    if (this.els.copySourceBtn) {
      this.els.copySourceBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(this.els.sourceInput?.value || "");
        this.showToast("Source text copied!", "success");
      });
    }

    if (this.els.clearSourceBtn) {
      this.els.clearSourceBtn.addEventListener("click", () => {
        if (this.els.sourceInput) this.els.sourceInput.value = "";
        this.updateCharCounter();
        this.clearOutput();
      });
    }

    if (this.els.copyOutputBtn) {
      this.els.copyOutputBtn.addEventListener("click", () => {
        const text = this.els.outputText?.innerText || "";
        if (text && !text.includes("Translation appears here")) {
          navigator.clipboard.writeText(text);
          this.showToast("Translation copied!", "success");
        }
      });
    }

    window.addEventListener("scroll", () => this.closeAllDropdowns(), { passive: true });
    window.addEventListener("resize", () => this.closeAllDropdowns());

    if (this.els.speakOutputBtn) {
      this.els.speakOutputBtn.addEventListener("click", () => this.speakOutput());
    }
  }

  async doTranslate() {
    const text = this.els.sourceInput?.value?.trim();
    if (!text) {
      this.showToast("Please enter text to translate", "error");
      return;
    }

    const key = localStorage.getItem("azure_key") || "";
    const region = localStorage.getItem("azure_region") || "";
    if (!key || !region) {
      this.showToast("Pehle ⚙ Settings mein Azure Key enter karein!", "error");
      this.showSettingsModal();
      return;
    }

    if (this.isTranslating) return;
    this.setTranslating(true);

    const startTime = Date.now();
    try {
      const sourceLang = this.sourceLang.code === "auto" ? null : this.sourceLang.code;
      const result = await this.translator.translate(text, this.targetLang.code, sourceLang);
      this.onTranslationSuccess(result, text, Date.now() - startTime);
    } catch (err) {
      this.onTranslationError(err);
    } finally {
      this.setTranslating(false);
    }
  }

  async autoTranslate() {
    const text = this.els.sourceInput?.value?.trim();
    if (!text || text.length < 3) return;
    const key = localStorage.getItem("azure_key") || "";
    if (!key) return;
    await this.doTranslate();
  }

  onTranslationSuccess(result, sourceText, elapsedMs) {
    if (this.els.outputText) {
      this.els.outputText.innerHTML = `<span class="typing-cursor">${this.escapeHtml(
        result.translatedText
      )}</span>`;
      this.els.outputText.classList.add("translate-flash");
      setTimeout(() => this.els.outputText.classList.remove("translate-flash"), 500);
    }

    if (result.sourceLanguage && this.sourceLang.code === "auto") {
      const lang = AZURE_CONFIG.supportedLanguages.find((l) => l.code === result.sourceLanguage);
      if (this.els.detectedLang) {
        this.els.detectedLang.classList.add("visible");
        this.els.detectedText.textContent = `Detected: ${
          lang ? lang.flag + " " + lang.name : result.sourceLanguage
        }`;
      }
    }

    if (result.sourceConfidence !== null && this.els.confidenceBar) {
      this.els.confidenceBar.style.width = result.sourceConfidence + "%";
      this.els.confidenceValue.textContent = result.sourceConfidence + "%";
    }

    this.totalTranslations++;
    this.totalChars += sourceText.length;
    this.trackLangUsage(this.targetLang);
    this.addToHistory(sourceText, result.translatedText, result.sourceLanguage);
    this.updateMetrics(elapsedMs);

    this.requestData = [...this.requestData.slice(1), this.totalTranslations];
    this.charData = [...this.charData.slice(1), this.totalChars];

    if (window.dashboardCharts) {
      window.dashboardCharts.drawSparkline("reqSparkline", this.requestData, "cyan");
      window.dashboardCharts.drawSparkline("charSparkline", this.charData, "blue");
    }
  }

  onTranslationError(err) {
    const msg = err.message || "Translation failed";
    this.showToast(msg.substring(0, 120), "error");
    console.error("Translation error:", err);

    if (this.els.outputText) {
      this.els.outputText.innerHTML = `<span style="color:var(--neon-pink);font-size:0.85rem;">⚠ ${this.escapeHtml(
        msg
      )}</span>`;
    }

    if (
      msg.includes("401") ||
      msg.includes("Unauthorized") ||
      msg.includes("key") ||
      msg.includes("region") ||
      msg.includes("Settings")
    ) {
      this.updateStatus(false, "Azure auth failed — open Settings");
      setTimeout(() => this.showSettingsModal(), 500);
    } else if (msg.includes("Proxy server")) {
      this.updateStatus(false, "Proxy server offline");
    } else {
      this.updateStatus(false, "Translation failed");
    }
  }

  setTranslating(state) {
    this.isTranslating = state;
    if (this.els.translateBtn) {
      this.els.translateBtn.classList.toggle("loading", state);
      this.els.translateBtn.innerHTML = state ? "⏳" : "⚡";
    }
    if (!state && this.els.outputText) {
      setTimeout(() => {
        const cursor = this.els.outputText.querySelector(".typing-cursor");
        if (cursor) cursor.classList.remove("typing-cursor");
      }, 2000);
    }
  }

  clearOutput() {
    if (this.els.outputText) {
      this.els.outputText.innerHTML = `<span class="output-placeholder">Translation appears here...</span>`;
    }
    if (this.els.confidenceBar) this.els.confidenceBar.style.width = "0%";
    if (this.els.confidenceValue) this.els.confidenceValue.textContent = "0%";
    if (this.els.detectedLang) this.els.detectedLang.classList.remove("visible");
  }

  updateCharCounter() {
    const len = this.els.sourceInput?.value?.length || 0;
    const max = AZURE_CONFIG.rateLimit.charactersPerRequest;
    if (this.els.charCounter) {
      this.els.charCounter.textContent = `${len} / ${max}`;
      this.els.charCounter.className = "char-counter";
      if (len > max * 0.9) this.els.charCounter.classList.add("danger");
      else if (len > max * 0.7) this.els.charCounter.classList.add("warning");
    }
  }

  swapLanguages() {
    if (this.sourceLang.code === "auto") return;

    const tmp = this.sourceLang;
    this.sourceLang = this.targetLang;
    this.targetLang = tmp;

    const outText = this.els.outputText?.innerText || "";
    if (this.els.sourceInput && outText && !outText.includes("Translation")) {
      this.els.sourceInput.value = outText;
      this.clearOutput();
    }

    this.updateLangButtons();
    this.updateCharCounter();
    this.showToast(`Swapped: ${this.sourceLang.flag} ↔ ${this.targetLang.flag}`, "success");
  }

  toggleDropdown(pane) {
    const dd = pane === "source" ? this.els.sourceLangDD : this.els.targetLangDD;
    const btn = pane === "source" ? this.els.sourceLangBtn : this.els.targetLangBtn;
    const other = pane === "source" ? this.els.targetLangDD : this.els.sourceLangDD;

    if (other) {
      other.classList.remove("open");
      other.style.top = "";
      other.style.left = "";
      other.style.width = "";
      other.style.maxHeight = "";
    }

    if (!dd || !btn) return;

    const isOpen = dd.classList.contains("open");
    if (isOpen) {
      dd.classList.remove("open");
      dd.style.top = "";
      dd.style.left = "";
      dd.style.width = "";
      dd.style.maxHeight = "";
      return;
    }

    const rect = btn.getBoundingClientRect();
    const margin = 12;
    const gap = 6;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const dropdownWidth = Math.max(rect.width, 220);
    dd.style.width = dropdownWidth + "px";

    let left = rect.left;
    if (left + dropdownWidth > viewportWidth - margin) {
      left = viewportWidth - dropdownWidth - margin;
    }
    if (left < margin) left = margin;
    dd.style.left = left + "px";

    const spaceBelow = viewportHeight - rect.bottom - margin - gap;
    const spaceAbove = rect.top - margin - gap;

    let top;
    let maxHeight;

    if (spaceBelow >= 220 || spaceBelow >= spaceAbove) {
      top = rect.bottom + gap;
      maxHeight = Math.max(140, spaceBelow);
    } else {
      maxHeight = Math.max(140, spaceAbove);
      top = rect.top - Math.min(maxHeight, 320) - gap;
    }

    dd.style.top = `${Math.max(margin, top)}px`;
    dd.style.maxHeight = `${Math.min(maxHeight, 320)}px`;
    dd.scrollTop = 0;
    dd.classList.add("open");
  }

  closeAllDropdowns() {
    [this.els.sourceLangDD, this.els.targetLangDD].forEach((dd) => {
      if (!dd) return;
      dd.classList.remove("open");
      dd.style.top = "";
      dd.style.left = "";
      dd.style.width = "";
      dd.style.maxHeight = "";
    });
  }

  addToHistory(source, translation, detectedLang) {
    const entry = {
      id: Date.now(),
      source: source.substring(0, 60),
      translation: translation.substring(0, 60),
      sourceLang: detectedLang || this.sourceLang.code,
      targetLang: this.targetLang.code,
      targetFlag: this.targetLang.flag,
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    };
    this.history.unshift(entry);
    if (this.history.length > AZURE_CONFIG.dashboard.maxHistoryItems) this.history.pop();
    this.renderHistory();
  }

  renderHistory() {
    if (!this.els.historyList) return;

    if (this.history.length === 0) {
      this.els.historyList.innerHTML = `<div style="color:var(--text-muted);font-size:0.8rem;padding:1rem;text-align:center;">No translations yet</div>`;
      return;
    }

    this.els.historyList.innerHTML = this.history
      .slice(0, 8)
      .map(
        (h) => `
      <div class="history-item card-3d" onclick="app.loadHistoryItem(${h.id})">
        <div class="history-langs">${h.sourceLang.toUpperCase()} → ${h.targetFlag} ${h.targetLang.toUpperCase()}</div>
        <div class="history-preview">${this.escapeHtml(h.source)}</div>
        <div class="history-time">${h.time}</div>
      </div>`
      )
      .join("");
  }

  loadHistoryItem(id) {
    const item = this.history.find((h) => h.id === id);
    if (!item) return;
    if (this.els.sourceInput) this.els.sourceInput.value = item.source;
    if (this.els.outputText) this.els.outputText.textContent = item.translation;
  }

  trackLangUsage(lang) {
    this.langUsage[lang.code] = (this.langUsage[lang.code] || 0) + 1;
    this.renderLangStats();

    const uniqueLangs = Object.keys(this.langUsage).length;
    if (this.els.metricLanguages) this.els.metricLanguages.textContent = uniqueLangs;
    if (this.els.statLanguages) this.els.statLanguages.textContent = uniqueLangs;
  }

  renderLangStats() {
    if (!this.els.langStats) return;

    const sorted = Object.entries(this.langUsage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const max = sorted[0]?.[1] || 1;

    this.els.langStats.innerHTML = sorted
      .map(([code, count]) => {
        const lang = AZURE_CONFIG.supportedLanguages.find((l) => l.code === code);
        const pct = Math.round((count / max) * 100);
        return `
        <div class="lang-stat-item">
          <div class="lang-stat-flag">${lang?.flag || "🌐"}</div>
          <div class="lang-stat-info">
            <div class="lang-stat-name">${lang?.name || code}</div>
            <div class="lang-bar-track">
              <div class="lang-bar-fill" style="width:${pct}%"></div>
            </div>
          </div>
          <div class="lang-stat-count">${count}</div>
        </div>`;
      })
      .join("");
  }

  updateMetrics(elapsedMs) {
    if (this.els.metricTranslations) this.els.metricTranslations.textContent = this.totalTranslations;
    if (this.els.statTranslations) this.els.statTranslations.textContent = this.totalTranslations;

    if (this.els.metricChars) {
      this.els.metricChars.textContent =
        this.totalChars >= 1000 ? (this.totalChars / 1000).toFixed(1) + "K" : this.totalChars;
    }

    if (this.els.statChars) this.els.statChars.textContent = this.totalChars;
    if (this.els.metricAvgTime) this.els.metricAvgTime.textContent = elapsedMs + "ms";
  }

  speakOutput() {
    const text = this.els.outputText?.innerText;
    if (!text || text.includes("Translation appears here")) return;

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = this.targetLang.code;
      utter.rate = 0.9;
      window.speechSynthesis.speak(utter);
      this.showToast("Speaking translation...", "success");
    } else {
      this.showToast("TTS not supported in this browser", "error");
    }
  }

  showToast(message, type = "info") {
    if (!this.els.toastContainer) return;

    const icon = type === "success" ? "✓" : type === "error" ? "✗" : "ℹ";
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icon}</span><span>${this.escapeHtml(message)}</span>`;
    this.els.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(30px)";
      toast.style.transition = "all 0.3s";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  updateStatus(online, text) {
    if (this.els.statusDot) this.els.statusDot.classList.toggle("offline", !online);
    if (this.els.statusText) this.els.statusText.textContent = text;
  }

  startUptimeClock() {
    const start = Date.now();
    setInterval(() => {
      const secs = Math.floor((Date.now() - start) / 1000);
      const h = String(Math.floor(secs / 3600)).padStart(2, "0");
      const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
      const s = String(secs % 60).padStart(2, "0");
      if (this.els.statUptime) this.els.statUptime.textContent = `${h}:${m}:${s}`;
    }, 1000);
  }

  animateCounters() {
    const elements = document.querySelectorAll(".metric-number[data-target]");
    elements.forEach((el) => {
      const target = parseInt(el.dataset.target);
      let current = 0;
      const step = target / 60;
      const interval = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = Math.round(current);
        if (current >= target) clearInterval(interval);
      }, 16);
    });
  }

  initCharts() {
    setTimeout(() => {
      if (window.dashboardCharts) {
        const demoReq = [0, 2, 3, 5, 4, 7, 6, 8, 9, 11, 10, 12, 15, 14, 18, 16, 20, 22, 21, 24];
        const demoChar = [0, 50, 120, 200, 180, 250, 230, 310, 290, 380, 360, 420, 500, 480, 560, 540, 620, 680, 650, 720];

        window.dashboardCharts.drawSparkline("reqSparkline", demoReq, "cyan");
        window.dashboardCharts.drawSparkline("charSparkline", demoChar, "blue");
        window.dashboardCharts.drawDonut(
          "langDonut",
          [
            { value: 35, color: "#00f5ff" },
            { value: 25, color: "#0080ff" },
            { value: 20, color: "#00ff88" },
            { value: 12, color: "#ffd700" },
            { value: 8, color: "#8b00ff" },
          ],
          "LANG"
        );
        window.dashboardCharts.drawBarChart(
          "weeklyBar",
          ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          [12, 19, 8, 24, 17, 31, 22],
          "cyan"
        );
      }
    }, 500);
  }

  escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}

const app = new TranslatorDashboard();