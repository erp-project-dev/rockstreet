# RockStreet

Beat 'em up arcade estilo Streets of Rage, temática rock de los 80s, en **Phaser 4 + TypeScript + Vite**. Resolución nativa 1920×1080.

```bash
npm install
npm run dev       # servidor de desarrollo
npm run build     # typecheck + build de producción
```

## Controles
| Acción | Tecla |
|---|---|
| Mover | Flechas / WASD |
| Golpe | Clic izquierdo / J |
| Dash (impulso rápido) | Espacio |
| Poderes | Clic derecho Power Chord · Q Feedback · E Solo |
| Pausa / volver | Esc |
| Confirmar | Enter |

En desarrollo (`npm run dev`) o abriendo la URL con `?debug`: **F1** abre el menú de debug (vida infinita, info en pantalla, ir al jefe, derrotar enemigos, ganar la misión, +$1000, desbloquear misiones, mejoras al máximo/reiniciar) y `H` resta vida. En dev el juego queda en `window.game`.

## Combate
- Combo de 3 guitarrazos (el 3º tumba), dash para acercarte o alejarte rápido (Espacio, sin invulnerabilidad) y embestida (dash + golpe, tumba). Golpear da stamina.
- Cada zona bloquea la cámara hasta vencer sus oleadas; luego aparece **GO ▶**.
- Los enemigos avisan antes de golpear (brillo naranja): es la ventana para esquivar.
- Jefes: rojo = golpe al suelo (aléjate de su radio), amarillo = llama refuerzos. Se enfurecen al 50%.

## Estructura
```
src/
  config.ts            resolución, paleta, fuentes, teclas, escenas
  data/                contenido editable sin tocar lógica
    story.ts           intro, final, objetivo principal
    missions.ts        10 misiones: lore, objetivo, jefe, recompensas
    upgrades.ts        estadísticas y poderes comprables
    items.ts           consumibles y tablas de botín
    enemies.ts         Los Fanáticos: stats, IA, botín, en qué misión aparecen
    bosses.ts          los 10 falsos guitarristas: vida, movimientos, frase
    levels.ts          zonas, oleadas y objetos rompibles de cada misión
  systems/
    SaveManager.ts     3 ranuras en localStorage, esquema versionado
    GameState.ts       partida activa, progreso, tienda, stats derivados
    Input.ts           teclado + ratón por acciones
    Music.ts           música global con fundidos (sigue entre escenas)
    WorldArt.ts        panorámicas de las 10 misiones y fondos de lore
  entities/            Fighter (profundidad falsa + estados de combate), Player (combo),
                       Enemy (IA), Boss (patrones, fases, debilidad), Projectile, Breakable, Pickup
  scenes/              Boot → Preload → MainMenu → SaveSlots → Story(intro)
                       → WorldMap ⇄ Backstage → Briefing → Game + HUD
                       → MissionComplete / GameOver → … → Story(final)
  ui/ui.ts             texto neón, paneles, menús, fondo synthwave
```

Los personajes, consumibles, objetos rompibles y fondos usan arte ilustrado cargado en `PreloadScene`; los efectos de combate y algunos proyectiles se dibujan por código.

## Audio
Música en `public/assets/audio/music/`:

| Archivo | Dónde suena |
|---|---|
| `menu.mp3` | Menús, intro, mapa, briefing, Backstage, resultados |
| `stage-garage.mp3` | Misión 1 · El Garage |
| `stage-club.mp3` | Misión 2 · Callejón del Club |
| `stage-arcade.mp3` | Misión 3 · Salón Arcade |
| `stage-disqueria.mp3` | Misión 4 · La Disquería |
| `stage-metro.mp3` | Misión 5 · Línea 86 |
| `stage-estudio.mp3` | Misión 6 · El Estudio |
| `stage-autopista.mp3` | Misión 7 · La Autopista |
| `stage-fachada.mp3` | Misión 8 · La Disquera (Discos Fachada) |
| `stage-academia.mp3` | Misión 9 · La Academia |
| `stage-coronacion.mp3` | Misión 10 · La Coronación (batalla final) |

Los temas de escenario **no** se cargan al inicio (cada uno ocupa ~80 MB decodificado): se cargan al entrar a la misión y se liberan al cambiar de escenario. El reparto está en `MISSION_TRACK` (`src/systems/Music.ts`).

Para agregar una pista:
1. Convierte el archivo: `ffmpeg -i pista.wav -codec:a libmp3lame -b:a 192k public/assets/audio/music/pista.mp3`
2. Añade su clave en `MUSIC` (`src/systems/Music.ts`) y cárgala en `PreloadScene.preload()`.
3. En la escena que corresponda, llama a `Music.play(this, MUSIC.pista)`.

