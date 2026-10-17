# AOT: Titan Jackpot — Crónicas del Bastión Aegis

Juego web 2D de acción táctica, expediciones ramificadas y máquina de suministros con identidad visual original de fantasía militar oscura (**Bastión Aegis — Cuerpo de Murallas**). Diseñado para ejecutarse directamente en navegadores de escritorio (PC/Mac) y dispositivos móviles (Android/iOS) y listo para publicarse en **GitHub Pages**.

---

## 1. Características Principales

- **Identidad Visual Original y Libre de Derechos**:
  - 4 Exploradores jugables con roles, habilidades activas y hojas de sprites animadas propias (*Capitán Kaelen Vance — Vanguardia*, *Soren Falk — Explorador*, *Valeria Krost — Ingeniera*, *Dra. Elena Vane — Médica*).
  - 3 Tipos de Colosos comunes/élite (*Merodeador de Ceniza*, *Acechador Saltarín*, *Demoledor de Escombros*) y 3 Jefes Colosales con mecánicas diferenciadas (*Acorazado de Basalto*, *Matriarca Cristalina* y *Coloso de Vapor*).
  - Integración de tiles, partículas adaptadas a pixel-art, interfaz y sonidos bajo licencia **CC0 1.0 Dominio Público** (documentados en `ASSET_LICENSES.md`).
- **Combate 2D en Tiempo Real con Puntos Débiles (La Nuca)**:
  - Los Colosos reducen el daño frontal y anticipan sus ataques con indicadores visuales y textuales claros en el terreno.
  - Utiliza los **Cables de Maniobra (`Espacio`)** para flanquear al enemigo y colocarte a su espalda o golpéalo cuando quede **Vulnerable** tras un ataque pesado para ejecutar un **Corte Crítico en la Nuca (×2.3 a ×3.2 de daño)**.
- **Expediciones Ramificadas y Extracción con Bengala Verde**:
  - 2 Expediciones desbloqueables (*Bosque de Árboles Gigantes* y *Ruinas de la Muralla Exterior*) con nodos de combate, rescate de supervivientes, eventos de decisión con riesgo/recompensa explícitos y puntos de extracción.
  - En caso de derrota de la escuadra, **nunca pierdes personajes ni mejoras permanentes**: realizas una evacuación de emergencia conservando el 50 % del botín no asegurado.
- **Máquina de Suministros ("Tómbola Táctica Aegis")**:
  - Funciona exclusivamente con **Fichas Aegis** ficticias obtenidas jugando (sin dinero real, pasarelas de pago ni apuestas monetarias).
  - Muestra costes y probabilidades exactas antes de tirar (**Común 50 %**, **Raro 32 %**, **Épico 14 %**, **Jackpot Legendario 4 %**), contador de garantía (*pity*) y conversión automática de duplicados en **Acero Táctico** y **Núcleos Térmicos**.
- **Guardado Local Persistente (`localStorage`) y Accesibilidad**:
  - Guardado automático tras cada mejora, tirada y nodo de expedición.
  - Opciones de volumen, modo de **Reducción de Movimiento y Sacudidas**, **Texto Grande** y **Alto Contraste**.

---

## 2. Controles (PC y Móvil)

| Acción | Teclado (PC) | Pantalla Táctil (Celular / Tablet) |
| :--- | :--- | :--- |
| **Movimiento 2D** | `WASD` o `Flechas` | **Joystick Virtual** (esquina inferior izquierda) |
| **Atacar (Cuchillas / Lanza)** | `J`, `Z` o `Enter` | Botón táctil **⚔ ATACAR** |
| **Cables / Esquiva hacia la Nuca** | `Espacio` o `Shift` | Botón táctil **🪝 CABLES / NUCA** |
| **Habilidad Única de Unidad** | `K`, `E` o `X` | Botón táctil **✨ HABILIDAD** |
| **Usar Botiquín de Campaña** | `L`, `Q` o `C` | Botón táctil **➕ BOTIQUÍN** |
| **Cambiar Explorador Activo** | Teclas `1`, `2`, `3`, `4` | Tocar el retrato del explorador en la barra superior |
| **Extraer / Avanzar en Zona Despejada** | Tecla `R` o acercarse a la Bengala Verde | Botón **🟢 Continuar / Extraer** o acercarse a la Bengala |
| **Pausar Partida** | `P` o `Esc` (pausa automática al cambiar de pestaña) | Botón **⏸ Pausa** |

