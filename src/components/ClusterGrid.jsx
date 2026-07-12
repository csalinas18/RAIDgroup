import { motion } from 'framer-motion'

/**
 * Ícono de disco duro (SVG inline).
 */
function DiskIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width="16"
      height="16"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" />
      <path d="M18 18.5v.01" />
    </svg>
  )
}

/**
 * Tarjeta individual de disco. Cada tarjeta está identificada por el fragmento
 * lógico que contiene (layoutId) para que Framer Motion la deslice cuando una
 * permutación reordena el clúster.
 */
function DiskCard({ position, fragIndex, fragment, wear, destroyed, recovered }) {
  const hasData = fragment != null && !destroyed
  const preview = hasData ? fragment.slice(0, 40) : ''

  // Estado visual → colores del borde/fondo.
  let borderColor = 'rgba(255,255,255,0.06)'
  let boxShadow = 'none'
  let bg = '#13131A'
  if (destroyed) {
    borderColor = '#DC2626'
    boxShadow = '0 0 22px rgba(220,38,38,0.35)'
    bg = 'rgba(220,38,38,0.10)'
  } else if (hasData) {
    borderColor = 'rgba(5,150,105,0.55)'
    boxShadow = '0 0 18px rgba(5,150,105,0.18)'
    bg = '#13131A'
  }

  // El temblor/pulso va en un contenedor interno: si se animara `x`/`scale`
  // sobre el mismo elemento que usa `layout`, ambos pelearían por el mismo
  // `transform` y las tarjetas saldrían de posición al mezclar.
  const emphasis = destroyed
    ? { x: [0, -8, 8, -8, 8, -4, 4, 0] }
    : recovered
      ? { scale: [1, 1.06, 1] }
      : { x: 0, scale: 1 }

  return (
    <motion.div
      layout
      layoutId={`disk-${fragIndex}`}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, borderColor, boxShadow, backgroundColor: bg }}
      className="relative rounded-xl border p-4 backdrop-blur-sm select-none"
      style={{ borderWidth: 1 }}
    >
      <motion.div animate={emphasis} transition={{ duration: 0.5 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-white/70">
          <DiskIcon />
          <span className="text-xs font-semibold tracking-wider">
            DISCO {position + 1}
          </span>
        </div>
        {!destroyed && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-cyan-glow text-accent-cyan-light border border-accent-cyan/20">
            F{fragIndex + 1}
          </span>
        )}
      </div>

      {/* Contenido */}
      {destroyed ? (
        <div className="flex items-center gap-2 text-status-error font-semibold text-sm py-3">
          <span className="text-lg">⚠</span> FALLO FÍSICO
        </div>
      ) : hasData ? (
        <p className="font-mono text-sm text-accent-cyan-light break-all leading-snug min-h-[2.5rem]">
          {preview || <span className="text-white/20">·</span>}
          {fragment.length > 40 && <span className="text-white/25">…</span>}
        </p>
      ) : (
        <p className="font-mono text-sm text-white/20 py-3">— sin datos —</p>
      )}

      {/* Barra de desgaste */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] text-white/30 mb-1">
          <span>DESGASTE</span>
          <span className="font-mono">{wear}</span>
        </div>
        <div className="h-1 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg,#22D3EE,#7C3AED)',
            }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, wear * 12)}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>
      </motion.div>
    </motion.div>
  )
}

/**
 * ClusterGrid — grilla 3×3 de discos + bloque de paridad.
 */
export default function ClusterGrid({
  fragments,
  mapping = [0, 1, 2, 3, 4, 5, 6, 7, 8],
  destroyedDisks = [],
  parityFragment,
  wearCounters = new Array(9).fill(0),
  recoveredDisk = null,
}) {
  const hasFile = fragments != null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 9 }, (_, position) => {
          const fragIndex = hasFile ? mapping[position] : position
          const destroyed = destroyedDisks.includes(position)
          const fragment = hasFile ? fragments[position] : null
          return (
            <DiskCard
              key={fragIndex}
              position={position}
              fragIndex={fragIndex}
              fragment={fragment}
              wear={wearCounters[fragIndex] || 0}
              destroyed={destroyed}
              recovered={recoveredDisk === position}
            />
          )
        })}
      </div>

      {/* Bloque de paridad P */}
      <div className="flex justify-center">
        <motion.div
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border p-4 w-2/3 backdrop-blur-sm"
          style={{
            borderColor: 'rgba(217,119,6,0.45)',
            borderWidth: 1,
            boxShadow: '0 0 18px rgba(217,119,6,0.15)',
            background: 'rgba(217,119,6,0.06)',
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold tracking-wider text-status-warning">
              ⛃ BLOQUE DE PARIDAD · P
            </span>
            <span className="text-[10px] font-mono text-status-warning/70">
              F₀ ⊕ … ⊕ F₈
            </span>
          </div>
          <p className="font-mono text-xs text-status-warning/90 break-all min-h-[1.5rem]">
            {parityFragment
              ? Array.from(parityFragment.slice(0, 32))
                  .map((c) => {
                    const code = c.charCodeAt(0)
                    return code >= 32 && code < 127 ? c : '·'
                  })
                  .join('')
              : '— sin calcular —'}
            {parityFragment && parityFragment.length > 32 && '…'}
          </p>
        </motion.div>
      </div>
    </div>
  )
}