## Efectos de sonido

14 efectos físicos en `public/assets/audio/sfx/` (WAV mono PCM 16 bits, 44.1 kHz): tres impactos, golpe fuerte, daño, rotura, golpe al suelo, lanzamiento/impacto de púa y cinco señales no musicales de recogida. Se eliminaron los efectos de guitarra, golpes al aire, dash, avisos, compras y navegación. Los poderes solo suenan cuando conectan mediante los impactos comunes. La música se conserva.

Generación: `python3 scripts/generate-physical-sfx.py` (ffmpeg). Fuentes: golpes de saco de qubodup y Air whoosh de pyranostudios, publicados en OpenGameArt bajo CC0; materiales de Kenney bajo CC0. Créditos y recetas guardados. `Sfx.ts` limita voces y frecuencia; las púas tienen sonidos propios. Revisión en `/sfx-preview.html`.

## Fondos finales de interfaz

Fondos originales generados con la herramienta integrada ImageGen en `public/assets/backgrounds/`: `menu.jpg`, `backstage.jpg`, `map.jpg`. Los prompts completos están en `scripts/background-prompts.json`. Se cargan en Preload y se dibujan a escala proporcional, con una sombra discreta para contraste. Los textos y controles permanecen interactivos. El mapa ubica sus diez nodos sobre las zonas del arte; el estadio corresponde a la misión final.

## Axel Riff: primera versión ilustrada

Arte de ImageGen en `public/assets/characters/axel/axel-sheet.png`, con atlas `axel-atlas.json` de 16 poses y un recorte de retrato. Los prompts están en `scripts/axel-prompts.json`. El atlas conserva el PNG original y alinea las suelas mediante offsets de frame.

`src/systems/PlayerArt.ts` registra reposo (2 cuadros), caminar (4 cuadros), golpes de combo, salto, patada, daño, levantarse y poderes. Los ataques usan pose de contacto y recuperación; no son todavía secuencias completas con cuadros intermedios. Caída y muerte conservan la rotación arcade del luchador. Las ventanas de daño y las físicas se conservan.

Visita `/axel-preview.html` con el servidor abierto para revisar todas las poses y animaciones en ambas orientaciones. Compilación, estructura del atlas y gameplay representativo verificados en navegador.

## Iconos de habilidades

Arte original de ImageGen en `public/assets/skills/`: Power Chord, Feedback y Solo (las imágenes `pick-*.png` de la púa lanzable quedan sin uso: la mecánica se retiró). `src/systems/SkillArt.ts` carga las texturas; HUD y Backstage muestran los iconos y sus estados. Los efectos de área de los poderes mantienen sus animaciones actuales.

Visita `/skills-preview.html` para revisar los iconos a tamaño grande y a tamaño de HUD. Prompts de generación: `scripts/skill-prompts.json`.

## Primer escenario: El Garage

`public/assets/levels/garage.jpg`: panorámica original de ImageGen (2172×724), garage de ensayo vandalizado, pared con instrumentos y suelo despejado. Prompt completo en `scripts/garage-prompt.json`. `src/systems/WorldArt.ts` la dibuja en coordenadas del mundo, a escala proporcional, con repeticiones reflejadas alternadas para cubrir el recorrido. El último tramo alinea el pequeño escenario con la arena de Sid. Las diez misiones usan panorámicas ilustradas propias. Oleadas, colisiones y objetos rompibles siguen siendo interactivos.

## Enemigos del primer escenario

Fanático ilustrado con tres casacas (violeta, azul, roja), seleccionado al aparecer, y Sid “Tres Acordes”, humano con guitarra. Assets de ImageGen y atlas en `public/assets/characters/punk/`, `punk-blue/`, `punk-red/`, `sid/`; prompts en `scripts/enemy-prompts.json`. Cada lámina tiene 12 poses: reposo ×2, caminata ×4, aviso, contacto, embestida, daño, caída y levantarse.

`EnemyArt.ts` registra animaciones por estado; `Enemy` elige la pose y conserva la IA y los tiempos de daño. Los golpes usan contacto y recuperación, sin todos los cuadros intermedios. La escala se calcula con la altura visible; atlas con suelas alineadas y transparencia verificados. Visita `/enemies-preview.html` para revisar animaciones y ambas orientaciones. Gameplay representativo validado en navegador.

## Consumibles ilustrados

Ocho imágenes originales de ImageGen en `public/assets/items/`: moneda, billete, fajo de dinero, corazón pequeño, corazón de vida completa, lata de energía, pase VIP de vida extra y disco de oro. Prompts en `scripts/item-prompts.json`. `src/systems/ItemArt.ts` carga las imágenes con las claves existentes; `Pickup` aplica escala proporcional por objeto y conserva recogida, rebote, parpadeo y caducidad. No cambian los efectos ni las probabilidades de botín. Los objetos colocados de forma permanente siguen sin caducar.

