import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HeapNode } from '../core/types';

interface DLLCanvasProps {
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
  isDummy?: boolean;
  isLeaked: boolean;
  isActive: boolean;
  label?: string;
}

export const DLLCanvas: React.FC<DLLCanvasProps> = ({
  memorySnapshot,
  pointers,
  activeNodes,
  leakAddresses,
}) => {
  const nodeRadius = 28; // Diámetro 56px
  const canvasWidth = 800;
  const canvasHeight = 500;

  // 1. Obtener nodos de la estructura activa (DLL) siguiendo los enlaces desde el dummy
  const getActiveStructureNodes = (): string[] => {
    const list: string[] = [];
    const visited = new Set<string>();
    const dummy = pointers.dummy;

    if (dummy && memorySnapshot[dummy]) {
      list.push(dummy);
      visited.add(dummy);
      let curr = memorySnapshot[dummy].next;
      while (curr && curr !== dummy && memorySnapshot[curr] && !visited.has(curr)) {
        list.push(curr);
        visited.add(curr);
        curr = memorySnapshot[curr].next;
      }
    }
    return list;
  };

  const activeStructureNodes = getActiveStructureNodes();

  // Calcular posiciones orbitales elípticas
  const positions: Record<string, NodePosition> = {};
  const centerX = 320;
  const centerY = 250;
  const rx = 180;
  const ry = 135;
  const len = activeStructureNodes.length;

  activeStructureNodes.forEach((addr, index) => {
    // El Dummy siempre en el tope (-pi/2)
    const angle = (index * 2 * Math.PI) / len - Math.PI / 2;
    const xPos = centerX + rx * Math.cos(angle);
    const yPos = centerY + ry * Math.sin(angle);
    const node = memorySnapshot[addr];

    positions[addr] = {
      address: addr,
      x: xPos,
      y: yPos,
      data: node.data,
      isDummy: node.isDummy,
      isLeaked: false,
      isActive: activeNodes.includes(addr),
      label: node.isDummy ? 'dummy' : undefined,
    };
  });

  // Calcular posiciones para los nodos huérfanos/leaked en la derecha
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
    } else if (pointers.nuevo === addr) {
      label = 'nuevo';
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

  // Ayudante para obtener puntos de conexión en el borde de los nodos circulares
  const getConnectionPoints = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;

    return {
      sx: x1 + ux * nodeRadius,
      sy: y1 + uy * nodeRadius,
      ex: x2 - ux * nodeRadius,
      ey: y2 - uy * nodeRadius,
    };
  };

  // Obtener la curva orbital elíptica entre dos nodos
  const getCurvedPath = (x1: number, y1: number, x2: number, y2: number, offset: number) => {
    const { sx, sy, ex, ey } = getConnectionPoints(x1, y1, x2, y2);
    const mx = (sx + ex) / 2;
    const my = (sy + ey) / 2;
    const dx = ex - sx;
    const dy = ey - sy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / dist;
    const ny = dx / dist;
    const cx = mx + nx * offset;
    const cy = my + ny * offset;
    return `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;
  };

  // Crear la curva Bezier cúbica (C) para autobucles (self-loops) cuando el nodo apunta a sí mismo
  const getSelfLoopPath = (x: number, y: number, isNext: boolean) => {
    const r = nodeRadius;
    // Ángulos de salida y entrada para la gota del bucle
    // isNext (derecha, horario): salida en -30°, entrada en -60°
    // isPrev (izquierda, antihorario): salida en -150°, entrada en -120°
    const angleStart = isNext ? -Math.PI / 6 : -5 * Math.PI / 6;
    const angleEnd = isNext ? -Math.PI / 3 : -2 * Math.PI / 3;

    const sx = x + r * Math.cos(angleStart);
    const sy = y + r * Math.sin(angleStart);
    const ex = x + r * Math.cos(angleEnd);
    const ey = y + r * Math.sin(angleEnd);

    // Puntos de control lejanos para crear el bucle curvo hacia afuera
    const cx1 = x + r * 2.6 * Math.cos(angleStart);
    const cy1 = y + r * 2.6 * Math.sin(angleStart);
    const cx2 = x + r * 2.6 * Math.cos(angleEnd);
    const cy2 = y + r * 2.6 * Math.sin(angleEnd);

    return `M ${sx} ${sy} C ${cx1} ${cy1} ${cx2} ${cy2} ${ex} ${ey}`;
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

        {/* 1. Línea guía de la órbita circular/elíptica de fondo */}
        <ellipse
          cx={centerX}
          cy={centerY}
          rx={rx}
          ry={ry}
          fill="none"
          stroke="rgba(26, 26, 26, 0.05)"
          strokeWidth="2"
          strokeDasharray="6 6"
        />

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

        {/* 3. Conexiones (Enlaces next y prev, incluyendo autobucles para dummy) */}
        <g>
          {Object.keys(positions).map((addr) => {
            const node = memorySnapshot[addr];
            const pos = positions[addr];
            if (!node || !pos || pos.isLeaked) return null;

            const elements: React.ReactNode[] = [];

            // A. Puntero NEXT (Clockwise / Sólida)
            if (node.next && positions[node.next]) {
              const isSelfLoop = node.next === addr;
              const isLineActive = activeNodes.includes(addr) && activeNodes.includes(node.next);
              const strokeColor = isLineActive ? '#596152' : '#1a1a1a';
              const strokeWidth = isLineActive ? 2.5 : 1.5;

              if (isSelfLoop) {
                // Dibujar autobucle de la derecha
                const pathD = getSelfLoopPath(pos.x, pos.y, true);
                elements.push(
                  <motion.path
                    key={`${addr}-next-self`}
                    d={pathD}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    filter="url(#roughness)"
                    markerEnd={isLineActive ? 'url(#arrow-secondary)' : 'url(#arrow-primary)'}
                  />
                );
              } else {
                // Dibujar curva exterior orbital
                const pathD = getCurvedPath(pos.x, pos.y, positions[node.next].x, positions[node.next].y, 25);
                elements.push(
                  <motion.path
                    key={`${addr}-next-curve`}
                    d={pathD}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    filter="url(#roughness)"
                    markerEnd={isLineActive ? 'url(#arrow-secondary)' : 'url(#arrow-primary)'}
                  />
                );
              }
            }

            // B. Puntero PREV (Counter-Clockwise / Punteada)
            if (node.prev && positions[node.prev]) {
              const isSelfLoop = node.prev === addr;
              const isLineActive = activeNodes.includes(addr) && activeNodes.includes(node.prev);
              const strokeColor = isLineActive ? '#596152' : '#1a1a1a';
              const strokeWidth = isLineActive ? 2.0 : 1.2;

              if (isSelfLoop) {
                // Dibujar autobucle de la izquierda
                const pathD = getSelfLoopPath(pos.x, pos.y, false);
                elements.push(
                  <motion.path
                    key={`${addr}-prev-self`}
                    d={pathD}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray="3 2"
                    filter="url(#roughness)"
                    markerEnd={isLineActive ? 'url(#arrow-secondary)' : 'url(#arrow-primary)'}
                  />
                );
              } else {
                // Dibujar curva interior orbital (punteada)
                const pathD = getCurvedPath(pos.x, pos.y, positions[node.prev].x, positions[node.prev].y, -25);
                elements.push(
                  <motion.path
                    key={`${addr}-prev-curve`}
                    d={pathD}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray="4 2"
                    filter="url(#roughness)"
                    markerEnd={isLineActive ? 'url(#arrow-secondary)' : 'url(#arrow-primary)'}
                  />
                );
              }
            }

            return elements;
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
                const isDummy = pos.isDummy;

                let strokeColor = '#1a1a1a';
                let fillColor = '#fcf9f0';
                let textColor = '#1a1a1a';
                let filterId = 'url(#premium-shadow)';

                if (isDummy) {
                  strokeColor = 'rgba(26, 26, 26, 0.5)';
                  fillColor = '#ebe8df';
                  textColor = 'rgba(26, 26, 26, 0.6)';
                }

                if (isActive) {
                  strokeColor = '#596152';
                  fillColor = '#d8e0cc';
                  textColor = '#1a1a1a';
                  filterId = 'url(#active-shadow)';
                } else if (isLeaked) {
                  strokeColor = '#ba1a1a';
                  fillColor = '#ffdad6';
                  textColor = '#ba1a1a';
                  filterId = 'url(#leak-shadow)';
                }

                // Animación orbital
                // Insert: El nodo vuela desde la derecha (Heap) hasta su posición orbital
                const isNodeInList = activeStructureNodes.includes(addr);
                const initialX = isNodeInList ? pos.x + 60 : pos.x;

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
                      x: isNodeInList ? pos.x - 40 : pos.x,
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
                      strokeWidth={isActive ? 3 : (isDummy ? 1.5 : 2)}
                      strokeDasharray={isDummy ? '4 2' : undefined}
                      filter={filterId}
                      className="cursor-pointer"
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.2 }}
                    />

                    {/* Valor o texto DUM */}
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={textColor}
                      className={`font-serif font-bold ${isDummy ? 'text-xs italic' : 'text-lg'} select-none pointer-events-none`}
                    >
                      {isDummy ? 'DUM' : pos.data}
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

                    {/* Puntero Activo / Dummy Label (arriba del nodo) */}
                    {pos.label && (
                      <g transform={`translate(0, ${-(nodeRadius + 16)})`}>
                        <rect
                          x="-25"
                          y="-8"
                          width="50"
                          height="16"
                          rx="3"
                          fill={isLeaked ? '#ba1a1a' : (isDummy ? '#1a1a1a' : '#596152')}
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
