# Future Failure

Prototipo web 2D tipo metroidvania hecho con Phaser 3, TypeScript y Vite.

## Instalacion

```bash
npm install
```

## Ejecutar

```bash
npm run prepare:assets
npm run dev
```

Abre la URL local que imprime Vite.

## Compilacion

```bash
npm run prepare:assets
npm run test:assets
npm run test:level
npm run test:combat
npm run test:movement
npm run test:tutorial
npm run build
```

## Flujo del juego

El primer nivel esta disenado como una secuencia modular y legible:

- Bahia de inicio para leer controles y sincronizar checkpoint.
- Modulo de movimiento con saltos, dash, pared y primera puerta.
- Modulo de combate con checkpoint y soldado de validacion.
- Reactor con hazards alineados a sprites y tarjeta de acceso.
- Arena final con espacio limpio para dron, mech, energia y portal.

## Controles

Teclado:

- Moverse: flechas izquierda/derecha
- Saltar: `X`
- Dash: `Z`
- Espada / combo: `C`
- Disparo de energia: `V`
- Interactuar: flecha arriba
- Pausa: `Esc`
- Debug fisico: `F3`

Mando:

- Moverse: stick izquierdo o D-pad
- Saltar: `A`
- Atacar: `X`
- Dash: `B` o `RB`
- Interactuar: `Y`

Los controles tactiles aparecen automaticamente en dispositivos touch.
El boton `TACTIL: ON/OFF` permite mostrar u ocultar los botones en pantalla.

## Pipeline de assets

Los PNG crudos van en `public/assets/raw`. Si hay PNG en la raiz del proyecto, el script tambien los mueve a esa carpeta.

```bash
npm run prepare:assets
```

El script:

- Detecta dimensiones de PNG.
- Clasifica `1400x1120` o nombres de heroe como sheet de jugador `5x4`.
- Clasifica `1254x1254` como sheets `6x6`.
- Limpia fondos blancos/checkerboard y bordes de grilla.
- Escribe PNG con alpha en `public/assets/processed`.
- Regenera `src/assets/assetManifest.ts`.

Validacion:

```bash
npm run test:assets
npm run test:level
npm run test:combat
npm run test:movement
npm run test:tutorial
```

`test:level` revisa que LevelOne tenga techo, puertas sin dependencias circulares, keycard antes de su compuerta, colliders alineados a visuales y decoracion separada del gameplay.
`test:combat` revisa ventanas de combo, reglas de payload, hitstop y eventos semanticos del combate.
`test:movement` revisa tuning del heroe, dash/coyote/wall jump, estados semanticos y locomocion enemiga.
`test:tutorial` revisa prompts cortos, acciones declaradas, ausencia de texto redundante de controles y canal semantico de tutorial.

## Agregar niveles

Crea un archivo en `src/data` siguiendo el tipo `LevelData` de `src/data/levelTypes.ts`.
Usa las factorias de `src/data/levelFactories.ts` para plataformas, paredes, zonas, tiles, decoracion y senales de lectura.

Mantiene esta separacion:

- `platforms`: colliders rectangulares invisibles y limpios.
- `visualTiles`: sprites visibles alineados a plataformas o decoracion.
- `hazards`: `x/y/width/height` define la caja de dano; `visual` puede definir una caja distinta para ajustar el sprite.
- `pickups`, `enemies`, `doors`, `checkpoints`, `terminals`: gameplay data.
- `mapMarkers`: hitos del minimapa para que el HUD escale con cada nivel.
- `design.criticalPath`: beats pequenos que ensenan o prueban mecanicas, con `pace` e intensidad objetivo.
- `design.optionalRoutes`: rutas de riesgo/recompensa o backtracking.
- `design.graph`: nodos y conexiones de navegacion para ruta critica, ramas, retornos y atajos.
- `design.signposts`: senales visuales no funcionales para ruta, peligro, recompensa, atajo, checkpoint o salida.
- `design.landmarks`: ids memorables que ayudan a orientarse en el mapa.

Luego usa `LevelBuilder` para construir la escena desde datos.
`test:level` valida tambien flow, grafo conectado de inicio a salida, ramas reales, curva de intensidad, landmarks, atajos, prompts cercanos a puertas, roles de senalizacion, ancho de arena, spacing de enemigos y plataformas de aterrizaje.

## Reemplazar sprites

Coloca nuevos PNG en `public/assets/raw` o en la raiz y ejecuta:

```bash
npm run prepare:assets
```

Si falta un asset, el juego usa texturas fallback para mantener el gameplay ejecutable.

## Assets usados

| Key | Grilla | Frame | Categoria |
| --- | --- | --- | --- |
| `player` | 5x4 | 280x280 | jugador |
| `tiles` | 6x6 | 209x209 | plataformas industriales |
| `props` | 6x6 | 209x209 | decoracion de laboratorio |
| `hazards` | 6x6 | 209x209 | trampas y reactores |
| `doors` | 6x6 | 209x209 | puertas y portal |
| `pickups` | 6x6 | 209x209 | salud, energia y tarjetas |
| `destructibles` | 6x6 | 209x209 | cajas y barriles |
| `trooper` | 6x6 | 209x209 | enemigo soldado |
| `drone` | 6x6 | 209x209 | enemigo dron |
| `mech` | 6x6 | 209x209 | enemigo pesado |
| `interactables` | 6x6 | 209x209 | terminales y checkpoints |

## Arquitectura

El proyecto esta dividido en escenas, entidades, sistemas, UI y datos. Los textos visibles estan centralizados en `src/data/gameText.ts`; los contratos de nivel viven en `src/data/levelTypes.ts`, las factorias en `src/data/levelFactories.ts`, las metricas auditables en `src/data/levelDesignConfig.ts` y el primer nivel en `src/data/levelOne.ts`.
