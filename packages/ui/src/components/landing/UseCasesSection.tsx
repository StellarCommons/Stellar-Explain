'use client';

import { useEffect, useRef, useState } from 'react';

const NODES = [
  {
    id: 'developers',
    label: 'Developers',
    sub: 'debug with clarity',
    icon: '</>',
    x: 185,
    y: 190,
    floatDur: 2.8,
    floatAmp: 9,
    floatDelay: 0,
  },
  {
    id: 'analysts',
    label: 'Analysts',
    sub: 'audit made readable',
    icon: '~~~',
    x: 830,
    y: 172,
    floatDur: 3.4,
    floatAmp: 11,
    floatDelay: 0.4,
  },
  {
    id: 'curious',
    label: 'Curious Users',
    sub: 'your wallet, explained',
    icon: '◉',
    x: 158,
    y: 440,
    floatDur: 3.1,
    floatAmp: 8,
    floatDelay: 0.8,
  },
  {
    id: 'businesses',
    label: 'Businesses',
    sub: 'compliance-ready context',
    icon: '⬡',
    x: 840,
    y: 438,
    floatDur: 2.6,
    floatAmp: 10,
    floatDelay: 0.2,
  },
  {
    id: 'auditors',
    label: 'Auditors',
    sub: 'trace every operation',
    icon: '◈',
    x: 920,
    y: 310,
    floatDur: 3.7,
    floatAmp: 7,
    floatDelay: 1.0,
  },
];

const CENTER = { x: 530, y: 315 };

const CURVES: Record<string, string> = {
  developers: `M${CENTER.x - 26},${CENTER.y - 26} C420,265 320,230 248,200`,
  analysts: `M${CENTER.x + 24},${CENTER.y - 28} C630,248 720,205 768,182`,
  curious: `M${CENTER.x - 28},${CENTER.y + 24} C420,378 310,408 222,440`,
  businesses: `M${CENTER.x + 26},${CENTER.y + 24} C635,378 728,412 778,438`,
  auditors: `M${CENTER.x + 30},${CENTER.y} C668,308 768,310 858,312`,
};

const SEQUENCE_DELAYS: Record<string, { line: number; node: number }> = {
  developers: { line: 1100, node: 1500 },
  analysts: { line: 1750, node: 2100 },
  curious: { line: 2300, node: 2650 },
  businesses: { line: 2900, node: 3250 },
  auditors: { line: 3500, node: 3850 },
};

