import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Permutation from '../math/Permutation.js'
import ProtocolController from '../math/ProtocolController.js'

/** Tabla de la función σ: {1..9} → {1..9}. */
function FunctionTable({ permutation }) {
  const { domain, codomain } = permutation.toFunctionTable()
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-center font-mono text-sm">
        <tbody>
          <tr>
            <td className="text-white/40 text-xs pr-2 text-right">i</td>
            {domain.map((d) => (
              <td key={d} className="px-1.5 py-1 text-white/60">
                {d}
              </td>
            ))}
          </tr>
          <tr>
            <td className="text-white/40 text-xs pr-2 text-right">σ(i)</td>
            {codomain.map((c, i) => (
              <td
                key={i}
                className={`px-1.5 py-1 ${
                  c === domain[i] ? 'text-white/40' : 'text-accent-cyan-light'
                }`}
              >
                {c}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function MiniMapping({ label, permutation }) {
  return (
    <div className="rounded-lg bg-bg-secondary border border-border-subtle p-2.5">
      <div className="text-[10px] text-white/40 mb-1 font-mono">{label}</div>
      <div className="font-mono text-xs text-accent-purple-light break-all">
        [{permutation.mapping.join(', ')}]
      </div>
      <div className="font-mono text-[11px] text-white/50 mt-1">
        {permutation.toCycleNotation()}
      </div>
    </div>
  )
}

/** Tab 1 — Permutación actual Σ. */
function CurrentTab({ currentPermutation, history }) {
  const isIdentity = currentPermutation.isIdentity()
  const order = currentPermutation.order()
  const cycle = currentPermutation.toCycleNotation()
  const forwardWord = ProtocolController.computeForwardWord(history)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        {isIdentity ? (
          <span className="badge bg-status-success-glow text-status-success border-status-success/30">
            Identidad ✓
          </span>
        ) : (
          <span className="badge bg-accent-purple-glow text-accent-purple-light border-accent-purple/30">
            No trivial
          </span>
        )}
        <span className="text-xs text-white/40">
          Estado acumulado del clúster
        </span>
      </div>

      <div>
        <p className="section-title mb-2">Función σ : {'{1..9}'} → {'{1..9}'}</p>
        <div className="rounded-xl bg-bg-secondary border border-border-subtle p-3">
          <FunctionTable permutation={currentPermutation} />
        </div>
      </div>

      <div>
        <p className="section-title mb-2">Notación cíclica</p>
        <div className="rounded-xl bg-bg-secondary border border-border-subtle p-4 text-center">
          <span className="font-mono text-2xl text-accent-cyan-light glow-cyan break-all">
            {cycle}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-bg-secondary border border-border-subtle p-4">
          <p className="section-title mb-2">Orden k</p>
          <div className="text-4xl font-bold text-accent-purple-light font-mono">
            {order}
          </div>
          <p className="text-[11px] text-white/40 mt-1 font-mono">
            σ^k = e cuando k = {order}
          </p>
        </div>
        <div className="rounded-xl bg-bg-secondary border border-border-subtle p-4">
          <p className="section-title mb-2">Composición Σ</p>
          <div className="font-mono text-sm text-accent-cyan-light break-all">
            σ = {forwardWord}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Tab 2 — Verificador de asociatividad. */
function AssocTab({ history, moves }) {
  const [result, setResult] = useState(null)
  const canVerify = history.length >= 3

  function resolveMove(moveName) {
    const isInverse = moveName.includes('⁻¹')
    const base = moveName.replace('⁻¹', '')
    return isInverse ? moves[base].inverse() : moves[base]
  }

  function verify() {
    const last3 = history.slice(-3)
    const [a, b, c] = last3.map(resolveMove)
    setResult({ names: last3, ...Permutation.verifyAssociativity(a, b, c) })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/60 leading-relaxed">
        La <span className="text-accent-purple-light">asociatividad</span> garantiza
        que el orden de agrupación no importa: (a∘b)∘c = a∘(b∘c). Es uno de los
        axiomas de grupo.
      </p>

      {!canVerify ? (
        <div className="rounded-xl bg-bg-secondary border border-border-subtle p-4 text-sm text-white/40">
          Aplica al menos 3 movimientos para verificar.
        </div>
      ) : (
        <button onClick={verify} className="btn-primary text-sm">
          Verificar (A∘B)∘C = A∘(B∘C)
        </button>
      )}

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <p className="text-xs text-white/40 font-mono">
              a = {result.names[0]}, b = {result.names[1]}, c = {result.names[2]}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <MiniMapping label="a∘b" permutation={result.steps.ab} />
              <MiniMapping label="b∘c" permutation={result.steps.bc} />
              <MiniMapping label="(a∘b)∘c" permutation={result.steps.ab_c} />
              <MiniMapping label="a∘(b∘c)" permutation={result.steps.a_bc} />
            </div>
            <div
              className={`rounded-xl border p-3 text-center font-semibold ${
                result.isEqual
                  ? 'bg-status-success-glow text-status-success border-status-success/30'
                  : 'bg-status-error-glow text-status-error border-status-error/30'
              }`}
            >
              {result.isEqual
                ? '✓ (a∘b)∘c = a∘(b∘c) — se cumple la asociatividad'
                : '✗ Los resultados difieren'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Tab 3 — Propiedades del grupo S₉. */
function GroupTab({ currentPermutation }) {
  const props = [
    {
      title: 'Clausura',
      def: 'La composición de dos permutaciones de S₉ es otra permutación de S₉.',
      ex: 'A ∘ B ∈ S₉',
    },
    {
      title: 'Identidad',
      def: 'Existe e = [1,2,…,9] tal que σ ∘ e = e ∘ σ = σ.',
      ex: currentPermutation.isIdentity()
        ? 'Σ actual = e'
        : 'e = (sin ciclos)',
    },
    {
      title: 'Inversos',
      def: 'Para cada σ existe σ⁻¹ tal que σ ∘ σ⁻¹ = e.',
      ex: `σ⁻¹ = ${currentPermutation.inverse().toCycleNotation()}`,
    },
    {
      title: 'Asociatividad',
      def: '(a∘b)∘c = a∘(b∘c) para toda terna de permutaciones.',
      ex: 'Ver pestaña Asociatividad',
    },
  ]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {props.map((p) => (
          <div
            key={p.title}
            className="rounded-xl bg-bg-secondary border border-border-subtle p-4 space-y-1.5"
          >
            <h4 className="text-sm font-semibold text-accent-purple-light">
              {p.title}
            </h4>
            <p className="text-[11px] text-white/50 leading-snug">{p.def}</p>
            <p className="font-mono text-[11px] text-accent-cyan-light break-all">
              {p.ex}
            </p>
          </div>
        ))}
      </div>
      <div className="text-center text-xs text-white/40 font-mono">
        |S₉| = 9! = 362,880 elementos · Generado por A, B, C, D, E, F
      </div>
    </div>
  )
}

/**
 * MathPanel — panel matemático con 3 pestañas.
 */
export default function MathPanel({ currentPermutation, history = [], moves }) {
  const [tab, setTab] = useState('current')
  const tabs = [
    { id: 'current', label: 'Permutación Σ' },
    { id: 'assoc', label: 'Asociatividad' },
    { id: 'group', label: 'Grupo S₉' },
  ]

  return (
    <div className="rounded-2xl bg-bg-card border border-border-subtle ring-1 ring-accent-purple/20 p-5">
      <div className="flex gap-1 mb-5 p-1 rounded-lg bg-bg-secondary border border-border-subtle">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 text-xs font-medium py-2 rounded-md transition-all ${
              tab === t.id
                ? 'bg-accent-purple text-white'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'current' && (
        <CurrentTab currentPermutation={currentPermutation} history={history} />
      )}
      {tab === 'assoc' && <AssocTab history={history} moves={moves} />}
      {tab === 'group' && <GroupTab currentPermutation={currentPermutation} />}
    </div>
  )
}
