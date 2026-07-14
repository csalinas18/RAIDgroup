import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import DistributedSystem from './math/DistributedSystem.js'
import Permutation from './math/Permutation.js'
import ParityEngine from './math/ParityEngine.js'
import * as DiskStorage from './storage/DiskStorage.js'

import ClusterGrid from './components/ClusterGrid.jsx'
import FileLoader from './components/FileLoader.jsx'
import MoveControls from './components/MoveControls.jsx'
import MathPanel from './components/MathPanel.jsx'
import RecoveryPanel from './components/RecoveryPanel.jsx'
import ParityPanel from './components/ParityPanel.jsx'

const ALL_MOVES = [
  'A', 'B', 'C', 'D', 'E', 'F',
  'A⁻¹', 'B⁻¹', 'C⁻¹', 'D⁻¹', 'E⁻¹', 'F⁻¹',
]

function timestamp() {
  const d = new Date()
  return d.toTimeString().slice(0, 8)
}

/** Índices de fragmentos cuya posición cambió entre dos mappings. */
function movedFragments(prevMapping, newMapping) {
  const moved = []
  for (let f = 0; f < 9; f++) {
    if (prevMapping.indexOf(f) !== newMapping.indexOf(f)) moved.push(f)
  }
  return moved
}

export default function App() {
  const [system] = useState(() => new DistributedSystem())
  const [fragments, setFragments] = useState(null)
  const [originalFragments, setOriginalFragments] = useState(null)
  const [parityFragment, setParityFragment] = useState(null)
  const [destroyedDisks, setDestroyedDisks] = useState([])
  const [lostFragment, setLostFragment] = useState(null)
  const [wearCounters, setWearCounters] = useState(new Array(9).fill(0))
  const [history, setHistory] = useState([])
  const [currentPermutation, setCurrentPermutation] = useState(Permutation.identity())
  const [animationSpeed, setAnimationSpeed] = useState(400)
  const [activeTab, setActiveTab] = useState('math')
  const [operationLog, setOperationLog] = useState([])
  const [recoveredDisk, setRecoveredDisk] = useState(null)
  const [busy, setBusy] = useState(false)
  const [loaderOpen, setLoaderOpen] = useState(true)
  const [fileMeta, setFileMeta] = useState(null)

  // Refs para lectura sincrónica dentro de bucles de animación.
  const originalRef = useRef(null)
  const speedRef = useRef(animationSpeed)
  useEffect(() => {
    speedRef.current = animationSpeed
  }, [animationSpeed])

  const addLog = useCallback((msg) => {
    setOperationLog((prev) => [`[${timestamp()}] ${msg}`, ...prev].slice(0, 200))
  }, [])

  // Carga inicial desde IndexedDB.
  useEffect(() => {
    ;(async () => {
      try {
        await DiskStorage.initDB()
        const disks = await DiskStorage.loadDisks()
        if (!disks) return
        const frags = disks.map((d) => d.fragment)
        const destroyed = disks.filter((d) => !d.alive).map((d) => d.id)
        const parity = await DiskStorage.loadParity()
        const savedHistory = await DiskStorage.loadHistory()

        if (frags.every((f) => f != null)) {
          setOriginalFragments(frags)
          originalRef.current = frags
          system.restoreHistory(savedHistory || [])
          setHistory(system.getHistory())
          setCurrentPermutation(system.getCurrentPermutation())
          setFragments(system.applyToFragments(frags))
        } else {
          setOriginalFragments(frags)
          originalRef.current = frags
          setFragments(frags)
        }
        if (destroyed.length) {
          setDestroyedDisks(destroyed)
        }
        setParityFragment(parity)
        if (frags.some((f) => f != null)) {
          setLoaderOpen(false)
          addLog('Sesión restaurada desde IndexedDB')
        }
      } catch (e) {
        console.warn('No se pudo restaurar la sesión:', e)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ------- Carga de archivo -------
  async function handleFragmentsLoaded(frags, parity, meta) {
    system.reset()
    originalRef.current = frags
    setOriginalFragments(frags)
    setFragments(frags)
    setParityFragment(parity)
    setHistory([])
    setCurrentPermutation(Permutation.identity())
    setWearCounters(new Array(9).fill(0))
    setDestroyedDisks([])
    setLostFragment(null)
    setFileMeta(meta)
    setLoaderOpen(false)
    addLog(`Archivo cargado — 9 fragmentos de ${frags[0].length} caracteres`)
    try {
      await DiskStorage.saveFragments(frags)
      await DiskStorage.saveParity(parity)
      await DiskStorage.saveHistory([])
    } catch (e) {
      console.warn('Error guardando en IndexedDB:', e)
    }
  }

  async function handleClear() {
    system.reset()
    originalRef.current = null
    setOriginalFragments(null)
    setFragments(null)
    setParityFragment(null)
    setHistory([])
    setCurrentPermutation(Permutation.identity())
    setWearCounters(new Array(9).fill(0))
    setDestroyedDisks([])
    setLostFragment(null)
    setFileMeta(null)
    setOperationLog([])
    try {
      await DiskStorage.clearAll()
    } catch (e) {
      console.warn('Error limpiando IndexedDB:', e)
    }
  }

  // ------- Aplicar un movimiento (unidad reutilizable) -------
  const stepMove = useCallback(
    (moveName, { log = true } = {}) => {
      const prevMapping = system.getCurrentPermutation().mapping.slice()
      system.applyMove(moveName)
      const newPerm = system.getCurrentPermutation()
      const newMapping = newPerm.mapping

      const moved = movedFragments(prevMapping, newMapping)
      setWearCounters((prev) => {
        const copy = prev.slice()
        for (const f of moved) copy[f] = (copy[f] || 0) + 1
        return copy
      })

      setHistory(system.getHistory())
      setCurrentPermutation(newPerm)
      const orig = originalRef.current
      if (orig) setFragments(newPerm.apply(orig))

      if (log) {
        if (moved.length) {
          const f = moved[0]
          const disk = newMapping.indexOf(f)
          addLog(
            `Movimiento ${moveName} aplicado — fragmento F${f + 1} migró al disco ${disk + 1}`,
          )
        } else {
          addLog(`Movimiento ${moveName} aplicado`)
        }
      }
      DiskStorage.saveHistory(system.getHistory()).catch(() => {})
    },
    [system, addLog],
  )

  function handleMove(moveName) {
    if (busy || destroyedDisks.length) return
    stepMove(moveName)
  }

  function handleRemoveLast() {
    if (busy || destroyedDisks.length || history.length === 0) return
    const newHistory = history.slice(0, -1)
    system.restoreHistory(newHistory)
    const newPerm = system.getCurrentPermutation()
    setHistory(system.getHistory())
    setCurrentPermutation(newPerm)
    const orig = originalRef.current
    if (orig) setFragments(newPerm.apply(orig))
    addLog('Se deshizo el último movimiento')
    DiskStorage.saveHistory(system.getHistory()).catch(() => {})
  }

  async function runSequence(sequence) {
    setBusy(true)
    for (const mv of sequence) {
      stepMove(mv)
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, speedRef.current))
    }
    setBusy(false)
  }

  async function handleShuffle() {
    if (busy || destroyedDisks.length || !originalRef.current) return
    const count = 8 + Math.floor(Math.random() * 5) // 8–12
    const seq = Array.from(
      { length: count },
      () => ALL_MOVES[Math.floor(Math.random() * ALL_MOVES.length)],
    )
    addLog(`Mezcla aleatoria — ${count} movimientos`)
    await runSequence(seq)
  }

  async function handleSolve() {
    if (busy || destroyedDisks.length || history.length === 0) return
    if (system.getCurrentPermutation().isIdentity()) return
    // La secuencia inversa del historial actual devuelve Σ a la identidad.
    const seq = history
      .slice()
      .reverse()
      .map((m) => (m.includes('⁻¹') ? m.replace('⁻¹', '') : m + '⁻¹'))
    addLog(`Resolviendo — aplicando ${seq.length} inversos`)
    await runSequence(seq)
    if (system.getCurrentPermutation().isIdentity()) {
      addLog('Clúster alineado — permutación = identidad ✓')
    }
  }

  function handleReset() {
    if (busy) return
    system.reset()
    setHistory([])
    setCurrentPermutation(Permutation.identity())
    setWearCounters(new Array(9).fill(0))
    setDestroyedDisks([])
    setLostFragment(null)
    const orig = originalRef.current
    if (orig) setFragments(orig)
    addLog('Sistema reiniciado — fragmentos en posición original')
    DiskStorage.saveHistory([]).catch(() => {})
  }

  // ------- Paridad / fallos -------
  function handleDestroyDisk(index) {
    if (!fragments) return
    const lost = fragments[index]
    setLostFragment(lost)
    setDestroyedDisks([index])
    setFragments((prev) => {
      const copy = prev.slice()
      copy[index] = null
      return copy
    })
    addLog(`💥 Disco ${index + 1} destruido — fragmento perdido`)
    DiskStorage.destroyDisk(index).catch(() => {})
  }

  function handleRepairDisk(index, recovered) {
    setFragments((prev) => {
      const copy = prev.slice()
      copy[index] = recovered
      return copy
    })
    setDestroyedDisks([])
    setLostFragment(null)
    setRecoveredDisk(index)
    setTimeout(() => setRecoveredDisk(null), 900)
    addLog(`🛠 Disco ${index + 1} recuperado con XOR sobre Z₂ ✓`)
    DiskStorage.repairDisk(index, recovered).catch(() => {})
  }

  function handleRecalcParity() {
    if (!fragments || destroyedDisks.length) return
    const parity = ParityEngine.computeParity(fragments)
    setParityFragment(parity)
    addLog('Paridad recalculada')
    DiskStorage.saveParity(parity).catch(() => {})
  }

  // ------- Estado global del sistema (badge) -------
  const degraded = destroyedDisks.length > 0
  const isIdentity = currentPermutation.isIdentity()
  let systemStatus
  if (!originalFragments)
    systemStatus = { label: 'Sin archivo', color: 'error', dot: '🔴' }
  else if (destroyedDisks.length)
    systemStatus = { label: 'Fallo físico', color: 'error', dot: '🔴' }
  else if (isIdentity && history.length === 0)
    systemStatus = { label: 'Distribuido', color: 'warning', dot: '🟡' }
  else if (!isIdentity)
    systemStatus = { label: 'Mezclado', color: 'purple', dot: '🟠' }
  else systemStatus = { label: 'Alineado', color: 'success', dot: '🟢' }

  const badgeColors = {
    error: 'bg-status-error-glow text-status-error border-status-error/30',
    warning: 'bg-status-warning-glow text-status-warning border-status-warning/30',
    purple: 'bg-accent-purple-glow text-accent-purple-light border-accent-purple/30',
    success: 'bg-status-success-glow text-status-success border-status-success/30',
  }

  const tabs = [
    { id: 'math', label: 'Matemática' },
    { id: 'recovery', label: 'Reconstrucción' },
    { id: 'parity', label: 'Recuperación' },
  ]

  return (
    <div className="min-h-screen bg-bg-primary text-white">
      {/* Fondo decorativo */}
      <div
        className="fixed inset-0 pointer-events-none opacity-60"
        style={{
          background:
            'radial-gradient(900px circle at 15% 0%, rgba(124,58,237,0.10), transparent 45%), radial-gradient(800px circle at 100% 20%, rgba(6,182,212,0.08), transparent 40%)',
        }}
      />

      <div className="relative max-w-[1400px] mx-auto px-5 py-6">
        {/* Header */}
        <header className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              RAID<span className="text-accent-purple-light">Group</span>
            </h1>
            <p className="text-sm text-white/45">
              Simulador de almacenamiento distribuido ·{' '}
              <span className="font-mono text-accent-cyan-light">S₉</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`badge ${badgeColors[systemStatus.color]}`}>
              {systemStatus.dot} {systemStatus.label}
            </span>
            <button
              onClick={() => setLoaderOpen((o) => !o)}
              className="btn-move text-sm px-3 py-2"
            >
              {loaderOpen ? '▲ Ocultar carga' : '▼ Cargar archivo'}
            </button>
          </div>
        </header>

        {/* FileLoader colapsable */}
        <AnimatePresence>
          {loaderOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="rounded-2xl bg-bg-card border border-border-subtle p-5">
                <h3 className="section-title mb-4">Carga y fragmentación</h3>
                <FileLoader
                  onFragmentsLoaded={handleFragmentsLoaded}
                  onClear={handleClear}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Layout dos columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-[38%_1fr] gap-6">
          {/* Columna izquierda */}
          <div className="space-y-6">
            <div className="rounded-2xl bg-bg-card border border-border-subtle p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="section-title">Clúster · 9 discos (3×3)</h3>
                {fileMeta && (
                  <span className="text-[11px] text-white/35 font-mono truncate max-w-[140px]">
                    {fileMeta.name}
                  </span>
                )}
              </div>
              <ClusterGrid
                fragments={fragments}
                mapping={currentPermutation.mapping}
                destroyedDisks={destroyedDisks}
                parityFragment={parityFragment}
                wearCounters={wearCounters}
                recoveredDisk={recoveredDisk}
              />
            </div>
            <MoveControls
              onMove={handleMove}
              history={history}
              animationSpeed={animationSpeed}
              onSpeedChange={setAnimationSpeed}
              onShuffle={handleShuffle}
              onSolve={handleSolve}
              onReset={handleReset}
              onRemoveLast={handleRemoveLast}
              busy={busy}
              disabled={!originalFragments || degraded}
              degraded={degraded}
              solved={isIdentity}
            />
          </div>

          {/* Columna derecha */}
          <div className="space-y-4">
            <div className="flex gap-1 p-1 rounded-xl bg-bg-card border border-border-subtle">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex-1 text-sm font-medium py-2.5 rounded-lg transition-all ${
                    activeTab === t.id
                      ? 'bg-accent-purple text-white shadow-[0_0_20px_rgba(124,58,237,0.35)]'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'math' && (
                  <MathPanel
                    currentPermutation={currentPermutation}
                    history={history}
                    moves={system.moves}
                  />
                )}
                {activeTab === 'recovery' && (
                  <RecoveryPanel
                    history={history}
                    currentPermutation={currentPermutation}
                    fragments={fragments}
                    originalFragments={originalFragments}
                    moves={system.moves}
                    operationLog={operationLog}
                    animationSpeed={animationSpeed}
                    onSolveAnimated={handleSolve}
                    degraded={degraded}
                  />
                )}
                {activeTab === 'parity' && (
                  <ParityPanel
                    fragments={fragments}
                    parityFragment={parityFragment}
                    destroyedDisks={destroyedDisks}
                    lostFragment={lostFragment}
                    onDestroyDisk={handleDestroyDisk}
                    onRepairDisk={handleRepairDisk}
                    onRecalcParity={handleRecalcParity}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <footer className="mt-10 text-center text-xs text-white/25">
          RAIDGroup · Teoría de Grupos de Permutaciones aplicada a tolerancia a
          fallos · Matemáticas Discretas
        </footer>
      </div>
    </div>
  )
}