export default function UseCasesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [centerVisible, setCenterVisible] = useState(false);
  const [linesVisible, setLinesVisible] = useState<Record<string, boolean>>({});
  const [nodesVisible, setNodesVisible] = useState<Record<string, boolean>>({});
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setVisible(true);
          setStarted(true);
        }
      },
      { threshold: 0.25 },
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!visible) return;

    const t0 = setTimeout(() => setCenterVisible(true), 600);

    const lineTimers: ReturnType<typeof setTimeout>[] = [];
    const nodeTimers: ReturnType<typeof setTimeout>[] = [];

    NODES.forEach((node) => {
      const d = SEQUENCE_DELAYS[node.id];
      lineTimers.push(
        setTimeout(() => {
          setLinesVisible((prev) => ({ ...prev, [node.id]: true }));
        }, d.line),
      );
      nodeTimers.push(
        setTimeout(() => {
          setNodesVisible((prev) => ({ ...prev, [node.id]: true }));
        }, d.node),
      );
    });

    return () => {
      clearTimeout(t0);
      [...lineTimers, ...nodeTimers].forEach(clearTimeout);
    };
  }, [visible]);

  return (
    <section
      ref={sectionRef}
      style={{
        width: '100%',
        padding: '96px 24px 112px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Section heading */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: '64px',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}
      >
        <p
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '12px',
            color: '#38bdf8',
            letterSpacing: '0.08em',
            marginBottom: '12px',
          }}
        >
          who is this for??
        </p>
        <h2
          style={{
            fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 300,
            color: '#f0f9ff',
            letterSpacing: '-0.3px',
            margin: 0,
          }}
        >
          Everyone navigating Stellar.
        </h2>
      </div>

      {/* SVG node graph */}
      <div style={{ width: '100%', maxWidth: '1100px' }}>
        <svg
          viewBox="0 0 1060 620"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        >
          <defs>
            {/* Line pulse filter */}
            <filter id="lineglow">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* CSS animations injected inline */}
            <style>{`
              @keyframes drawLine {
                from { stroke-dashoffset: 400; stroke-opacity: 0; }
                to   { stroke-dashoffset: 0;   stroke-opacity: 0.4; }
              }
              @keyframes linePulse {
                0%,100% { stroke-opacity: 0.3; }
                50%      { stroke-opacity: 0.6; }
              }
              @keyframes popIn {
                0%   { opacity: 0; transform: scale(0.2); }
                60%  { opacity: 1; transform: scale(1.08); }
                80%  { transform: scale(0.96); }
                100% { opacity: 1; transform: scale(1); }
              }
              @keyframes float0 {
                0%,100% { transform: translateY(0px) translateX(0px); }
                30%     { transform: translateY(-9px) translateX(2px); }
                70%     { transform: translateY(4px) translateX(-2px); }
              }
              @keyframes float1 {
                0%,100% { transform: translateY(0px) translateX(0px); }
                25%     { transform: translateY(-11px) translateX(-3px); }
                65%     { transform: translateY(5px) translateX(3px); }
              }
              @keyframes float2 {
                0%,100% { transform: translateY(0px) translateX(0px); }
                40%     { transform: translateY(-8px) translateX(3px); }
                75%     { transform: translateY(6px) translateX(-1px); }
              }
              @keyframes float3 {
                0%,100% { transform: translateY(0px) translateX(0px); }
                35%     { transform: translateY(-10px) translateX(-2px); }
                80%     { transform: translateY(4px) translateX(2px); }
              }
              @keyframes float4 {
                0%,100% { transform: translateY(0px) translateX(0px); }
                20%     { transform: translateY(-7px) translateX(2px); }
                60%     { transform: translateY(5px) translateX(-3px); }
              }
              @keyframes centerPulse {
                0%,100% { filter: drop-shadow(0 0 5px rgba(56,189,248,0.35)); }
                50%      { filter: drop-shadow(0 0 18px rgba(56,189,248,0.75)); }
              }
              @keyframes nodePulse {
                0%,100% { filter: drop-shadow(0 0 3px rgba(14,165,233,0.2)); }
                50%      { filter: drop-shadow(0 0 10px rgba(14,165,233,0.5)); }
              }
              @keyframes eyebrowFade {
                from { opacity: 0; transform: translateY(6px); }
                to   { opacity: 1; transform: translateY(0); }
              }
              .line-path {
                fill: none;
                stroke: #38bdf8;
                stroke-width: 1.2;
                stroke-dasharray: 400;
                stroke-dashoffset: 400;
                stroke-opacity: 0;
              }
              .line-path.visible {
                animation:
                  drawLine 0.7s ease forwards,
                  linePulse 2.8s ease-in-out 0.8s infinite;
              }
              .node-group {
                opacity: 0;
              }
              .node-group.visible {
                animation:
                  popIn 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards,
                  nodePulse 3s ease-in-out 0.6s infinite;
              }
              .node-group.visible.float-0 { animation: popIn 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards, float0 2.8s ease-in-out 0.6s infinite, nodePulse 3s ease-in-out 0.6s infinite; }
              .node-group.visible.float-1 { animation: popIn 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards, float1 3.4s ease-in-out 1.0s infinite, nodePulse 3.4s ease-in-out 0.6s infinite; }
              .node-group.visible.float-2 { animation: popIn 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards, float2 3.1s ease-in-out 0.8s infinite, nodePulse 3.1s ease-in-out 0.6s infinite; }
              .node-group.visible.float-3 { animation: popIn 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards, float3 2.6s ease-in-out 1.2s infinite, nodePulse 2.6s ease-in-out 0.6s infinite; }
              .node-group.visible.float-4 { animation: popIn 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards, float4 3.7s ease-in-out 0.4s infinite, nodePulse 3.7s ease-in-out 0.6s infinite; }
              .center-group {
                opacity: 0;
              }
              .center-group.visible {
                animation:
                  popIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards,
                  centerPulse 2.5s ease-in-out 0.6s infinite;
              }
            `}</style>
          </defs>

          {/* Ambient dots */}
          {[
            [360, 140],
            [680, 560],
            [90, 320],
            [980, 200],
            [460, 560],
            [740, 118],
            [55, 210],
            [1010, 500],
            [200, 560],
            [900, 80],
          ].map(([cx, cy], i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={i % 3 === 0 ? 2 : 1.4}
              fill="#38bdf8"
              opacity={0.12 + (i % 4) * 0.04}
            />
          ))}

          {/* Connector lines */}
          {NODES.map((node) => (
            <path
              key={node.id}
              className={`line-path${linesVisible[node.id] ? ' visible' : ''}`}
              d={CURVES[node.id]}
            />
          ))}

          {/* CENTER NODE */}
          <g
            className={`center-group${centerVisible ? ' visible' : ''}`}
            style={{ transformOrigin: `${CENTER.x}px ${CENTER.y}px` }}
          >
            <rect
              x={CENTER.x - 82}
              y={CENTER.y - 52}
              width={164}
              height={104}
              rx={20}
              fill="#061624"
              stroke="#38bdf8"
              strokeWidth={2}
              strokeOpacity={0.85}
            />
            {/* Star icon */}
            <g transform={`translate(${CENTER.x - 60}, ${CENTER.y - 36})`}>
              <rect
                width={34}
                height={34}
                rx={8}
                fill="#0e2a3d"
                stroke="#38bdf8"
                strokeWidth={1}
                strokeOpacity={0.6}
              />
              <circle cx={17} cy={17} r={3.2} fill="#38bdf8" />
              <line
                x1={17}
                y1={6}
                x2={17}
                y2={11}
                stroke="#38bdf8"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
              <line
                x1={17}
                y1={23}
                x2={17}
                y2={28}
                stroke="#38bdf8"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
              <line
                x1={6}
                y1={17}
                x2={11}
                y2={17}
                stroke="#38bdf8"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
              <line
                x1={23}
                y1={17}
                x2={28}
                y2={17}
                stroke="#38bdf8"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
              <line
                x1={9}
                y1={9}
                x2={12}
                y2={12}
                stroke="#38bdf8"
                strokeWidth={1.1}
                strokeLinecap="round"
                opacity={0.55}
              />
              <line
                x1={22}
                y1={22}
                x2={25}
                y2={25}
                stroke="#38bdf8"
                strokeWidth={1.1}
                strokeLinecap="round"
                opacity={0.55}
              />
              <line
                x1={25}
                y1={9}
                x2={22}
                y2={12}
                stroke="#38bdf8"
                strokeWidth={1.1}
                strokeLinecap="round"
                opacity={0.55}
              />
              <line
                x1={12}
                y1={22}
                x2={9}
                y2={25}
                stroke="#38bdf8"
                strokeWidth={1.1}
                strokeLinecap="round"
                opacity={0.55}
              />
            </g>
            {/* <text
              x={CENTER.x + 8}
              y={CENTER.y - 8}
              textAnchor="middle"
              fontFamily="'IBM Plex Mono', monospace"
              fontSize={15}
              fontWeight={600}
              fill="#bae6fd"
              letterSpacing={0.5}
            >
              Stellar Explain
            </text> */}
            <text
              x={CENTER.x}
              y={CENTER.y + 14}
              textAnchor="middle"
              fontFamily="'IBM Plex Sans', sans-serif"
              fontSize={12}
              fill="#7dd3fc"
              opacity={0.8}
            >
              plain-english blockchain
            </text>
          </g>

          {/* AUDIENCE NODES */}
          {NODES.map((node, i) => {
            const w = node.id === 'businesses' ? 196 : node.id === 'curious' ? 192 : 180;
            const h = 84;
            const nx = node.x - w / 2;
            const ny = node.y - h / 2;

            return (
              <g
                key={node.id}
                className={`node-group${nodesVisible[node.id] ? ` visible float-${i}` : ''}`}
                style={{ transformOrigin: `${node.x}px ${node.y}px` }}
              >
                <rect
                  x={nx}
                  y={ny}
                  width={w}
                  height={h}
                  rx={14}
                  fill="#050f1a"
                  stroke="#0ea5e9"
                  strokeWidth={1}
                  strokeOpacity={0.55}
                />
                {/* Icon box */}
                <rect
                  x={nx + 10}
                  y={ny + 14}
                  width={36}
                  height={36}
                  rx={8}
                  fill="#0e2a3d"
                  stroke="#0ea5e9"
                  strokeWidth={0.8}
                  strokeOpacity={0.45}
                />
                <text
                  x={nx + 28}
                  y={ny + 37}
                  textAnchor="middle"
                  fontFamily="'IBM Plex Mono', monospace"
                  fontSize={15}
                  fill="#38bdf8"
                >
                  {node.icon}
                </text>
                {/* Label */}
                <text
                  x={nx + 56}
                  y={ny + 34}
                  fontFamily="'IBM Plex Mono', monospace"
                  fontSize={15}
                  fontWeight={500}
                  fill="#e0f2fe"
                >
                  {node.label}
                </text>
                <text
                  x={nx + 56}
                  y={ny + 54}
                  fontFamily="'IBM Plex Sans', sans-serif"
                  fontSize={12}
                  fill="#7dd3fc"
                  opacity={0.85}
                >
                  {node.sub}
                </text>
                {/* Decorative corner dot */}
                <circle cx={nx + w - 8} cy={ny + 8} r={2.5} fill="#38bdf8" opacity={0.2} />
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
