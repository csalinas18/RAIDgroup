import FileFragmenter from './FileFragmenter.js'

/**
 * ProtocolController — el "sistema operativo" del clúster.
 *
 * Se encarga de la recuperación del archivo revirtiendo la secuencia de
 * movimientos aplicados. La clave matemática es la propiedad del inverso de
 * una composición en un grupo:
 *
 *     (A ∘ B ∘ C)⁻¹ = C⁻¹ ∘ B⁻¹ ∘ A⁻¹
 *
 * Importa solo utilidades puras — sin React.
 */
class ProtocolController {
  /** Devuelve el inverso textual de un movimiento: 'X' ↔ 'X⁻¹'. */
  static invertMoveName(moveName) {
    return moveName.includes('⁻¹') ? moveName.replace('⁻¹', '') : moveName + '⁻¹'
  }

  /**
   * Secuencia de solución: invierte el historial y aplica el inverso de cada
   * movimiento. Para history = ['A','B','C'] devuelve ['C⁻¹','B⁻¹','A⁻¹'].
   */
  static getSolutionSequence(history) {
    return history
      .slice()
      .reverse()
      .map((m) => ProtocolController.invertMoveName(m))
  }

  /** Palabra legible del inverso: 'C⁻¹ ∘ B⁻¹ ∘ A⁻¹'. */
  static computeInverseWord(history) {
    const seq = ProtocolController.getSolutionSequence(history)
    return seq.length ? seq.join(' ∘ ') : 'e'
  }

  /** Palabra legible de la permutación acumulada: 'A ∘ B ∘ C'. */
  static computeForwardWord(history) {
    if (!history.length) return 'e'
    // Σ = A ∘ B ∘ C para el historial [A, B, C] (primero = más externo).
    return history.join(' ∘ ')
  }

  /**
   * Reconstrucción iterativa: aplica la secuencia de solución paso a paso,
   * registrando el estado de los fragmentos tras cada movimiento inverso.
   * Devuelve { result, steps } donde steps permite animar la reconstrucción.
   *
   * @param {string[]} mixedFragments  fragmentos mezclados (9)
   * @param {string[]} history         movimientos aplicados
   * @param {object}   moves           mapa de generadores (DistributedSystem.moves)
   */
  static reconstructIterative(mixedFragments, history, moves) {
    const sequence = ProtocolController.getSolutionSequence(history)
    let fragments = mixedFragments.slice()
    const steps = []
    for (const moveName of sequence) {
      const isInverse = moveName.includes('⁻¹')
      const base = moveName.replace('⁻¹', '')
      const perm = isInverse ? moves[base].inverse() : moves[base]
      fragments = perm.apply(fragments)
      steps.push({ moveName, fragmentsAfter: fragments.slice() })
    }
    return { result: fragments, steps }
  }

  /**
   * Reconstrucción directa: aplica σ⁻¹ de una sola vez sobre los fragmentos.
   */
  static reconstructDirect(mixedFragments, sigmaInverse) {
    return sigmaInverse.apply(mixedFragments)
  }

  /**
   * Compara el texto original con el reconstruido (ignorando el padding).
   */
  static verifyReconstruction(original, reconstructed) {
    const originalText = FileFragmenter.reconstruct(original)
    const reconstructedText = FileFragmenter.reconstruct(reconstructed)
    return {
      success: originalText === reconstructedText,
      originalText,
      reconstructedText,
    }
  }
}

export default ProtocolController
