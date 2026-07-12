import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import FileFragmenter from '../math/FileFragmenter.js'
import ParityEngine from '../math/ParityEngine.js'

/**
 * FileLoader — carga de archivo .txt (drag & drop o selección), o escritura
 * directa en un textarea. Fragmenta el texto en 9 bloques, calcula la paridad
 * y notifica al padre mediante onFragmentsLoaded(fragments, parity, meta).
 */
export default function FileLoader({ onFragmentsLoaded, onClear }) {
  const [dragOver, setDragOver] = useState(false)
  const [meta, setMeta] = useState(null) // { name, size }
  const [fragments, setFragments] = useState(null)
  const [textInput, setTextInput] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  function processText(text, name) {
    if (text.length < 9) {
      setError('El contenido debe tener al menos 9 caracteres.')
      return
    }
    setError('')
    const frags = FileFragmenter.fragment(text)
    const parity = ParityEngine.computeParity(frags)
    setFragments(frags)
    setMeta({ name: name || 'texto-directo.txt', size: new Blob([text]).size })
    onFragmentsLoaded(frags, parity, {
      name: name || 'texto-directo.txt',
      size: text.length,
    })
  }

  function handleFile(file) {
    if (!file) return
    if (!file.name.endsWith('.txt') && file.type !== 'text/plain') {
      setError('Solo se aceptan archivos .txt')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => processText(String(e.target.result), file.name)
    reader.readAsText(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    handleFile(file)
  }

  function handleClear() {
    setFragments(null)
    setMeta(null)
    setTextInput('')
    setError('')
    if (inputRef.current) inputRef.current.value = ''
    onClear?.()
  }

  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        {/* Zona drag & drop */}
        <motion.label
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          animate={{
            borderColor: dragOver ? '#8B5CF6' : 'rgba(255,255,255,0.10)',
            backgroundColor: dragOver ? 'rgba(124,58,237,0.10)' : 'rgba(19,19,26,0.5)',
          }}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer text-center transition-colors"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <span className="text-2xl">📄</span>
          <span className="text-sm text-white/70">
            Arrastra un <span className="text-accent-purple-light font-medium">.txt</span> o
            haz clic
          </span>
          <span className="text-[11px] text-white/35">
            El archivo se dividirá en 9 fragmentos
          </span>
        </motion.label>

        {/* Textarea directo */}
        <div className="flex flex-col gap-2">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="…o escribe texto directamente (mínimo 9 caracteres)"
            className="flex-1 min-h-[96px] rounded-xl bg-bg-card border border-border-default p-3 text-sm font-mono text-accent-cyan-light resize-none focus:outline-none focus:border-accent-purple transition-colors"
          />
          <button
            onClick={() => processText(textInput, null)}
            disabled={textInput.length < 9}
            className="btn-primary text-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Distribuir texto
          </button>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-status-error"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Info del archivo + preview de fragmentos */}
      <AnimatePresence>
        {meta && fragments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl bg-bg-secondary border border-border-subtle p-3 space-y-2 overflow-hidden"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-accent-purple-light">📦 {meta.name}</span>
                <span className="text-white/35 font-mono text-xs">
                  {meta.size} bytes
                </span>
              </div>
              <button
                onClick={handleClear}
                className="btn-danger text-xs px-3 py-1"
              >
                Limpiar todo
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {fragments.map((f, i) => (
                <span
                  key={i}
                  title={f}
                  className="font-mono text-[11px] px-2 py-1 rounded-md bg-accent-cyan-glow text-accent-cyan-light border border-accent-cyan/15"
                >
                  <span className="text-white/40">F{i + 1}</span>{' '}
                  {f.slice(0, 6).trimEnd() || '·'}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
