# RAIDGroup

**Gestión y Recuperación de Datos mediante Estructuras Algebraicas.**

Simulador web interactivo que modela la consistencia y la tolerancia a fallos de
un sistema de almacenamiento distribuido usando **Teoría de Grupos de
Permutaciones (grupo simétrico S₉)** y **aritmética sobre Z₂ (XOR)**.

> Proyecto de **Matemáticas Discretas II** - Departamento de Ingeniería de
> Sistemas e Industrial, Universidad Nacional de Colombia (Sede Bogotá).
> **Autores:** Brayner Motta · Jhon Patiño · David Pimiento · Camilo Salinas.

---

## Resumen del proyecto

Los sistemas de almacenamiento modernos (Google Drive, Amazon S3, RAID) no
guardan un archivo en un solo disco: lo dividen en fragmentos y los distribuyen
entre varias unidades (*block striping*). Esto mejora rendimiento y
disponibilidad, pero abre dos preguntas:

1. Si los fragmentos se reorganizan constantemente entre discos para balancear la
   carga, **¿cómo se vuelve exactamente al archivo original?**
2. Si un disco **falla físicamente**, ¿cómo se recupera su fragmento sin tener
   una copia completa de respaldo?

RAIDGroup responde ambas con matemáticas discretas:

- Modela un clúster de **9 discos en matriz 3×3**. Un archivo `.txt` se parte en
  9 fragmentos, uno por disco.
- Cada reorganización de "balanceo de carga" es una **permutación de S₉**. Las
  propiedades de grupo (clausura, asociatividad, identidad, inversos) garantizan
  que **cualquier desorden se revierte exactamente** aplicando la secuencia
  inversa: `(A∘B∘C)⁻¹ = C⁻¹∘B⁻¹∘A⁻¹`.
- Un **bloque de paridad XOR** `P = b₁ ⊕ b₂ ⊕ … ⊕ b₉` permite reconstruir el
  fragmento de un disco destruido, usando la propiedad `a ⊕ a = 0` de Z₂.

Estos son, formalmente, los mismos principios que sustentan **RAID-0**
(*striping*) y **RAID-5** (paridad XOR).

### Funcionalidades

- Carga y fragmentación de un `.txt` (drag & drop o texto directo).
- 6 operadores de reorganización (A-F) y sus inversos, con historial y mezcla
  aleatoria.
- Panel matemático en tiempo real: permutación acumulada Σ, notación cíclica,
  orden, tabla de función y verificador de asociatividad.
- Reconstrucción del archivo **iterativa** (paso a paso) y **directa** (Σ⁻¹).
- Simulación de **fallo físico** de un disco y recuperación por **XOR**.
- Persistencia de la sesión en el navegador (IndexedDB).

---

## Instalación y ejecución

Requisitos: **Node.js 18+** y **npm**.

```bash
# 1. Instalar dependencias
npm install

# 2. Levantar el servidor de desarrollo
npm run dev
```

Abre `http://localhost:5173/` en Chrome o Firefox.

```bash
npm run build     # build de producción en dist/
npm run preview   # previsualiza el build de producción
```

### Stack

React 18 + Vite · Tailwind CSS · Framer Motion · `idb` (IndexedDB). Sin backend:
toda la lógica corre en el cliente. **La matemática está implementada desde
cero**, sin librerías de álgebra.

### Cómo usarlo

1. Carga un `.txt` o escribe texto → se generan 9 fragmentos y la paridad `P`.
2. Aplica movimientos (A-F o inversos) o pulsa **Mezclar**; observa Σ en la
   pestaña **Matemática**.
3. En la pestaña **Reconstrucción**, recupera el archivo (paso a paso o directo).
4. En la pestaña **Recuperación**, simula el fallo físico de un disco y
   recupéralo con XOR.

> Mientras un disco esté destruido, los movimientos y la reconstrucción quedan
> bloqueados: primero se recupera el dato con XOR (tolerancia a fallos) y solo
> después se reordena con la permutación inversa (consistencia).

---

## Estructura del proyecto

```
src/
├── main.jsx
├── App.jsx                     ← estado global, orquestación y persistencia
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
    ├── MoveControls.jsx        ← operadores, historial y acciones
    ├── MathPanel.jsx           ← Σ, notación cíclica, orden, asociatividad
    ├── RecoveryPanel.jsx       ← reconstrucción iterativa y directa
    └── ParityPanel.jsx         ← simulación de fallo + recuperación XOR
```

La arquitectura sigue tres capas con una regla central: **la capa matemática no
depende de React ni de la interfaz**, por lo que puede probarse de forma
independiente.

### Módulos matemáticos principales

