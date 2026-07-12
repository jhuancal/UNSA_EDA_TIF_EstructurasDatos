import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HeapNode } from '../core/types';

interface BSTCanvasProps {
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

interface Branch {
  fromAddr: string;
  toAddr: string;
  isLeft: boolean;
}

export const BSTCanvas: React.FC<BSTCanvasProps> = ({
  memorySnapshot,
  pointers,
  activeNodes,
  leakAddresses,
}) => {
  const nodeRadius = 28; // Diámetro 56px
  const canvasWidth = 800;
  const canvasHeight = 500;

  // Calcular las posiciones de los nodos recursivamente
  const positions: Record<string, NodePosition> = {};
  const rootAddr = pointers.root;

  const assignBSTCoords = (addr: string | null, x: number, y: number, dx: number) => {
    if (!addr || !memorySnapshot[addr]) return;

    const node = memorySnapshot[addr];
    positions[addr] = {
      address: addr,
      x,
      y,
      data: node.data,
      isLeaked: false,
      isActive: activeNodes.includes(addr),
      label: addr === rootAddr ? 'root' : undefined,
    };

    // Separación vertical de 90px por nivel, factor de reducción dx de 1.8
    assignBSTCoords(node.left || null, x - dx, y + 90, dx / 1.8);
    assignBSTCoords(node.right || null, x + dx, y + 90, dx / 1.8);
  };

  // Posicionar la raíz centrada arriba
  assignBSTCoords(rootAddr, 400, 70, 160);

  // Calcular posiciones para los nodos huérfanos/fugados (Leaks) en la zona de la derecha
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
    } else if (pointers.pred === addr) {
      label = 'pred';
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

  // Obtener la lista de todas las ramas/conexiones activas en el árbol
  const getBranches = (): Branch[] => {
    const list: Branch[] = [];
    const visited = new Set<string>();

    const traverse = (addr: string | null) => {
      if (!addr || !memorySnapshot[addr] || visited.has(addr)) return;
      visited.add(addr);

      const node = memorySnapshot[addr];
      if (node.left && memorySnapshot[node.left]) {
        list.push({ fromAddr: addr, toAddr: node.left, isLeft: true });
        traverse(node.left);
      }
      if (node.right && memorySnapshot[node.right]) {
        list.push({ fromAddr: addr, toAddr: node.right, isLeft: false });
        traverse(node.right);
      }
    };

    traverse(rootAddr);
    return list;
  };

  const branches = getBranches();

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

        {/* 1. Zona de Fugas (Leaks) */}
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

        {/* 2. Renderizar Ramas (Ramas Izquierda/Derecha con etiquetas L/R y dibujo progresivo) */}
        <g>
          {branches.map((b) => {
            const parentPos = positions[b.fromAddr];
            const childPos = positions[b.toAddr];
            if (!parentPos || !childPos) return null;

            const pts = getConnectionPoints(parentPos.x, parentPos.y, childPos.x, childPos.y);
            const isLineActive = activeNodes.includes(b.fromAddr) && activeNodes.includes(b.toAddr);

            // Calcular el punto medio para poner la etiqueta L o R
            const midX = (parentPos.x + childPos.x) / 2;
            const midY = (parentPos.y + childPos.y) / 2;
            // Desplazar la etiqueta a un lado para que no pise la línea
            const labelOffsetX = b.isLeft ? -12 : 12;

            return (
              <g key={`branch-${b.fromAddr}-to-${b.toAddr}`}>
                {/* Línea de la rama */}
                <motion.line
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
                
                {/* Etiqueta L / R en el medio */}
                <motion.text
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  transition={{ delay: 0.2 }}
                  x={midX + labelOffsetX}
                  y={midY - 4}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="font-mono text-[9px] font-extrabold fill-primary select-none pointer-events-none"
                >
                  {b.isLeft ? 'L' : 'R'}
                </motion.text>
              </g>
            );
          })}
        </g>

        {/* 3. Renderizar Nodos en SVG con Framer Motion */}
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



                return (
                  <motion.g
                    key={addr}
                    layoutId={`node-group-${addr}`}
                    layout
                    initial={{
                      x: pos.x,
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
                          x="-25"
                          y="-8"
                          width="50"
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
