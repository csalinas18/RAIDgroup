# Reporte de código — RAIDGroup (documento de contexto)

Este documento describe qué se construyó, cómo está organizado y qué decisiones
técnicas se tomaron. Sirve como contexto de onboarding para retomar el proyecto.

---

## 1. Contexto general

**RAIDGroup** es un simulador web (React, sin backend) de tolerancia a fallos en
almacenamiento distribuido, fundamentado en **Teoría de Grupos de Permutaciones
(S₉)**. Es un proyecto universitario de **Matemáticas Discretas**.

Modela un clúster de **9 discos** en matriz 3×3. Un `.txt` se parte en 9
fragmentos (uno por disco). Dos mecanismos matemáticos, **independientes y
complementarios**:

1. **Permutaciones de S₉** — el "balanceo de carga" reordena los fragmentos.
   La recuperación es aplicar la permutación inversa: `(A∘B∘C)⁻¹ = C⁻¹∘B⁻¹∘A⁻¹`.
   Recupera de un **desorden** (los datos están, pero mal ubicados).
2. **Paridad XOR sobre Z₂** — un bloque `P = F₀⊕…⊕F₈` permite reconstruir un
   disco físicamente destruido. Recupera de una **pérdida** (falta un dato).

Idea clave del proyecto: *permutación inversa repara el desorden; XOR repara la
pérdida; en un escenario con ambos, primero XOR (traer el dato) y luego Σ⁻¹
(reordenar).*

---

## 2. Stack

- React 18 + Vite (build tool)
- Tailwind CSS v3 (paleta oscura personalizada en `tailwind.config.js`)
- Framer Motion (animaciones)
- `idb` (wrapper de IndexedDB para persistencia)
- Toda la matemática está implementada **desde cero**, sin librerías de álgebra.
- Idioma: UI en español; nombres de clases/métodos en inglés.

