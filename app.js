// Controlador Principal de Pantallas, Progresión, Expediciones y Máquina de Suministros — AOT: Titan Jackpot
(function () {
  class GameApp {
    constructor() {
      this.hasExistingSave = window.StorageManager.hasSave();
      this.state = window.StorageManager.load();
      this.currentScreen = "menu"; // menu, base, squad, machine, collection, map, combat, results
      this.modalHtml = null;
      this.modalBind = null;

      // Active expedition runtime state
      this.expRun = null;
      this.combatScene = null;
      this.lastSpinResults = null;
      this.isSpinning = false;
    }

    async init() {
      this.applyAccessibilitySettings();
      window.AudioManager.applySettings(this.state.settings);

      const ok = await window.GameAssets.loadAll();
      if (!ok) {
        const root = document.getElementById("app-root");
        if (root) {
          root.innerHTML = `<div class="screen-panel"><h2>Error de Carga</h2><p>${window.GameAssets.error || "No se pudieron cargar los recursos."}</p></div>`;
        }
        return;
      }

      this.render();
      if (!this.state.tutorialSeen) {
        // Show brief tutorial modal on first launch when entering base
      }
    }

    save() {
      // Unlock Expedition 2 automatically if Sala de Mapas >= 2
      if (this.state.baseLevels.sala_mapas >= 2) {
        this.state.unlockedExpeditions.exp_muralla = true;
      }
      window.StorageManager.save(this.state);
      this.hasExistingSave = true;
    }

    applyAccessibilitySettings() {
      const s = this.state.settings || {};
      document.body.classList.toggle("large-text", !!s.largeText);
      document.body.classList.toggle("high-contrast", !!s.highContrast);
    }

    getImgSrc(type, key) {
      const bundle = window.GAME_ASSETS_BUNDLE || {};
      if (bundle[type] && bundle[type][key]) {
        return bundle[type][key];
      }
      return `./assets/${type}/${key}.png`;
    }

    computeUnitStats(unitId) {
      const tmpl = window.GAME_DATA.explorers.find((e) => e.id === unitId);
      const uSave = this.state.units[unitId] || { level: 1, weapon: "blade_std", module: "gas_std" };
      const lvl = uSave.level || 1;

      const wep = window.GAME_DATA.equipmentCatalog.find((i) => i.id === uSave.weapon) || { atkBonus: 0, hpBonus: 0, gasBonus: 0, critBonus: 0 };
      const mod = window.GAME_DATA.equipmentCatalog.find((i) => i.id === uSave.module) || { atkBonus: 0, hpBonus: 0, gasBonus: 0, critBonus: 0 };

      const tallerLvl = this.state.baseLevels.taller || 1;
      const enfLvl = this.state.baseLevels.enfermeria || 1;
      const gasLvl = this.state.baseLevels.deposito_gas || 1;

      const rawHp = tmpl.baseStats.hp + (lvl - 1) * tmpl.growth.hp + wep.hpBonus + mod.hpBonus;
      const rawAtk = tmpl.baseStats.atk + (lvl - 1) * tmpl.growth.atk + wep.atkBonus + mod.atkBonus;
      const rawGas = tmpl.baseStats.maxGas + (lvl - 1) * tmpl.growth.maxGas + wep.gasBonus + mod.gasBonus + (gasLvl - 1) * 15;

      const maxHp = Math.round(rawHp * (1 + (enfLvl - 1) * 0.12));
      const atk = Math.round(rawAtk * (1 + (tallerLvl - 1) * 0.10));
      const maxGas = Math.round(rawGas);
      const critMult = +(tmpl.baseStats.critMult + (wep.critBonus || 0) + (mod.critBonus || 0)).toFixed(2);

      return {
        id: tmpl.id,
        name: tmpl.name,
        role: tmpl.role,
        roleBadge: tmpl.roleBadge,
        rarity: tmpl.rarity,
        spriteRow: tmpl.spriteRow,
        level: lvl,
        maxHp,
        hp: maxHp,
        atk,
        spd: tmpl.baseStats.spd,
        maxGas,
        gas: maxGas,
        critMult,
        skill: tmpl.skill,
        skillCd: 0,
        weapon: wep,
        module: mod,
        lore: tmpl.lore
      };
    }

    navigate(screen) {
      if (this.combatScene) {
        this.combatScene.stop();
        this.combatScene = null;
      }
      window.AudioManager.play("click");
      this.currentScreen = screen;
      this.render();
      if (screen === "base" && !this.state.tutorialSeen) {
        this.state.tutorialSeen = true;
        this.save();
        this.openTutorialModal();
      }
    }

    renderHeaderAndNav() {
      const r = this.state.resources;
      const brand = window.GAME_DATA.brand;
      const showNav = !["menu", "combat", "results"].includes(this.currentScreen);

      return `
        <header class="top-header">
          <div class="brand-block">
            <div class="brand-crest">⚔</div>
            <div>
              <div class="brand-title">${brand.workingTitle}</div>
              <div class="brand-sub">${brand.subtitle}</div>
            </div>
          </div>
          <div class="resource-bar">
            <div class="res-pill tokens" title="Fichas ficticias ganadas en expediciones">🪙 Fichas Aegis: <span>${r.tokens}</span></div>
            <div class="res-pill steel" title="Material para mejoras de cuartel y nivel">⚙ Acero: <span>${r.steel}</span></div>
            <div class="res-pill cores" title="Núcleos térmicos de colosos">🔥 Núcleos: <span>${r.cores}</span></div>
            <div class="res-pill medkits" title="Botiquines para curar en expedición">➕ Botiquines: <span>${r.medkits}</span></div>
            ${this.currentScreen !== "menu" ? `<button class="btn" id="btn-top-menu">Menú</button>` : ""}
          </div>
        </header>
        ${showNav ? `
          <nav class="nav-tabs" aria-label="Navegación del Cuartel">
            <button class="btn ${this.currentScreen === "base" ? "active-tab" : ""}" data-nav="base">🏰 Cuartel / Base</button>
            <button class="btn ${this.currentScreen === "squad" ? "active-tab" : ""}" data-nav="squad">⚔ Escuadra (${this.state.squadOrder.length})</button>
            <button class="btn ${this.currentScreen === "map" ? "active-tab" : ""} primary" data-nav="map">🗺 Iniciar Expedición</button>
            <button class="btn ${this.currentScreen === "machine" ? "active-tab" : ""}" data-nav="machine">🎰 Máquina Suministros</button>
            <button class="btn ${this.currentScreen === "collection" ? "active-tab" : ""}" data-nav="collection">📖 Colección y Bestiario</button>
            <button class="btn" id="btn-nav-tutorial">❓ Tutorial</button>
          </nav>
        ` : ""}
      `;
    }

    render() {
      const root = document.getElementById("app-root");
      if (!root) return;

      let screenContent = "";
      if (this.currentScreen === "menu") screenContent = this.renderMenuScreen();
      else if (this.currentScreen === "base") screenContent = this.renderBaseScreen();
      else if (this.currentScreen === "squad") screenContent = this.renderSquadScreen();
      else if (this.currentScreen === "machine") screenContent = this.renderMachineScreen();
      else if (this.currentScreen === "collection") screenContent = this.renderCollectionScreen();
      else if (this.currentScreen === "map") screenContent = this.renderMapScreen();
      else if (this.currentScreen === "combat") screenContent = this.renderCombatScreen();
      else if (this.currentScreen === "results") screenContent = this.renderResultsScreen();

      root.innerHTML = `
        ${this.renderHeaderAndNav()}
        ${screenContent}
        ${this.modalHtml ? `<div class="modal-backdrop" id="modal-backdrop">${this.modalHtml}</div>` : ""}
      `;

      this.bindCommonEvents();
      if (this.currentScreen === "combat") {
        this.mountCombatCanvas();
      }
      if (this.modalBind) {
        this.modalBind();
      }
    }

    bindCommonEvents() {
      const topMenuBtn = document.getElementById("btn-top-menu");
      if (topMenuBtn) {
        topMenuBtn.onclick = () => {
          if (this.currentScreen === "combat") {
            this.openConfirmModal(
              "¿Abandonar combate y volver al menú?",
              "Si abandonas la expedición fuera de un punto de extracción, conservarás tu progreso y exploradores, pero perderás el 50% del botín no asegurado en esta ruta.",
              () => {
                this.finishExpedition("defeat");
              }
            );
          } else {
            this.navigate("menu");
          }
        };
      }

      document.querySelectorAll("[data-nav]").forEach((btn) => {
        btn.onclick = () => this.navigate(btn.getAttribute("data-nav"));
      });

      const tutBtn = document.getElementById("btn-nav-tutorial");
      if (tutBtn) tutBtn.onclick = () => this.openTutorialModal();

      // Bind screen-specific actions
      if (this.currentScreen === "menu") this.bindMenuEvents();
      else if (this.currentScreen === "base") this.bindBaseEvents();
      else if (this.currentScreen === "squad") this.bindSquadEvents();
      else if (this.currentScreen === "machine") this.bindMachineEvents();
      else if (this.currentScreen === "collection") this.bindCollectionEvents();
      else if (this.currentScreen === "map") this.bindMapEvents();
      else if (this.currentScreen === "results") this.bindResultsEvents();
    }

    // ==================== 1. MENÚ PRINCIPAL ====================
    renderMenuScreen() {
      const s = this.state.stats;
      return `
        <main class="screen-panel">
          <div class="grid-2" style="align-items: center;">
            <div style="display:flex; flex-direction:column; gap:14px;">
              <span class="badge legendario" style="align-self:flex-start;">VERSIÓN COMPLETA JUGABLE · PC Y MÓVIL</span>
              <h1 style="font-size:2rem; color:var(--accent-gold); line-height:1.15;">${window.GAME_DATA.brand.workingTitle}</h1>
              <p style="color:var(--text-muted); font-size:0.98rem;">
                Dirige una escuadra de élite del <strong>Bastión Aegis</strong> en expediciones fuera de la muralla.
                Domina los cables de maniobra tridimensional, flanquea la <strong>nuca</strong> de los Colosos, extrae suministros con bengalas verdes y utiliza tus <strong>Fichas Aegis</strong> en la Tómbola Militar.
              </p>

              <div style="display:flex; flex-direction:column; gap:10px; max-width:380px; margin-top:4px;">
                ${this.hasExistingSave ? `
                  <button class="btn success" id="btn-menu-continue" style="font-size:1.05rem;">▶ Continuar Partida Guardada</button>
                  <button class="btn primary" id="btn-menu-play">🏰 Ir al Cuartel Aegis</button>
                  <button class="btn" id="btn-menu-newgame">🔄 Nueva Operación (Reiniciar)</button>
                ` : `
                  <button class="btn primary" id="btn-menu-play" style="font-size:1.08rem;">▶ Jugar — Iniciar Operación</button>
                `}
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                  <button class="btn" id="btn-menu-tutorial" style="flex:1;">❓ Tutorial</button>
                  <button class="btn" id="btn-menu-options" style="flex:1;">⚙ Opciones</button>
                  <button class="btn" id="btn-menu-credits" style="flex:1;">📜 Créditos</button>
                </div>
              </div>

              <div class="card" style="margin-top:6px; font-size:0.85rem;">
                <strong style="color:var(--accent-gold);">Registro de Mando Local:</strong>
                <span>Expediciones: <strong>${s.expeditionsPlayed}</strong> · Extracciones: <strong>${s.expeditionsExtracted}</strong> · Jefes Abatidos: <strong>${s.bossesDefeated}</strong> · Cortes a Nuca: <strong>${s.napeCrits}</strong></span>
                <span style="color:var(--text-muted); font-size:0.78rem;">${window.GAME_DATA.brand.disclaimer}</span>
              </div>
            </div>

            <div class="card highlight">
              <div class="section-title" style="font-size:1.05rem;">Escuadra de Exploración y Colosos</div>
              <div class="grid-2" style="grid-template-columns: repeat(2, 1fr); gap:10px;">
                <div class="sprite-preview-box">
                  <img src="${this.getImgSrc("sprites", "vanguardia")}" alt="Capitán Kaelen Vance" />
                </div>
                <div class="sprite-preview-box">
                  <img src="${this.getImgSrc("sprites", "ingeniera")}" alt="Ingeniera Valeria Krost" />
                </div>
                <div class="sprite-preview-box">
                  <img src="${this.getImgSrc("sprites", "acorazado")}" alt="Jefe Acorazado de Basalto" />
                </div>
                <div class="sprite-preview-box">
                  <img src="${this.getImgSrc("sprites", "supply_machine")}" alt="Tómbola de Suministros" />
                </div>
              </div>
              <p style="font-size:0.82rem; color:var(--text-muted); text-align:center;">
                Sprites originales en pixel-art con hojas de animación completas y tiles CC0 integrados.
              </p>
            </div>
          </div>
        </main>
      `;
    }

    bindMenuEvents() {
      const playBtn = document.getElementById("btn-menu-play");
      if (playBtn) playBtn.onclick = () => this.navigate("base");

      const contBtn = document.getElementById("btn-menu-continue");
      if (contBtn) contBtn.onclick = () => this.navigate(this.expRun ? "map" : "base");

      const newBtn = document.getElementById("btn-menu-newgame");
      if (newBtn) {
        newBtn.onclick = () => {
          this.openConfirmModal(
            "¿Iniciar Nueva Operación desde cero?",
            "Se reiniciarán las mejoras del cuartel, niveles y fichas al estado inicial. Esta acción reemplazará tu partida guardada actual.",
            () => {
              this.state = window.StorageManager.reset();
              this.expRun = null;
              this.navigate("base");
            }
          );
        };
      }

      const tutBtn = document.getElementById("btn-menu-tutorial");
      if (tutBtn) tutBtn.onclick = () => this.openTutorialModal();

      const optBtn = document.getElementById("btn-menu-options");
      if (optBtn) optBtn.onclick = () => this.openOptionsModal();

      const credBtn = document.getElementById("btn-menu-credits");
      if (credBtn) credBtn.onclick = () => this.openCreditsModal();
    }

    // ==================== 2. CUARTEL / BASE ====================
    renderBaseScreen() {
      const facilitiesHtml = window.GAME_DATA.baseFacilities.map((fac) => {
        const lvl = this.state.baseLevels[fac.id] || 1;
        const isMax = lvl >= fac.maxLevel;
        const costSteel = fac.baseCostSteel * lvl;
        const costCores = fac.baseCostCores * lvl;
        const canAfford = !isMax && this.state.resources.steel >= costSteel && this.state.resources.cores >= costCores;

        return `
          <div class="card ${lvl > 1 ? "highlight" : ""}">
            <div style="display:flex; align-items:center; gap:12px;">
              <img src="${this.getImgSrc("tiles", fac.iconTile)}" alt="${fac.name}" style="width:44px; height:44px;" />
              <div style="flex:1;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <strong style="font-size:1.02rem; color:var(--accent-gold);">${fac.name}</strong>
                  <span class="badge ${isMax ? "legendario" : "raro"}">Nivel ${lvl}/${fac.maxLevel}</span>
                </div>
                <div style="font-size:0.83rem; color:var(--accent-green); font-weight:700; margin-top:2px;">
                  Efecto actual: ${fac.effectLabel(lvl)}
                </div>
              </div>
            </div>
            <p style="font-size:0.86rem; color:var(--text-muted);">${fac.description}</p>
            <div style="margin-top:auto; display:flex; justify-content:space-between; align-items:center; gap:8px; padding-top:6px; border-top:1px solid var(--border-muted);">
              ${isMax ? `
                <span style="color:var(--accent-gold); font-weight:700; font-size:0.85rem;">✔ Instalación al Nivel Máximo</span>
              ` : `
                <div style="font-size:0.82rem;">
                  Coste Nv.${lvl + 1}: <strong>⚙ ${costSteel} Acero</strong> · <strong>🔥 ${costCores} Núcleos</strong>
                </div>
                <button class="btn ${canAfford ? "success" : ""}" data-upgrade-fac="${fac.id}" ${!canAfford ? "disabled" : ""}>
                  ⬆ Mejorar a Nv.${lvl + 1}
                </button>
              `}
            </div>
          </div>
        `;
      }).join("");

      return `
        <main class="screen-panel">
          <div class="section-header">
            <div>
              <h2 class="section-title">🏰 Cuartel General — Bastión Aegis</h2>
              <p style="font-size:0.88rem; color:var(--text-muted);">
                Mejora las instalaciones de la ciudad amurallada para fortalecer a tu escuadra y desbloquear nuevas rutas de expedición.
              </p>
            </div>
            <div style="display:flex; gap:8px;">
              <button class="btn primary" data-nav="map">🗺 Desplegar Expedición</button>
              <button class="btn" id="btn-base-options">⚙ Opciones</button>
            </div>
          </div>

          <div class="grid-2">
            ${facilitiesHtml}
          </div>
        </main>
      `;
    }

    bindBaseEvents() {
      const optBtn = document.getElementById("btn-base-options");
      if (optBtn) optBtn.onclick = () => this.openOptionsModal();

      document.querySelectorAll("[data-upgrade-fac]").forEach((btn) => {
        btn.onclick = () => {
          const facId = btn.getAttribute("data-upgrade-fac");
          const fac = window.GAME_DATA.baseFacilities.find((f) => f.id === facId);
          const lvl = this.state.baseLevels[facId] || 1;
          if (!fac || lvl >= fac.maxLevel) return;

          const costSteel = fac.baseCostSteel * lvl;
          const costCores = fac.baseCostCores * lvl;
          if (this.state.resources.steel < costSteel || this.state.resources.cores < costCores) {
            window.AudioManager.play("error");
            return;
          }

          this.state.resources.steel -= costSteel;
          this.state.resources.cores -= costCores;
          this.state.baseLevels[facId] = lvl + 1;
          window.AudioManager.play("upgrade");
          this.save();
          this.render();
        };
      });
    }

    // ==================== 3. PREPARACIÓN DE ESCUADRA ====================
    renderSquadScreen() {
      const weapons = window.GAME_DATA.equipmentCatalog.filter((i) => i.slot === "weapon" && (this.state.inventory[i.id] || 0) > 0);
      const modules = window.GAME_DATA.equipmentCatalog.filter((i) => i.slot === "module" && (this.state.inventory[i.id] || 0) > 0);

      const cardsHtml = this.state.squadOrder.map((unitId, orderIdx) => {
        const st = this.computeUnitStats(unitId);
        const uSave = this.state.units[unitId];
        const lvlCostSteel = st.level * 20;
        const canLvl = this.state.resources.steel >= lvlCostSteel && st.level < 10;

        return `
          <div class="card ${orderIdx === 0 ? "highlight" : ""}">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span class="badge ${st.rarity === "Épico" ? "epico" : "raro"}">${st.roleBadge}</span>
              <span style="font-size:0.8rem; font-weight:700; color:var(--accent-gold);">
                ${orderIdx === 0 ? "★ LÍDER EN CAMPO (Tecla 1)" : `Relevo #${orderIdx + 1} (Tecla ${orderIdx + 1})`}
              </span>
            </div>

            <div class="sprite-preview-box">
              <img src="${this.getImgSrc("sprites", unitId)}" alt="${st.name}" />
            </div>

            <div>
              <h3 style="font-size:1.08rem; color:var(--text-main);">${st.name} <span style="color:var(--accent-gold);">Nv.${st.level}</span></h3>
              <p style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">${st.lore}</p>
            </div>

            <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:6px; background:#181f2b; padding:8px; border-radius:6px; font-size:0.82rem;">
              <div>❤️ Vida Máx: <strong>${st.maxHp}</strong></div>
              <div>⚔ Ataque: <strong>${st.atk}</strong></div>
              <div>💨 Gas Máx: <strong>${st.maxGas}</strong></div>
              <div>🎯 Crítico Nuca: <strong>×${st.critMult}</strong></div>
            </div>

            <div style="background:#1c2534; border-left:3px solid var(--accent-blue); padding:7px 9px; font-size:0.8rem; border-radius:4px;">
              <strong>Habilidad [K]: ${st.skill.name}</strong> (${st.skill.cooldown}s · ${st.skill.gasCost} Gas)<br/>
              <span style="color:var(--text-muted);">${st.skill.description}</span>
            </div>

            <div style="display:flex; flex-direction:column; gap:6px; font-size:0.82rem;">
              <label>Arma Equipada:
                <select class="btn" style="width:100%; min-height:36px; padding:4px 8px; margin-top:3px;" data-equip-unit="${unitId}" data-equip-slot="weapon">
                  ${weapons.map((w) => `<option value="${w.id}" ${uSave.weapon === w.id ? "selected" : ""}>${w.name} (+${w.atkBonus} ATQ, +${Math.round(w.critBonus*100)}% Crít)</option>`).join("")}
                </select>
              </label>
              <label>Módulo de Maniobra:
                <select class="btn" style="width:100%; min-height:36px; padding:4px 8px; margin-top:3px;" data-equip-unit="${unitId}" data-equip-slot="module">
                  ${modules.map((m) => `<option value="${m.id}" ${uSave.module === m.id ? "selected" : ""}>${m.name} (+${m.hpBonus} PV, +${m.gasBonus} Gas)</option>`).join("")}
                </select>
              </label>
            </div>

            <div style="display:flex; gap:8px; margin-top:auto; padding-top:6px;">
              <button class="btn ${canLvl ? "success" : ""}" style="flex:1; font-size:0.82rem;" data-lvl-unit="${unitId}" ${!canLvl ? "disabled" : ""}>
                ${st.level >= 10 ? "Nivel Máx" : `⬆ Subir Nv.${st.level + 1} (⚙ ${lvlCostSteel})`}
              </button>
              ${orderIdx > 0 ? `<button class="btn" style="font-size:0.82rem;" data-promote-unit="${unitId}" title="Colocar como explorador inicial">★ Líder</button>` : ""}
            </div>
          </div>
        `;
      }).join("");

      const canBuyMedkit = this.state.resources.steel >= 15;

      return `
        <main class="screen-panel">
          <div class="section-header">
            <div>
              <h2 class="section-title">⚔ Preparación de Escuadra y Equipo</h2>
              <p style="font-size:0.88rem; color:var(--text-muted);">
                Entrena a tus 4 exploradores, equipa armas y módulos obtenidos en la Máquina de Suministros y elige quién lidera el despliegue.
              </p>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button class="btn ${canBuyMedkit ? "success" : ""}" id="btn-craft-medkit" ${!canBuyMedkit ? "disabled" : ""}>
                ➕ Fabricar Botiquín (⚙ 15 Acero)
              </button>
              <button class="btn primary" data-nav="map">🗺 Ir al Mapa de Expedición</button>
            </div>
          </div>

          <div class="grid-4">
            ${cardsHtml}
          </div>
        </main>
      `;
    }

    bindSquadEvents() {
      const medBtn = document.getElementById("btn-craft-medkit");
      if (medBtn) {
        medBtn.onclick = () => {
          if (this.state.resources.steel < 15) return;
          this.state.resources.steel -= 15;
          this.state.resources.medkits += 1;
          window.AudioManager.play("confirm");
          this.save();
          this.render();
        };
      }

      document.querySelectorAll("[data-lvl-unit]").forEach((btn) => {
        btn.onclick = () => {
          const uId = btn.getAttribute("data-lvl-unit");
          const u = this.state.units[uId];
          const cost = u.level * 20;
          if (this.state.resources.steel < cost || u.level >= 10) return;
          this.state.resources.steel -= cost;
          u.level += 1;
          window.AudioManager.play("upgrade");
          this.save();
          this.render();
        };
      });

      document.querySelectorAll("[data-promote-unit]").forEach((btn) => {
        btn.onclick = () => {
          const uId = btn.getAttribute("data-promote-unit");
          this.state.squadOrder = [uId, ...this.state.squadOrder.filter((id) => id !== uId)];
          window.AudioManager.play("select");
          this.save();
          this.render();
        };
      });

      document.querySelectorAll("[data-equip-unit]").forEach((sel) => {
        sel.onchange = () => {
          const uId = sel.getAttribute("data-equip-unit");
          const slot = sel.getAttribute("data-equip-slot");
          this.state.units[uId][slot] = sel.value;
          window.AudioManager.play("click");
          this.save();
          this.render();
        };
      });
    }

    // ==================== 4. MÁQUINA DE SUMINISTROS (TÓMBOLA AEGIS) ====================
    renderMachineScreen() {
      const m = window.GAME_DATA.supplyMachine;
      const tokens = this.state.resources.tokens;
      const canSingle = tokens >= m.costSingle && !this.isSpinning;
      const canMulti = tokens >= m.costMulti5 && !this.isSpinning;

      const probRows = m.probabilities.map((p) => `
        <div style="display:flex; flex-direction:column; gap:2px; padding:8px 10px; background:#181f2c; border-left:4px solid ${p.color}; border-radius:5px;">
          <div style="display:flex; justify-content:space-between; font-weight:800; font-size:0.86rem;">
            <span style="color:${p.color};">${p.badgeText}</span>
            <span>Probabilidad Visible: ${p.chancePercent}%</span>
          </div>
          <span style="font-size:0.8rem; color:var(--text-muted);">${p.description}</span>
        </div>
      `).join("");

      const resultsHtml = this.lastSpinResults ? `
        <div class="card highlight" style="margin-top:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:var(--accent-gold);">🎁 Suministros Recibidos (${this.lastSpinResults.length}):</strong>
            <span style="font-size:0.8rem; color:var(--accent-green);">✔ Guardado automáticamente</span>
          </div>
          <div class="grid-2" style="grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap:8px;">
            ${this.lastSpinResults.map((res) => `
              <div style="background:#171e2b; border:1px solid var(--border-muted); border-radius:6px; padding:8px; font-size:0.82rem;">
                <span class="badge ${res.rarityClass}">${res.rarityLabel}</span>
                <div style="font-weight:800; margin-top:4px; color:var(--text-main);">${res.title}</div>
                <div style="color:var(--text-muted); font-size:0.78rem;">${res.detail}</div>
              </div>
            `).join("")}
          </div>
        </div>
      ` : "";

      return `
        <main class="screen-panel">
          <div class="section-header">
            <div>
              <h2 class="section-title">🎰 Máquina de Suministros — Tómbola Táctica Aegis</h2>
              <p style="font-size:0.86rem; color:var(--text-muted);">
                Canjea las <strong>Fichas Aegis</strong> obtenidas en tus expediciones por equipamiento, módulos y materiales.
                <strong>100% ficticio, sin dinero real ni compras.</strong> Los objetos repetidos se convierten automáticamente en Acero y Núcleos.
              </p>
            </div>
          </div>

          <div class="jackpot-layout">
            <div class="machine-stage">
              <img src="${this.getImgSrc("sprites", "supply_machine")}" alt="Máquina de Suministros Militar" style="width:150px; height:150px;" />

              <div class="reels-row" id="machine-reels">
                <div class="reel-slot"><span style="font-size:1.5rem;">⚔</span><span>ARMA</span></div>
                <div class="reel-slot"><span style="font-size:1.5rem;">🛡</span><span>MÓDULO</span></div>
                <div class="reel-slot"><span style="font-size:1.5rem;">👑</span><span>JACKPOT</span></div>
              </div>

              <div style="font-size:0.84rem; color:var(--text-muted);">
                Tiradas acumuladas: <strong>${this.state.stats.pullsCount}</strong> ·
                Garantía Épica/Legendaria en: <strong>${25 - (this.state.stats.pityEpicCounter % 25)}</strong> tiradas
              </div>

              <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center; width:100%;">
                <button class="btn primary" id="btn-pull-1" ${!canSingle ? "disabled" : ""} style="flex:1; min-width:170px;">
                  🪙 Suministro ×1 (${m.costSingle} Fichas)
                </button>
                <button class="btn success" id="btn-pull-5" ${!canMulti ? "disabled" : ""} style="flex:1; min-width:190px;">
                  🪙 Lote Táctico ×5 (${m.costMulti5} Fichas · Ahorras 5)
                </button>
              </div>
              ${tokens < m.costSingle ? `<p style="color:var(--accent-orange); font-size:0.82rem;">Necesitas al menos ${m.costSingle} Fichas Aegis. ¡Juega una expedición para conseguir más!</p>` : ""}
            </div>

            <div style="display:flex; flex-direction:column; gap:10px;">
              <h3 style="font-size:1.05rem; color:var(--accent-gold);">📊 Tabla Transparente de Probabilidades y Premios</h3>
              ${probRows}
              <div class="card" style="font-size:0.81rem; color:var(--text-muted);">
                <strong style="color:var(--text-main);">Política Anti-Duplicados Activa:</strong>
                Si obtienes un arma o módulo que ya tienes en cantidad suficiente para tu escuadra (máx. 4 copias), se transforma al instante en
                <strong>+15 a +100 de Acero Táctico</strong> y <strong>+1 a +12 Núcleos Térmicos</strong> según su rareza.
              </div>
            </div>
          </div>

          ${resultsHtml}
        </main>
      `;
    }

    bindMachineEvents() {
      const btn1 = document.getElementById("btn-pull-1");
      const btn5 = document.getElementById("btn-pull-5");
      if (btn1) btn1.onclick = () => this.executeSupplyPulls(1, window.GAME_DATA.supplyMachine.costSingle);
      if (btn5) btn5.onclick = () => this.executeSupplyPulls(5, window.GAME_DATA.supplyMachine.costMulti5);
    }

    executeSupplyPulls(count, totalCost) {
      if (this.state.resources.tokens < totalCost || this.isSpinning) return;
      this.state.resources.tokens -= totalCost;
      window.AudioManager.play("jackpot");

      const results = [];
      for (let i = 0; i < count; i++) {
        this.state.stats.pullsCount += 1;
        this.state.stats.pityRareCounter += 1;
        this.state.stats.pityEpicCounter += 1;

        let roll = Math.random() * 100;
        let rarity = "Común";
        if (this.state.stats.pityEpicCounter >= 25 || roll < 4) {
          rarity = roll < 4 ? "Legendario" : "Épico";
          this.state.stats.pityEpicCounter = 0;
          this.state.stats.pityRareCounter = 0;
        } else if (roll < 18) {
          rarity = "Épico";
          this.state.stats.pityEpicCounter = 0;
          this.state.stats.pityRareCounter = 0;
        } else if (this.state.stats.pityRareCounter >= 10 || roll < 50) {
          rarity = "Raro";
          this.state.stats.pityRareCounter = 0;
        }

        const pool = window.GAME_DATA.equipmentCatalog.filter((it) => it.rarity === rarity);
        const picked = pool[Math.floor(Math.random() * pool.length)] || window.GAME_DATA.equipmentCatalog[0];
        const owned = this.state.inventory[picked.id] || 0;

        const rarityClass = rarity === "Legendario" ? "legendario" : rarity === "Épico" ? "epico" : rarity === "Raro" ? "raro" : "comun";

        if (owned < 4) {
          this.state.inventory[picked.id] = owned + 1;
          // Auto-equip if strictly better than current weapon/module on any unit
          this.autoEquipIfUpgrade(picked);
          results.push({
            rarityLabel: `${rarity.toUpperCase()} · NUEVO EQUIPO`,
            rarityClass,
            title: picked.name,
            detail: `${picked.desc} (+${picked.atkBonus} ATQ, +${picked.hpBonus} PV, +${picked.gasBonus} Gas)`
          });
        } else {
          // Convert duplicate into materials + bonus medkit
          const comp = window.GAME_DATA.supplyMachine.duplicateCompensation[rarity] || { steel: 20, cores: 2 };
          this.state.resources.steel += comp.steel;
          this.state.resources.cores += comp.cores;
          results.push({
            rarityLabel: `${rarity.toUpperCase()} · CONVERSIÓN DUPLICADO`,
            rarityClass,
            title: `${picked.name} (Convertido)`,
            detail: `Recibes compensación directa: +⚙ ${comp.steel} Acero Táctico y +🔥 ${comp.cores} Núcleos Térmicos.`
          });
        }
      }

      this.lastSpinResults = results;
      this.save();
      this.render();
    }

    autoEquipIfUpgrade(item) {
      Object.keys(this.state.units).forEach((uId) => {
        const u = this.state.units[uId];
        const curId = u[item.slot];
        const curItem = window.GAME_DATA.equipmentCatalog.find((x) => x.id === curId);
        const curScore = curItem ? curItem.atkBonus * 2 + curItem.hpBonus + curItem.gasBonus : 0;
        const newScore = item.atkBonus * 2 + item.hpBonus + item.gasBonus;
        if (newScore > curScore) {
          u[item.slot] = item.id;
        }
      });
    }

    // ==================== 5. COLECCIÓN Y BESTIARIO ====================
    renderCollectionScreen() {
      const equipCards = window.GAME_DATA.equipmentCatalog.map((item) => {
        const count = this.state.inventory[item.id] || 0;
        const rClass = item.rarity === "Legendario" ? "legendario" : item.rarity === "Épico" ? "epico" : item.rarity === "Raro" ? "raro" : "comun";
        return `
          <div class="card" style="opacity:${count > 0 ? "1" : "0.6"};">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span class="badge ${rClass}">${item.rarity} · ${item.slot === "weapon" ? "ARMA" : "MÓDULO"}</span>
              <span style="font-size:0.8rem; font-weight:700; color:${count > 0 ? "var(--accent-green)" : "var(--text-muted)"};">
                ${count > 0 ? `En Arsenal: ×${count}` : "No obtenido"}
              </span>
            </div>
            <strong style="color:var(--text-main);">${item.name}</strong>
            <p style="font-size:0.8rem; color:var(--text-muted);">${item.desc}</p>
            <div style="font-size:0.8rem; color:var(--accent-gold); margin-top:auto;">
              +${item.atkBonus} ATQ · +${item.hpBonus} PV · +${item.gasBonus} Gas · +${Math.round(item.critBonus * 100)}% Crítico Nuca
            </div>
          </div>
        `;
      }).join("");

      const bossList = [
        ...Object.values(window.GAME_DATA.enemies).map((e) => ({ ...e, isBoss: false })),
        ...Object.values(window.GAME_DATA.bosses).map((b) => ({ ...b, isBoss: true }))
      ];

      const bestiaryCards = bossList.map((b) => `
        <div class="card ${b.isBoss ? "highlight" : ""}">
          <div style="display:flex; justify-content:space-between;">
            <span class="badge ${b.isBoss ? "legendario" : "comun"}">${b.isBoss ? "JEFE COLOSAL" : "COLOSO COMÚN"}</span>
            <span style="font-size:0.8rem; color:var(--accent-gold);">🪙 +${b.rewardTokens} Fichas</span>
          </div>
          <div class="sprite-preview-box">
            <img src="${this.getImgSrc("sprites", b.id)}" alt="${b.name}" />
          </div>
          <strong>${b.name}</strong>
          <div style="font-size:0.8rem; color:var(--text-muted);">
            Vida: <strong>${b.hp}</strong> · Ataque: <strong>${b.atk}</strong> · Reducción Frontal: <strong>${Math.round((1 - b.frontDamageMultiplier) * 100)}%</strong>
          </div>
          <p style="font-size:0.8rem; color:var(--accent-green);">
            ${b.mechanicHint || "Esquiva su ataque anticipado con [ESPACIO] y golpea su nuca por la espalda para daño crítico."}
          </p>
        </div>
      `).join("");

      return `
        <main class="screen-panel">
          <div class="section-header">
            <h2 class="section-title">📖 Arsenal Táctico y Bestiario de Colosos</h2>
          </div>
          <h3 style="color:var(--accent-gold); margin-bottom:10px;">1. Registro de Bestiario y Puntos Débiles</h3>
          <div class="grid-4" style="margin-bottom:20px;">
            ${bestiaryCards}
          </div>
          <h3 style="color:var(--accent-gold); margin-bottom:10px;">2. Catálogo de Armas y Módulos (${Object.keys(this.state.inventory).length}/${window.GAME_DATA.equipmentCatalog.length})</h3>
          <div class="grid-4">
            ${equipCards}
          </div>
        </main>
      `;
    }

    bindCollectionEvents() {}

    // ==================== 6. MAPA DE EXPEDICIÓN Y RUTAS ====================
    startNewExpeditionRun(expId) {
      const exp = window.GAME_DATA.expeditions.find((e) => e.id === expId) || window.GAME_DATA.expeditions[0];
      const squad = this.state.squadOrder.map((uId) => this.computeUnitStats(uId));
      this.expRun = {
        expeditionId: exp.id,
        expeditionName: exp.name,
        currentNodeId: exp.nodes[0].id,
        completedNodeIds: [],
        availableNodeIds: [exp.nodes[0].id],
        squad,
        bankedLoot: { tokens: 0, steel: 0, cores: 0, survivors: 0 },
        unbankedLoot: { tokens: 0, steel: 0, cores: 0, survivors: 0 },
        tempBuffs: { atkMult: 1.0 },
        canExtractNow: false
      };
      this.state.stats.expeditionsPlayed += 1;
      this.save();
    }

    renderMapScreen() {
      // Unlock check for Expedition 2
      const exp2Unlocked = this.state.unlockedExpeditions.exp_muralla || this.state.baseLevels.sala_mapas >= 2;

      if (!this.expRun) {
        // Expedition selection screen before entering the branching map
        const expCards = window.GAME_DATA.expeditions.map((exp) => {
          const isUnlocked = exp.unlockedByDefault || (exp.id === "exp_muralla" && exp2Unlocked);
          return `
            <div class="card ${isUnlocked ? "highlight" : ""}">
              <span class="badge ${exp.id === "exp_muralla" ? "legendario" : "raro"}">${exp.difficultyBadge}</span>
              <h3 style="font-size:1.15rem; color:var(--accent-gold);">${exp.name}</h3>
              <p style="font-size:0.88rem; color:var(--text-muted);">${exp.description}</p>
              <div style="font-size:0.82rem; background:#171e2b; padding:8px; border-radius:6px;">
                Nodos de Ruta: <strong>${exp.nodes.length} zonas ramificadas</strong> ·
                Jefes: <strong>${exp.id === "exp_bosque" ? "Acorazado de Basalto / Matriarca Cristalina" : "Coloso de Vapor"}</strong>
              </div>
              <div style="margin-top:auto; padding-top:8px;">
                ${isUnlocked ? `
                  <button class="btn primary" style="width:100%;" data-start-exp="${exp.id}">🚀 Desplegar Escuadra en esta Expedición</button>
                ` : `
                  <button class="btn" style="width:100%;" disabled>🔒 ${exp.unlockRequirementText}</button>
                `}
              </div>
            </div>
          `;
        }).join("");

        return `
          <main class="screen-panel">
            <div class="section-header">
              <div>
                <h2 class="section-title">🗺 Selección de Operación Exterior</h2>
                <p style="font-size:0.88rem; color:var(--text-muted);">
                  Elige la región fuera de la muralla. Durante la expedición podrás asegurar el botín en los puntos de bengala verde o arriesgarte hasta el Jefe Colosal.
                </p>
              </div>
              <button class="btn" data-nav="squad">⚔ Revisar Escuadra</button>
            </div>
            <div class="grid-2">
              ${expCards}
            </div>
          </main>
        `;
      }

      // Active Branching Expedition Map
      const exp = window.GAME_DATA.expeditions.find((e) => e.id === this.expRun.expeditionId);
      const uLoot = this.expRun.unbankedLoot;
      const bLoot = this.expRun.bankedLoot;

      const nodesHtml = exp.nodes.map((node) => {
        const isDone = this.expRun.completedNodeIds.includes(node.id);
        const isAvail = this.expRun.availableNodeIds.includes(node.id) && !isDone;
        const typeLabel = node.type === "boss" ? "💀 JEFE COLOSAL" : node.type === "event" ? "⛺ EVENTO TÁCTICO" : "⚔ ENCUENTRO DE COMBATE";

        return `
          <div class="card ${isAvail ? "highlight" : ""}" style="opacity:${isDone || isAvail ? "1" : "0.52"};">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span class="badge ${node.type === "boss" ? "legendario" : node.type === "event" ? "raro" : "comun"}">Etapa ${node.stage} · ${typeLabel}</span>
              <span style="font-size:0.8rem; font-weight:800; color:${isDone ? "var(--accent-green)" : isAvail ? "var(--accent-gold)" : "var(--text-muted)"};">
                ${isDone ? "✔ COMPLETADO" : isAvail ? "▶ DISPONIBLE" : "🔒 Ruta no activa"}
              </span>
            </div>
            <strong style="font-size:1.02rem;">${node.title}</strong>
            <p style="font-size:0.83rem; color:var(--text-muted);">${node.summary}</p>
            ${node.canExtractAfter ? `<div style="font-size:0.78rem; color:var(--accent-green);">🟢 Incluye Punto de Bengala Verde (Permite Extraer Botín tras completar)</div>` : ""}

            <div style="margin-top:auto; padding-top:8px;">
              ${isAvail ? `
                <button class="btn ${node.type === "boss" ? "danger" : "primary"}" style="width:100%;" data-enter-node="${node.id}">
                  ${node.type === "event" ? "⛺ Resolver Evento Táctico" : node.type === "boss" ? "⚔ Enfrentar al Jefe Colosal" : "⚔ Entrar en Zona de Combate"}
                </button>
              ` : ""}
            </div>
          </div>
        `;
      }).join("");

      return `
        <main class="screen-panel">
          <div class="section-header">
            <div>
              <h2 class="section-title">🗺 Ruta Activa: ${exp.name}</h2>
              <p style="font-size:0.85rem; color:var(--text-muted);">
                Avanza por los nodos conectados. Si decides continuar en lugar de extraer, el botín no asegurado queda en riesgo (en caso de derrota conservas el 50%).
              </p>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              ${this.expRun.canExtractNow ? `
                <button class="btn success" id="btn-map-extract">🟢 Extraer con 100% del Botín Ahora</button>
              ` : ""}
              <button class="btn danger" id="btn-map-abort">🏳 Retirada de Emergencia</button>
            </div>
          </div>

          <div class="grid-2" style="margin-bottom:14px;">
            <div class="card" style="background:#17231e; border-color:var(--accent-green);">
              <strong style="color:var(--accent-green);">🟢 Botín Total Acumulado en la Expedición:</strong>
              <div style="font-size:0.9rem;">
                🪙 <strong>${bLoot.tokens + uLoot.tokens} Fichas Aegis</strong> ·
                ⚙ <strong>${bLoot.steel + uLoot.steel} Acero</strong> ·
                🔥 <strong>${bLoot.cores + uLoot.cores} Núcleos</strong> ·
                🛟 <strong>${bLoot.survivors + uLoot.survivors} Supervivientes</strong>
              </div>
              <span style="font-size:0.78rem; color:var(--text-muted);">
                ${this.expRun.canExtractNow ? "Punto de Bengala Verde activo: puedes extraer ahora sin riesgo o arriesgarte hacia el Jefe (+50% Fichas)." : "Supera el siguiente nodo para alcanzar un Punto de Bengala Verde."}
              </span>
            </div>

            <div class="card">
              <strong style="color:var(--accent-gold);">Estado Actual de la Escuadra:</strong>
              <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:6px; font-size:0.82rem;">
                ${this.expRun.squad.map((u) => `
                  <div>${u.name.split(" ")[0]}: <strong style="color:${u.hp > 0 ? "var(--accent-green)" : "var(--accent-red)"};">${u.hp}/${u.maxHp} PV</strong></div>
                `).join("")}
              </div>
            </div>
          </div>

          <div class="grid-2">
            ${nodesHtml}
          </div>
        </main>
      `;
    }

    bindMapEvents() {
      document.querySelectorAll("[data-start-exp]").forEach((btn) => {
        btn.onclick = () => {
          this.startNewExpeditionRun(btn.getAttribute("data-start-exp"));
          window.AudioManager.play("confirm");
          this.render();
        };
      });

      const extBtn = document.getElementById("btn-map-extract");
      if (extBtn) {
        extBtn.onclick = () => {
          this.openConfirmModal(
            "🟢 ¿Extraer Escuadra en Punto de Bengala Verde?",
            "Regresarás al Cuartel Aegis asegurando el 100% de las Fichas Aegis, Acero, Núcleos y Supervivientes reunidos hasta ahora.",
            () => {
              this.finishExpedition("extracted");
            }
          );
        };
      }

      const abortBtn = document.getElementById("btn-map-abort");
      if (abortBtn) {
        abortBtn.onclick = () => {
          this.openConfirmModal(
            "🏳 ¿Ordenar Retirada Fuera de Punto de Extracción?",
            "Al retirarte sin bengala verde, tus exploradores regresan a salvo pero perderás el 50% del botín en riesgo recogido en esta incursión.",
            () => {
              this.finishExpedition("defeat");
            }
          );
        };
      }

      document.querySelectorAll("[data-enter-node]").forEach((btn) => {
        btn.onclick = () => {
          const nodeId = btn.getAttribute("data-enter-node");
          const exp = window.GAME_DATA.expeditions.find((e) => e.id === this.expRun.expeditionId);
          const node = exp.nodes.find((n) => n.id === nodeId);
          if (!node) return;

          this.expRun.currentNodeId = node.id;
          if (node.type === "event") {
            this.openEventModal(node);
          } else {
            this.navigate("combat");
          }
        };
      });
    }

    openEventModal(node) {
      const choicesHtml = (node.eventChoices || []).map((ch, idx) => `
        <div class="card" style="gap:6px;">
          <strong style="color:var(--accent-gold);">${ch.label}</strong>
          <span style="font-size:0.83rem; color:var(--accent-green);">${ch.riskText}</span>
          <button class="btn primary" data-event-choice="${idx}" style="margin-top:4px;">Elegir Opción</button>
        </div>
      `).join("");

      this.modalHtml = `
        <div class="modal-box">
          <h3 class="section-title">⛺ ${node.title}</h3>
          <p style="color:var(--text-muted); font-size:0.9rem;">${node.summary}</p>
          <div style="display:flex; flex-direction:column; gap:10px;">
            ${choicesHtml}
          </div>
        </div>
      `;
      this.modalBind = () => {
        document.querySelectorAll("[data-event-choice]").forEach((btn) => {
          btn.onclick = () => {
            const idx = parseInt(btn.getAttribute("data-event-choice"), 10);
            const ch = node.eventChoices[idx];
            const ef = ch.effect || {};
            if (ef.healPct) {
              this.expRun.squad.forEach((u) => {
                if (u.hp > 0) u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * ef.healPct));
              });
            }
            if (ef.hpPenaltyPct) {
              this.expRun.squad.forEach((u) => {
                if (u.hp > 0) u.hp = Math.max(15, u.hp - Math.round(u.hp * ef.hpPenaltyPct));
              });
            }
            if (ef.medkits) this.state.resources.medkits += ef.medkits;
            if (ef.tempAtkBuff) this.expRun.tempBuffs.atkMult += ef.tempAtkBuff;
            if (ef.tokens) this.expRun.unbankedLoot.tokens += ef.tokens;
            if (ef.steel) this.expRun.unbankedLoot.steel += ef.steel;
            if (ef.cores) this.expRun.unbankedLoot.cores += ef.cores;

            this.completeCurrentMapNode(node);
            this.closeModal();
          };
        });
      };
      this.render();
    }

    completeCurrentMapNode(node) {
      if (!this.expRun.completedNodeIds.includes(node.id)) {
        this.expRun.completedNodeIds.push(node.id);
      }
      this.expRun.canExtractNow = !!node.canExtractAfter;
      this.expRun.availableNodeIds = [...(node.nextNodes || [])];
      window.AudioManager.play("confirm");
      this.save();
    }

    // ==================== 7. ESCENA DE EXPLORACIÓN Y COMBATE 2D ====================
    renderCombatScreen() {
      const exp = window.GAME_DATA.expeditions.find((e) => e.id === this.expRun.expeditionId);
      const node = exp.nodes.find((n) => n.id === this.expRun.currentNodeId);

      return `
        <main class="screen-panel combat-wrapper">
          <div class="combat-hud-top" id="combat-hud-container">
            ${this.renderCombatHudInner()}
          </div>

          <div class="canvas-viewport">
            <canvas id="combat-canvas" width="920" height="500"></canvas>
          </div>

          <div class="touch-controls-bar">
            <div class="joystick-zone">
              <div class="joystick-base" id="joystick-base" aria-label="Joystick Virtual de Movimiento">
                <div class="joystick-stick" id="joystick-stick"></div>
              </div>
              <div style="font-size:0.78rem; color:var(--text-muted); max-width:170px;">
                <strong>Movimiento 2D</strong><br/>
                PC: <code>WASD</code> / Flechas<br/>
                Móvil: Arrastra el Joystick
              </div>
            </div>

            <div class="action-buttons-grid">
              <button class="btn primary tactile-btn" id="btn-act-attack">⚔ ATACAR [J]</button>
              <button class="btn tactile-btn" id="btn-act-grapple" style="border-color:var(--accent-blue); color:#70a1ff;">🪝 CABLES / NUCA [ESPACIO]</button>
              <button class="btn tactile-btn" id="btn-act-skill" style="border-color:var(--accent-purple); color:#e0aaff;">✨ HABILIDAD [K]</button>
              <button class="btn success tactile-btn" id="btn-act-medkit">➕ BOTIQUÍN [L] (${this.state.resources.medkits})</button>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; font-size:0.8rem; color:var(--text-muted);">
            <span>💡 <strong>Consejo Táctico:</strong> Usa <strong>Cables [ESPACIO]</strong> para colocarte a la derecha (espalda) del Titán y asestar un <strong>Corte Crítico en la Nuca</strong>.</span>
            <div style="display:flex; gap:8px;">
              <button class="btn" id="btn-combat-pause">⏸ Pausa [P]</button>
              <button class="btn success" id="btn-combat-advance" style="display:none;">🟢 Zona Despejada: Continuar / Extraer [R]</button>
            </div>
          </div>
        </main>
      `;
    }

    renderCombatHudInner() {
      if (!this.expRun) return "";
      const activeIdx = this.combatScene ? this.combatScene.activeIdx : 0;
      const u = this.expRun.squad[activeIdx] || this.expRun.squad[0];

      const squadBtns = this.expRun.squad.map((m, idx) => `
        <button class="squad-mini-btn ${idx === activeIdx ? "active" : ""} ${m.hp <= 0 ? "ko" : ""}" data-switch-unit="${idx}">
          <span>[${idx + 1}] ${m.name.split(" ")[0]}</span>
          <span style="color:${m.hp > 0 ? "var(--accent-green)" : "var(--accent-red)"};">${m.hp}/${m.maxHp}</span>
        </button>
      `).join("");

      return `
        <div class="squad-switch-bar">${squadBtns}</div>
        <div style="display:flex; gap:14px; align-items:center; flex-wrap:wrap; font-size:0.85rem;">
          <div>❤️ <strong>${u.name.split(" ")[0]}:</strong> <span style="color:var(--accent-green); font-weight:800;">${u.hp}/${u.maxHp} PV</span></div>
          <div>💨 <strong>Gas:</strong> <span style="color:var(--accent-blue); font-weight:800;">${Math.round(u.gas)}/${u.maxGas}</span></div>
          <div>✨ <strong>${u.skill.name}:</strong> <span style="color:var(--accent-gold); font-weight:800;">${u.skillCd > 0 ? `${u.skillCd.toFixed(1)}s` : "LISTA [K]"}</span></div>
        </div>
      `;
    }

    mountCombatCanvas() {
      const canvas = document.getElementById("combat-canvas");
      if (!canvas || !this.expRun) return;

      const exp = window.GAME_DATA.expeditions.find((e) => e.id === this.expRun.expeditionId);
      const node = exp.nodes.find((n) => n.id === this.expRun.currentNodeId);

      this.combatScene = new window.CombatScene(canvas, {
        onHudUpdate: () => {
          const hud = document.getElementById("combat-hud-container");
          if (hud) {
            hud.innerHTML = this.renderCombatHudInner();
            this.bindCombatSquadSwitch();
          }
          const medBtn = document.getElementById("btn-act-medkit");
          if (medBtn) medBtn.textContent = `➕ BOTIQUÍN [L] (${this.state.resources.medkits})`;
        },
        onStageCleared: () => {
          const advBtn = document.getElementById("btn-combat-advance");
          if (advBtn) advBtn.style.display = "inline-flex";
        },
        onRequestExtract: () => {
          if (this.combatScene && this.combatScene.extractionReady) {
            this.handleCombatNodeVictory(node, this.combatScene.nodeLoot);
          }
        },
        onNodeCompleted: (loot) => {
          this.handleCombatNodeVictory(node, loot);
        },
        onSquadDefeated: (loot) => {
          this.expRun.unbankedLoot.tokens += loot.tokens;
          this.expRun.unbankedLoot.steel += loot.steel;
          this.expRun.unbankedLoot.cores += loot.cores;
          this.finishExpedition("defeat");
        },
        onPauseChange: (isPaused) => {
          const pBtn = document.getElementById("btn-combat-pause");
          if (pBtn) pBtn.textContent = isPaused ? "▶ Reanudar [P]" : "⏸ Pausa [P]";
        }
      });

      this.combatScene.startNode(node, this.expRun.squad, this.state, this.expRun.tempBuffs);
      this.bindCombatControls(node);
    }

    bindCombatSquadSwitch() {
      document.querySelectorAll("[data-switch-unit]").forEach((btn) => {
        btn.onclick = () => {
          const idx = parseInt(btn.getAttribute("data-switch-unit"), 10);
          if (this.combatScene) this.combatScene.switchUnit(idx);
        };
      });
    }

    bindCombatControls(node) {
      this.bindCombatSquadSwitch();

      const bindTap = (id, fn) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.onclick = (e) => {
          e.preventDefault();
          fn();
        };
      };

      bindTap("btn-act-attack", () => this.combatScene && this.combatScene.triggerAttack());
      bindTap("btn-act-grapple", () => this.combatScene && this.combatScene.triggerGrappleDodge());
      bindTap("btn-act-skill", () => this.combatScene && this.combatScene.triggerSkill());
      bindTap("btn-act-medkit", () => this.combatScene && this.combatScene.triggerConsumable());
      bindTap("btn-combat-pause", () => this.combatScene && this.combatScene.togglePause());
      bindTap("btn-combat-advance", () => {
        if (this.combatScene && this.combatScene.extractionReady) {
          this.handleCombatNodeVictory(node, this.combatScene.nodeLoot);
        }
      });

      // Virtual Touch/Mouse Joystick
      const base = document.getElementById("joystick-base");
      const stick = document.getElementById("joystick-stick");
      if (!base || !stick) return;

      let dragging = false;
      const maxRadius = 34;

      const updateStick = (clientX, clientY) => {
        const rect = base.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        let dx = clientX - cx;
        let dy = clientY - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > maxRadius) {
          dx = (dx / dist) * maxRadius;
          dy = (dy / dist) * maxRadius;
        }
        stick.style.transform = `translate(${dx}px, ${dy}px)`;
        if (this.combatScene) {
          this.combatScene.joyVec = { x: dx / maxRadius, y: dy / maxRadius };
        }
      };

      const resetStick = () => {
        dragging = false;
        stick.style.transform = `translate(0px, 0px)`;
        if (this.combatScene) {
          this.combatScene.joyVec = { x: 0, y: 0 };
        }
      };

      base.addEventListener("pointerdown", (e) => {
        dragging = true;
        base.setPointerCapture(e.pointerId);
        updateStick(e.clientX, e.clientY);
      });
      base.addEventListener("pointermove", (e) => {
        if (dragging) updateStick(e.clientX, e.clientY);
      });
      base.addEventListener("pointerup", resetStick);
      base.addEventListener("pointercancel", resetStick);
    }

    handleCombatNodeVictory(node, loot) {
      if (this.combatScene) {
        this.combatScene.stop();
        this.combatScene = null;
      }

      this.expRun.unbankedLoot.tokens += loot.tokens;
      this.expRun.unbankedLoot.steel += loot.steel;
      this.expRun.unbankedLoot.cores += loot.cores;
      this.expRun.unbankedLoot.survivors += loot.survivors;

      this.completeCurrentMapNode(node);

      if (node.type === "boss" || (node.nextNodes && node.nextNodes.length === 0)) {
        // Boss defeated -> unlock Expedition 2 and finish with Boss Jackpot Bonus!
        this.state.unlockedExpeditions.exp_muralla = true;
        this.finishExpedition("boss_victory");
      } else {
        this.navigate("map");
      }
    }

    // ==================== 8. EXTRACCIÓN, DERROTA Y RESULTADOS ====================
    finishExpedition(outcome) {
      if (this.combatScene) {
        this.combatScene.stop();
        this.combatScene = null;
      }

      const run = this.expRun;
      if (!run) {
        this.navigate("base");
        return;
      }

      const mapLvl = this.state.baseLevels.sala_mapas || 1;
      const mapBonusMult = 1 + (mapLvl - 1) * 0.15;

      let rawTokens = run.bankedLoot.tokens + run.unbankedLoot.tokens;
      let rawSteel = run.bankedLoot.steel + run.unbankedLoot.steel;
      let rawCores = run.bankedLoot.cores + run.unbankedLoot.cores;
      let survivors = run.bankedLoot.survivors + run.unbankedLoot.survivors;

      let bossBonusTokens = 0;
      let penaltyText = "Ninguna (100% del botín asegurado)";

      if (outcome === "boss_victory") {
        bossBonusTokens = Math.round(rawTokens * 0.5) + 15;
        this.state.stats.expeditionsExtracted += 1;
      } else if (outcome === "extracted") {
        this.state.stats.expeditionsExtracted += 1;
      } else {
        // Defeat / Emergency Evacuation: keep 50% of unbanked loot, lose 0 characters!
        rawTokens = run.bankedLoot.tokens + Math.ceil(run.unbankedLoot.tokens * 0.5);
        rawSteel = run.bankedLoot.steel + Math.ceil(run.unbankedLoot.steel * 0.5);
        rawCores = run.bankedLoot.cores + Math.ceil(run.unbankedLoot.cores * 0.5);
        penaltyText = "Evacuación de Emergencia: Se conserva el 50% del botín no asegurado. Tus exploradores y mejoras están 100% a salvo.";
      }

      const finalTokens = Math.round((rawTokens + bossBonusTokens) * mapBonusMult);
      const finalSteel = rawSteel;
      const finalCores = rawCores;

      this.state.resources.tokens += finalTokens;
      this.state.resources.steel += finalSteel;
      this.state.resources.cores += finalCores;

      this.lastExpeditionSummary = {
        outcome,
        expeditionName: run.expeditionName,
        finalTokens,
        bossBonusTokens,
        mapBonusPct: (mapLvl - 1) * 15,
        finalSteel,
        finalCores,
        survivors,
        penaltyText
      };

      this.expRun = null;
      this.save();
      this.navigate("results");
    }

    renderResultsScreen() {
      const sum = this.lastExpeditionSummary || {
        outcome: "extracted",
        expeditionName: "Expedición",
        finalTokens: 0,
        bossBonusTokens: 0,
        mapBonusPct: 0,
        finalSteel: 0,
        finalCores: 0,
        survivors: 0,
        penaltyText: ""
      };

      const isWin = sum.outcome === "boss_victory" || sum.outcome === "extracted";

      return `
        <main class="screen-panel" style="max-width:760px; margin:0 auto; width:100%;">
          <div class="section-header">
            <div>
              <span class="badge ${isWin ? "legendario" : "comun"}">
                ${sum.outcome === "boss_victory" ? "🏆 ¡VICTORIA TOTAL CONTRA JEFE COLOSAL!" : sum.outcome === "extracted" ? "🟢 ¡EXTRACCIÓN CON BENGALA VERDE EXITOSA!" : "🛟 EVACUACIÓN DE EMERGENCIA AL CUARTEL"}
              </span>
              <h2 class="section-title" style="margin-top:6px;">Informe de Resultados — ${sum.expeditionName}</h2>
            </div>
          </div>

          <div class="card highlight" style="gap:12px;">
            <p style="font-size:0.9rem; color:var(--text-muted);">${sum.penaltyText}</p>

            <div class="grid-2" style="grid-template-columns: repeat(2, 1fr);">
              <div style="background:#171e2b; padding:12px; border-radius:6px;">
                <div style="font-size:0.82rem; color:var(--text-muted);">Fichas Aegis Obtenidas</div>
                <div style="font-size:1.4rem; font-weight:800; color:var(--accent-gold);">🪙 +${sum.finalTokens} Fichas</div>
                <div style="font-size:0.76rem; color:var(--accent-green);">
                  ${sum.bossBonusTokens > 0 ? `Incluye +${sum.bossBonusTokens} por Jackpot de Jefe · ` : ""}
                  Bonificación Sala de Mapas: +${sum.mapBonusPct}%
                </div>
              </div>

              <div style="background:#171e2b; padding:12px; border-radius:6px;">
                <div style="font-size:0.82rem; color:var(--text-muted);">Materiales y Rescates Asegurados</div>
                <div style="font-size:1.1rem; font-weight:800; color:var(--text-main);">
                  ⚙ +${sum.finalSteel} Acero · 🔥 +${sum.finalCores} Núcleos
                </div>
                <div style="font-size:0.8rem; color:var(--accent-blue);">
                  🛟 Supervivientes evacuados: ${sum.survivors}
                </div>
              </div>
            </div>

            <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:8px;">
              <button class="btn primary" data-nav="machine" style="flex:1;">🎰 Gastar Fichas en Máquina de Suministros</button>
              <button class="btn success" data-nav="base" style="flex:1;">🏰 Volver al Cuartel y Mejorar</button>
              <button class="btn" data-nav="map">🗺 Nueva Expedición</button>
            </div>
          </div>
        </main>
      `;
    }

    bindResultsEvents() {}

    // ==================== MODALES (TUTORIAL, OPCIONES, CRÉDITOS, CONFIRMACIÓN) ====================
    closeModal() {
      this.modalHtml = null;
      this.modalBind = null;
      this.render();
    }

    openConfirmModal(title, message, onConfirm) {
      this.modalHtml = `
        <div class="modal-box">
          <h3 class="section-title">${title}</h3>
          <p style="color:var(--text-muted); font-size:0.92rem;">${message}</p>
          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:8px;">
            <button class="btn" id="modal-cancel">Cancelar</button>
            <button class="btn danger" id="modal-confirm">Confirmar</button>
          </div>
        </div>
      `;
      this.modalBind = () => {
        const cBtn = document.getElementById("modal-cancel");
        const okBtn = document.getElementById("modal-confirm");
        if (cBtn) cBtn.onclick = () => this.closeModal();
        if (okBtn) okBtn.onclick = () => {
          this.closeModal();
          onConfirm && onConfirm();
        };
      };
      this.render();
    }

    openTutorialModal() {
      this.modalHtml = `
        <div class="modal-box">
          <h3 class="section-title">❓ Manual Táctico del Cuerpo de Murallas</h3>
          <div style="display:flex; flex-direction:column; gap:10px; font-size:0.88rem;">
            <div>
              <strong style="color:var(--accent-gold);">1. El Ciclo Principal:</strong>
              Prepara tu escuadra de 4 exploradores ➔ Entra en una expedición ramificada ➔ Combate colosos, rompe cajas y rescata supervivientes ➔ Extrae con bengala verde o abate al Jefe ➔ Usa tus <strong>Fichas Aegis</strong> en la Máquina de Suministros y mejora el Cuartel.
            </div>
            <div>
              <strong style="color:var(--accent-gold);">2. Puntos Débiles (La Nuca) y Anticipación:</strong>
              Los Colosos reducen el daño recibido de frente. Observa el círculo de peligro cuando preparan un ataque, usa tus <strong>Cables de Maniobra [ESPACIO]</strong> para esquivar y posicionarte a su espalda (lado derecho del Titán) o espera a que queden <strong>VULNERABLES</strong> para conectar un <strong>Corte Crítico en la Nuca (×2.3 a ×3.2 de daño)</strong>.
            </div>
            <div>
              <strong style="color:var(--accent-gold);">3. Controles en PC y Celular:</strong>
              • <strong>Movimiento:</strong> <code>WASD</code> / Flechas en PC o <strong>Joystick Virtual</strong> en móvil.<br/>
              • <strong>Ataque:</strong> Tecla <code>J</code> / <code>Z</code> o botón táctil <strong>ATACAR</strong>.<br/>
              • <strong>Cables / Esquiva a la Nuca:</strong> <code>ESPACIO</code> o botón táctil <strong>CABLES</strong>.<br/>
              • <strong>Habilidad Única:</strong> Tecla <code>K</code> / <code>E</code> o botón táctil <strong>HABILIDAD</strong>.<br/>
              • <strong>Botiquín / Relevo:</strong> Tecla <code>L</code> para curar y teclas <code>1–4</code> (o tocar retratos) para relevar explorador.
            </div>
          </div>
          <div style="display:flex; justify-content:flex-end;">
            <button class="btn primary" id="modal-close-tut">¡Entendido, en marcha!</button>
          </div>
        </div>
      `;
      this.modalBind = () => {
        const b = document.getElementById("modal-close-tut");
        if (b) b.onclick = () => this.closeModal();
      };
      this.render();
    }

    openOptionsModal() {
      const s = this.state.settings;
      this.modalHtml = `
        <div class="modal-box">
          <h3 class="section-title">⚙ Opciones y Accesibilidad</h3>
          <div style="display:flex; flex-direction:column; gap:12px; font-size:0.9rem;">
            <label style="display:flex; justify-content:space-between; align-items:center;">
              <span>🔊 Efectos de Sonido Activos</span>
              <input type="checkbox" id="opt-sound" ${s.soundEnabled ? "checked" : ""} style="width:20px; height:20px;" />
            </label>
            <label style="display:flex; justify-content:space-between; align-items:center;">
              <span>🎚 Volumen (${Math.round(s.volume * 100)}%)</span>
              <input type="range" id="opt-vol" min="0" max="1" step="0.05" value="${s.volume}" />
            </label>
            <label style="display:flex; justify-content:space-between; align-items:center;">
              <span>🛡 Reducir Movimiento y Sacudidas de Cámara</span>
              <input type="checkbox" id="opt-motion" ${s.reducedMotion ? "checked" : ""} style="width:20px; height:20px;" />
            </label>
            <label style="display:flex; justify-content:space-between; align-items:center;">
              <span>🔠 Texto Escalado Grande (Accesibilidad)</span>
              <input type="checkbox" id="opt-text" ${s.largeText ? "checked" : ""} style="width:20px; height:20px;" />
            </label>
            <label style="display:flex; justify-content:space-between; align-items:center;">
              <span>🌗 Modo de Alto Contraste</span>
              <input type="checkbox" id="opt-contrast" ${s.highContrast ? "checked" : ""} style="width:20px; height:20px;" />
            </label>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
            <button class="btn primary" id="modal-save-opt">Guardar y Cerrar</button>
          </div>
        </div>
      `;
      this.modalBind = () => {
        const saveBtn = document.getElementById("modal-save-opt");
        if (saveBtn) {
          saveBtn.onclick = () => {
            s.soundEnabled = document.getElementById("opt-sound").checked;
            s.volume = parseFloat(document.getElementById("opt-vol").value);
            s.reducedMotion = document.getElementById("opt-motion").checked;
            s.largeText = document.getElementById("opt-text").checked;
            s.highContrast = document.getElementById("opt-contrast").checked;
            this.applyAccessibilitySettings();
            window.AudioManager.applySettings(s);
            this.save();
            this.closeModal();
          };
        }
      };
      this.render();
    }

    openCreditsModal() {
      this.modalHtml = `
        <div class="modal-box">
          <h3 class="section-title">📜 Créditos y Licencias (ASSET_LICENSES.md)</h3>
          <div style="display:flex; flex-direction:column; gap:10px; font-size:0.85rem; color:var(--text-muted);">
            <p><strong style="color:var(--text-main);">Dirección, Código y Sprites Originales (Exploradores, Titanes, Jefes y Tómbola):</strong><br/>
            Desarrollado con identidad visual original de fantasía militar oscura (Bastión Aegis), libre de recursos protegidos de terceros.</p>
            <p><strong style="color:var(--text-main);">Recursos CC0 Integrados desde los Paquetes ZIP Adjuntos:</strong><br/>
            • <strong>Kenney Roguelike/RPG Pack</strong> (Kenney Vleugels & Lynn Evers) — Licencia CC0 1.0 Dominio Público.<br/>
            • <strong>Kenney UI Pack 2.0</strong> (Kenney Vleugels) — Licencia CC0 1.0 Dominio Público.<br/>
            • <strong>Kenney Interface Sounds 1.0</strong> (Kenney Vleugels) — Licencia CC0 1.0 Dominio Público.<br/>
            • <strong>Kenney Particle Pack 1.1</strong> (Kenney Vleugels) — Licencia CC0 1.0 Dominio Público.</p>
            <p>Consulta el archivo <code>ASSET_LICENSES.md</code> en la raíz del proyecto para el desglose completo por archivo.</p>
          </div>
          <div style="display:flex; justify-content:flex-end;">
            <button class="btn primary" id="modal-close-cred">Cerrar</button>
          </div>
        </div>
      `;
      this.modalBind = () => {
        const b = document.getElementById("modal-close-cred");
        if (b) b.onclick = () => this.closeModal();
      };
      this.render();
    }
  }

  function bootGameApp() {
    if (window.App) return;
    window.App = new GameApp();
    window.App.init();
  }
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", bootGameApp);
  } else {
    bootGameApp();
  }
})();
