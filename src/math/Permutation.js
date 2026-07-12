/**
 * Permutation — representa un elemento del Grupo Simétrico S₉.
 *
 * Una permutación se modela como un array `mapping` de 9 índices base-0.
 * `mapping[i] = j` significa que la posición i recibe el contenido de la
 * posición j al aplicar la permutación (ver `apply`). La identidad es
 * [0,1,2,3,4,5,6,7,8].
 *
 * Esta clase es JavaScript puro: no importa React ni ninguna otra dependencia.
 */
class Permutation {
  constructor(mapping) {
    if (!Array.isArray(mapping) || mapping.length !== 9) {
      throw new Error('Una permutación de S₉ requiere un array de 9 elementos.')
    }
    this.mapping = mapping.slice()
  }

  /**
   * Composición de funciones: this ∘ other.
   * Primero se aplica `other`, luego `this`.
   * result[i] = this.mapping[other.mapping[i]]
   */
  compose(other) {
    const result = new Array(9)
    for (let i = 0; i < 9; i++) {
      result[i] = this.mapping[other.mapping[i]]
    }
    return new Permutation(result)
  }

  /**
   * Inverso: si mapping[i] = j, entonces inverse.mapping[j] = i.
   */
  inverse() {
    const result = new Array(9)
    for (let i = 0; i < 9; i++) {
      result[this.mapping[i]] = i
    }
    return new Permutation(result)
  }

  /**
   * Orden del elemento: el mínimo k ≥ 1 tal que this^k = identidad.
   */
  order() {
    let power = Permutation.identity()
    let k = 0
    do {
      power = this.compose(power)
      k++
    } while (!power.isIdentity() && k < 5000)
    return k
  }

  /**
   * Notación cíclica en base-1, ej: "(1 3 2)(4 5)".
   * Se omiten los puntos fijos. La identidad devuelve "e".
   * Se recorre la función σ(x) = mapping[x].
   */
  toCycleNotation() {
    if (this.isIdentity()) return 'e'
    const visited = new Array(9).fill(false)
    const cycles = []
    for (let start = 0; start < 9; start++) {
      if (visited[start]) continue
      const cycle = []
      let x = start
      while (!visited[x]) {
        visited[x] = true
        cycle.push(x + 1) // base-1
        x = this.mapping[x]
      }
      if (cycle.length > 1) {
        cycles.push('(' + cycle.join(' ') + ')')
      }
    }
    return cycles.length ? cycles.join('') : 'e'
  }

  /**
   * Reordena un array de 9 elementos según la permutación.
   * result[i] = array[this.mapping[i]]
   */
  apply(array) {
    const result = new Array(9)
    for (let i = 0; i < 9; i++) {
      result[i] = array[this.mapping[i]]
    }
    return result
  }

  /** true si el mapping es [0,1,2,3,4,5,6,7,8]. */
  isIdentity() {
    for (let i = 0; i < 9; i++) {
      if (this.mapping[i] !== i) return false
    }
    return true
  }

  /** true si dos permutaciones son iguales. */
  equals(other) {
    for (let i = 0; i < 9; i++) {
      if (this.mapping[i] !== other.mapping[i]) return false
    }
    return true
  }

  /**
   * Tabla de la función σ: {1..9} → {1..9}.
   * Devuelve { domain: [1..9], codomain: [mapping+1] }.
   */
  toFunctionTable() {
    const domain = []
    const codomain = []
    for (let i = 0; i < 9; i++) {
      domain.push(i + 1)
      codomain.push(this.mapping[i] + 1)
    }
    return { domain, codomain }
  }

  /** Devuelve la permutación identidad de S₉. */
  static identity() {
    return new Permutation([0, 1, 2, 3, 4, 5, 6, 7, 8])
  }

  /**
   * Verifica la propiedad asociativa: (a∘b)∘c = a∘(b∘c).
   */
  static verifyAssociativity(a, b, c) {
    const ab = a.compose(b)
    const bc = b.compose(c)
    const ab_c = ab.compose(c)
    const a_bc = a.compose(bc)
    return {
      leftSide: ab_c,
      rightSide: a_bc,
      isEqual: ab_c.equals(a_bc),
      steps: { ab, bc, ab_c, a_bc },
    }
  }
}

export default Permutation
