import { useMemo, useState } from 'react'
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { cn } from '../../lib/format'
import { filterGraph, layoutGraph } from '../../lib/forensics'
import { NodePanel } from './NodePanel'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'wallets', label: 'Wallets' },
  { id: 'contracts', label: 'Contracts' },
  { id: 'tokens', label: 'Tokens' },
  { id: 'signals', label: 'Risk signals' },
]

const SHORT_TYPE = {
  wallet: 'You',
  counterparty: 'Wallet',
  contract: 'Contract',
  token: 'Token',
  flagged: 'Listed',
}

const KIND_SHORT = {
  'transferred to': 'sent',
  'received from': 'recv',
  approved: 'ok',
  called: 'call',
  'interacted with': 'used',
}

const TYPE_COLOR = {
  wallet: '#9aaf9a',
  counterparty: '#e7e3db',
  contract: '#6e9a94',
  token: '#9aaf9a',
  flagged: '#d4524c',
}

function GraphNode({ data, selected }) {
  const tone = data.highlight
    ? data.riskSeverity === 'high' || data.riskSeverity === 'critical'
      ? 'critical'
      : data.riskSeverity === 'medium' || data.riskSeverity === 'elevated'
        ? 'high'
        : 'scan'
    : data.isSubject
      ? 'accent'
      : 'info'
  const shape =
    data.type === 'contract'
      ? 'square'
      : data.type === 'token'
        ? 'diamond'
        : 'circle'

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${data.typeLabel} ${data.display}`}
      aria-pressed={selected}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          data.onActivate?.()
        }
      }}
      className={cn(
        'min-w-[132px] cursor-pointer border bg-raised px-3 py-2 transition sm:min-w-[148px]',
        selected ? 'border-scan' : 'border-line hover:border-faint',
        data.highlight && data.type === 'flagged' && 'wa-glow-critical',
        data.highlight && data.type !== 'flagged' && 'wa-glow',
        data.isSubject && !data.highlight && 'wa-glow',
        data.isSubject && 'wa-node-drift',
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-1.5 !w-1.5 !border-0 !bg-faint" />
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-block h-2 w-2 shrink-0',
            shape === 'circle' && 'rounded-full',
            shape === 'diamond' && 'rotate-45',
          )}
          style={{ background: `var(--wa-${tone === 'scan' ? 'scan' : tone})` }}
          aria-hidden="true"
        />
        <p className="wa-kicker" style={{ color: `var(--wa-${tone === 'scan' ? 'scan' : tone})` }}>
          {SHORT_TYPE[data.type] || data.typeLabel}
        </p>
      </div>
      <p className="mt-1 text-[12px] text-ink">{data.display}</p>
      <p className="mt-1 text-[11px] text-faint">
        {data.interactionCount} {data.interactionCount === 1 ? 'event' : 'events'}
      </p>
      {data.riskLabel ? <p className="mt-1 text-[10px] tracking-[0.12em] text-quiet uppercase">{data.riskLabel}</p> : null}
      <Handle type="source" position={Position.Bottom} className="!h-1.5 !w-1.5 !border-0 !bg-faint" />
    </div>
  )
}

const nodeTypes = { autopsy: GraphNode }

function GraphCanvas({ nodes, edges, onSelect }) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.22, minZoom: 0.45, maxZoom: 1.5 }}
      minZoom={0.4}
      onInit={(instance) => {
        requestAnimationFrame(() => instance.fitView({ padding: 0.22 }))
      }}
      onNodeClick={(_, node) => onSelect(node.data)}
      onPaneClick={() => onSelect(null)}
      nodesDraggable
      nodesConnectable={false}
      elementsSelectable
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#1c2026" gap={18} size={1} />
      <MiniMap
        pannable
        zoomable
        maskColor="rgba(6,7,8,0.82)"
        nodeColor={(node) => TYPE_COLOR[node.data.type] || '#8d8982'}
      />
      <Controls showInteractive={false} />
    </ReactFlow>
  )
}

export function RelationshipGraph({ graph, chain }) {
  const [filter, setFilter] = useState('all')
  const [riskOnly, setRiskOnly] = useState(true)
  const [selected, setSelected] = useState(null)

  const visible = useMemo(() => filterGraph(graph, { filter, riskOnly }), [graph, filter, riskOnly])
  const laidOut = useMemo(() => layoutGraph(visible.nodes, graph.subject), [visible.nodes, graph.subject])

  const flowNodes = useMemo(
    () =>
      laidOut.map((node) => ({
        id: node.id,
        type: 'autopsy',
        position: node.position,
        selected: selected?.id === node.id,
        data: { ...node, onActivate: () => setSelected(node) },
      })),
    [laidOut, selected],
  )

  const flowEdges = useMemo(
    () =>
      visible.edges.map((edge) => {
        const highlighted = edge.riskRelevant
        const color = highlighted ? '#6d9a93' : '#6f6a62'
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: `${KIND_SHORT[edge.kind] || edge.kind} · ${edge.count}`,
          type: 'smoothstep',
          animated: highlighted,
          markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color },
          style: { stroke: color, strokeWidth: highlighted ? 1.6 : 1 },
          labelStyle: { fill: highlighted ? '#9aaf9a' : '#9a958a', fontSize: 10, fontFamily: 'IBM Plex Sans' },
          labelBgStyle: { fill: '#060708' },
          labelBgPadding: [4, 6],
        }
      }),
    [visible.edges],
  )

  const emptyRisk = riskOnly && visible.nodes.length <= 1

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="wa-kicker">Relationship graph</p>
          <h2 className="wa-display mt-2 text-3xl">Map</h2>
        </div>
        <p className="text-[12px] text-quiet">
          {Math.max(0, visible.nodes.length - 1)}/{graph.totalCounterparties}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            aria-pressed={filter === item.id}
            className={cn(
              'border px-3 py-1.5 text-[11px] tracking-[0.14em] uppercase transition',
              filter === item.id ? 'border-accent text-ink' : 'border-line text-quiet hover:border-faint hover:text-ink',
            )}
          >
            {item.label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-[12px] text-quiet">
          <input
            type="checkbox"
            checked={riskOnly}
            onChange={(event) => setRiskOnly(event.target.checked)}
            className="accent-[var(--wa-accent)]"
          />
          Risk only
        </label>
      </div>

      <div className="relative mt-5 h-[360px] border-y border-line bg-canvas sm:h-[440px] lg:h-[520px]">
        {emptyRisk ? (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <p className="text-sm text-quiet">No risk links. Turn off Risk only.</p>
          </div>
        ) : (
          <ReactFlowProvider>
            <GraphCanvas
              key={`${filter}-${riskOnly}`}
              nodes={flowNodes}
              edges={flowEdges}
              onSelect={setSelected}
            />
          </ReactFlowProvider>
        )}
        {selected ? (
          <NodePanel node={selected} chain={chain} onClose={() => setSelected(null)} />
        ) : null}
      </div>
    </section>
  )
}
