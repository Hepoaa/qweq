// Gestor de Guardado Local Persistente (localStorage + respaldo window.name) y Sistema de Audio Híbrido (Kenney OGG + WebAudio Synth)
(function () {
  const SAVE_KEY = "aot_titan_jackpot_save_v1";

  function createDefaultSave() {
    return {
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tutorialSeen: false,
      resources: {
        tokens: 30,       // Fichas Aegis ficticias iniciales para probar la máquina o reservar
        steel: 60,        // Acero Táctico para mejoras de cuartel y nivel
        cores: 5,         // Núcleos Térmicos
        medkits: 3,       // Botiquines de campaña para las expediciones
        survivorsSaved: 0
      },
      stats: {
        expeditionsPlayed: 0,
        expeditionsExtracted: 0,
        bossesDefeated: 0,
        titansSlain: 0,
        napeCrits: 0,
        pullsCount: 0,
        pityRareCounter: 0,
        pityEpicCounter: 0
      },
      baseLevels: {
        taller: 1,
        enfermeria: 1,
        sala_mapas: 1,
        deposito_gas: 1
      },
      unlockedExpeditions: {
        exp_bosque: true,
        exp_muralla: false
      },
      units: {
        vanguardia: { level: 1, unlocked: true, weapon: "blade_std", module: "gas_std" },
        explorador: { level: 1, unlocked: true, weapon: "blade_std", module: "cloak_scout" },
        ingeniera:  { level: 1, unlocked: true, weapon: "blade_std", module: "gas_std" },
        medica:     { level: 1, unlocked: true, weapon: "blade_std", module: "cloak_scout" }
      },
      squadOrder: ["vanguardia", "explorador", "ingeniera", "medica"],
      inventory: {
        blade_std: 4,
        gas_std: 2,
        cloak_scout: 2
      },
      settings: {
        soundEnabled: true,
        volume: 0.75,
        reducedMotion: false,
        largeText: false,
        highContrast: false
      }
    };
  }

  function readRawSave() {
    try {
      const v = localStorage.getItem(SAVE_KEY);
      if (v) return v;
    } catch (e) {}
    try {
      if (window.name && window.name.startsWith("AOT_SAVE:")) {
        return window.name.slice("AOT_SAVE:".length);
      }
    } catch (e) {}
    return null;
  }

  function writeRawSave(jsonStr) {
    let saved = false;
    try {
      localStorage.setItem(SAVE_KEY, jsonStr);
      saved = true;
    } catch (e) {}
    try {
      window.name = "AOT_SAVE:" + jsonStr;
      saved = true;
    } catch (e) {}
    return saved;
  }

  window.StorageManager = {
    SAVE_KEY,
    hasSave() {
      return !!readRawSave();
    },
    load() {
      const def = createDefaultSave();
      try {
        const raw = readRawSave();
        if (!raw) return def;
        const parsed = JSON.parse(raw);
        return {
          ...def,
          ...parsed,
          resources: { ...def.resources, ...(parsed.resources || {}) },
          stats: { ...def.stats, ...(parsed.stats || {}) },
          baseLevels: { ...def.baseLevels, ...(parsed.baseLevels || {}) },
          unlockedExpeditions: { ...def.unlockedExpeditions, ...(parsed.unlockedExpeditions || {}) },
          units: { ...def.units, ...(parsed.units || {}) },
          inventory: { ...def.inventory, ...(parsed.inventory || {}) },
          settings: { ...def.settings, ...(parsed.settings || {}) }
        };
      } catch (e) {
        return def;
      }
    },
    save(state) {
      state.updatedAt = Date.now();
      return writeRawSave(JSON.stringify(state));
    },
    reset() {
      const fresh = createDefaultSave();
      this.save(fresh);
      return fresh;
    }
  };

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.htmlAudio = {};
      this.enabled = true;
      this.volume = 0.75;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      const bundleAudio = (window.GAME_ASSETS_BUNDLE && window.GAME_ASSETS_BUNDLE.audio) || {};
      const keys = ["click", "confirm", "error", "select", "toggle", "upgrade", "drop", "jackpot", "hit", "back"];
      keys.forEach((k) => {
        if (!this.htmlAudio[k]) {
          const a = new Audio();
          a.preload = "auto";
          a.src = bundleAudio[k] || `./assets/audio/${k}.ogg`;
          this.htmlAudio[k] = a;
        }
      });
    }

    applySettings(settings) {
      if (!settings) return;
      this.enabled = settings.soundEnabled !== false;
      this.volume = typeof settings.volume === "number" ? settings.volume : 0.75;
    }

    play(name) {
      if (!this.enabled || this.volume <= 0.01) return;
      this.init();

      if (this.htmlAudio[name]) {
        try {
          const clone = this.htmlAudio[name].cloneNode();
          clone.volume = Math.min(1, Math.max(0, this.volume));
          clone.play().catch(() => {});
        } catch (e) {}
      }

      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const gain = this.ctx.createGain();
      gain.connect(this.ctx.destination);
      const v = this.volume * 0.28;

      if (name === "slash" || name === "crit") {
        const osc = this.ctx.createOscillator();
        osc.type = name === "crit" ? "sawtooth" : "triangle";
        osc.frequency.setValueAtTime(name === "crit" ? 580 : 360, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + (name === "crit" ? 0.22 : 0.14));
        gain.gain.setValueAtTime(v, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (name === "crit" ? 0.24 : 0.15));
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (name === "grapple") {
        const osc = this.ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(720, now + 0.16);
        gain.gain.setValueAtTime(v * 0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.19);
      } else if (name === "roar") {
        const osc = this.ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.linearRampToValueAtTime(65, now + 0.35);
        gain.gain.setValueAtTime(v * 0.9, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    }
  }

  window.AudioManager = new AudioEngine();
})();
