import React from 'react';
import type { HeapNode } from '../core/types';

interface CanvasProps {
  structureType: 'stack' | 'queue' | 'dll' | 'bst';
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

export const Canvas: React.FC<CanvasProps> = ({
  structureType,
  memorySnapshot,
  pointers,
  activeNodes,
  leakAddresses,
}) => {
  const nodeRadius = 28; // Diameter 56px

  // 1. Identify which nodes are in the active structure vs orphaned/leaked
  const getActiveStructureNodes = (): string[] => {
    const list: string[] = [];
    const visited = new Set<string>();

    if (structureType === 'stack') {
      let curr = pointers.top;
      while (curr && memorySnapshot[curr] && !visited.has(curr)) {
        list.push(curr);
        visited.add(curr);
        curr = memorySnapshot[curr].next || null;
      }
    } else if (structureType === 'queue') {
      let curr = pointers.front;
      while (curr && memorySnapshot[curr] && !visited.has(curr)) {
        list.push(curr);
        visited.add(curr);
        curr = memorySnapshot[curr].next || null;
      }
    } else if (structureType === 'dll') {
      let dummy = pointers.dummy;
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
    } else if (structureType === 'bst') {
      const traverse = (addr: string | null) => {
        if (!addr || !memorySnapshot[addr] || visited.has(addr)) return;
        list.push(addr);
        visited.add(addr);
        traverse(memorySnapshot[addr].left || null);
        traverse(memorySnapshot[addr].right || null);
      };
      traverse(pointers.root);
    }
    return list;
  };

  const activeStructureNodes = getActiveStructureNodes();

  // Position calculation
  const positions: Record<string, NodePosition> = {};
  const canvasWidth = 800;
  const canvasHeight = 500;

  // Calculate coordinates for active structure nodes
  if (structureType === 'stack') {
    const startY = 400;
    const gapY = 60;
    const centerX = 300;

    activeStructureNodes.forEach((addr, index) => {
      positions[addr] = {
        address: addr,
        x: centerX,
        y: startY - index * gapY,
        data: memorySnapshot[addr].data,
        isLeaked: false,
        isActive: activeNodes.includes(addr),
        label: index === 0 ? 'top' : undefined,
      };
    });
  } else if (structureType === 'queue') {
    const startX = 200;
    const gapX = 90;
    const centerY = 250;

    // Display front at the right, rear at the left
    const len = activeStructureNodes.length;
    activeStructureNodes.forEach((addr, index) => {
      // index = 0 is Front (drawn at right), index = len-1 is Rear (drawn at left)
      const xPos = startX + (len - 1 - index) * gapX;
      positions[addr] = {
        address: addr,
        x: xPos,
        y: centerY,
        data: memorySnapshot[addr].data,
        isLeaked: false,
        isActive: activeNodes.includes(addr),
        label: index === 0 ? 'front' : (index === len - 1 ? 'rear' : undefined),
      };
    });
  } else if (structureType === 'dll') {
    const centerX = 350;
    const centerY = 240;
    const rx = 180;
    const ry = 120;
    const len = activeStructureNodes.length;

    activeStructureNodes.forEach((addr, index) => {
      // Angle starting from top (-pi/2)
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
  } else if (structureType === 'bst') {
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

      assignBSTCoords(node.left || null, x - dx, y + 80, dx / 1.7);
      assignBSTCoords(node.right || null, x + dx, y + 80, dx / 1.7);
    };

    assignBSTCoords(rootAddr, 350, 100, 130);
  }

  // Calculate coordinates for Leaked/Orphaned nodes
  // We place leaked/orphaned nodes on a "shelf" at the right side of the canvas
  const allNodeAddresses = Object.keys(memorySnapshot);
  const orphanedAddresses = allNodeAddresses.filter(addr => !positions[addr]);

  const shelfStartX = 620;
  const shelfStartY = 80;
  const shelfGapY = 65;
  const nodesPerColumn = 6;

  orphanedAddresses.forEach((addr, index) => {
    const col = Math.floor(index / nodesPerColumn);
    const row = index % nodesPerColumn;
    const isLeaked = leakAddresses.includes(addr);

    positions[addr] = {
      address: addr,
      x: shelfStartX + col * 75,
      y: shelfStartY + row * shelfGapY,
      data: memorySnapshot[addr].data,
      isDummy: memorySnapshot[addr].isDummy,
      isLeaked,
      isActive: activeNodes.includes(addr),
      label: isLeaked ? 'leak' : 'temp/unlinked',
    };
  });

  // Boundary connection point helper
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

  // Curved paths generator for Doubly Linked List clockwise / counter-clockwise paths
  const getCurvedPath = (x1: number, y1: number, x2: number, y2: number, offset: number) => {
    const { sx, sy, ex, ey } = getConnectionPoints(x1, y1, x2, y2);
    const mx = (sx + ex) / 2;
    const my = (sy + ey) / 2;
    const dx = ex - sx;
    const dy = ey - sy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const cx = mx + nx * offset;
    const cy = my + ny * offset;
    return `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;
  };

  return (
    <div className="flex-1 relative border border-primary/10 bg-surface rounded-DEFAULT overflow-hidden ink-bleed min-h-[480px] w-full select-none">
      {/* SVG Canvas for background borders and connections */}
      <svg
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 5 }}
      >
        <defs>
          <filter id="roughness">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <marker id="arrow-primary" markerWidth="7" markerHeight="7" refX="8" refY="3.5" orient="auto-start-reverse" viewBox="0 0 10 10">
            <path d="M 0 0 L 10 3.5 L 0 7 z" fill="#1a1a1a" filter="url(#roughness)" />
          </marker>
          <marker id="arrow-secondary" markerWidth="7" markerHeight="7" refX="8" refY="3.5" orient="auto-start-reverse" viewBox="0 0 10 10">
            <path d="M 0 0 L 10 3.5 L 0 7 z" fill="#596152" filter="url(#roughness)" />
          </marker>
          <marker id="arrow-error" markerWidth="7" markerHeight="7" refX="8" refY="3.5" orient="auto-start-reverse" viewBox="0 0 10 10">
            <path d="M 0 0 L 10 3.5 L 0 7 z" fill="#ba1a1a" filter="url(#roughness)" />
          </marker>
        </defs>

        {/* 1. Structural Background Outlines */}
        {structureType === 'stack' && (
          // Stack vertical tube shape
          <path
            d="M 230 140 L 230 435 Q 230 440 235 440 L 365 440 Q 370 440 370 435 L 370 140"
            fill="none"
            stroke="rgba(26, 26, 26, 0.15)"
            strokeWidth="3"
            strokeDasharray="4 4"
            filter="url(#roughness)"
          />
        )}
        {structureType === 'queue' && (
          // Queue horizontal pipe shape
          <>
            <line x1="80" y1="210" x2="600" y2="210" stroke="rgba(26, 26, 26, 0.15)" strokeWidth="3" strokeDasharray="4 4" filter="url(#roughness)" />
            <line x1="80" y1="290" x2="600" y2="290" stroke="rgba(26, 26, 26, 0.15)" strokeWidth="3" strokeDasharray="4 4" filter="url(#roughness)" />
          </>
        )}

        {/* 2. Leaked / Orphaned Shelf Area */}
        {orphanedAddresses.length > 0 && (
          <>
            <line x1="580" y1="40" x2="580" y2="460" stroke="rgba(186, 26, 26, 0.2)" strokeWidth="1.5" strokeDasharray="4 2" />
            <text x="690" y="30" textAnchor="middle" className="font-label-caps text-[9px] fill-error/60 tracking-widest uppercase font-bold">
              Zona de Fugas (Leaks)
            </text>
          </>
        )}

        {/* 3. Rendering Edges (Connections) */}
        {Object.keys(positions).map((addr) => {
          const node = memorySnapshot[addr];
          const pos = positions[addr];
          if (!node || !pos || pos.isLeaked) return null;

          // Connections for Stack & Queue (pointing to next)
          if ((structureType === 'stack' || structureType === 'queue') && node.next && positions[node.next]) {
            const targetPos = positions[node.next];
            const { sx, sy, ex, ey } = getConnectionPoints(pos.x, pos.y, targetPos.x, targetPos.y);
            const isLineActive = activeNodes.includes(addr) && activeNodes.includes(node.next);
            
            return (
              <line
                key={`${addr}-next`}
                x1={sx}
                y1={sy}
                x2={ex}
                y2={ey}
                className={`hand-drawn-line ${isLineActive ? 'active' : ''}`}
                markerEnd={isLineActive ? 'url(#arrow-secondary)' : 'url(#arrow-primary)'}
              />
            );
          }

          // Connections for Double Circular Linked List
          if (structureType === 'dll') {
            const elements = [];
            
            // Draw Next Pointer Curve (Clockwise)
            if (node.next && positions[node.next]) {
              const targetPos = positions[node.next];
              const isLineActive = activeNodes.includes(addr) && activeNodes.includes(node.next);
              const pathD = getCurvedPath(pos.x, pos.y, targetPos.x, targetPos.y, 25);
              elements.push(
                <path
                  key={`${addr}-next-curve`}
                  d={pathD}
                  className={`hand-drawn-line ${isLineActive ? 'active' : ''}`}
                  markerEnd={isLineActive ? 'url(#arrow-secondary)' : 'url(#arrow-primary)'}
                />
              );
            }

            // Draw Prev Pointer Curve (Counter-Clockwise)
            if (node.prev && positions[node.prev]) {
              const targetPos = positions[node.prev];
              const isLineActive = activeNodes.includes(addr) && activeNodes.includes(node.prev);
              const pathD = getCurvedPath(pos.x, pos.y, targetPos.x, targetPos.y, -25);
              elements.push(
                <path
                  key={`${addr}-prev-curve`}
                  d={pathD}
                  className={`hand-drawn-line ${isLineActive ? 'active' : ''}`}
                  markerEnd={isLineActive ? 'url(#arrow-secondary)' : 'url(#arrow-primary)'}
                  strokeDasharray="4 2"
                />
              );
            }

            return elements;
          }

          // Connections for Binary Search Tree (left and right branches)
          if (structureType === 'bst') {
            const branches = [];
            
            if (node.left && positions[node.left]) {
              const targetPos = positions[node.left];
              const { sx, sy, ex, ey } = getConnectionPoints(pos.x, pos.y, targetPos.x, targetPos.y);
              const isLineActive = activeNodes.includes(addr) && activeNodes.includes(node.left);
              branches.push(
                <line
                  key={`${addr}-left-branch`}
                  x1={sx}
                  y1={sy}
                  x2={ex}
                  y2={ey}
                  className={`hand-drawn-line ${isLineActive ? 'active' : ''}`}
                  markerEnd={isLineActive ? 'url(#arrow-secondary)' : 'url(#arrow-primary)'}
                />
              );
            }

            if (node.right && positions[node.right]) {
              const targetPos = positions[node.right];
              const { sx, sy, ex, ey } = getConnectionPoints(pos.x, pos.y, targetPos.x, targetPos.y);
              const isLineActive = activeNodes.includes(addr) && activeNodes.includes(node.right);
              branches.push(
                <line
                  key={`${addr}-right-branch`}
                  x1={sx}
                  y1={sy}
                  x2={ex}
                  y2={ey}
                  className={`hand-drawn-line ${isLineActive ? 'active' : ''}`}
                  markerEnd={isLineActive ? 'url(#arrow-secondary)' : 'url(#arrow-primary)'}
                />
              );
            }

            return branches;
          }

          return null;
        })}
      </svg>

      {/* 4. Rendering HTML Nodes (positioned absolutely) */}
      <div className="absolute inset-0 w-full h-full" style={{ zIndex: 10 }}>
        {Object.values(positions).map((pos) => {
          let nodeClass = 'tree-node';
          
          if (pos.isDummy) {
            nodeClass += ' dummy-node';
          }
          if (pos.isActive) {
            nodeClass += ' active-highlight';
          }
          if (pos.isLeaked) {
            nodeClass += ' leak-highlight';
          }

          return (
            <div
              key={pos.address}
              style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                transform: 'translate(-50%, -50%)',
              }}
              className={`absolute cursor-pointer flex flex-col items-center ${nodeClass}`}
              title={`Dirección: ${pos.address}`}
            >
              {/* Node Data */}
              <span className="font-semibold select-none">
                {pos.isDummy ? 'DUM' : pos.data}
              </span>

              {/* Virtual Address (Floating Marginalia Label) */}
              <div 
                className="absolute top-[60px] font-annotation text-[10px] text-on-surface-variant bg-surface-bright/90 px-1 py-0.2 border border-primary/10 rounded-sm font-bold font-mono tracking-tighter"
              >
                {pos.address}
              </div>

              {/* Variable Pointers Highlight (top, front, rear, etc.) */}
              {pos.label && (
                <div 
                  className={`absolute bottom-[60px] font-label-caps text-[9px] px-2 py-0.5 rounded-sm tracking-wider uppercase font-bold ${
                    pos.isLeaked 
                      ? 'bg-error text-on-error' 
                      : 'bg-primary text-on-primary'
                  }`}
                >
                  {pos.label}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
