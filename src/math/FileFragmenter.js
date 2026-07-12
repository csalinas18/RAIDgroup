/**
 * FileFragmenter — divide un texto en exactamente 9 fragmentos de igual
 * longitud (uno por disco) y los vuelve a unir.
 *
 * JavaScript puro, sin React.
 */
class FileFragmenter {
  /**
   * Divide el texto en 9 fragmentos de igual longitud.
   * Si la longitud no es divisible entre 9, rellena con espacios al final.
   */
  static fragment(text) {
    const fragmentSize = Math.max(1, Math.ceil(text.length / 9))
    const padded = text.padEnd(fragmentSize * 9, ' ')
    const fragments = []
    for (let i = 0; i < 9; i++) {
      fragments.push(padded.slice(i * fragmentSize, (i + 1) * fragmentSize))
    }
    return fragments
  }

  /**
   * Reconstruye el texto original concatenando los 9 fragmentos y quitando
   * el padding final.
   */
  static reconstruct(fragments) {
    return fragments.join('').trimEnd()
  }
}

export default FileFragmenter