Comandos: `npm install`, `npm run dev` (http://localhost:5173), `npm run build`.

---

## 3. Arquitectura en capas

```
src/
├── main.jsx / index.css
├── App.jsx                 ← estado global, orquestación, persistencia
├── math/                   ← LÓGICA PURA (sin React)
│   ├── Permutation.js
│   ├── DistributedSystem.js
│   ├── ProtocolController.js
│   ├── ParityEngine.js
│   └── FileFragmenter.js
├── storage/DiskStorage.js  ← IndexedDB
└── components/             ← UI (React + Framer Motion)
    ├── ClusterGrid.jsx
    ├── FileLoader.jsx
    ├── MoveControls.jsx
    ├── MathPanel.jsx
    ├── RecoveryPanel.jsx
    └── ParityPanel.jsx
```

Regla de dependencia: `math/` no importa React ni componentes. Los componentes
importan `math/` y `storage/`. `App.jsx` conecta todo.

---

## 4. Capa matemática (`src/math/`)

### `Permutation.js`
Elemento de S₉ como array `mapping` de 9 índices base-0. Identidad = `[0..8]`.
- `compose(other)` → `this ∘ other`; `result[i] = this.mapping[other.mapping[i]]`.
- `inverse()`, `order()` (aplica hasta volver a la identidad), `apply(array)`
  (`result[i] = array[mapping[i]]`), `isIdentity()`, `equals()`.
- `toCycleNotation()` → notación cíclica base-1, `e` si identidad.
- `toFunctionTable()` → `{domain, codomain}` para la UI.
- `static identity()`, `static verifyAssociativity(a,b,c)` → devuelve
  `{leftSide, rightSide, isEqual, steps:{ab,bc,ab_c,a_bc}}`.

### `DistributedSystem.js`
Estado del clúster. Define los **6 generadores** (3-ciclos, orden 3):
A=fila sup, B=fila inf, C=col izq, D=col der, E=diagonal, F=fila central.
- Acumula Σ componiendo **a la derecha**: `Σ ← Σ ∘ mov`. Así, historial `[A,B,C]`
  ⇒ `Σ = A∘B∘C` y `Σ⁻¹ = C⁻¹∘B⁻¹∘A⁻¹`. **(Decisión crítica, ver §7.)**
- `applyMove`, `applyToFragments`, `reset`, `restoreHistory`, `getMoveDescription`.

### `ProtocolController.js`
Lógica de recuperación (métodos estáticos):
- `getSolutionSequence(history)` → invierte y niega: `[A,B,C]→[C⁻¹,B⁻¹,A⁻¹]`.
- `computeInverseWord` / `computeForwardWord` → strings legibles.
- `reconstructIterative(mixed, history, moves)` → aplica la secuencia inversa
  paso a paso, devuelve `{result, steps}` (para animar).
- `reconstructDirect(mixed, sigmaInverse)` → aplica Σ⁻¹ de una vez.
- `verifyReconstruction(original, reconstructed)`.

### `ParityEngine.js`
XOR sobre Z₂ (métodos estáticos). `computeParity`, `recoverFragment`,
`verifyIntegrity`, `xorBytes`, `textToBytes`/`bytesToText` (UTF-8).
- **Detalle de implementación:** los fragmentos de datos son UTF-8, pero los
  bytes de paridad son binarios arbitrarios (no forman UTF-8 válido). Para
  persistir P sin corromperlo se usa una codificación **Latin1 reversible**
  (`bytesToLatin1`/`latin1ToBytes`, 1 byte ↔ 1 code unit). El XOR también
  hace padding a la longitud máxima con ceros por robustez.
- Propiedad clave: **P es invariante bajo permutación** (XOR conmutativo/
  asociativo), por eso la recuperación funciona en cualquier estado de Σ.

### `FileFragmenter.js`
`fragment(text)` → 9 fragmentos de igual longitud (padding con espacios).
`reconstruct(fragments)` → concatena y hace `trimEnd()`.

---

## 5. Persistencia (`storage/DiskStorage.js`)

IndexedDB `RAIDGroupDB`: store `disks` (`{id, fragment, alive}`) y store
`metadata` (`{key:'parity'|'history', value}`). Funciones async:
`initDB, saveFragments, saveParity, saveHistory, loadDisks, loadParity,
loadHistory, destroyDisk, repairDisk, clearAll`. La sesión se restaura al abrir.

---

## 6. Componentes y `App.jsx`

- **`App.jsx`** — dueño de todo el estado (`system`, `fragments`,
  `originalFragments`, `parityFragment`, `destroyedDisks`, `lostFragment`,
  `wearCounters`, `history`, `currentPermutation`, `operationLog`, etc.).
  `stepMove()` es la unidad reutilizable que aplica un movimiento (usada por los
  botones, Mezclar y Resolver). Usa un `originalRef` para lecturas síncronas
  dentro de los bucles de animación con `await`. Layout de 2 columnas:
  izquierda = ClusterGrid + MoveControls; derecha = tabs Matemática/Recuperación/
  Paridad.
- **`ClusterGrid.jsx`** — grilla 3×3. **Discos en celdas fijas** (no se
  reordenan); el movimiento del fragmento se muestra con un **fundido del
  contenido** y el badge `F1..F9` indica qué fragmento lógico ocupa cada disco.
  (Ver §7 — por qué NO se usa animación de posición.)
- **`FileLoader.jsx`** — drag&drop + textarea; fragmenta y calcula paridad.
- **`MoveControls.jsx`** — botones A–F e inversos, historial, velocidad,
  Mezclar/Resolver/Reiniciar. Se **bloquea si hay un disco caído**.
- **`MathPanel.jsx`** — 3 tabs: permutación Σ (tabla, ciclos, orden), verificador
  de asociatividad, propiedades de grupo.
- **`RecoveryPanel.jsx`** — 4 fases del sistema, reconstrucción iterativa y
  directa, descarga, log. Reconstrucción **bloqueada si hay disco caído**.
- **`ParityPanel.jsx`** — muestra P, integridad, simular fallo, recuperar por XOR.

---

## 7. Decisiones clave y problemas resueltos (IMPORTANTE)

Estas notas explican *por qué* el código es como es; conviene no revertirlas.

1. **Orden de composición de Σ.** `applyMove` compone a la derecha
   (`Σ ← Σ ∘ mov`). Se probó primero al revés y **rompía la reconstrucción
   iterativa**; este orden hace que `[A,B,C] ⇒ Σ=A∘B∘C ⇒ Σ⁻¹=C⁻¹∘B⁻¹∘A⁻¹`, que
   es coherente con la aplicación física incremental sobre los fragmentos.
   Verificado con tests unitarios (reconstrucción iterativa y directa coinciden).

2. **Discos sin animación de posición.** Se intentó el "deslizamiento" de las
   tarjetas con `layout`/`layoutId` de Framer Motion. Falla en este stack: al
   mezclar/reconstruir, Framer dejaba **transformaciones residuales incorrectas**
   sobre las celdas de CSS grid (agravado por `backdrop-blur`), y las tarjetas se
   salían del área visible o se superponían → "desaparecía" un disco.
   Diagnosticado midiendo `getBoundingClientRect` en Chrome headless. Solución
   definitiva: **celdas estáticas + fundido de contenido** (imposible que una
   tarjeta se pierda). La matemática nunca estuvo afectada; era 100% visual.

3. **Guarda de estado degradado.** Mover el clúster mientras un disco está caído
   producía estados confusos (la app recalcula fragmentos desde los originales,
   "tapando" el hueco por detrás mientras el disco seguía marcado como muerto, y
   la verificación comparaba contra el fragmento del momento de la destrucción).
   Solución: **mientras haya un disco caído se deshabilitan movimientos, Mezclar,
   Resolver y reconstrucción**; solo quedan *Recuperar* y *Reiniciar*. Esto
   impone el orden conceptual correcto (XOR primero, Σ⁻¹ después).

---

## 8. Estado de verificación

- **Tests unitarios de `math/`** (script ad-hoc con Node): generadores biyectivos,
  `A∘A⁻¹=e`, orden 3, asociatividad, `fragment↔reconstruct`, reconstrucción
  iterativa y directa, recuperación XOR de los 9 discos. Todos pasan.
- **Pruebas de UI en Chrome headless (puppeteer-core, instalado con `--no-save`,
  no queda en `package.json`):** confirmado que las 9 tarjetas siempre están
  visibles (opacidad 1) tras mezclar/reconstruir, y que la guarda deshabilita los
  movimientos durante un fallo y los reactiva tras recuperar. Sin errores de
  consola.
- `npm run build` compila limpio.

---

## 9. Git / control de versiones

Repo: `https://github.com/csalinas18/RAIDgroup` (rama `main`). Commits
progresivos en español, primera persona, uno por capa/componente, firmados como
`Camilo Salinas <camilos1302@gmail.com>`. Se hace `git push` tras cada commit.
