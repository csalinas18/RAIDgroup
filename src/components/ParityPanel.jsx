import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ParityEngine from '../math/ParityEngine.js'

/** Convierte una cadena binaria (paridad) en algo legible/imprimible. */
function printable(str, n = 48) {
  if (!str) return '— sin calcular —'
  const shown = Array.from(str.slice(0, n))
    .map((c) => {
      const code = c.charCodeAt(0)
      return code >= 32 && code < 127 ? c : '·'
    })
    .join('')
  return shown + (str.length > n ? '…' : '')
}

/**
 * ParityPanel — bloque de paridad, simulación de fallo físico y recuperación XOR.
 */
export default function ParityPanel({
  fragments,
  parityFragment,
  destroyedDisks = [],
  lostFragment = null,
  onDestroyDisk,
  onRepairDisk,
  onRecalcParity,
}) {
  const [selected, setSelected] = useState(0)
  const [recoveryResult, setRecoveryResult] = useState(null)

  const hasFile = fragments != null
  const intact = destroyedDisks.length === 0
  const integrity = hasFile && intact
    ? ParityEngine.verifyIntegrity(fragments, parityFragment)
    : false
  const canRecover = destroyedDisks.length === 1
  const destroyedIndex = destroyedDisks[0]

  function destroy() {
    if (!hasFile) return
    setRecoveryResult(null)
    onDestroyDisk?.(selected)
  }

  function recover() {
    if (!canRecover) return
    const recovered = ParityEngine.recoverFragment(
      fragments,
      parityFragment,
      destroyedIndex,
    )
    const success = lostFragment != null ? recovered === lostFragment : true
    setRecoveryResult({ index: destroyedIndex, recovered, success })
    onRepairDisk?.(destroyedIndex, recovered)
  }

  return (
    <div className="rounded-2xl bg-bg-card border border-border-subtle p-5 space-y-5">
      {/* Sección 1 — Bloque de paridad */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-status-warning">
            Bloque de paridad · P
          </h4>
          {hasFile &&
            (intact ? (
              <span
                className={`badge ${
                  integrity
                    ? 'bg-status-success-glow text-status-success border-status-success/30'
                    : 'bg-status-error-glow text-status-error border-status-error/30'
                }`}
              >
                {integrity ? '✅ Íntegro' : '❌ Corrupto'}
              </span>
            ) : (
              <span className="badge bg-status-error-glow text-status-error border-status-error/30">
                ❌ Integridad comprometida
              </span>
            ))}
        </div>
        <div className="font-mono text-xs text-white/50 mb-1">
          P = F₀ ⊕ F₁ ⊕ … ⊕ F₈
        </div>
        <div className="rounded-xl bg-bg-primary border border-status-warning/20 p-3 font-mono text-xs text-status-warning/90 break-all">
          {printable(parityFragment)}
        </div>
        <button
          onClick={onRecalcParity}
          disabled={!hasFile}
          className="btn-move text-xs px-3 py-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ↻ Recalcular paridad
        </button>
      </div>

      <div className="border-t border-border-subtle" />

      {/* Sección 2 — Simulación de fallo */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-status-error">
          Simulación de fallo físico
        </h4>
        <div className="flex items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(Number(e.target.value))}
            disabled={!hasFile || !intact}
            className="bg-bg-secondary border border-border-default rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-purple disabled:opacity-30"
          >
            {Array.from({ length: 9 }, (_, i) => (
              <option key={i} value={i}>
                Disco {i + 1}
              </option>
            ))}
          </select>
          <button
            onClick={destroy}
            disabled={!hasFile || !intact}
            className="btn-danger text-sm px-4 py-2 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            💥 Simular fallo físico
          </button>
        </div>

        <AnimatePresence>
          {!intact && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl bg-status-error-glow border border-status-error/30 p-3 space-y-2"
            >
              <p className="text-sm text-status-error">
                Disco {destroyedIndex + 1} destruido. Fragmento perdido:{' '}
                <span className="font-mono text-xs">
                  {lostFragment ? `"${lostFragment.slice(0, 20)}…"` : '(desconocido)'}
                </span>
              </p>
              <div className="font-mono text-[11px] text-white/60 break-all">
                F<sub>{destroyedIndex + 1}</sub> = P ⊕ F₀ ⊕ … ⊕ F
                <sub>{destroyedIndex}</sub> ⊕ F<sub>{destroyedIndex + 2}</sub> ⊕ … ⊕ F₈
              </div>
              <p className="text-[11px] text-status-warning/80">
                La propiedad <span className="font-mono">a ⊕ a = 0</span> en Z₂
                garantiza recuperación exacta.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-border-subtle" />

      {/* Sección 3 — Recuperación */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-status-success">
          Recuperación XOR
        </h4>
        <button
          onClick={recover}
          disabled={!canRecover}
          className="btn-primary text-sm disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {canRecover
            ? `Recuperar disco ${destroyedIndex + 1}`
            : 'Recuperar disco (requiere 1 disco caído)'}
        </button>

        <AnimatePresence>
          {recoveryResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl bg-bg-secondary border border-border-subtle p-3 space-y-2"
            >
              <p className="text-xs text-white/50">
                Fragmento recuperado del disco {recoveryResult.index + 1}:
              </p>
              <div className="font-mono text-xs text-accent-cyan-light break-all bg-bg-primary rounded-lg p-2">
                {recoveryResult.recovered.slice(0, 60)}
                {recoveryResult.recovered.length > 60 && '…'}
              </div>
              <span
                className={`badge ${
                  recoveryResult.success
                    ? 'bg-status-success-glow text-status-success border-status-success/30'
                    : 'bg-status-error-glow text-status-error border-status-error/30'
                }`}
              >
                {recoveryResult.success
                  ? '✅ Idéntico al fragmento original'
                  : '❌ No coincide'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
