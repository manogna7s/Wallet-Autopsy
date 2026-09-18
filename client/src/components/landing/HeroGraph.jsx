const NODES = [
  { id: 'a', x: 90, y: 70, kind: 'wallet', r: 7 },
  { id: 'b', x: 210, y: 50, kind: 'contract', r: 6 },
  { id: 'c', x: 330, y: 90, kind: 'wallet', r: 5 },
  { id: 'd', x: 150, y: 160, kind: 'token', r: 5 },
  { id: 'e', x: 280, y: 180, kind: 'risky', r: 8 },
  { id: 'f', x: 400, y: 150, kind: 'contract', r: 6 },
  { id: 'g', x: 70, y: 240, kind: 'wallet', r: 5 },
  { id: 'h', x: 200, y: 270, kind: 'contract', r: 6 },
  { id: 'i', x: 340, y: 250, kind: 'wallet', r: 6 },
  { id: 'j', x: 460, y: 80, kind: 'token', r: 4 },
  { id: 'k', x: 480, y: 220, kind: 'risky', r: 6 },
]

const EDGES = [
  ['a', 'b'],
  ['b', 'c'],
  ['a', 'd'],
  ['d', 'e'],
  ['b', 'e'],
  ['c', 'f'],
  ['e', 'i'],
  ['g', 'a'],
  ['g', 'h'],
  ['h', 'i'],
  ['f', 'j'],
  ['f', 'k'],
  ['i', 'k'],
]

const FILL = {
  wallet: '#e7e3db',
  contract: '#6e9a94',
  token: '#9aaf9a',
  risky: '#d4524c',
}

function nodeById(id) {
  return NODES.find((node) => node.id === id)
}

export function HeroGraph() {
  return (
    <svg
      viewBox="0 0 560 320"
      className="h-full w-full"
      role="img"
      aria-label="Animated network of wallets, contracts, and flagged counterparties"
    >
      <defs>
        <radialGradient id="wa-field" cx="50%" cy="45%" r="65%">
          <stop offset="0%" stopColor="#6e9a94" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#060708" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="560" height="320" fill="url(#wa-field)" />

      {EDGES.map(([from, to], index) => {
        const a = nodeById(from)
        const b = nodeById(to)
        return (
          <line
            key={`${from}-${to}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="#1c2026"
            strokeWidth="1"
            className="wa-edge-flow"
            style={{ animationDelay: `${index * 0.4}s` }}
          />
        )
      })}

      {NODES.map((node) => (
        <g key={node.id} className="wa-node-live" style={{ animationDelay: `${node.x / 120}s` }}>
          {node.kind === 'contract' ? (
            <rect
              x={node.x - node.r}
              y={node.y - node.r}
              width={node.r * 2}
              height={node.r * 2}
              fill={FILL.contract}
            />
          ) : node.kind === 'token' ? (
            <polygon
              points={`${node.x},${node.y - node.r} ${node.x + node.r},${node.y} ${node.x},${node.y + node.r} ${node.x - node.r},${node.y}`}
              fill={FILL.token}
            />
          ) : (
            <circle cx={node.x} cy={node.y} r={node.r} fill={FILL[node.kind]} />
          )}
          {node.kind === 'risky' ? (
            <circle
              cx={node.x}
              cy={node.y}
              r={node.r + 5}
              fill="none"
              stroke="#d4524c"
              strokeOpacity="0.45"
            />
          ) : null}
        </g>
      ))}

      <g fontFamily="IBM Plex Sans, sans-serif" fontSize="9" letterSpacing="0.16em" fill="#5b5853">
        <text x="24" y="304">
          WALLET
        </text>
        <text x="92" y="304">
          CONTRACT
        </text>
        <text x="180" y="304">
          TOKEN
        </text>
        <text x="244" y="304" fill="#d4524c">
          FLAGGED
        </text>
      </g>
    </svg>
  )
}
