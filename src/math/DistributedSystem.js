import Permutation from './Permutation.js'

/**
 * DistributedSystem — gestiona el estado del clúster de 9 discos (matriz 3×3).
 *
 * Define los 6 movimientos generadores (rotaciones de 3-ciclos) del subgrupo
 * de S₉ que usamos para "balanceo de carga", acumula la permutación actual
 * Σ = composición de todos los movimientos aplicados, y guarda el historial.
 *
 * Importa únicamente Permutation.js — es JavaScript puro, sin React.
 *
 * Disposición de la matriz 3×3 (índices base-0):
 *   0 1 2
 *   3 4 5
 *   6 7 8
 */
class DistributedSystem {
  constructor() {
    this.moves = {
      // A: rota la fila superior →   posiciones [0,1,2]
      A: new Permutation([2, 0, 1, 3, 4, 5, 6, 7, 8]),
      // B: rota la fila inferior →   posiciones [6,7,8]
      B: new Permutation([0, 1, 2, 3, 4, 5, 8, 6, 7]),
      // C: rota la columna izquierda ↓  posiciones [0,3,6]
      C: new Permutation([6, 1, 2, 0, 4, 5, 3, 7, 8]),
      // D: rota la columna derecha ↓  posiciones [2,5,8]
      D: new Permutation([0, 1, 8, 3, 4, 2, 6, 7, 5]),
      // E: rota la diagonal principal ↓  posiciones [0,4,8]
      E: new Permutation([8, 1, 2, 3, 0, 5, 6, 7, 4]),
      // F: rota la fila central →   posiciones [3,4,5]
      F: new Permutation([0, 1, 2, 5, 3, 4, 6, 7, 8]),
    }
    this.descriptions = {
      A: 'Rotar fila superior →',
      B: 'Rotar fila inferior →',
      C: 'Rotar columna izquierda ↓',
      D: 'Rotar columna derecha ↓',
      E: 'Rotar diagonal principal ↓',
      F: 'Rotar fila central →',
    }
    this.history = []
    this.currentPermutation = Permutation.identity()
  }

  /**
   * Resuelve el nombre de un movimiento a su Permutation concreta.
   * Acepta 'A'..'F' y sus inversos 'A⁻¹'..'F⁻¹'.
   */
  resolveMove(moveName) {
    const isInverse = moveName.includes('⁻¹')
    const base = moveName.replace('⁻¹', '')
    const move = this.moves[base]
    if (!move) throw new Error(`Movimiento desconocido: ${moveName}`)
    return isInverse ? move.inverse() : move
  }

  /**
   * Aplica un movimiento. La permutación acumulada se construye componiendo
   * a la derecha: Σ_nuevo = Σ_actual ∘ perm. Así, para un historial [A,B,C]
   * la permutación acumulada es Σ = A ∘ B ∘ C (el primer movimiento queda como
   * el más externo), lo que hace que su inverso sea Σ⁻¹ = C⁻¹ ∘ B⁻¹ ∘ A⁻¹.
   *
   * Esto además es coherente con la aplicación física incremental sobre los
   * fragmentos: aplicar A y luego B equivale a (A ∘ B).apply(originales).
   * Registra el movimiento y devuelve la nueva permutación acumulada.
   */
  applyMove(moveName) {
    const perm = this.resolveMove(moveName)
    this.currentPermutation = this.currentPermutation.compose(perm)
    this.history.push(moveName)
    return this.currentPermutation
  }

  getCurrentPermutation() {
    return this.currentPermutation
  }

  getHistory() {
    return this.history.slice()
  }

  /**
   * Aplica la permutación acumulada actual a los 9 fragmentos.
   * Se parte SIEMPRE de los fragmentos originales, y Σ los redistribuye.
   */
  applyToFragments(fragments) {
    return this.currentPermutation.apply(fragments)
  }

  /** Reinicia el sistema al estado identidad. */
  reset() {
    this.currentPermutation = Permutation.identity()
    this.history = []
  }

  /** Restaura un historial dado recomputando la permutación acumulada. */
  restoreHistory(history) {
    this.reset()
    for (const moveName of history) {
      this.applyMove(moveName)
    }
    return this.currentPermutation
  }

  getMoveDescription(moveName) {
    const isInverse = moveName.includes('⁻¹')
    const base = moveName.replace('⁻¹', '')
    const desc = this.descriptions[base] || moveName
    return isInverse ? desc.replace('→', '←').replace('↓', '↑') + ' (inverso)' : desc
  }
}

export default DistributedSystem
