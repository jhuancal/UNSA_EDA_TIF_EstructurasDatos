import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HeapNode } from '../core/types';

interface StackCanvasProps {
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

export const StackCanvas: React.FC<StackCanvasProps> = ({
  memorySnapshot,
  pointers,
  activeNodes,
  leakAddresses,
}) => {
  const nodeRadius = 28; // Diámetro 56px
  const canvasWidth = 800;
  const canvasHeight = 500;

  // 1. Obtener nodos de la estructura activa (Stack) siguiendo el puntero 'top'
  const getActiveStructureNodes = (): string[] => {
    const list: string[] = [];
    const visited = new Set<string>();
    let curr = pointers.top;

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

  // Posicionamiento de la pila:
  // Queremos que los nodos se apilen verticalmente.
  // El nodo más antiguo abajo (y alto), el nodo más nuevo ('top') arriba (y bajo).
  // centerX = 300
  // startY = 400 (base del tubo)
  // gapY = 75 (suficiente espacio para que no se superpongan)
  const centerX = 300;
  const startY = 400;
  const gapY = 90; // Incrementado para separar más los nodos y ver las etiquetas de puntero/dirección sin traslapes

  activeStructureNodes.forEach((addr, index) => {
    // index = 0 es 'top' (debe dibujarse arriba en la pila)
    // El orden de la lista es: top -> top.next -> top.next.next...
    // Así que index = 0 es el tope, index = len - 1 es la base.
    // Queremos que la base esté en startY, y el tope vaya subiendo.
    const len = activeStructureNodes.length;
    const positionInStackFromBase = len - 1 - index;
    const yPos = startY - positionInStackFromBase * gapY;

    positions[addr] = {
      address: addr,
      x: centerX,
      y: yPos,
      data: memorySnapshot[addr].data,
      isLeaked: false,
      isActive: activeNodes.includes(addr),
      label: index === 0 ? 'top' : undefined,
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

  // Ayudante para calcular puntos de conexión en el borde del nodo
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
          {/* Sombras premium para los nodos */}
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

        {/* 1. Contenedor de la Pila (Tubo vertical punteado) */}
        <path
          d="M 240 100 L 240 445 Q 240 450 245 450 L 355 450 Q 360 450 360 445 L 360 100"
          fill="none"
          stroke="rgba(26, 26, 26, 0.15)"
          strokeWidth="3"
          strokeDasharray="5 5"
          filter="url(#roughness)"
        />

        {/* 2. Zona de Fugas (Leaks) */}
        {orphanedAddresses.length > 0 && (
          <g>
            <line
              x1="550"
              y1="40"
              x2="550"
              y2="460"
              stroke="rgba(186, 26, 26, 0.2)"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
            <text
              x="675"
              y="35"
              textAnchor="middle"
              className="font-mono text-[9px] fill-error/70 tracking-widest uppercase font-bold"
            >
              Zona de Fugas (Leaks)
            </text>
          </g>
        )}

        {/* 3. Renderizar las conexiones (Flechas de enlace) con animación */}
        <g>
          {activeStructureNodes.map((addr) => {
            const node = memorySnapshot[addr];
            const pos = positions[addr];
            if (!node || !pos || !node.next || !positions[node.next]) return null;

            const targetPos = positions[node.next];
            const pts = getConnectionPoints(pos.x, pos.y, targetPos.x, targetPos.y);
            const isLineActive = activeNodes.includes(addr) && activeNodes.includes(node.next);

            return (
              <motion.line
                key={`arrow-${addr}-to-${node.next}`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                x1={pts.sx}
                y1={pts.sy}
                x2={pts.ex}
                y2={pts.ey}
                stroke={isLineActive ? '#596152' : '#1a1a1a'}
                strokeWidth={isLineActive ? 2.5 : 1.5}
                strokeLinecap="round"
                filter="url(#roughness)"
                markerEnd={isLineActive ? 'url(#arrow-secondary)' : 'url(#arrow-primary)'}
              />
            );
          })}
        </g>

        {/* 4. Renderizar los Nodos interactivos en SVG usando Framer Motion */}
        <g>
          <AnimatePresence>
            {Object.entries(positions)
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([addr, pos]) => {
              const isActive = pos.isActive;
              const isLeaked = pos.isLeaked;

              // Determinar estilos de color
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

              // Definir la animación del nodo
              // Push: Aparece cayendo desde arriba (si está en la pila activa) o hace fade
              // Pop: Sale hacia arriba y se desvanece
              const isNodeInStack = activeStructureNodes.includes(addr);
              const initialY = isNodeInStack ? pos.y - 80 : pos.y;
              const initialScale = 0.4;

              return (
                <motion.g
                  key={addr}
                  layoutId={`node-group-${addr}`}
                  layout
                  initial={{
                    x: isNodeInStack ? centerX : pos.x,
                    y: initialY,
                    opacity: 0,
                    scale: initialScale,
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
                    y: isNodeInStack ? pos.y - 60 : pos.y,
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

                  {/* Valor del Nodo (Centrado) */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={textColor}
                    className="font-serif font-bold text-lg select-none pointer-events-none"
                  >
                    {pos.data}
                  </text>

                  {/* Dirección Virtual (Etiqueta Flotante Abajo) */}
                  <g transform={`translate(0, ${nodeRadius + 14})`}>
                    {/* Fondo redondeado para dirección */}
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

                  {/* Puntero Activo / Etiqueta de Fuga (Etiqueta Flotante Arriba) */}
                  {pos.label && (
                    <g transform={`translate(0, ${-(nodeRadius + 16)})`}>
                      {/* Fondo de la etiqueta */}
                      <rect
                        x="-22"
                        y="-8"
                        width="44"
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
