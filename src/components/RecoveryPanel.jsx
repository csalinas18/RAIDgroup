import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ProtocolController from '../math/ProtocolController.js'
import FileFragmenter from '../math/FileFragmenter.js'

function PhaseIndicator({ phase }) {
  const phases = [
    { icon: '🔴', label: 'Sin archivo cargado' },
    { icon: '🟡', label: 'Archivo distribuido — posición original' },
    { icon: '🟠', label: 'Clúster mezclado — fragmentos redistribuidos' },
    { icon: '🟢', label: 'Alineado — permutación es identidad' },
  ]
  return (
    <div className="space-y-1.5">
      {phases.map((p, i) => (
        <div
          key={i}
          className={`flex items-center gap-2 text-sm transition-opacity ${
            i + 1 === phase ? 'opacity-100' : 'opacity-30'
          }`}
        >
          <span>{p.icon}</span>
          <span className={i + 1 === phase ? 'text-white' : 'text-white/50'}>
            {p.label}
          </span>
          {i + 1 === phase && (
            <motion.span
              layoutId="phase-marker"
              className="ml-auto text-[10px] text-accent-cyan-light"
            >
              ● actual
            </motion.span>
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * RecoveryPanel — reconstrucción del archivo mediante la secuencia inversa.
 */
export default function RecoveryPanel({
  history = [],
  currentPermutation,
  fragments,
  originalFragments,
  moves,
  operationLog = [],
  animationSpeed = 400,
  onSolveAnimated,
  degraded = false,
}) {
  const [reconstructed, setReconstructed] = useState(null) // string[9]
  const [stepIndex, setStepIndex] = useState(-1)
  const [animating, setAnimating] = useState(false)
  const [mode, setMode] = useState(null) // 'iterative' | 'direct'

  const hasFile = originalFragments != null
  const isIdentity = currentPermutation?.isIdentity()
  let phase = 1
  if (!hasFile) phase = 1
  else if (isIdentity && history.length === 0) phase = 2
  else if (!isIdentity) phase = 3
  else phase = 4

  const inverseWord = ProtocolController.computeInverseWord(history)
  const solutionSeq = ProtocolController.getSolutionSequence(history)

  const verification = reconstructed
    ? ProtocolController.verifyReconstruction(originalFragments, reconstructed)
    : null

  async function reconstructStepByStep() {
    if (!fragments || !history.length) return
    setAnimating(true)
    setMode('iterative')
    setReconstructed(null)
    const { steps, result } = ProtocolController.reconstructIterative(
      fragments,
      history,
      moves,
    )
    onSolveAnimated?.() // anima también la grilla del clúster
    for (let i = 0; i < steps.length; i++) {
      setStepIndex(i)
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, animationSpeed))
    }
    setStepIndex(-1)
    setReconstructed(result)
    setAnimating(false)
  }

  function reconstructDirectly() {
    if (!fragments) return
    setMode('direct')
    const sigmaInverse = currentPermutation.inverse()
    const result = ProtocolController.reconstructDirect(fragments, sigmaInverse)
    setReconstructed(result)
  }

  function download() {
    const text = FileFragmenter.reconstruct(reconstructed)
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'raidgroup-reconstruido.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const sigmaInv = currentPermutation ? currentPermutation.inverse() : null

  return (
    <div className="rounded-2xl bg-bg-card border border-border-subtle p-5 space-y-5">
      <div>
        <h3 className="section-title mb-3">Estado del sistema</h3>
        <PhaseIndicator phase={phase} />
      </div>

      {degraded && (
        <div className="rounded-lg bg-status-error-glow border border-status-error/30 px-3 py-2 text-xs text-status-error">
          ⚠ Hay un disco caído: falta un fragmento. Una permutación no puede
          reconstruir datos ausentes — primero recupera el disco por XOR (panel
          Paridad / Z₂) y luego reconstruye.
        </div>
      )}

      {/* Reconstrucción iterativa */}
      <div className="rounded-xl bg-bg-secondary border border-border-subtle p-4 space-y-3">
        <h4 className="text-sm font-semibold text-accent-purple-light">
          Reconstrucción iterativa
        </h4>
        <div className="font-mono text-xs text-accent-cyan-light break-all">
          σ⁻¹ = {inverseWord}
        </div>
        <button
          onClick={reconstructStepByStep}
          disabled={
            !hasFile || history.length === 0 || animating || degraded || isIdentity
          }
          className="btn-primary text-sm disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Reconstruir paso a paso
        </button>
        {(animating || (mode === 'iterative' && stepIndex >= 0)) && (
          <div className="flex flex-wrap gap-1.5">
            {solutionSeq.map((mv, i) => (
              <span
                key={i}
                className={`font-mono text-xs px-2 py-1 rounded-md border transition-all ${
                  i === stepIndex
                    ? 'bg-accent-cyan-glow text-accent-cyan-light border-accent-cyan/40 scale-110'
                    : i < stepIndex
                      ? 'bg-status-success-glow text-status-success border-status-success/30'
                      : 'bg-bg-card text-white/40 border-border-subtle'
                }`}
              >
                {mv}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Reconstrucción directa */}
      <div className="rounded-xl bg-bg-secondary border border-border-subtle p-4 space-y-3">
        <h4 className="text-sm font-semibold text-accent-purple-light">
          Reconstrucción directa
        </h4>
        <button
          onClick={reconstructDirectly}
          disabled={!hasFile || animating || degraded || isIdentity}
          className="btn-move text-sm px-4 py-2 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Reconstruir directo (σ⁻¹)
        </button>
        {sigmaInv && (
          <div className="font-mono text-[11px] text-white/50 break-all">
            σ⁻¹ mapping: [{sigmaInv.mapping.map((m) => m + 1).join(', ')}]
          </div>
        )}
      </div>

      {/* Resultado */}
      <AnimatePresence>
        {reconstructed && verification && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <p className="section-title">Texto reconstruido</p>
            <textarea
              readOnly
              value={verification.reconstructedText}
              className="w-full h-24 rounded-xl bg-bg-primary border border-border-subtle p-3 text-sm font-mono text-accent-cyan-light resize-none focus:outline-none"
            />
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span
                className={`badge ${
                  verification.success
                    ? 'bg-status-success-glow text-status-success border-status-success/30'
                    : 'bg-status-error-glow text-status-error border-status-error/30'
                }`}
              >
                {verification.success
                  ? '✅ Texto idéntico al original'
                  : '❌ Error en la reconstrucción'}
              </span>
              <button onClick={download} className="btn-move text-xs px-3 py-1.5">
                ⬇ Descargar .txt
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Log de operaciones */}
      <div>
        <p className="section-title mb-2">Log de operaciones</p>
        <div className="rounded-xl bg-bg-primary border border-border-subtle p-3 h-40 overflow-y-auto font-mono text-[11px] space-y-1">
          {operationLog.length === 0 ? (
            <p className="text-white/25">— sin eventos —</p>
          ) : (
            operationLog.map((line, i) => (
              <div key={i} className="text-white/60">
                {line}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
