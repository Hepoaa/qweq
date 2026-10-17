// Configuración editable de marca y datos de juego — AOT: Titan Jackpot (Bastión Aegis)
window.GAME_DATA = {
  brand: {
    workingTitle: "AOT: TITAN JACKPOT",
    subtitle: "Crónicas del Bastión Aegis — Cuerpo de Murallas",
    version: "1.0.0",
    fictionalCurrencyName: "Fichas Aegis",
    disclaimer: "Juego de acción y estrategia con fichas 100% ficticias obtenidas jugando. Sin dinero real, compras ni apuestas monetarias."
  },

  explorers: [
    {
      id: "vanguardia",
      name: "Capitán Kaelen Vance",
      role: "Vanguardia",
      roleBadge: "VANGUARDIA · CORTE CRÍTICO",
      rarity: "Épico",
      spriteRow: 0,
      portraitIndex: 0,
      baseStats: { hp: 240, atk: 38, spd: 195, maxGas: 110, critMult: 2.6 },
      growth: { hp: 26, atk: 5, maxGas: 6 },
      skill: {
        name: "Torbellino de Acero",
        cooldown: 6.5,
        gasCost: 22,
        description: "Giro invulnerable con cuchillas gemelas que atraviesa al enemigo, se posiciona en su espalda e inflige 260% de daño directo a la nuca."
      },
      lore: "Veterano de la Primera Muralla. Su velocidad con las cuchillas dobles permite cercenar el núcleo cervical de los colosos antes de que terminen su embestida."
    },
    {
      id: "explorador",
      name: "Soren Falk",
      role: "Explorador",
      roleBadge: "EXPLORADOR · MOVILIDAD Y MARCA",
      rarity: "Raro",
      spriteRow: 1,
      portraitIndex: 1,
      baseStats: { hp: 215, atk: 32, spd: 225, maxGas: 135, critMult: 2.4 },
      growth: { hp: 22, atk: 4, maxGas: 10 },
      skill: {
        name: "Impulso Relámpago",
        cooldown: 7.0,
        gasCost: 0,
        description: "Recarga +45 de Gas al instante, otorga +35% de velocidad y marca el punto débil del enemigo durante 5 s, aumentando todo el daño recibido un 50%."
      },
      lore: "Rastreador de vanguardia equipado con turbinas de doble compresión y gafas de viento. Localiza aberturas en la coraza enemiga para toda la escuadra."
    },
    {
      id: "ingeniera",
      name: "Valeria Krost",
      role: "Ingeniera",
      roleBadge: "INGENIERA · ANTI-BLINDAJE",
      rarity: "Épico",
      spriteRow: 2,
      portraitIndex: 2,
      baseStats: { hp: 255, atk: 42, spd: 175, maxGas: 105, critMult: 2.5 },
      growth: { hp: 28, atk: 6, maxGas: 6 },
      skill: {
        name: "Lanza Trueno Perforante",
        cooldown: 8.0,
        gasCost: 25,
        description: "Dispara un arpón explosivo térmico a distancia que inflige 240% de daño, destruye blindajes minerales/cristalinos y aturde al coloso exponiendo su nuca por 4.5 s."
      },
      lore: "Jefa de artillería del Taller Aegis. Sus lanzas de trueno perforan las placas del Acorazado de Basalto y rompen la guardia de la Matriarca Cristalina."
    },
    {
      id: "medica",
      name: "Dra. Elena Vane",
      role: "Médica",
      roleBadge: "MÉDICA · AUXILIO Y ESCUDO",
      rarity: "Raro",
      spriteRow: 3,
      portraitIndex: 3,
      baseStats: { hp: 230, atk: 29, spd: 190, maxGas: 115, critMult: 2.3 },
      growth: { hp: 25, atk: 4, maxGas: 8 },
      skill: {
        name: "Bengala de Auxilio y Suero",
        cooldown: 9.0,
        gasCost: 20,
        description: "Restaura el 35% de la Vida Máxima de toda la escuadra, despliega un escudo táctico de 65 PV y lanza una onda defensiva que empuja enemigos cercanos."
      },
      lore: "Oficial médica del Cuerpo de Rescate. Sus inyectores de suero regenerativo mantienen en pie a la escuadra en las incursiones más profundas."
    }
  ],

  baseFacilities: [
    {
      id: "taller",
      name: "Taller de Forja y Módulos",
      iconTile: "anvil",
      maxLevel: 5,
      baseCostSteel: 30,
      baseCostCores: 2,
      description: "Templa las cuchillas y calibra las lanzas térmicas. Aumenta el Ataque de toda la escuadra un +10% por nivel.",
      effectLabel: (lvl) => `+${lvl * 10}% Ataque de Escuadra y desbloqueo de forja Nv.${lvl}`
    },
    {
      id: "enfermeria",
      name: "Enfermería de Campaña",
      iconTile: "bed_green",
      maxLevel: 5,
      baseCostSteel: 25,
      baseCostCores: 2,
      description: "Sintetiza sueros de emergencia y acelera la recuperación. Aumenta la Vida Máxima un +12% por nivel y mejora un +15% la curación de botiquines.",
      effectLabel: (lvl) => `+${lvl * 12}% Vida Máxima y +${lvl * 15}% eficacia de Botiquines`
    },
    {
      id: "sala_mapas",
      name: "Sala de Mapas Estratégicos",
      iconTile: "table_map",
      maxLevel: 5,
      baseCostSteel: 35,
      baseCostCores: 3,
      description: "Cartografía rutas seguras fuera de la muralla. Aumenta las Fichas Aegis ganadas un +15% por nivel. En Nivel 2 desbloquea la Expedición 2 (Muralla Exterior).",
      effectLabel: (lvl) => `+${lvl * 15}% Fichas Aegis ${lvl >= 2 ? "· Expedición 2 Activa" : "· Nv.2 desbloquea Expedición 2"}`
    },
    {
      id: "deposito_gas",
      name: "Depósito de Gas a Presión",
      iconTile: "barrel",
      maxLevel: 5,
      baseCostSteel: 25,
      baseCostCores: 2,
      description: "Refina el propulsor de los equipos de maniobras. Añade +15 de Gas Máximo y +12% de recarga de gas por segundo en combate por cada nivel.",
      effectLabel: (lvl) => `+${lvl * 15} Gas Máximo y +${lvl * 12}% recarga de Gas`
    }
  ],

  equipmentCatalog: [
    { id: "blade_std", name: "Cuchillas de Acero Aegis", slot: "weapon", rarity: "Común", atkBonus: 6, hpBonus: 0, gasBonus: 0, critBonus: 0.1, desc: "Hojas segmentadas reglamentarias del Cuerpo de Murallas." },
    { id: "gas_std", name: "Cilindro de Compresión Estándar", slot: "module", rarity: "Común", atkBonus: 0, hpBonus: 15, gasBonus: 15, critBonus: 0, desc: "Depósito equilibrado para maniobras de corto alcance." },
    { id: "cloak_scout", name: "Capa Cortavientos de Explorador", slot: "module", rarity: "Común", atkBonus: 3, hpBonus: 25, gasBonus: 10, critBonus: 0, desc: "Tejido impermeable que reduce la fricción en vuelo." },
    { id: "blade_carbon", name: "Sables de Carbono Flexible", slot: "weapon", rarity: "Raro", atkBonus: 14, hpBonus: 10, gasBonus: 0, critBonus: 0.25, desc: "Aleación ligera que conserva el filo tras cortar hueso denso." },
    { id: "turbine_dual", name: "Turbina de Doble Válvula", slot: "module", rarity: "Raro", atkBonus: 6, hpBonus: 30, gasBonus: 30, critBonus: 0.15, desc: "Inyecta presión extra al lanzar los ganchos de anclaje." },
    { id: "serum_belt", name: "Cinturón de Suero Coagulante", slot: "module", rarity: "Raro", atkBonus: 5, hpBonus: 55, gasBonus: 15, critBonus: 0, desc: "Suministro médico automático que incrementa la vitalidad." },
    { id: "lance_thermal", name: "Lanzas Trueno de Magma", slot: "weapon", rarity: "Épico", atkBonus: 26, hpBonus: 25, gasBonus: 10, critBonus: 0.45, desc: "Proyectiles térmicos capaces de fracturar corazas de basalto." },
    { id: "gyro_core", name: "Giroscopio Táctico Imperial", slot: "module", rarity: "Épico", atkBonus: 14, hpBonus: 65, gasBonus: 45, critBonus: 0.3, desc: "Estabilizador aéreo para giros precisos hacia la nuca enemiga." },
    { id: "blade_vortex", name: "Hojas Vibratorias Cortanucas", slot: "weapon", rarity: "Épico", atkBonus: 28, hpBonus: 15, gasBonus: 15, critBonus: 0.55, desc: "Hojas resonantes diseñadas para ejecuciones críticas." },
    { id: "aegis_crest", name: "Reliquia del Bastión Aegis", slot: "module", rarity: "Legendario", atkBonus: 24, hpBonus: 110, gasBonus: 60, critBonus: 0.65, desc: "Prototipo maestro de la Primera Muralla. Potencia todas las estadísticas." },
    { id: "colossus_slayer", name: "Mandoble Térmico Mata-Colosos", slot: "weapon", rarity: "Legendario", atkBonus: 44, hpBonus: 45, gasBonus: 25, critBonus: 0.85, desc: "Arma insignia forjada con núcleos cristalinos de jefes abatidos." }
  ],

  supplyMachine: {
    costSingle: 10,
    costMulti5: 45,
    duplicateCompensation: {
      "Común": { steel: 15, cores: 1 },
      "Raro": { steel: 30, cores: 3 },
      "Épico": { steel: 55, cores: 6 },
      "Legendario": { steel: 100, cores: 12 }
    },
    probabilities: [
      {
        rarity: "Común",
        chancePercent: 50,
        badgeText: "COMÚN [C] · 50%",
        color: "#8fa4b8",
        description: "Armamento reglamentario, lotes de Acero Táctico (+25) y Suministros Médicos de campo."
      },
      {
        rarity: "Raro",
        chancePercent: 32,
        badgeText: "RARO [R] · 32%",
        color: "#4da6ff",
        description: "Sables de Carbono, Turbinas Dobles, Fragmentos de Entrenamiento de Escuadra y Núcleos Térmicos."
      },
      {
        rarity: "Épico",
        chancePercent: 14,
        badgeText: "ÉPICO [E] · 14%",
        color: "#c56cf0",
        description: "Lanzas Trueno de Magma, Hojas Vibratorias, Giroscopios Imperiales y Ascensos de Unidad (+1 Nivel)."
      },
      {
        rarity: "Legendario",
        chancePercent: 4,
        badgeText: "JACKPOT LEGENDARIO [L] · 4%",
        color: "#ffbe3b",
        description: "Mandoble Térmico Mata-Colosos, Reliquia del Bastión Aegis y Cofre Maestro de Materiales."
      }
    ]
  },

  enemies: {
    merodeador: {
      id: "merodeador",
      name: "Merodeador de Ceniza",
      type: "common",
      spriteRow: 0,
      hp: 260,
      atk: 26,
      spd: 72,
      attackRange: 88,
      windupTime: 1.25,
      vulnerableTime: 3.5,
      frontDamageMultiplier: 0.65,
      attackLabel: "¡MANOTAZO DE CENIZA!",
      rewardTokens: 6,
      rewardSteel: 10,
      rewardCores: 1
    },
    saltarin: {
      id: "saltarin",
      name: "Acechador Saltarín",
      type: "common",
      spriteRow: 1,
      hp: 210,
      atk: 30,
      spd: 112,
      attackRange: 135,
      windupTime: 1.1,
      vulnerableTime: 3.8,
      frontDamageMultiplier: 0.75,
      attackLabel: "¡EMBESTIDA EN SALTO!",
      rewardTokens: 7,
      rewardSteel: 12,
      rewardCores: 1
    },
    demoledor: {
      id: "demoledor",
      name: "Demoledor de Escombros",
      type: "elite",
      spriteRow: 2,
      hp: 390,
      atk: 38,
      spd: 58,
      attackRange: 110,
      windupTime: 1.45,
      vulnerableTime: 4.0,
      frontDamageMultiplier: 0.5,
      attackLabel: "¡IMPACTO DE ROCA!",
      rewardTokens: 11,
      rewardSteel: 18,
      rewardCores: 2
    }
  },

  bosses: {
    acorazado: {
      id: "acorazado",
      name: "Acorazado de Basalto",
      title: "Coloso Blindado de la Muralla Sur",
      spriteRow: 0,
      hp: 980,
      atk: 46,
      spd: 68,
      attackRange: 125,
      windupTime: 1.4,
      vulnerableTime: 4.8,
      frontDamageMultiplier: 0.30,
      mechanicHint: "Sus placas frontales reducen el daño un 70%. Esquiva su Carga Sísmica con tus cables (Espacio) para golpear su nuca o usa la Lanza Trueno de la Ingeniera para romper su coraza.",
      attackLabel: "¡CARGA SÍSMICA ACORAZADA!",
      rewardTokens: 32,
      rewardSteel: 45,
      rewardCores: 5
    },
    matriarca: {
      id: "matriarca",
      name: "Matriarca Cristalina",
      title: "Soberana Marcial del Bosque Gigante",
      spriteRow: 1,
      hp: 890,
      atk: 44,
      spd: 96,
      attackRange: 115,
      windupTime: 1.15,
      vulnerableTime: 4.4,
      frontDamageMultiplier: 0.40,
      mechanicHint: "Endurece sus puños con cristal cian para bloquear ataques frontales. Espera a que ejecute su Patada Ciclón o usa habilidades de marca/explosión para dejar expuesta su nuca.",
      attackLabel: "¡PATADA CICLÓN DE CRISTAL!",
      rewardTokens: 34,
      rewardSteel: 48,
      rewardCores: 5
    },
    coloso_vapor: {
      id: "coloso_vapor",
      name: "Coloso de Vapor",
      title: "Titán de Asedio de la Muralla Exterior",
      spriteRow: 2,
      hp: 1450,
      atk: 56,
      spd: 52,
      attackRange: 155,
      windupTime: 1.65,
      vulnerableTime: 5.5,
      frontDamageMultiplier: 0.45,
      mechanicHint: "Emite una Erupción de Vapor Térmico en área amplia. Aléjate del círculo rojo durante la sobrecarga y lánzate con cables hacia su nuca cuando quede exhausto.",
      attackLabel: "¡ERUPCIÓN DE VAPOR ABRASADOR!",
      rewardTokens: 55,
      rewardSteel: 80,
      rewardCores: 9
    }
  },

  expeditions: [
    {
      id: "exp_bosque",
      name: "Expedición 1: Bosque de Árboles Gigantes",
      difficultyBadge: "AMENAZA ESTÁNDAR · NV. RECOMENDADO 1+",
      biome: "forest",
      unlockedByDefault: true,
      description: "Ruta de reconocimiento entre árboles centenarios fuera del Bastión Aegis. Ideal para rescatar supervivientes, recolectar Fichas Aegis y abatir a los primeros Jefes Colosales.",
      nodes: [
        {
          id: "n1_entrada",
          stage: 1,
          title: "1. Puerta Exterior del Bosque",
          type: "combat",
          biome: "forest",
          summary: "Patrulla inicial contra Merodeadores de Ceniza cerca de los almacenes avanzados.",
          enemies: ["merodeador", "merodeador"],
          survivors: 1,
          crates: 2,
          canExtractAfter: false,
          nextNodes: ["n2_norte", "n2_sur"]
        },
        {
          id: "n2_norte",
          stage: 2,
          title: "2A. Senda de las Copas Altas (Ruta Ágil)",
          type: "combat",
          biome: "forest",
          summary: "Terreno elevado con Acechadores Saltarines y un civil atrapado junto a suministros.",
          enemies: ["saltarin", "saltarin", "merodeador"],
          survivors: 1,
          crates: 2,
          canExtractAfter: true,
          nextNodes: ["n3_evento_norte", "n3_extraccion"]
        },
        {
          id: "n2_sur",
          stage: 2,
          title: "2B. Convoy Abandonado (Ruta Pesada)",
          type: "combat",
          biome: "ruins",
          summary: "Un Demoledor de Escombros custodia vagones cargados de Acero Táctico.",
          enemies: ["demoledor", "merodeador"],
          survivors: 1,
          crates: 3,
          canExtractAfter: true,
          nextNodes: ["n3_extraccion", "n3_evento_sur"]
        },
        {
          id: "n3_evento_norte",
          stage: 3,
          title: "3A. Depósito de Gas Intacto",
          type: "event",
          biome: "forest",
          summary: "Decisión táctica: asegurar suministros médicos o sobrecargar turbinas antes del Jefe.",
          eventChoices: [
            {
              label: "Asegurar Cajas y Reabastecer Escuadra",
              riskText: "Sin riesgo · +35% Vida a la escuadra, +1 Botiquín y +12 Fichas Aegis",
              effect: { healPct: 0.35, medkits: 1, tokens: 12, steel: 15, cores: 1 }
            },
            {
              label: "Extraer Núcleos del Nido de Colosos",
              riskText: "Riesgo Moderado (-15% Vida actual) · +28 Fichas Aegis, +30 Acero y +3 Núcleos",
              effect: { hpPenaltyPct: 0.15, tokens: 28, steel: 30, cores: 3 }
            }
          ],
          canExtractAfter: true,
          nextNodes: ["n4_jefe_matriarca"]
        },
        {
          id: "n3_extraccion",
          stage: 3,
          title: "3B. Puesto de Bengala Verde (Extracción / Cruce)",
          type: "combat",
          biome: "forest",
          summary: "Defiende la torre de señales para asegurar el botín acumulado o elige a qué Jefe enfrentarte.",
          enemies: ["merodeador", "saltarin", "demoledor"],
          survivors: 2,
          crates: 2,
          canExtractAfter: true,
          nextNodes: ["n4_jefe_acorazado", "n4_jefe_matriarca"]
        },
        {
          id: "n3_evento_sur",
          stage: 3,
          title: "3C. Polvorín de Lanzas Trueno",
          type: "event",
          biome: "ruins",
          summary: "Encuentras un arsenal experimental rodeado de vapor corrosivo.",
          eventChoices: [
            {
              label: "Equipar Munición Térmica Segura",
              riskText: "Sin riesgo · +15% Ataque en esta expedición y +15 Fichas Aegis",
              effect: { tempAtkBuff: 0.15, tokens: 15, steel: 20, cores: 2 }
            },
            {
              label: "Desmontar Reactor Completo",
              riskText: "Riesgo (-20% Vida actual) · +32 Fichas Aegis y +4 Núcleos Térmicos",
              effect: { hpPenaltyPct: 0.20, tokens: 32, steel: 35, cores: 4 }
            }
          ],
          canExtractAfter: true,
          nextNodes: ["n4_jefe_acorazado"]
        },
        {
          id: "n4_jefe_acorazado",
          stage: 4,
          title: "4A. Brecha del Bastión: Acorazado de Basalto (JEFE)",
          type: "boss",
          biome: "ruins",
          bossId: "acorazado",
          enemies: ["merodeador"],
          survivors: 1,
          crates: 2,
          summary: "Enfrenta al coloso blindado. Abatirlo asegura el 100% del botín más bonificación Jackpot (+50% Fichas).",
          canExtractAfter: true,
          nextNodes: []
        },
        {
          id: "n4_jefe_matriarca",
          stage: 4,
          title: "4B. Claro Cristalino: Matriarca Cristalina (JEFE)",
          type: "boss",
          biome: "forest",
          bossId: "matriarca",
          enemies: ["saltarin"],
          survivors: 1,
          crates: 2,
          summary: "Duelo contra la soberana marcial de cristal. Abatirla asegura el 100% del botín más bonificación Jackpot (+50% Fichas).",
          canExtractAfter: true,
          nextNodes: []
        }
      ]
    },
    {
      id: "exp_muralla",
      name: "Expedición 2: Ruinas de la Muralla Exterior",
      difficultyBadge: "AMENAZA EXTREMA · NV. RECOMENDADO 2+",
      biome: "ruins",
      unlockedByDefault: false,
      unlockRequirementText: "Requiere Sala de Mapas Nv. 2 o completar la Expedición 1",
      description: "Operación de alto riesgo en el cráter térmico de la antigua capital. Recompensas duplicadas y enfrentamiento contra el Coloso de Vapor.",
      nodes: [
        {
          id: "m1_brecha",
          stage: 1,
          title: "1. Distrito en Ruinas",
          type: "combat",
          biome: "ruins",
          summary: "Avance entre murallas derruidas contra una horda de Acechadores y Demoledores.",
          enemies: ["saltarin", "demoledor", "merodeador"],
          survivors: 1,
          crates: 3,
          canExtractAfter: false,
          nextNodes: ["m2_crater", "m2_almacen"]
        },
        {
          id: "m2_crater",
          stage: 2,
          title: "2A. Avenida de Ceniza Ardiente",
          type: "combat",
          biome: "ruins",
          summary: "Doble Demoledor de Escombros bloqueando el paso hacia la muralla principal.",
          enemies: ["demoledor", "demoledor", "saltarin"],
          survivors: 2,
          crates: 3,
          canExtractAfter: true,
          nextNodes: ["m3_jefe_vapor"]
        },
        {
          id: "m2_almacen",
          stage: 2,
          title: "2B. Bóveda Subterránea del Cuerpo de Ingeniería",
          type: "event",
          biome: "ruins",
          summary: "Cámara acorazada intacta bajo los escombros de la muralla.",
          eventChoices: [
            {
              label: "Evacuar Supervivientes y Botiquines",
              riskText: "Sin riesgo · +40% Vida a la escuadra, +2 Botiquines y +25 Fichas Aegis",
              effect: { healPct: 0.40, medkits: 2, tokens: 25, steel: 30, cores: 3 }
            },
            {
              label: "Forzar Cámara de Reliquias Aegis",
              riskText: "Riesgo (-20% Vida actual) · +45 Fichas Aegis, +55 Acero y +6 Núcleos Térmicos",
              effect: { hpPenaltyPct: 0.20, tokens: 45, steel: 55, cores: 6 }
            }
          ],
          canExtractAfter: true,
          nextNodes: ["m3_jefe_vapor"]
        },
        {
          id: "m3_jefe_vapor",
          stage: 3,
          title: "3. Cráter Central: Coloso de Vapor (JEFE FINAL)",
          type: "boss",
          biome: "ruins",
          bossId: "coloso_vapor",
          enemies: ["merodeador", "saltarin"],
          survivors: 2,
          crates: 3,
          summary: "El coloso sin dermis domina la muralla exterior. Corta su nuca tras sus descargas de vapor para reclamar el Gran Jackpot Aegis.",
          canExtractAfter: true,
          nextNodes: []
        }
      ]
    }
  ]
};
