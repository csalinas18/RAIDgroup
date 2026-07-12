# RAIDGroup

**Simulador interactivo de consistencia y tolerancia a fallos en almacenamiento
distribuido, fundamentado en la Teoría de Grupos de Permutaciones (S₉).**

Proyecto para la asignatura de **Matemáticas Discretas** — Ingeniería de Sistemas.

RAIDGroup modela un clúster de **9 discos duros** dispuestos en una matriz 3×3.
Un archivo `.txt` se divide en 9 fragmentos (uno por disco). Las operaciones de
"balanceo de carga" son **permutaciones del grupo simétrico S₉** que redistribuyen
los fragmentos, y la recuperación se logra aplicando la **secuencia inversa**. La
destrucción física de un disco se recupera mediante **paridad XOR sobre Z₂**.

---

## 🚀 Instalación y ejecución

Requisitos: **Node.js 18+** y **npm**.

```bash
# 1. Instalar dependencias
npm install

# 2. Levantar el servidor de desarrollo
npm run dev
```

Luego abre `http://localhost:5173/` en Chrome o Firefox.

Otros comandos:

```bash
npm run build     # build de producción en dist/
npm run preview   # previsualiza el build de producción
```

### Stack

- **React 18** + **Vite**
- **Tailwind CSS** (paleta personalizada)
- **Framer Motion** (animaciones)
- **idb** (IndexedDB para persistencia)
- Toda la matemática está implementada **desde cero**, sin librerías de álgebra.

---

## 📁 Estructura del proyecto

```
src/
├── main.jsx
├── App.jsx                     ← estado global, layout y orquestación
├── index.css                   ← Tailwind + estilos base
├── math/                       ← CAPA MATEMÁTICA (JavaScript puro, sin React)
│   ├── Permutation.js
│   ├── DistributedSystem.js
│   ├── ProtocolController.js
│   ├── ParityEngine.js
│   └── FileFragmenter.js
├── storage/
│   └── DiskStorage.js          ← persistencia en IndexedDB
└── components/
    ├── ClusterGrid.jsx         ← grilla 3×3 de discos + bloque de paridad
    ├── FileLoader.jsx          ← carga y fragmentación de .txt
    ├── MoveControls.jsx        ← botones de movimiento e historial
    ├── MathPanel.jsx           ← permutación actual, asociatividad, grupo S₉
    ├── RecoveryPanel.jsx       ← reconstrucción iterativa y directa
    └── ParityPanel.jsx         ← simulación de fallo + recuperación XOR
```

---

## 🧮 Descripción de la capa matemática (`src/math/`)

### `Permutation.js`
Representa un elemento de **S₉** como un array `mapping` de 9 índices base-0.
La identidad es `[0,1,2,3,4,5,6,7,8]`.

| Método | Descripción |
|---|---|
| `compose(other)` | Composición `this ∘ other`: `result[i] = this.mapping[other.mapping[i]]`. Primero se aplica `other`, luego `this`. |
| `inverse()` | Inverso: si `mapping[i] = j` entonces `inverse.mapping[j] = i`. |
| `order()` | Menor `k ≥ 1` tal que `σᵏ = e`. |
| `toCycleNotation()` | Notación cíclica base-1, ej. `(1 3 2)(4 5)`; la identidad devuelve `e`. |
| `apply(array)` | Reordena 9 elementos: `result[i] = array[mapping[i]]`. |
| `isIdentity()` | `true` si el mapping es la identidad. |
| `toFunctionTable()` | Devuelve `{ domain, codomain }` para mostrar `σ: {1..9} → {1..9}`. |
| `static identity()` | Permutación identidad. |
| `static verifyAssociativity(a,b,c)` | Comprueba `(a∘b)∘c = a∘(b∘c)` y devuelve los pasos intermedios. |

### `DistributedSystem.js`
Gestiona el estado del clúster. Define los **6 generadores** (3-ciclos) del
subgrupo de S₉ usado para el balanceo:

| Mov. | Acción | Posiciones |
|---|---|---|
| **A** | Rotar fila superior → | [0,1,2] |
| **B** | Rotar fila inferior → | [6,7,8] |
| **C** | Rotar columna izquierda ↓ | [0,3,6] |
| **D** | Rotar columna derecha ↓ | [2,5,8] |
| **E** | Rotar diagonal principal ↓ | [0,4,8] |
| **F** | Rotar fila central → | [3,4,5] |

Acumula la permutación actual **Σ** componiendo a la derecha
(`Σ = Σ ∘ mov`), de modo que para el historial `[A, B, C]` se obtiene
`Σ = A ∘ B ∘ C` y su inverso es `Σ⁻¹ = C⁻¹ ∘ B⁻¹ ∘ A⁻¹`. Métodos:
`applyMove`, `applyToFragments`, `reset`, `restoreHistory`,
`getMoveDescription`.

### `ProtocolController.js`
El "sistema operativo" del clúster: la lógica de recuperación.
- `getSolutionSequence(history)` — invierte el historial y cada movimiento:
  `[A,B,C] → [C⁻¹,B⁻¹,A⁻¹]`.
