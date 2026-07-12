import React from 'react';
import type { HeapNode } from '../core/types';

interface HeapViewerProps {
  memory: Record<string, HeapNode>;
  leakAddresses: string[];
  activeNodes: string[];
  structureType: 'stack' | 'queue' | 'dll' | 'bst';
}

export const HeapViewer: React.FC<HeapViewerProps> = ({
  memory,
  leakAddresses,
  activeNodes,
  structureType,
}) => {
  const addresses = Object.keys(memory).sort((a, b) => parseInt(a, 16) - parseInt(b, 16));
  const activeCount = addresses.length - leakAddresses.length;
  const leakCount = leakAddresses.length;

  return (
    <div className="flex flex-col h-full bg-surface-container-low border border-primary/10 p-6 rounded-DEFAULT">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-primary/10">
        <div>
          <h3 className="font-headline-md text-headline-md text-primary">Heap Virtual (Memoria)</h3>
          <p className="font-annotation text-annotation text-on-surface-variant text-xs">Simulación de bloques de memoria física en C++</p>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <span className="block font-label-caps text-[10px] text-on-surface-variant tracking-wider uppercase">Activos</span>
            <span className="font-headline-md text-secondary font-bold">{activeCount}</span>
          </div>
          <div className="text-right border-l border-primary/10 pl-4">
            <span className="block font-label-caps text-[10px] text-on-surface-variant tracking-wider uppercase">Fugas (Leaks)</span>
            <span className={`font-headline-md font-bold ${leakCount > 0 ? 'text-error animate-pulse' : 'text-primary'}`}>{leakCount}</span>
          </div>
        </div>
      </div>

      {/* Heap Table */}
      <div className="flex-1 overflow-y-auto max-h-[300px] border border-primary/10 bg-surface rounded-DEFAULT">
        {addresses.length === 0 ? (
          <div className="flex items-center justify-center h-32 italic text-on-surface-variant/60 font-body-md text-sm">
            Heap vacío. Inserta elementos para asignar memoria.
          </div>
        ) : (
          <table className="w-full text-left font-annotation text-sm border-collapse">
            <thead>
              <tr className="bg-surface-container-high border-b border-primary/20 font-label-caps text-[10px] tracking-wider uppercase text-on-surface-variant">
                <th className="p-2 border-r border-primary/10">Dirección</th>
                <th className="p-2 border-r border-primary/10">Dato</th>
                <th className="p-2">Enlaces (Punteros)</th>
              </tr>
            </thead>
            <tbody>
              {addresses.map((addr) => {
                const node = memory[addr];
                const isLeaked = leakAddresses.includes(addr);
                const isActive = activeNodes.includes(addr);

                let bgClass = 'bg-surface hover:bg-surface-container-low';
                if (isLeaked) bgClass = 'bg-error-container/40 text-error';
                else if (isActive) bgClass = 'bg-secondary-container/40';

                return (
                  <tr
                    key={addr}
                    className={`border-b border-primary/10 transition-colors ${bgClass}`}
                  >
                    {/* Address column */}
                    <td className="p-2 font-mono font-bold border-r border-primary/10">
                      <div className="flex items-center gap-1">
                        <span>{addr}</span>
                        {isLeaked && (
                          <span className="px-1.5 py-0.2 font-label-caps text-[8px] bg-error text-on-error rounded-DEFAULT uppercase tracking-widest font-bold">
                            LEAK
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Data column */}
                    <td className="p-2 border-r border-primary/10">
                      {node.isDummy ? (
                        <span className="italic text-on-surface-variant/60 text-xs">Nodo Dummy</span>
                      ) : (
                        <span className="font-body-md font-bold">{node.data}</span>
                      )}
                    </td>

                    {/* Links column */}
                    <td className="p-2 font-mono text-xs text-on-surface-variant">
                      {structureType === 'bst' ? (
                        <div className="flex gap-4">
                          <span>izq: <strong className="text-primary">{node.left || 'NULL'}</strong></span>
                          <span>der: <strong className="text-primary">{node.right || 'NULL'}</strong></span>
                        </div>
                      ) : (
                        <div className="flex gap-4">
                          <span>next: <strong className="text-primary">{node.next || 'NULL'}</strong></span>
                          {node.prev !== undefined && (
                            <span>prev: <strong className="text-primary">{node.prev || 'NULL'}</strong></span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Educational Explanation Box */}
      <div className="mt-4 p-4 border border-primary/10 bg-surface-container rounded-DEFAULT text-xs leading-relaxed text-on-surface-variant">
        {leakCount > 0 ? (
          <div className="flex gap-3">
            <span className="material-symbols-outlined text-error flex-shrink-0 text-[20px]">warning</span>
            <div>
              <p className="font-bold text-error mb-1">¡Advertencia de Fuga de Memoria (Memory Leak)!</p>
              <p>
                Hay <strong>{leakCount}</strong> nodo(s) desconectado(s) de la estructura pero aún ocupando espacio en el Heap virtual.
                En C++, al desvincular un nodo sin llamar explícitamente a <code className="font-mono text-error font-bold">delete node;</code>, 
                ese espacio queda reservado de forma permanente. Si continúas insertando elementos sin liberar la memoria,
                el simulador podría saturar el Heap simulando un <strong className="text-error">Out of Memory</strong>.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <span className="material-symbols-outlined text-secondary flex-shrink-0 text-[20px]">info</span>
            <div>
              <p className="font-bold text-secondary mb-1">Control de Asignación en C++</p>
              <p>
                Cada nodo en el simulador es instanciado mediante un operador equivalente a <code className="font-mono bg-surface px-1">new Node()</code>.
                Esto asigna una dirección física simulada en el Heap. 
                Si desactivas la gestión manual del delete, observarás cómo los nodos huérfanos se quedan estancados consumiendo memoria.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
