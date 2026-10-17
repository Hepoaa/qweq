// Motor 2D de Exploración y Combate en Tiempo Real — AOT: Titan Jackpot (Bastión Aegis)
(function () {
  class AssetLoader {
    constructor() {
      this.images = {};
      this.loaded = false;
      this.error = null;
    }

    async loadAll() {
      if (this.loaded) return true;
      const bundle = window.GAME_ASSETS_BUNDLE || { sprites: {}, tiles: {}, particles: {}, ui: {} };
      const toLoad = [];

      const queueGroup = (groupObj, prefix, folder) => {
        Object.keys(groupObj).forEach((key) => {
          toLoad.push({
            id: `${prefix}_${key}`,
            src: groupObj[key],
            fallback: `./assets/${folder}/${key}.png`
          });
        });
      };

      queueGroup(bundle.sprites || {}, "sp", "sprites");
      queueGroup(bundle.tiles || {}, "tl", "tiles");
      queueGroup(bundle.particles || {}, "pt", "particles");
      queueGroup(bundle.ui || {}, "ui", "ui");

      const promises = toLoad.map((item) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            this.images[item.id] = img;
            resolve(true);
          };
          img.onerror = () => {
            if (img.src !== item.fallback) {
              img.src = item.fallback;
            } else {
              console.warn("No se pudo cargar imagen:", item.id);
              resolve(false);
            }
          };
          img.src = item.src || item.fallback;
        });
      });

      try {
        await Promise.all(promises);
        this.loaded = true;
        return true;
      } catch (err) {
        this.error = "Error al cargar los recursos gráficos del juego.";
        return false;
      }
    }

    get(id) {
      return this.images[id] || null;
    }
  }

  window.GameAssets = new AssetLoader();

  class CombatScene {
    constructor(canvas, callbacks) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.callbacks = callbacks || {};

      this.width = 920;
      this.height = 500;
      this.groundMinY = 145;
      this.groundMaxY = 455;

      this.running = false;
      this.paused = false;
      this.lastTime = 0;
      this.animTimer = 0;
      this.shakeTime = 0;
      this.shakeMag = 0;

      // Input state (PC Keyboard + Mobile Virtual Joystick)
      this.keys = {};
      this.joyVec = { x: 0, y: 0 };

      this.bindEvents();
    }

    bindEvents() {
      this.onKeyDown = (e) => {
        if (!this.running) return;
        const k = e.key.toLowerCase();
        this.keys[k] = true;

        if (k === "p" || k === "escape") {
          e.preventDefault();
          this.togglePause();
          return;
        }
        if (this.paused) return;

        if (k === " " || k === "shift") {
          e.preventDefault();
          this.triggerGrappleDodge();
        } else if (k === "j" || k === "z" || k === "enter") {
          e.preventDefault();
          this.triggerAttack();
        } else if (k === "k" || k === "e" || k === "x") {
          e.preventDefault();
          this.triggerSkill();
        } else if (k === "l" || k === "q" || k === "c") {
          e.preventDefault();
          this.triggerConsumable();
        } else if (k === "r") {
          e.preventDefault();
          if (this.extractionReady) {
            this.callbacks.onRequestExtract && this.callbacks.onRequestExtract();
          }
        } else if (["1", "2", "3", "4"].includes(k)) {
          const idx = parseInt(k, 10) - 1;
          this.switchUnit(idx);
        }
      };

      this.onKeyUp = (e) => {
        const k = e.key.toLowerCase();
        this.keys[k] = false;
      };

      this.onBlur = () => {
        this.keys = {};
        this.joyVec = { x: 0, y: 0 };
        if (this.running && !this.paused) {
          this.setPaused(true);
        }
      };

      window.addEventListener("keydown", this.onKeyDown);
      window.addEventListener("keyup", this.onKeyUp);
      window.addEventListener("blur", this.onBlur);
      document.addEventListener("visibilitychange", () => {
        if (document.hidden && this.running && !this.paused) {
          this.setPaused(true);
        }
      });
    }

    startNode(nodeData, squadState, saveState, tempBuffs) {
      this.node = nodeData;
      this.squad = squadState; // Array of 4 live unit objects
      this.saveState = saveState;
      this.tempBuffs = tempBuffs || { atkMult: 1.0 };

      // Pick first living unit
      this.activeIdx = this.squad.findIndex((u) => u.hp > 0);
      if (this.activeIdx < 0) this.activeIdx = 0;

      // Player position
      this.player = {
        x: 165,
        y: 310,
        vx: 0,
        vy: 0,
        facing: 1, // 1 = right, -1 = left
        anim: "idle",
        animTime: 0,
        attackTimer: 0,
        dodgeTimer: 0,
        invulnTimer: 0,
        grappleTarget: null,
        shieldHp: 0,
        speedBuffTimer: 0
      };

      // Build scenery props (anchor trees/pillars along top & bottom edges)
      this.anchors = [];
      for (let i = 0; i < 8; i++) {
        this.anchors.push({
          x: 90 + i * 110,
          y: i % 2 === 0 ? 115 : 128,
          kind: nodeData.biome === "forest" ? "tree_giant" : "wall_cracked"
        });
      }

      // Spawn breakable supply crates
      this.crates = [];
      const crateCount = nodeData.crates || 2;
      for (let i = 0; i < crateCount; i++) {
        this.crates.push({
          x: 280 + i * 210 + (i % 2) * 35,
          y: 205 + ((i * 97) % 210),
          opened: false
        });
      }

      // Spawn rescuable survivors
      this.survivors = [];
      const survCount = nodeData.survivors || 1;
      for (let i = 0; i < survCount; i++) {
        this.survivors.push({
          x: 340 + i * 240,
          y: 390 - i * 120,
          progress: 0,
          rescued: false
        });
      }

      // Spawn Enemies & Boss
      this.enemies = [];
      const list = [...(nodeData.enemies || [])];
      list.forEach((eId, idx) => {
        const tmpl = window.GAME_DATA.enemies[eId];
        if (!tmpl) return;
        this.enemies.push({
          uid: `enem_${idx}_${Date.now()}`,
          isBoss: false,
          template: tmpl,
          name: tmpl.name,
          spriteRow: tmpl.spriteRow,
          x: 640 + idx * 95,
          y: 230 + (idx % 3) * 85,
          hp: tmpl.hp,
          maxHp: tmpl.hp,
          atk: tmpl.atk,
          spd: tmpl.spd,
          state: "move", // move, windup, attack, vulnerable, defeat
          stateTimer: 0,
          attackCooldown: 1.5 + idx * 0.6,
          markedTimer: 0,
          dead: false
        });
      });

      if (nodeData.type === "boss" && nodeData.bossId) {
        const bTmpl = window.GAME_DATA.bosses[nodeData.bossId];
        if (bTmpl) {
          this.enemies.push({
            uid: `boss_${nodeData.bossId}`,
            isBoss: true,
            template: bTmpl,
            name: bTmpl.name,
            title: bTmpl.title,
            spriteRow: bTmpl.spriteRow,
            x: 740,
            y: 300,
            hp: bTmpl.hp,
            maxHp: bTmpl.hp,
            atk: bTmpl.atk,
            spd: bTmpl.spd,
            state: "move",
            stateTimer: 0,
            attackCooldown: 2.0,
            markedTimer: 0,
            dead: false
          });
        }
      }

      this.particles = [];
      this.floatingTexts = [];
      this.projectiles = [];
      this.nodeLoot = { tokens: 0, steel: 0, cores: 0, survivors: 0 };
      this.stageCleared = false;
      this.extractionReady = false;
      this.extractionZone = { x: 835, y: 295, radius: 56 };

      this.running = true;
      this.paused = false;
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.loop(t));
    }

    stop() {
      this.running = false;
    }

    togglePause() {
      this.setPaused(!this.paused);
    }

    setPaused(val) {
      this.paused = val;
      if (!this.paused) {
        this.lastTime = performance.now();
      }
      this.callbacks.onPauseChange && this.callbacks.onPauseChange(this.paused);
    }

    getActiveUnit() {
      return this.squad[this.activeIdx] || this.squad[0];
    }

    switchUnit(idx) {
      if (idx < 0 || idx >= this.squad.length) return;
      if (this.squad[idx].hp <= 0 || idx === this.activeIdx) return;
      this.activeIdx = idx;
      this.player.invulnTimer = 0.45;
      window.AudioManager.play("select");
      this.addFloatingText(this.player.x, this.player.y - 48, `¡RELEVO: ${this.squad[idx].name.split(" ")[0]}!`, "#7bed9f");
      this.callbacks.onHudUpdate && this.callbacks.onHudUpdate();
    }

    triggerGrappleDodge() {
      if (!this.running || this.paused) return;
      const u = this.getActiveUnit();
      if (!u || u.hp <= 0) return;
      const gasCost = 16;
      if (u.gas < gasCost) {
        window.AudioManager.play("error");
        this.addFloatingText(this.player.x, this.player.y - 36, "¡GAS INSUFICIENTE!", "#ff6b6b");
        return;
      }
      u.gas = Math.max(0, u.gas - gasCost);
      window.AudioManager.play("grapple");

      // Determine grapple direction: if a living enemy is nearby and player isn't holding a direction, zip behind the enemy's nape!
      let dirX = this.joyVec.x;
      let dirY = this.joyVec.y;
      if (this.keys["w"] || this.keys["arrowup"]) dirY -= 1;
      if (this.keys["s"] || this.keys["arrowdown"]) dirY += 1;
      if (this.keys["a"] || this.keys["arrowleft"]) dirX -= 1;
      if (this.keys["d"] || this.keys["arrowright"]) dirX += 1;

      const nearestEnemy = this.getNearestEnemy();
      let targetAnchor = { x: this.player.x + this.player.facing * 160, y: 120 };

      if (Math.abs(dirX) < 0.1 && Math.abs(dirY) < 0.1 && nearestEnemy) {
        // Auto-flank maneuver toward the enemy's back (right side of enemy since enemies face left)
        const flankX = Math.min(this.width - 50, nearestEnemy.x + 62);
        const flankY = nearestEnemy.y;
        const dx = flankX - this.player.x;
        const dy = flankY - this.player.y;
        const len = Math.hypot(dx, dy) || 1;
        dirX = dx / len;
        dirY = dy / len;
        targetAnchor = { x: nearestEnemy.x + 25, y: nearestEnemy.y - 45 };
        this.addFloatingText(this.player.x, this.player.y - 42, "¡MANIOBRA A LA NUCA!", "#70a1ff");
      } else {
        const len = Math.hypot(dirX, dirY) || 1;
        dirX = (dirX || this.player.facing) / len;
        dirY = dirY / len;
        targetAnchor = { x: this.player.x + dirX * 150, y: Math.max(95, this.player.y - 90) };
      }

      this.player.vx = dirX * 520;
      this.player.vy = dirY * 420;
      this.player.dodgeTimer = 0.28;
      this.player.invulnTimer = 0.45;
      this.player.grappleTarget = targetAnchor;
      this.player.anim = "move";
      this.player.animTime = 0;

      // Spawn gas smoke & cable spark particles
      this.spawnParticle("smoke", this.player.x - dirX * 18, this.player.y, 0.35, 42);
      this.spawnParticle("spark", targetAnchor.x, targetAnchor.y, 0.25, 34);
      this.callbacks.onHudUpdate && this.callbacks.onHudUpdate();
    }

    triggerAttack() {
      if (!this.running || this.paused) return;
      const u = this.getActiveUnit();
      if (!u || u.hp <= 0 || this.player.attackTimer > 0) return;

      this.player.attackTimer = 0.32;
      this.player.anim = "attack";
      this.player.animTime = 0;
      window.AudioManager.play("slash");

      // Check breakable crates
      this.crates.forEach((c) => {
        if (!c.opened && Math.hypot(c.x - this.player.x, c.y - this.player.y) < 75) {
          c.opened = true;
          this.nodeLoot.tokens += 5;
          this.nodeLoot.steel += 8;
          u.gas = Math.min(u.maxGas, u.gas + 30);
          window.AudioManager.play("drop");
          this.spawnParticle("star", c.x, c.y - 10, 0.45, 44);
          this.addFloatingText(c.x, c.y - 24, "+5 Fichas · +8 Acero · +30 Gas", "#ffd32a");
        }
      });

      // Hit enemies in range
      const atkRange = u.id === "ingeniera" ? 135 : 98;
      const baseDmg = Math.round(u.atk * (this.tempBuffs.atkMult || 1.0));

      let hitAny = false;
      this.enemies.forEach((en) => {
        if (en.dead) return;
        const dist = Math.hypot(en.x - this.player.x, en.y - this.player.y);
        if (dist <= atkRange + (en.isBoss ? 28 : 12)) {
          hitAny = true;
          this.applyDamageToEnemy(en, baseDmg, false);
        }
      });

      if (hitAny) {
        this.spawnParticle("slash", this.player.x + this.player.facing * 36, this.player.y - 18, 0.22, 54);
      }
      this.callbacks.onHudUpdate && this.callbacks.onHudUpdate();
    }

    triggerSkill() {
      if (!this.running || this.paused) return;
      const u = this.getActiveUnit();
      if (!u || u.hp <= 0) return;

      if (u.skillCd > 0) {
        window.AudioManager.play("error");
        this.addFloatingText(this.player.x, this.player.y - 36, `HABILIDAD EN RECARGA (${u.skillCd.toFixed(1)}s)`, "#ff9f43");
        return;
      }
      if (u.gas < u.skill.gasCost) {
        window.AudioManager.play("error");
        this.addFloatingText(this.player.x, this.player.y - 36, "¡GAS INSUFICIENTE PARA HABILIDAD!", "#ff6b6b");
        return;
      }

      u.gas = Math.max(0, u.gas - u.skill.gasCost);
      u.skillCd = u.skill.cooldown;
      this.player.anim = "skill";
      this.player.animTime = 0;
      this.player.attackTimer = 0.42;

      const baseDmg = Math.round(u.atk * (this.tempBuffs.atkMult || 1.0));
      const target = this.getNearestEnemy();

      if (u.id === "vanguardia") {
        // Torbellino de Acero: teleport behind target, invulnerable spin, guaranteed critical nape strike!
        this.player.invulnTimer = 0.8;
        window.AudioManager.play("crit");
        if (target) {
          this.player.x = Math.min(this.width - 55, target.x + 48);
          this.player.y = target.y;
          this.player.facing = -1;
          this.spawnParticle("slash_2", target.x, target.y - 25, 0.45, 86);
          this.applyDamageToEnemy(target, Math.round(baseDmg * 2.6), true);
        }
        this.addFloatingText(this.player.x, this.player.y - 54, "¡TORBELLINO DE ACERO!", "#70a1ff");

      } else if (u.id === "explorador") {
        // Impulso Relámpago: +45 gas, speed buff, marks enemy weak spot for 5s
        u.gas = Math.min(u.maxGas, u.gas + 45);
        this.player.speedBuffTimer = 5.0;
        window.AudioManager.play("upgrade");
        this.spawnParticle("flare", this.player.x, this.player.y - 20, 0.45, 72);
        this.enemies.forEach((en) => {
          if (!en.dead) {
            en.markedTimer = 5.5;
            en.state = "vulnerable";
            en.stateTimer = 4.0;
          }
        });
        this.addFloatingText(this.player.x, this.player.y - 54, "¡IMPULSO Y MARCA EN NUCA!", "#ffd32a");

      } else if (u.id === "ingeniera") {
        // Lanza Trueno Perforante: fires explosive thermal harpoon that shatters boss armor and forces vulnerable state!
        window.AudioManager.play("crit");
        if (target) {
          this.spawnParticle("fire", target.x, target.y - 24, 0.5, 92);
          this.spawnParticle("spark", target.x, target.y - 24, 0.4, 76);
          target.state = "vulnerable";
          target.stateTimer = 4.8;
          this.applyDamageToEnemy(target, Math.round(baseDmg * 2.4), true);
          this.addFloatingText(target.x, target.y - 68, "¡LANZA TRUENO: CORAZA ROTA!", "#ff7f50");
        } else {
          this.addFloatingText(this.player.x, this.player.y - 48, "¡LANZA TRUENO LISTA!", "#ff7f50");
        }

      } else if (u.id === "medica") {
        // Bengala de Auxilio y Suero: heals all living squad units +35% HP & grants 65 shield
        window.AudioManager.play("confirm");
        this.squad.forEach((member) => {
          if (member.hp > 0) {
            const healAmt = Math.round(member.maxHp * 0.35);
            member.hp = Math.min(member.maxHp, member.hp + healAmt);
          }
        });
        this.player.shieldHp = 65;
        this.spawnParticle("magic", this.player.x, this.player.y - 20, 0.55, 84);
        this.addFloatingText(this.player.x, this.player.y - 54, "¡SUERO Y ESCUDO TÁCTICO (+35% PV)!", "#2ed573");
      }

      this.callbacks.onHudUpdate && this.callbacks.onHudUpdate();
    }

    triggerConsumable() {
      if (!this.running || this.paused) return;
      const u = this.getActiveUnit();
      if (!u || u.hp <= 0) return;

      if (this.saveState.resources.medkits <= 0) {
        window.AudioManager.play("error");
        this.addFloatingText(this.player.x, this.player.y - 36, "¡SIN BOTIQUINES DISPONIBLES!", "#ff6b6b");
        return;
      }

      this.saveState.resources.medkits -= 1;
      const enfLvl = (this.saveState.baseLevels && this.saveState.baseLevels.enfermeria) || 1;
      const healPct = 0.45 * (1 + (enfLvl - 1) * 0.15);
      const healAmt = Math.round(u.maxHp * healPct);
      u.hp = Math.min(u.maxHp, u.hp + healAmt);
      u.gas = Math.min(u.maxGas, u.gas + 50);

      window.AudioManager.play("confirm");
      this.spawnParticle("star", this.player.x, this.player.y - 24, 0.45, 56);
      this.addFloatingText(this.player.x, this.player.y - 46, `+${healAmt} PV · +50 GAS`, "#2ed573");
      this.callbacks.onHudUpdate && this.callbacks.onHudUpdate();
    }

    applyDamageToEnemy(en, rawDmg, forceWeakPoint) {
      const u = this.getActiveUnit();
      // Enemy faces left (-1), so attacking from the right side (player.x > en.x - 8) hits the Nape (back of neck)!
      const isBehind = this.player.x > en.x - 8;
      const isVulnerable = en.state === "vulnerable";
      const isWeakHit = forceWeakPoint || isBehind || isVulnerable;

      let finalDmg = rawDmg;
      if (en.markedTimer > 0) {
        finalDmg *= 1.5;
      }

      if (isWeakHit) {
        finalDmg = Math.round(finalDmg * (u ? u.critMult : 2.4));
        this.saveState.stats.napeCrits = (this.saveState.stats.napeCrits || 0) + 1;
        window.AudioManager.play("crit");
        this.triggerShake(0.18, 6);
        this.spawnParticle("flare", en.x + 12, en.y - 36, 0.35, 62);
        this.addFloatingText(en.x, en.y - 58, `¡IMPACTO EN LA NUCA! -${finalDmg}`, "#ffd32a");
      } else {
        const frontMult = en.template.frontDamageMultiplier || 0.65;
        finalDmg = Math.max(1, Math.round(finalDmg * frontMult));
        window.AudioManager.play("hit");
        this.spawnParticle("spark", en.x - 18, en.y - 20, 0.25, 38);
        this.addFloatingText(en.x - 10, en.y - 42, `-${finalDmg} (Blindaje Frontal)`, "#ced6e0");
      }

      en.hp = Math.max(0, en.hp - finalDmg);
      if (en.hp <= 0 && !en.dead) {
        en.dead = true;
        en.state = "defeat";
        en.stateTimer = 0.9;
        this.nodeLoot.tokens += en.template.rewardTokens || 8;
        this.nodeLoot.steel += en.template.rewardSteel || 12;
        this.nodeLoot.cores += en.template.rewardCores || 1;
        this.saveState.stats.titansSlain = (this.saveState.stats.titansSlain || 0) + 1;
        if (en.isBoss) {
          this.saveState.stats.bossesDefeated = (this.saveState.stats.bossesDefeated || 0) + 1;
        }
        this.spawnParticle("smoke", en.x, en.y - 20, 0.7, 96);
        this.addFloatingText(en.x, en.y - 72, `¡ABATIDO! +${en.template.rewardTokens} Fichas`, "#7bed9f");
      }
    }

    getNearestEnemy() {
      let best = null;
      let bestDist = Infinity;
      this.enemies.forEach((en) => {
        if (en.dead) return;
        const d = Math.hypot(en.x - this.player.x, en.y - this.player.y);
        if (d < bestDist) {
          bestDist = d;
          best = en;
        }
      });
      return best;
    }

    triggerShake(duration, magnitude) {
      if (this.saveState && this.saveState.settings && this.saveState.settings.reducedMotion) {
        return;
      }
      this.shakeTime = duration;
      this.shakeMag = magnitude;
    }

    spawnParticle(type, x, y, duration, size) {
      this.particles.push({ type, x, y, duration, maxDuration: duration, size });
    }

    addFloatingText(x, y, text, color) {
      this.floatingTexts.push({ x, y, text, color: color || "#ffffff", timer: 1.15 });
    }

    loop(timestamp) {
      if (!this.running) return;
      const dt = Math.min(0.05, Math.max(0.001, (timestamp - this.lastTime) / 1000));
      this.lastTime = timestamp;

      if (!this.paused) {
        this.update(dt);
      }
      this.render();

      if (this.running) {
        requestAnimationFrame((t) => this.loop(t));
      }
    }

    update(dt) {
      this.animTimer += dt;
      if (this.shakeTime > 0) this.shakeTime = Math.max(0, this.shakeTime - dt);

      const u = this.getActiveUnit();
      if (!u) return;

      // Passive Gas regeneration & skill cooldowns across squad
      const gasLvl = (this.saveState.baseLevels && this.saveState.baseLevels.deposito_gas) || 1;
      const gasRegen = 7.5 * (1 + (gasLvl - 1) * 0.12);
      this.squad.forEach((member) => {
        if (member.hp > 0) {
          member.gas = Math.min(member.maxGas, member.gas + gasRegen * dt);
          if (member.skillCd > 0) {
            member.skillCd = Math.max(0, member.skillCd - dt);
          }
        }
      });

      // Player timers
      if (this.player.attackTimer > 0) this.player.attackTimer = Math.max(0, this.player.attackTimer - dt);
      if (this.player.invulnTimer > 0) this.player.invulnTimer = Math.max(0, this.player.invulnTimer - dt);
      if (this.player.speedBuffTimer > 0) this.player.speedBuffTimer = Math.max(0, this.player.speedBuffTimer - dt);

      if (this.player.dodgeTimer > 0) {
        this.player.dodgeTimer = Math.max(0, this.player.dodgeTimer - dt);
        this.player.x += this.player.vx * dt;
        this.player.y += this.player.vy * dt;
        if (this.player.dodgeTimer <= 0) {
          this.player.grappleTarget = null;
        }
      } else {
        // Normal movement
        let mx = this.joyVec.x;
        let my = this.joyVec.y;
        if (this.keys["w"] || this.keys["arrowup"]) my -= 1;
        if (this.keys["s"] || this.keys["arrowdown"]) my += 1;
        if (this.keys["a"] || this.keys["arrowleft"]) mx -= 1;
        if (this.keys["d"] || this.keys["arrowright"]) mx += 1;

        const len = Math.hypot(mx, my);
        if (len > 0.05) {
          mx /= Math.max(1, len);
          my /= Math.max(1, len);
          const spdMult = this.player.speedBuffTimer > 0 ? 1.35 : 1.0;
          this.player.x += mx * u.spd * spdMult * dt;
          this.player.y += my * u.spd * spdMult * dt;
          if (Math.abs(mx) > 0.1) this.player.facing = mx > 0 ? 1 : -1;
          if (this.player.attackTimer <= 0) this.player.anim = "move";
        } else if (this.player.attackTimer <= 0) {
          this.player.anim = "idle";
        }
      }

      this.player.x = Math.max(40, Math.min(this.width - 40, this.player.x));
      this.player.y = Math.max(this.groundMinY, Math.min(this.groundMaxY, this.player.y));

      // Rescue survivors by proximity
      this.survivors.forEach((sv) => {
        if (sv.rescued) return;
        const d = Math.hypot(sv.x - this.player.x, sv.y - this.player.y);
        if (d < 68) {
          sv.progress = Math.min(1, sv.progress + dt * 0.85);
          if (sv.progress >= 1) {
            sv.rescued = true;
            this.nodeLoot.survivors += 1;
            this.nodeLoot.tokens += 10;
            this.saveState.resources.survivorsSaved = (this.saveState.resources.survivorsSaved || 0) + 1;
            window.AudioManager.play("confirm");
            this.spawnParticle("star", sv.x, sv.y - 20, 0.5, 58);
            this.addFloatingText(sv.x, sv.y - 36, "¡SUPERVIVIENTE RESCATADO! +10 Fichas", "#7bed9f");
          }
        }
      });

      // Update enemies & bosses
      let livingEnemies = 0;
      this.enemies.forEach((en) => {
        if (en.dead) {
          en.stateTimer = Math.max(0, en.stateTimer - dt);
          return;
        }
        livingEnemies += 1;
        if (en.markedTimer > 0) en.markedTimer = Math.max(0, en.markedTimer - dt);

        const dist = Math.hypot(this.player.x - en.x, this.player.y - en.y);

        if (en.state === "vulnerable") {
          en.stateTimer -= dt;
          if (en.stateTimer <= 0) {
            en.state = "move";
            en.attackCooldown = 1.6;
          }
        } else if (en.state === "windup") {
          en.stateTimer -= dt;
          if (en.stateTimer <= 0) {
            // Execute telegraphed attack!
            en.state = "attack";
            en.stateTimer = 0.45;
            window.AudioManager.play("roar");
            this.spawnParticle("dirt", en.x - 45, en.y, 0.45, 78);

            // Check if player is inside danger zone
            const hitRadius = en.template.attackRange || 105;
            const impactX = en.isBoss && en.template.id === "coloso_vapor" ? en.x : en.x - 36;
            const dHit = Math.hypot(this.player.x - impactX, this.player.y - en.y);
            if (dHit <= hitRadius) {
              if (this.player.invulnTimer > 0) {
                this.addFloatingText(this.player.x, this.player.y - 44, "¡ESQUIVA PERFECTA!", "#70a1ff");
              } else {
                this.damagePlayer(en.atk);
              }
            }
          }
        } else if (en.state === "attack") {
          en.stateTimer -= dt;
          if (en.stateTimer <= 0) {
            // After heavy attack, enemy becomes VULNERABLE (Nape exposed!)
            en.state = "vulnerable";
            en.stateTimer = en.template.vulnerableTime || 3.5;
            this.addFloatingText(en.x, en.y - 58, "¡NUCA EXPUESTA!", "#ff6b6b");
          }
        } else {
          // Move toward player
          en.attackCooldown = Math.max(0, en.attackCooldown - dt);
          const triggerDist = (en.template.attackRange || 95) - 10;
          if (dist <= triggerDist && en.attackCooldown <= 0) {
            en.state = "windup";
            en.stateTimer = en.template.windupTime || 1.25;
          } else {
            const dx = this.player.x - en.x;
            const dy = this.player.y - en.y;
            const l = Math.hypot(dx, dy) || 1;
            en.x += (dx / l) * en.spd * dt;
            en.y += (dy / l) * en.spd * dt;
            en.x = Math.max(90, Math.min(this.width - 60, en.x));
            en.y = Math.max(this.groundMinY + 20, Math.min(this.groundMaxY, en.y));
          }
        }
      });

      // Check stage completion -> activate Extraction Point!
      if (livingEnemies === 0 && !this.stageCleared) {
        this.stageCleared = true;
        this.extractionReady = true;
        window.AudioManager.play("jackpot");
        this.addFloatingText(this.width / 2, 130, "¡ZONA DESPEJADA! BENGALA DE EXTRACCIÓN ACTIVA", "#2ed573");
        this.callbacks.onStageCleared && this.callbacks.onStageCleared(this.nodeLoot);
      }

      // Check if player steps into extraction beacon after clearing
      if (this.extractionReady) {
        const dExt = Math.hypot(this.player.x - this.extractionZone.x, this.player.y - this.extractionZone.y);
        if (dExt < this.extractionZone.radius) {
          this.running = false;
          this.callbacks.onNodeCompleted && this.callbacks.onNodeCompleted(this.nodeLoot);
          return;
        }
      }

      // Update particles & floating texts
      this.particles.forEach((p) => { p.duration -= dt; });
      this.particles = this.particles.filter((p) => p.duration > 0);

      this.floatingTexts.forEach((ft) => {
        ft.timer -= dt;
        ft.y -= 24 * dt;
      });
      this.floatingTexts = this.floatingTexts.filter((ft) => ft.timer > 0);
    }

    damagePlayer(rawAtk) {
      const u = this.getActiveUnit();
      if (!u) return;
      let dmg = rawAtk;

      if (this.player.shieldHp > 0) {
        const absorbed = Math.min(this.player.shieldHp, dmg);
        this.player.shieldHp -= absorbed;
        dmg -= absorbed;
      }

      if (dmg > 0) {
        u.hp = Math.max(0, u.hp - dmg);
        this.player.anim = "hit";
        this.player.invulnTimer = 0.65;
        this.triggerShake(0.2, 7);
        window.AudioManager.play("hit");
        this.addFloatingText(this.player.x, this.player.y - 40, `-${dmg} PV`, "#ff4757");
      } else {
        this.addFloatingText(this.player.x, this.player.y - 40, "¡ABSORBIDO POR ESCUDO!", "#70a1ff");
      }

      if (u.hp <= 0) {
        // Check if another squad member is alive
        const nextLiving = this.squad.findIndex((m) => m.hp > 0);
        if (nextLiving >= 0) {
          this.activeIdx = nextLiving;
          this.player.invulnTimer = 1.2;
          this.addFloatingText(this.player.x, this.player.y - 56, `¡CAÍDO! ENTRA ${this.squad[nextLiving].name.split(" ")[0]}`, "#ffa502");
        } else {
          // Squad defeated -> tactical retreat (keeps all banked loot + 50% unbanked loot)
          this.running = false;
          window.AudioManager.play("error");
          this.callbacks.onSquadDefeated && this.callbacks.onSquadDefeated(this.nodeLoot);
        }
      }
      this.callbacks.onHudUpdate && this.callbacks.onHudUpdate();
    }

    render() {
      const ctx = this.ctx;
      ctx.save();
      ctx.imageSmoothingEnabled = false;

      if (this.shakeTime > 0) {
        const ox = (Math.random() - 0.5) * 2 * this.shakeMag;
        const oy = (Math.random() - 0.5) * 2 * this.shakeMag;
        ctx.translate(ox, oy);
      }

      // 1. Draw tiled background (Forest or Outer Wall Ruins)
      const isForest = !this.node || this.node.biome === "forest";
      ctx.fillStyle = isForest ? "#2c3e28" : "#353238";
      ctx.fillRect(0, 0, this.width, this.height);

      const groundTile = window.GameAssets.get(isForest ? "tl_grass_1" : "tl_cobble_1");
      const roadTile = window.GameAssets.get(isForest ? "tl_dirt_1" : "tl_stone_floor_1");
      const wallTile = window.GameAssets.get("tl_wall_mid");

      if (groundTile) {
        for (let y = 96; y < this.height; y += 32) {
          for (let x = 0; x < this.width; x += 32) {
            const isRoad = y >= 256 && y <= 352;
            ctx.drawImage(isRoad && roadTile ? roadTile : groundTile, x, y, 32, 32);
          }
        }
      }

      // Top fortified wall / treeline border
      ctx.fillStyle = "#1b2028";
      ctx.fillRect(0, 0, this.width, 108);
      if (wallTile) {
        for (let x = 0; x < this.width; x += 32) {
          ctx.drawImage(wallTile, x, 44, 32, 32);
          ctx.drawImage(wallTile, x, 76, 32, 32);
        }
      }

      // Draw anchor trees / ruins pillars
      this.anchors.forEach((a) => {
        const aImg = window.GameAssets.get(`tl_${a.kind}`);
        if (aImg) {
          ctx.drawImage(aImg, a.x - 24, a.y - 56, 48, 76);
        }
      });

      // 2. Draw Breakable Supply Crates
      this.crates.forEach((c) => {
        const cImg = window.GameAssets.get(c.opened ? "tl_crate_open" : "tl_crate_closed");
        if (cImg) {
          ctx.drawImage(cImg, c.x - 18, c.y - 24, 36, 36);
        }
        if (!c.opened) {
          ctx.fillStyle = "rgba(255, 215, 70, 0.9)";
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("SUMINISTRO", c.x, c.y - 28);
        }
      });

      // 3. Draw Survivors with rescue progress ring
      const propsSheet = window.GameAssets.get("sp_props_sheet");
      const frame4 = Math.floor(this.animTimer * 5) % 4;
      this.survivors.forEach((sv) => {
        if (sv.rescued) return;
        ctx.save();
        ctx.strokeStyle = "#ffd32a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sv.x, sv.y, 44, 0, Math.PI * 2);
        ctx.stroke();

        if (propsSheet) {
          ctx.drawImage(propsSheet, frame4 * 64, 128, 64, 64, sv.x - 28, sv.y - 48, 56, 56);
        }
        ctx.fillStyle = "#ffeaa7";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`SUPERVIVIENTE (${Math.round(sv.progress * 100)}%)`, sv.x, sv.y - 52);
        ctx.restore();
      });

      // 4. Draw Extraction Zone (Green Smoke Flare Beacon)
      if (this.extractionReady) {
        const ez = this.extractionZone;
        ctx.save();
        ctx.fillStyle = "rgba(46, 213, 115, 0.18)";
        ctx.strokeStyle = "#2ed573";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(ez.x, ez.y, ez.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (propsSheet) {
          ctx.drawImage(propsSheet, frame4 * 64, 64, 64, 64, ez.x - 32, ez.y - 48, 64, 64);
        }
        ctx.fillStyle = "#7bed9f";
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("PUNTO DE AVANCE / EXTRACCIÓN", ez.x, ez.y - 56);
        ctx.fillText("Acércate para completar zona", ez.x, ez.y + ez.radius + 16);
        ctx.restore();
      }

      // 5. Draw Enemy Attack Telegraphs (Danger Zones on Ground)
      this.enemies.forEach((en) => {
        if (en.dead || en.state !== "windup") return;
        const hitRadius = en.template.attackRange || 105;
        const impactX = en.isBoss && en.template.id === "coloso_vapor" ? en.x : en.x - 36;
        const pct = 1 - Math.max(0, en.stateTimer / (en.template.windupTime || 1.25));

        ctx.save();
        ctx.fillStyle = "rgba(255, 71, 87, 0.24)";
        ctx.strokeStyle = "#ff4757";
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(impactX, en.y, hitRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner expanding fill showing exact timing
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(255, 107, 129, 0.35)";
        ctx.beginPath();
        ctx.arc(impactX, en.y, hitRadius * pct, 0, Math.PI * 2);
        ctx.fill();

        // Explicit textual warning (accessibility: never color alone!)
        ctx.fillStyle = "#ffbe76";
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(en.template.attackLabel || "¡ATAQUE INMINENTE! ESQUIVA CON ESPACIO", impactX, en.y - hitRadius - 10);
        ctx.restore();
      });

      // 6. Draw ODM Grapple Cables if active
      if (this.player.grappleTarget) {
        ctx.save();
        ctx.strokeStyle = "#dfe4ea";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(this.player.x, this.player.y - 18);
        ctx.lineTo(this.player.grappleTarget.x, this.player.grappleTarget.y);
        ctx.stroke();
        ctx.restore();
      }

      // 7. Draw Enemies & Bosses (from enemies_sheet & bosses_sheet)
      const enemSheet = window.GameAssets.get("sp_enemies_sheet");
      const bossSheet = window.GameAssets.get("sp_bosses_sheet");
      const animMap = { idle: 0, move: 1, windup: 2, attack: 3, vulnerable: 4, defeat: 5 };

      this.enemies.forEach((en) => {
        if (en.dead && en.stateTimer <= 0) return;
        const sheet = en.isBoss ? bossSheet : enemSheet;
        const fw = en.isBoss ? 112 : 80;
        const drawSize = en.isBoss ? 136 : 92;
        const aCol = (animMap[en.state] || 0) * 4 + (Math.floor(this.animTimer * 6) % 4);

        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.beginPath();
        ctx.ellipse(en.x, en.y + 6, drawSize * 0.35, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        if (sheet) {
          ctx.drawImage(
            sheet,
            aCol * fw,
            en.spriteRow * fw,
            fw,
            fw,
            en.x - drawSize / 2,
            en.y - drawSize + 14,
            drawSize,
            drawSize
          );
        }

        // Draw Nape Weak Point Indicator on right side (back of neck)
        if (!en.dead) {
          const napeX = en.x + (en.isBoss ? 22 : 14);
          const napeY = en.y - (en.isBoss ? 72 : 48);
          const isVuln = en.state === "vulnerable" || en.markedTimer > 0;
          ctx.save();
          ctx.fillStyle = isVuln ? "#ff4757" : "rgba(255, 165, 2, 0.85)";
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(napeX, napeY, isVuln ? 9 : 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          if (isVuln) {
            ctx.fillStyle = "#ffd32a";
            ctx.font = "bold 11px sans-serif";
            ctx.textAlign = "left";
            ctx.fillText("◀ NUCA [CRÍTICO]", napeX + 12, napeY + 4);
          }
          ctx.restore();

          // HP Bar + State Label
          const bw = en.isBoss ? 130 : 76;
          const bx = en.x - bw / 2;
          const by = en.y - drawSize + 2;
          ctx.fillStyle = "rgba(15, 18, 24, 0.85)";
          ctx.fillRect(bx - 1, by - 1, bw + 2, 10);
          ctx.fillStyle = en.isBoss ? "#ff6b6b" : "#eccc68";
          ctx.fillRect(bx, by, Math.max(0, (en.hp / en.maxHp) * bw), 8);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`${en.name} (${en.hp}/${en.maxHp})`, en.x, by - 4);
        }
      });

      // 8. Draw Active Explorer Sprite
      const u = this.getActiveUnit();
      const expSheet = window.GameAssets.get("sp_explorers_sheet");
      const pAnimMap = { idle: 0, move: 1, attack: 2, skill: 3, hit: 4, defeat: 5 };
      if (u && expSheet) {
        const pCol = (pAnimMap[this.player.anim] || 0) * 4 + (Math.floor(this.animTimer * 8) % 4);
        ctx.save();
        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.beginPath();
        ctx.ellipse(this.player.x, this.player.y + 4, 22, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tactical shield ring if active
        if (this.player.shieldHp > 0) {
          ctx.strokeStyle = "#2ed573";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(this.player.x, this.player.y - 28, 34, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.translate(this.player.x, this.player.y);
        if (this.player.facing < 0) {
          ctx.scale(-1, 1);
        }
        ctx.drawImage(expSheet, pCol * 64, u.spriteRow * 64, 64, 64, -38, -68, 76, 76);
        ctx.restore();
      }

      // 9. Draw Particles
      this.particles.forEach((p) => {
        const pImg = window.GameAssets.get(`pt_${p.type}`);
        if (pImg) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.duration / p.maxDuration);
          ctx.drawImage(pImg, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      // 10. Draw Floating Combat Texts
      this.floatingTexts.forEach((ft) => {
        ctx.save();
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.strokeStyle = "#10141a";
        ctx.lineWidth = 3;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      // 11. Top Tactical Objective Banner inside Canvas
      ctx.fillStyle = "rgba(16, 20, 28, 0.86)";
      ctx.fillRect(14, 10, this.width - 28, 30);
      ctx.strokeStyle = "#c59b27";
      ctx.strokeRect(14, 10, this.width - 28, 30);
      ctx.fillStyle = "#f1f2f6";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "left";
      const objTxt = this.extractionReady
        ? "OBJETIVO: Dirígete a la Bengala Verde (derecha) o pulsa EXTRAER / AVANZAR"
        : `OBJETIVO: Abate a los Colosos (${this.enemies.filter((e) => !e.dead).length} restantes) · Flanquea con [ESPACIO] para golpear la NUCA`;
      ctx.fillText(objTxt, 26, 30);

      ctx.restore();
    }
  }

  window.CombatScene = CombatScene;
})();