---

## 3. Requisitos y Ejecución Local

El proyecto no requiere servidor backend, bases de datos externas ni dependencias de compilación pesadas. Utiliza rutas relativas y un paquete de respaldo offline (`src/data/assetsBundle.js`).

### Opción A: Con cualquier servidor estático local (recomendado para desarrollo)
```bash
# Usando Python 3 (incluido en la mayoría de sistemas)
python3 -m http.server 8080
```
Luego abre `http://localhost:8080` en tu navegador de escritorio o móvil.

### Opción B: Ejecución directa sin servidor
Gracias a la capa `assetsBundle.js`, también puedes abrir `index.html` directamente con doble clic en cualquier navegador moderno.

---

## 4. Estructura del Proyecto

```text
.
├── index.html                        # Punto de entrada con rutas relativas compatibles con GitHub Pages
├── README.md                         # Documentación de uso, controles y despliegue
├── ASSET_LICENSES.md                 # Registro detallado de recursos ZIP inspeccionados y licencias CC0
├── .nojekyll                         # Evita procesamiento Jekyll innecesario en GitHub Pages
├── .github/workflows/deploy.yml      # Flujo de GitHub Actions listo para publicar en GitHub Pages
├── assets/
│   ├── sprites/                      # Hojas de sprites animadas (exploradores, enemigos, jefes, retratos, props)
│   ├── tiles/                        # Tiles 32x32 extraídos de Kenney Roguelike RPG Pack (CC0)
│   ├── particles/                    # Partículas pixel-art adaptadas de Kenney Particle Pack (CC0)
│   ├── audio/                        # Efectos de sonido .ogg de Kenney Interface Sounds (CC0)
│   └── fonts/                        # Tipografía Kenney Future Narrow (CC0)
└── src/
    ├── data/
    │   ├── gameData.js               # Configuración de marca, balance, probabilidades, unidades y rutas
    │   └── assetsBundle.js           # Respaldo offline de recursos en Data URI
    ├── engine/
    │   ├── audioAndStorage.js        # Persistencia en localStorage y motor de sonido híbrido OGG + WebAudio
    │   └── combatEngine.js           # Motor Canvas 2D de exploración, cables, puntos débiles y jefes
    ├── styles/
    │   └── main.css                  # Diseño adaptable para PC y móvil + modos de accesibilidad
    └── ui/
        └── app.js                    # Controlador de las 9 pantallas, cuartel, máquina y expediciones
```

### Cambiar el nombre comercial del juego
Para modificar el título provisional `"AOT: TITAN JACKPOT"`, edita el bloque `brand` al inicio de `src/data/gameData.js`:
```js
brand: {
  workingTitle: "TU NUEVO TÍTULO",
  subtitle: "Crónicas del Bastión Aegis — Cuerpo de Murallas",
  ...
}
```

---

## 5. Publicación en GitHub Pages

El repositorio incluye `.nojekyll` y el archivo `.github/workflows/deploy.yml` preconfigurado. Para publicarlo:

1. Crea un repositorio nuevo en GitHub y sube todos los archivos del proyecto a la rama `main`:
   ```bash
   git init
   git add .
   git commit -m "Versión inicial completa de AOT: Titan Jackpot"
   git branch -M main
   git remote add origin https://github.com/<TU_USUARIO>/<TU_REPOSITORIO>.git
   git push -u origin main
   ```
2. En GitHub, entra en **Settings ➔ Pages**.
3. En **Build and deployment ➔ Source**, selecciona **GitHub Actions** (o bien **Deploy from a branch ➔ `main` / `/ (root)`**).
4. En menos de un minuto tu juego estará publicado en `https://<TU_USUARIO>.github.io/<TU_REPOSITORIO>/`.