- `computeInverseWord(history)` — palabra legible `C⁻¹ ∘ B⁻¹ ∘ A⁻¹`.
- `reconstructIterative(...)` — aplica la secuencia inversa paso a paso
  (permite animar la reconstrucción).
- `reconstructDirect(mixed, σ⁻¹)` — aplica el inverso de una sola vez.
- `verifyReconstruction(original, reconstructed)` — compara ignorando el padding.

### `ParityEngine.js`
Tolerancia a fallos mediante **paridad XOR sobre Z₂**.
- `computeParity(fragments)` — `P = F₀ ⊕ F₁ ⊕ … ⊕ F₈`.
- `recoverFragment(remaining, P, k)` —
  `Fₖ = P ⊕ F₀ ⊕ … ⊕ F₍ₖ₋₁₎ ⊕ F₍ₖ₊₁₎ ⊕ … ⊕ F₈`.
- `verifyIntegrity(fragments, P)` — el XOR total debe ser cero.

Los fragmentos de datos son texto **UTF-8**; los bytes de paridad son binarios
arbitrarios y se persisten con una codificación Latin1 reversible para no
corromperlos.

### `FileFragmenter.js`
- `fragment(text)` — divide en 9 fragmentos de igual longitud (rellena con
  espacios si es necesario).
- `reconstruct(fragments)` — concatena y quita el padding final.

---

## 📐 Explicación matemática del proyecto

### El grupo simétrico S₉
**S₉** es el conjunto de todas las biyecciones (permutaciones) del conjunto
`{1,2,…,9}` con la operación de **composición de funciones**. Tiene
`|S₉| = 9! = 362 880` elementos y satisface los **axiomas de grupo**:

1. **Clausura** — la composición de dos permutaciones es otra permutación.
2. **Asociatividad** — `(a∘b)∘c = a∘(b∘c)`.
3. **Elemento neutro** — la identidad `e` cumple `σ∘e = e∘σ = σ`.
4. **Inverso** — cada `σ` tiene `σ⁻¹` con `σ∘σ⁻¹ = e`.

En RAIDGroup cada disco es una de las 9 posiciones y cada movimiento de
balanceo es un elemento de S₉. Los 6 generadores A–F son **3-ciclos** (orden 3),
y sus composiciones generan permutaciones de estructura cíclica arbitraria
dentro del subgrupo que producen.

### Composición e inversos: la recuperación
Si mezclamos el clúster con la secuencia de movimientos
`Σ = A ∘ B ∘ C`, para recuperar el archivo original basta aplicar el inverso.
Por la propiedad del **inverso de un producto** en un grupo:

```
(A ∘ B ∘ C)⁻¹ = C⁻¹ ∘ B⁻¹ ∘ A⁻¹
```

Es decir, se deshace en **orden inverso** aplicando el inverso de cada
movimiento. RAIDGroup lo hace de dos formas equivalentes:
- **Iterativa** — aplica `C⁻¹`, luego `B⁻¹`, luego `A⁻¹` paso a paso.
- **Directa** — calcula `Σ⁻¹` y lo aplica de una sola vez.

Ambas devuelven exactamente el texto original, ilustrando que la reconstrucción
es determinista y exacta gracias a la estructura de grupo.

### Paridad y el cuerpo Z₂
La tolerancia a la **pérdida física de un disco** no se resuelve con
permutaciones sino con **álgebra sobre Z₂** (el cuerpo de dos elementos `{0,1}`
con la suma XOR). Se guarda un bloque de paridad:

```
P = F₀ ⊕ F₁ ⊕ … ⊕ F₈
```

Si se destruye el disco `k`, se recupera con:

```
Fₖ = P ⊕ (⊕ de todos los fragmentos supervivientes)
```

Esto funciona por dos propiedades de Z₂:
- `a ⊕ a = 0` (todo elemento es su propio inverso aditivo),
- `a ⊕ 0 = a` (0 es el neutro).

Al volver a hacer XOR de la paridad con los fragmentos que sí sobreviven, cada
uno se cancela consigo mismo en la suma de `P` y solo **sobrevive el fragmento
perdido**. Además, como el XOR es conmutativo y asociativo, la paridad es
**invariante bajo cualquier permutación** de los fragmentos: mezclar el clúster
no altera `P`.

---

## 🎮 Uso

1. **Carga** un archivo `.txt` (arrastrando o seleccionando) o escribe texto
   directamente. El archivo se fragmenta en 9 bloques y se calcula la paridad.
2. **Aplica movimientos** A–F o sus inversos para redistribuir los fragmentos;
   observa la permutación acumulada Σ, su notación cíclica y su orden en el panel
   *Matemática*.
3. **Mezcla** aleatoriamente y luego pulsa **Resolver** o usa el panel
   *Recuperación* para reconstruir el archivo (iterativa o directa).
4. En el panel *Paridad / Z₂*, **simula el fallo físico** de un disco y
   **recupéralo** con XOR.

Todo el estado se **persiste en IndexedDB**, de modo que la sesión sobrevive a
recargas del navegador.
