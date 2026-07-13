import { motion, AnimatePresence } from 'framer-motion'

const MOVES = [
  { name: 'A', desc: 'Fila superior', arrow: '→' },
  { name: 'B', desc: 'Fila inferior', arrow: '→' },
  { name: 'C', desc: 'Col. izquierda', arrow: '↓' },
  { name: 'D', desc: 'Col. derecha', arrow: '↓' },
  { name: 'E', desc: 'Diagonal', arrow: '↘' },
  { name: 'F', desc: 'Fila central', arrow: '→' },
]

/**
 * MoveControls — botones de los 6 generadores y sus inversos, historial visual
 * de movimientos, control de velocidad, y acciones Mezclar / Resolver / Reiniciar.
 */
export default function MoveControls({
  onMove,
  history = [],
  animationSpeed = 400,
  onSpeedChange,
  onShuffle,
  onSolve,
  onReset,
  onRemoveLast,
  busy = false,
  disabled = false,
  degraded = false,
}) {
  return (
    <div className="rounded-2xl bg-bg-card border border-border-subtle p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="section-title">Movimientos · Generadores de S₉</h3>
        {busy && (
          <span className="text-[10px] text-accent-cyan-light animate-pulse">
            ejecutando…
          </span>
        )}
      </div>

      {degraded && (
        <div className="rounded-lg bg-status-error-glow border border-status-error/30 px-3 py-2 text-xs text-status-error">
          ⚠ Hay un disco caído. Recupéralo (panel Paridad / Z₂) o pulsa
          <span className="font-semibold"> Reiniciar</span> antes de seguir
          moviendo el clúster.
        </div>
      )}

      {/* Botones directos */}
      <div className="grid grid-cols-3 gap-2">
        {MOVES.map((m) => (
          <button
            key={m.name}
            onClick={() => onMove(m.name)}
            disabled={disabled || busy}
            className="btn-move flex flex-col items-center py-2 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="text-lg leading-none">
              {m.name} <span className="text-accent-cyan-light">{m.arrow}</span>
            </span>
            <span className="text-[10px] text-white/40 font-sans font-normal mt-0.5">
              {m.desc}
            </span>
          </button>
        ))}
      </div>

      {/* Botones inversos */}
      <div>
        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">
          Inversos
        </p>
        <div className="grid grid-cols-6 gap-2">
          {MOVES.map((m) => (
            <button
              key={m.name + 'inv'}
              onClick={() => onMove(m.name + '⁻¹')}
              disabled={disabled || busy}
              className="btn-move py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {m.name}⁻¹
            </button>
          ))}
        </div>
      </div>

      {/* Velocidad */}
      <div>
        <div className="flex items-center justify-between text-xs text-white/40 mb-1">
          <span>Velocidad de animación</span>
          <span className="font-mono text-accent-cyan-light">{animationSpeed}ms</span>
        </div>
        <input
          type="range"
          min="100"
          max="800"
          step="50"
          value={animationSpeed}
          onChange={(e) => onSpeedChange?.(Number(e.target.value))}
          className="w-full accent-accent-purple"
        />
      </div>

      {/* Acciones */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onShuffle}
          disabled={disabled || busy}
          className="btn-move py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
        >
          🔀 Mezclar
        </button>
        <button
          onClick={onSolve}
          disabled={disabled || busy || history.length === 0}
          className="btn-primary py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ✨ Resolver
        </button>
        <button
          onClick={onReset}
          disabled={busy}
          className="btn-move py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ↺ Reiniciar
        </button>
      </div>

      {/* Historial visual */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-white/30 uppercase tracking-wider">
            Historial · {history.length} mov.
          </span>
          {history.length > 0 && (
            <button
              onClick={onRemoveLast}
              disabled={busy}
              className="text-[10px] text-white/40 hover:text-status-error transition-colors"
            >
              deshacer último
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 min-h-[28px]">
          <AnimatePresence mode="popLayout">
            {history.length === 0 && (
              <span className="text-xs text-white/20">— sin movimientos —</span>
            )}
            {history.map((mv, i) => (
              <motion.span
                key={i + '-' + mv}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, x: -10 }}
                className="font-mono text-xs px-2 py-1 rounded-md bg-accent-purple-glow text-accent-purple-light border border-accent-purple/25"
              >
                {mv}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
