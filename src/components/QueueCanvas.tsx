import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HeapNode } from '../core/types';

interface QueueCanvasProps {
  memorySnapshot: Record<string, HeapNode>;
  pointers: Record<string, string | null>;
  activeNodes: string[];
  leakAddresses: string[];
}

interface NodePosition {
  address: string;
  x: number;
  y: number;
  data: any;
  isLeaked: boolean;
  isActive: boolean;
  label?: string;
}

export const QueueCanvas: React.FC<QueueCanvasProps> = ({
  memorySnapshot,
  pointers,
  activeNodes,
  leakAddresses,
}) => {
  const nodeRadius = 28; // Diámetro 56px
  const canvasWidth = 800;
  const canvasHeight = 500;

  // 1. Obtener nodos de la estructura activa (Queue) siguiendo el puntero 'front'
  const getActiveStructureNodes = (): string[] => {
    const list: string[] = [];
    const visited = new Set<string>();
    let curr = pointers.front;

    while (curr && memorySnapshot[curr] && !visited.has(curr)) {
      list.push(curr);
      visited.add(curr);
      curr = memorySnapshot[curr].next || null;
    }
    return list;
  };

  const activeStructureNodes = getActiveStructureNodes();

  // Calcular las posiciones de los nodos
  const positions: Record<string, NodePosition> = {};

  // Posicionamiento de la cola:
  // Queremos que los nodos se alineen horizontalmente.
  // Front a la izquierda (index 0) y rear a la derecha (index len - 1).
  // startX = 120
  // centerY = 250 (medio del tubo horizontal)
  // gapX = 110 (suficiente espacio para que no se superpongan y ver conexiones)
  const startX = 120;
  const centerY = 250;
  const gapX = 110;

  activeStructureNodes.forEach((addr, index) => {
    const xPos = startX + index * gapX;

    // Etiqueta: 'front' para el primero, 'rear' para el último.
    // Si solo hay uno, puede mostrar 'front/rear' o simplemente priorizar 'front' y 'rear' según corresponda
    let label: string | undefined = undefined;
    if (activeStructureNodes.length === 1) {
      label = 'front/rear';
    } else if (index === 0) {
      label = 'front';
    } else if (index === activeStructureNodes.length - 1) {
      label = 'rear';
    }

    positions[addr] = {
      address: addr,
      x: xPos,
      y: centerY,
      data: memorySnapshot[addr].data,
      isLeaked: false,
      isActive: activeNodes.includes(addr),
      label,
    };
  });

  // Calcular posiciones para los nodos huérfanos/fugados (Leaks)
  const allNodeAddresses = Object.keys(memorySnapshot);
  const orphanedAddresses = allNodeAddresses.filter((addr) => !positions[addr]);

  const shelfStartX = 620;
  const shelfStartY = 100;
  const shelfGapY = 80;
  const nodesPerColumn = 5;

  orphanedAddresses.forEach((addr, index) => {
    const col = Math.floor(index / nodesPerColumn);
    const row = index % nodesPerColumn;
    const isLeaked = leakAddresses.includes(addr);

    let label = 'temp/unlinked';
    if (isLeaked) {
      label = 'leak';
    } else if (pointers.temp === addr) {
      label = 'temp';
    } else if (activeNodes.includes(addr)) {
      label = 'nuevo';
    }

    positions[addr] = {
      address: addr,
      x: shelfStartX + col * 90,
      y: shelfStartY + row * shelfGapY,
      data: memorySnapshot[addr].data,
      isLeaked,
      isActive: activeNodes.includes(addr),
      label,
    };
  });

  // Configuración de animación con Spring
  const springTransition = {
    type: 'spring' as const,
    stiffness: 280,
    damping: 24,
    mass: 0.9,
  };

  // Curva cuadrática que sube por encima de los nodos para que las conexiones sean muy claras
  const getCurvedArrowPath = (x1: number, y1: number, x2: number, y2: number, arcOffset: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;

    // Puntos de inicio y fin en el borde de los círculos
    const sx = x1 + ux * nodeRadius;
    const sy = y1 + uy * nodeRadius;
    const ex = x2 - ux * nodeRadius;
    const ey = y2 - uy * nodeRadius;

    // Punto de control para la curva cuadrática
    const mx = (sx + ex) / 2;
    const my = (sy + ey) / 2;
    const cx = mx;
    const cy = my - arcOffset; // Curvatura hacia arriba

    return `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;
  };

  return (
    <div className="flex-1 relative border border-primary/10 bg-surface rounded-DEFAULT overflow-hidden ink-bleed min-h-[480px] w-full select-none">
      <svg
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        className="w-full h-full"
      >
        <defs>
          <filter id="roughness">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="premium-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="#1a1a1a" floodOpacity="0.12" />
          </filter>
          <filter id="active-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#596152" floodOpacity="0.5" />
          </filter>
          <filter id="leak-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#ba1a1a" floodOpacity="0.5" />
          </filter>

          <marker id="arrow-primary" markerWidth="7" markerHeight="7" refX="8" refY="3.5" orient="auto-start-reverse" viewBox="0 0 10 10">
            <path d="M 0 0 L 10 3.5 L 0 7 z" fill="#1a1a1a" filter="url(#roughness)" />
          </marker>
          <marker id="arrow-secondary" markerWidth="7" markerHeight="7" refX="8" refY="3.5" orient="auto-start-reverse" viewBox="0 0 10 10">
            <path d="M 0 0 L 10 3.5 L 0 7 z" fill="#596152" filter="url(#roughness)" />
          </marker>
        </defs>

        {/* 1. Contenedor de la Cola (Tubo horizontal punteado con etiquetas FIFO) */}
        <g>
          {/* Tubería horizontal */}
          <path
            d="M 60 200 L 530 200 Q 540 200 540 210 L 540 290 Q 540 300 530 300 L 60 300"
            fill="none"
            stroke="rgba(26, 26, 26, 0.15)"
            strokeWidth="3"
            strokeDasharray="5 5"
            filter="url(#roughness)"
          />
          {/* Indicadores de dirección FIFO */}
          <text
            x="70"
            y="190"
            className="font-mono text-[9px] fill-primary/40 font-bold uppercase tracking-wider"
          >
            ← Sale (Front)
          </text>
          <text
            x="455"
            y="190"
            className="font-mono text-[9px] fill-primary/40 font-bold uppercase tracking-wider"
          >
            Entra (Rear) →
          </text>
        </g>

        {/* 2. Zona de Fugas (Leaks) */}
        {orphanedAddresses.length > 0 && (
          <g>
            <line
              x1="570"
              y1="40"
              x2="570"
              y2="460"
              stroke="rgba(186, 26, 26, 0.2)"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
            <text
              x="685"
              y="35"
              textAnchor="middle"
              className="font-mono text-[9px] fill-error/70 tracking-widest uppercase font-bold"
            >
              Zona de Fugas (Leaks)
            </text>
          </g>
        )}

        {/* 3. Conexiones (Flechas curvas de enlace) */}
        <g>
          {activeStructureNodes.map((addr) => {
            const node = memorySnapshot[addr];
            const pos = positions[addr];
            if (!node || !pos || !node.next || !positions[node.next]) return null;

            const targetPos = positions[node.next];
            // Dibujamos un arco que sube 22px por encima de la línea central de nodos para que sea perfectamente visible
            const pathD = getCurvedArrowPath(pos.x, pos.y, targetPos.x, targetPos.y, 22);
            const isLineActive = activeNodes.includes(addr) && activeNodes.includes(node.next);

            return (
              <motion.path
                key={`arrow-${addr}-to-${node.next}`}
                d={pathD}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                fill="none"
                stroke={isLineActive ? '#596152' : '#1a1a1a'}
                strokeWidth={isLineActive ? 2.5 : 1.5}
                strokeLinecap="round"
                filter="url(#roughness)"
                markerEnd={isLineActive ? 'url(#arrow-secondary)' : 'url(#arrow-primary)'}
              />
            );
          })}
        </g>

        {/* 4. Renderizar Nodos en SVG */}
        <g>
          <AnimatePresence>
            {Object.entries(positions)
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([addr, pos]) => {
                const isActive = pos.isActive;
                const isLeaked = pos.isLeaked;

                let strokeColor = '#1a1a1a';
                let fillColor = '#fcf9f0';
                let textColor = '#1a1a1a';
                let filterId = 'url(#premium-shadow)';

                if (isActive) {
                  strokeColor = '#596152';
                  fillColor = '#d8e0cc';
                  filterId = 'url(#active-shadow)';
                } else if (isLeaked) {
                  strokeColor = '#ba1a1a';
                  fillColor = '#ffdad6';
                  textColor = '#ba1a1a';
                  filterId = 'url(#leak-shadow)';
                }

                // Animación de la Cola
                // Enqueue: Nace a la derecha de la cola (pos.x + 80) y entra flotando
                // Dequeue: Sale a la izquierda y se desvanece
                const isNodeInQueue = activeStructureNodes.includes(addr);
                const initialX = isNodeInQueue ? pos.x + 80 : pos.x;

                return (
                  <motion.g
                    key={addr}
                    layoutId={`node-group-${addr}`}
                    layout
                    initial={{
                      x: initialX,
                      y: pos.y,
                      opacity: 0,
                      scale: 0.4,
                    }}
                    animate={{
                      x: pos.x,
                      y: pos.y,
                      opacity: 1,
                      scale: isActive ? 1.08 : 1.0,
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.5,
                      x: isNodeInQueue ? pos.x - 60 : pos.x,
                      transition: { duration: 0.35, ease: 'easeIn' },
                    }}
                    transition={springTransition}
                    style={{ originX: 0.5, originY: 0.5 }}
                  >
                    {/* Círculo Principal */}
                    <motion.circle
                      r={nodeRadius}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isActive ? 3 : 2}
                      filter={filterId}
                      className="cursor-pointer"
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.2 }}
                    />

                    {/* Valor */}
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={textColor}
                      className="font-serif font-bold text-lg select-none pointer-events-none"
                    >
                      {pos.data}
                    </text>

                    {/* Dirección */}
                    <g transform={`translate(0, ${nodeRadius + 14})`}>
                      <rect
                        x="-25"
                        y="-7"
                        width="50"
                        height="14"
                        rx="3"
                        fill="#f6f3ea"
                        stroke="rgba(26, 26, 26, 0.1)"
                        strokeWidth="1"
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="font-mono text-[9px] font-bold fill-on-surface-variant select-none pointer-events-none"
                      >
                        {pos.address}
                      </text>
                    </g>

                    {/* Puntero Activo (arriba del nodo) */}
                    {pos.label && (
                      <g transform={`translate(0, ${-(nodeRadius + 16)})`}>
                        <rect
                          x="-30"
                          y="-8"
                          width="60"
                          height="16"
                          rx="3"
                          fill={isLeaked ? '#ba1a1a' : '#596152'}
                        />
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#ffffff"
                          className="font-mono text-[8px] font-extrabold uppercase tracking-wider select-none pointer-events-none"
                        >
                          {pos.label}
                        </text>
                      </g>
                    )}
                  </motion.g>
                );
              })}
          </AnimatePresence>
        </g>
      </svg>
    </div>
  );
};