Vista de revisión en `/items-preview.html`, con tamaño grande y tamaño de aparición.

## Arte de toda la campaña

Los diez mapas tienen panorámicas en `public/assets/levels/` y placas de lore en `public/assets/lore/`. La introducción usa `lore/intro.jpg`. Cada ilustración sigue el lugar y la historia de su misión. `WorldArt.ts` escala proporcionalmente y repite las panorámicas con reflejos alternados, alineando el último tramo con la arena del jefe.

`EnemyArt.ts` carga los cinco tipos de enemigos comunes y los diez jefes, además de las tres casacas del Fanático. Los personajes nuevos tienen 16 poses; Fanático y Sid tienen 12. Los atlas conservan el PNG original, recortan por transparencia y alinean las suelas. Los ataques utilizan poses clave y recuperación; todavía no son animaciones con todos los cuadros intermedios.

Papelera y amplificador tienen arte transparente en `public/assets/props/`, cargado por `PropArt.ts`. Conservan sus golpes, botín y destrucción. Los prompts de esta tanda están en `scripts/remaining-art-prompts.json`; el manifiesto está en `scripts/character-manifest.json` y el generador de metadatos en `scripts/build-character-atlas.py`.

Visita `/art-review.html` para revisar toda la campaña y abrir las vistas de personajes, habilidades y consumibles. En desarrollo, los enlaces `?artPreview=level-N`, `lore-N`, `boss-N` e `intro` permiten revisar escenas usando una partida temporal que no escribe en las ranuras guardadas.

Verificación: build de producción, transparencia y límites de todos los atlas, proporciones de fondos y cobertura de los recorridos; revisión visual de menú, Garage, destrucción y recogida de botín, lore de la misión 10 y combate con Blak Source. No se ha jugado la campaña completa.

## Fuentes
Incluidas en `public/assets/fonts/` (Monoton, Audiowide y Chakra Petch; licencia OFL, subconjunto latino), registradas en `index.html`. El juego no depende de Google Fonts ni de internet para verse bien.

## Sprite de dash de Axel

`axel-dash-sheet.png` y `axel-dash-atlas.json` contienen tres poses originales de ImageGen: impulso, desplazamiento y frenado. `PlayerArt.ts` las usa para dash y embestida; reemplazan visualmente caminata y patada aérea durante esas acciones. Se conserva la mecánica existente del dash. La escala se ajusta por tamaño de fuente de cada atlas y la estela copia la pose activa. Prompts: `scripts/dash-prompt.json`. Revisión de poses en `/axel-preview.html`. Build y atlas verificados; navegador no disponible para validar esta tanda en movimiento.

## Publicación (GitHub Pages)
Repo: https://github.com/erp-project-dev/rockstreet · Sitio: https://erp-project-dev.github.io/rockstreet/

- `.github/workflows/deploy.yml` publica automáticamente en cada push a `main` (o manualmente desde *Actions → Deploy to GitHub Pages → Run workflow*): `npm ci` → `npm run build` → sube `dist/` a Pages.
- Las páginas de vista previa de assets de `public/` (`*-preview.html`, `art-review.html`) se excluyen del sitio publicado.
- `vite.config.ts` usa `base: './'` (rutas relativas), así el mismo build funciona en local y bajo `/rockstreet/`.
- Configuración única en GitHub: *Settings → Pages → Build and deployment → Source: **GitHub Actions***.

## Pulido de animaciones y combate

18 hojas suplementarias (148 poses) en las carpetas de personajes, con atlas que conservan los PNG originales. Ataques mantienen el contacto al comienzo y añaden recuperación; avisos, embestidas, daño, caída y levantarse incorporan transiciones. La escala se normaliza entre hojas y Axel tiene pose tumbada horizontal. Las ventanas de daño y la IA se conservan.

Botella, contrato y nota hostil están en `public/assets/projectiles/`. Impacto, onda de Power Chord, anillo de Feedback y rayo de Solo están en `public/assets/effects/`, cargados por `CombatArt.ts`. El final usa `public/assets/lore/ending.jpg`. Prompts completos: `scripts/polish-prompts.json` y correcciones de espaciado en `scripts/polish-spacing-prompts.json`. Generación mediante ImageGen integrado.

Revisión conjunta con las animaciones reales de Phaser: `?artPreview=actors` (solo desarrollo), teclas 1–8 y F para orientación. Vistas individuales en `axel-preview.html` y `enemies-preview.html`, exportadas de las definiciones del juego mediante `node scripts/export-animation-manifest.mjs`; proyectiles/efectos en `combat-preview.html`.
