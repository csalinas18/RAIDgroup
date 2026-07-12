/**
 * ParityEngine — tolerancia a fallos mediante paridad XOR sobre Z₂.
 *
 * El bloque de paridad es P = F₀ ⊕ F₁ ⊕ ... ⊕ F₈ (XOR byte a byte).
 * Si un disco Fₖ se destruye, se recupera con:
 *
 *     Fₖ = P ⊕ F₀ ⊕ ... ⊕ F₍ₖ₋₁₎ ⊕ F₍ₖ₊₁₎ ⊕ ... ⊕ F₈
 *
 * Esto funciona porque en Z₂ cada bit cumple a ⊕ a = 0 y a ⊕ 0 = a, así que
 * al volver a XOR-ear todos los fragmentos presentes con la paridad se cancelan
 * en pares y sobrevive exactamente el fragmento perdido.
 *
 * Nota de implementación: los bytes de paridad son binarios arbitrarios (0–255)
 * y no forman UTF-8 válido. Para persistirlos como string sin corromperlos se
 * usa una codificación Latin1 (1 byte ↔ 1 code unit), reversible byte a byte.
 * Los fragmentos de datos sí son texto UTF-8 y usan TextEncoder/TextDecoder.
 *
 * JavaScript puro, sin React.
 */
class ParityEngine {
  /** string → Uint8Array (UTF-8). */
  static textToBytes(text) {
    return new TextEncoder().encode(text)
  }

  /** Uint8Array → string (UTF-8). */
  static bytesToText(bytes) {
    return new TextDecoder().decode(bytes)
  }

  /** Uint8Array → string Latin1 reversible (1 byte por code unit). */
  static bytesToLatin1(bytes) {
    let s = ''
    for (let i = 0; i < bytes.length; i++) {
      s += String.fromCharCode(bytes[i])
    }
    return s
  }

  /** string Latin1 → Uint8Array. */
  static latin1ToBytes(str) {
    const out = new Uint8Array(str.length)
    for (let i = 0; i < str.length; i++) {
      out[i] = str.charCodeAt(i) & 0xff
    }
    return out
  }

  /**
   * XOR byte a byte entre dos Uint8Array. Si difieren en longitud, el resultado
   * tiene la longitud máxima y las posiciones faltantes se tratan como 0.
   */
  static xorBytes(a, b) {
    const len = Math.max(a.length, b.length)
    const out = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      out[i] = (a[i] || 0) ^ (b[i] || 0)
    }
    return out
  }

  /**
   * Calcula el bloque de paridad P = XOR de los 9 fragmentos.
   * Devuelve la paridad como string Latin1 (byte-preservante).
   */
  static computeParity(fragments) {
    let acc = new Uint8Array(0)
    for (const frag of fragments) {
      acc = ParityEngine.xorBytes(acc, ParityEngine.textToBytes(frag))
    }
    return ParityEngine.bytesToLatin1(acc)
  }

  /**
   * Recupera un fragmento destruido.
   * @param {(string|null)[]} remainingFragments  9 fragmentos, con null en destroyedIndex
   * @param {string}          parityFragment       paridad (string Latin1)
   * @param {number}          destroyedIndex       índice del disco perdido
   * @returns {string} fragmento recuperado (texto UTF-8, sin padding NUL)
   */
  static recoverFragment(remainingFragments, parityFragment, destroyedIndex) {
    let acc = ParityEngine.latin1ToBytes(parityFragment)
    for (let i = 0; i < remainingFragments.length; i++) {
      if (i === destroyedIndex) continue
      const frag = remainingFragments[i]
      if (frag == null) continue
      acc = ParityEngine.xorBytes(acc, ParityEngine.textToBytes(frag))
    }
    // Elimina los bytes NUL de padding que pudieran quedar al final.
    let end = acc.length
    while (end > 0 && acc[end - 1] === 0) end--
    return ParityEngine.bytesToText(acc.subarray(0, end))
  }

  /**
   * Verifica la integridad: XOR de todos los fragmentos ⊕ paridad = ceros.
   */
  static verifyIntegrity(fragments, parityFragment) {
    let acc = ParityEngine.latin1ToBytes(parityFragment)
    for (const frag of fragments) {
      if (frag == null) return false
      acc = ParityEngine.xorBytes(acc, ParityEngine.textToBytes(frag))
    }
    for (let i = 0; i < acc.length; i++) {
      if (acc[i] !== 0) return false
    }
    return true
  }
}

export default ParityEngine