- **`Permutation.js`** - capa base. Representa un elemento de S₉ como un arreglo
  de 9 índices base-0. Implementa composición `(σ∘τ)(i) = σ(τ(i))`, inverso,
  orden, notación cíclica y verificación de asociatividad.
- **`DistributedSystem.js`** - el clúster de 9 discos. Mantiene la permutación
  acumulada Σ, el historial y el estado. Define los 6 operadores (ver abajo).
  Compone **a la derecha** (`Σ ← Σ ∘ M`), de modo que el historial `[A,B,C]`
  corresponde a `Σ = A∘B∘C` y la secuencia de recuperación es `[C⁻¹,B⁻¹,A⁻¹]`.
- **`ProtocolController.js`** - el "sistema operativo" del clúster. Reconstrucción
  **iterativa** (invierte el historial y aplica cada inverso paso a paso) y
  **directa** (aplica Σ⁻¹ de una vez). Ambas se verifican byte a byte.
- **`ParityEngine.js`** - tolerancia a fallos con XOR sobre Z₂: cálculo de
  paridad, recuperación de un disco e integridad.
- **`FileFragmenter.js`** - divide el texto en 9 fragmentos iguales y los reúne.

---

## Fundamento matemático

### El grupo simétrico S₉

Un **grupo** es un par (G, ∘) que cumple **clausura**, **asociatividad**,
**identidad** e **inversos**. El **grupo simétrico** Sₙ es el conjunto de todas
las permutaciones de n elementos bajo composición, con `|Sₙ| = n!`. Aquí n = 9:

```
|S₉| = 9! = 362 880 estados posibles
```

Cada redistribución de los 9 fragmentos es un elemento de S₉, y cada propiedad
del grupo se traduce en una garantía del sistema:

| Propiedad | Garantía en el simulador |
|---|---|
| Clausura | Ninguna secuencia de movimientos produce un estado inválido. |
| Asociatividad | El orden de agrupación de los movimientos no altera el resultado. |
| Identidad | Existe el estado inicial `e` (cada fragmento en su disco). |
| Inversos | Todo desorden se revierte exactamente con `Σ⁻¹`. |

### Los 6 operadores generadores

Cada operador es un **3-ciclo** (orden 3): aplicarlo 3 veces regresa al estado
original. Sus inversos generan el subgrupo de estados alcanzables.

| Op. | Ciclo (base-1) | Acción |
|---|---|---|
| **A** | (1 3 2) | Rota la fila superior → |
| **B** | (7 9 8) | Rota la fila inferior → |
| **C** | (1 7 4) | Rota la columna izquierda ↓ |
| **D** | (3 9 6) | Rota la columna derecha ↓ |
| **E** | (1 9 5) | Rota la diagonal principal ↓ |
| **F** | (4 6 5) | Rota la fila central → |

### Recuperación por la permutación inversa

Por el **teorema del inverso de la composición**:

```
(M₁ ∘ M₂ ∘ … ∘ Mₖ)⁻¹ = Mₖ⁻¹ ∘ … ∘ M₂⁻¹ ∘ M₁⁻¹
```

Para deshacer el desorden basta con invertir el historial y aplicar el inverso de
cada movimiento en orden contrario. Es exactamente lo que hace
`ProtocolController`, sin necesidad de conocer Σ como objeto completo.

### Recuperación de un disco destruido (Z₂ / XOR)

Antes de reorganizar se calcula el bloque de paridad:

```
P = b₁ ⊕ b₂ ⊕ … ⊕ b₉
```

Si se destruye el disco `k`, su fragmento se recupera con:

```
bₖ = P ⊕ (⊕ de todos los fragmentos i ≠ k)
```

Al expandir `P`, cada fragmento superviviente aparece **dos veces** y se cancela
(`a ⊕ a = 0`), dejando únicamente `bₖ`. Además, como el XOR es conmutativo y
asociativo, **`P` es invariante bajo cualquier permutación**: la recuperación
funciona sin importar el estado de reorganización del clúster.

---

## Limitaciones

- Tamaño fijo de 9 discos; los operadores generan un subgrupo propio de S₉ (no
  todas las 362 880 permutaciones son alcanzables con los 6 movimientos).
- El esquema XOR recupera **un solo** disco destruido a la vez (como RAID-5). Dos
  fallos simultáneos requerirían doble paridad / *erasure coding* sobre GF(2⁸).
- Es una prueba de concepto matemática: no modela latencias de red, concurrencia
  ni fallos de comunicación.

## Aplicaciones reales del modelo

RAID (0 y 5), *wear leveling* en discos SSD (orden de permutaciones), la etapa
*ShiftRows* del cifrado AES (permutaciones de filas) y los códigos de
Reed-Solomon en CDs/DVDs (generalización del XOR a campos finitos).
