import React, { useState } from 'react';

interface SidebarProps {
  structureType: 'stack' | 'queue' | 'dll' | 'bst';
  onOperation: (opType: string, val?: number) => void;
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onReset: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  explanation: string;
  complexity: string;
  activePointers: Record<string, string | null>;
  deleteEnabled: boolean;
  onDeleteToggle: (enabled: boolean) => void;
  totalHeapNodes: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  structureType,
  onOperation,
  currentStep,
  totalSteps,
  isPlaying,
  onPlayPause,
  onStepForward,
  onStepBackward,
  onReset,
  speed,
  onSpeedChange,
  explanation,
  complexity,
  activePointers,
  deleteEnabled,
  onDeleteToggle,
  totalHeapNodes,
}) => {
  const [inputValue, setInputValue] = useState<string>('');

  const handleOp = (opType: string) => {
    const val = inputValue !== '' ? parseInt(inputValue, 10) : undefined;
    if (val !== undefined && isNaN(val)) return;
    onOperation(opType, val);
    setInputValue('');
  };

  const getTitle = () => {
    switch (structureType) {
      case 'stack':
        return { name: 'Pila (Stack)', detail: 'LIFO (Last In, First Out)' };
      case 'queue':
        return { name: 'Cola (Queue)', detail: 'FIFO (First In, First Out)' };
      case 'dll':
        return { name: 'Lista Doble Circular', detail: 'con Nodo Dummy' };
      case 'bst':
        return { name: 'Árbol BST', detail: 'Binary Search Tree' };
    }
  };

  const titleInfo = getTitle();

  return (
    <aside className="w-80 h-full border-l border-primary/10 bg-surface-container-low flex flex-col flex-shrink-0 z-20 overflow-hidden">
      {/* Title */}
      <div className="p-6 border-b border-primary/10">
        <h2 className="font-headline-md text-headline-md text-primary leading-tight">{titleInfo.name}</h2>
        <p className="font-annotation text-annotation text-on-surface-variant text-xs mt-1">{titleInfo.detail}</p>
      </div>

      <div className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto">
        {/* Operations Inputs */}
        <div className="flex flex-col gap-4">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant tracking-wider uppercase">Operaciones</h3>
          
          <div className="flex flex-col gap-2">
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ingresa un número..."
              className="w-full bg-transparent border-b border-primary/30 focus:border-primary outline-none py-1 font-body-md text-primary placeholder:text-on-surface-variant/40 rounded-none h-10 px-0 focus:ring-0 text-lg transition-colors"
            />
            
            {structureType === 'stack' && (
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={() => handleOp('push')}
                  disabled={inputValue === ''}
                  className="h-10 px-3 ink-border hover:bg-secondary-container hover:text-on-secondary-container disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-primary transition-colors flex items-center justify-center gap-1.5 text-primary font-annotation text-xs bg-surface"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Push (Apilar)
                </button>
                <button
                  onClick={() => handleOp('pop')}
                  className="h-10 px-3 ink-border hover:bg-error-container hover:text-on-error-container transition-colors flex items-center justify-center gap-1.5 text-primary font-annotation text-xs bg-surface"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  Pop (Desapilar)
                </button>
              </div>
            )}

            {structureType === 'queue' && (
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={() => handleOp('enqueue')}
                  disabled={inputValue === ''}
                  className="h-10 px-3 ink-border hover:bg-secondary-container hover:text-on-secondary-container disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-primary transition-colors flex items-center justify-center gap-1.5 text-primary font-annotation text-xs bg-surface"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Enqueue
                </button>
                <button
                  onClick={() => handleOp('dequeue')}
                  className="h-10 px-3 ink-border hover:bg-error-container hover:text-on-error-container transition-colors flex items-center justify-center gap-1.5 text-primary font-annotation text-xs bg-surface"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  Dequeue
                </button>
              </div>
            )}

            {structureType === 'dll' && (
              <div className="flex flex-col gap-2 mt-1">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleOp('insertFront')}
                    disabled={inputValue === ''}
                    className="h-10 px-2 ink-border hover:bg-secondary-container hover:text-on-secondary-container disabled:opacity-40 transition-colors flex items-center justify-center gap-1 text-primary font-annotation text-[11px] bg-surface"
                  >
                    <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                    Ins. Inicio
                  </button>
                  <button
                    onClick={() => handleOp('insertBack')}
                    disabled={inputValue === ''}
                    className="h-10 px-2 ink-border hover:bg-secondary-container hover:text-on-secondary-container disabled:opacity-40 transition-colors flex items-center justify-center gap-1 text-primary font-annotation text-[11px] bg-surface"
                  >
                    <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                    Ins. Final
                  </button>
                </div>
                <button
                  onClick={() => handleOp('remove')}
                  disabled={inputValue === ''}
                  className="w-full h-10 px-3 ink-border hover:bg-error-container hover:text-on-error-container disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5 text-primary font-annotation text-xs bg-surface"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  Eliminar Valor
                </button>
              </div>
            )}

            {structureType === 'bst' && (
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={() => handleOp('insert')}
                  disabled={inputValue === ''}
                  className="h-10 px-3 ink-border hover:bg-secondary-container hover:text-on-secondary-container disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5 text-primary font-annotation text-xs bg-surface"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Insertar
                </button>
                <button
                  onClick={() => handleOp('remove')}
                  disabled={inputValue === ''}
                  className="h-10 px-3 ink-border hover:bg-error-container hover:text-on-error-container disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5 text-primary font-annotation text-xs bg-surface"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Playback Controls */}
        {totalSteps > 0 && (
          <div className="flex flex-col gap-3 p-4 bg-surface border border-primary/10 rounded-DEFAULT">
            <h4 className="font-label-caps text-[10px] text-on-surface-variant/70 tracking-wider uppercase">Control de Animación</h4>
            <div className="flex items-center justify-between">
              <button
                onClick={onStepBackward}
                disabled={currentStep === 0}
                className="p-1 text-primary hover:bg-primary/5 rounded disabled:opacity-30"
                title="Paso Anterior"
              >
                <span className="material-symbols-outlined text-[24px]">skip_previous</span>
              </button>
              <button
                onClick={onPlayPause}
                className="w-10 h-10 ink-border flex items-center justify-center rounded-full hover:bg-secondary-container hover:text-on-secondary-container text-primary bg-surface transition-colors"
                title={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                <span className="material-symbols-outlined text-[24px]">
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>
              <button
                onClick={onStepForward}
                disabled={currentStep === totalSteps - 1}
                className="p-1 text-primary hover:bg-primary/5 rounded disabled:opacity-30"
                title="Paso Siguiente"
              >
                <span className="material-symbols-outlined text-[24px]">skip_next</span>
              </button>
              <button
                onClick={onReset}
                className="p-1 text-primary hover:bg-primary/5 rounded"
                title="Reiniciar Simulación"
              >
                <span className="material-symbols-outlined text-[22px]">replay</span>
              </button>
            </div>
            
            {/* Speed slider */}
            <div className="mt-2">
              <div className="flex justify-between font-annotation text-[10px] text-on-surface-variant">
                <span>Velocidad</span>
                <span>{speed}ms</span>
              </div>
              <input
                type="range"
                min="300"
                max="2500"
                step="100"
                value={speed}
                onChange={(e) => onSpeedChange(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-secondary"
              />
            </div>
            
            {/* Progress bar */}
            <div className="mt-1 flex items-center justify-between font-annotation text-xs text-on-surface-variant">
              <span>Progreso:</span>
              <span className="font-bold">
                Paso {currentStep + 1} / {totalSteps}
              </span>
            </div>
          </div>
        )}

        {/* Algorithm Explanation Panel */}
        <div className="flex flex-col gap-3 mt-auto border-t border-primary/10 pt-4">
          <div className="flex justify-between items-center">
            <h3 className="font-label-caps text-label-caps text-on-surface-variant tracking-wider uppercase">Explicación Paso a Paso</h3>
            <span className="font-annotation text-xs bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded font-bold">
              Complejidad: {complexity}
            </span>
          </div>

          <div className="font-body-md text-sm text-primary p-4 ink-border bg-surface relative min-h-[120px] flex flex-col justify-between">
            <div className="absolute -left-2 top-4 w-4 h-4 rounded-full bg-secondary-container border border-secondary"></div>
            
            <p className="text-on-surface leading-relaxed mb-4">
              {explanation || 'Inicializa una operación de inserción o eliminación para comenzar el análisis didáctico.'}
            </p>

            {/* Render pointers values */}
            {Object.keys(activePointers).length > 0 && (
              <div className="bg-surface-container p-2.5 rounded font-annotation text-xs text-on-surface border border-primary/10">
                <div className="font-bold text-[10px] text-on-surface-variant uppercase tracking-wider mb-1.5 border-b border-primary/5 pb-0.5">Punteros Activos</div>
                <div className="flex flex-col gap-1">
                  {Object.entries(activePointers).map(([name, addr]) => (
                    <div key={name} className="flex justify-between">
                      <span className="opacity-70 font-mono italic">{name}:</span>
                      <span className="font-bold font-mono text-primary">{addr || 'NULL'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* C++ Settings: Leak and Heap limits */}
        <div className="border-t border-primary/10 pt-4 flex flex-col gap-3">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant tracking-wider uppercase">Gestión de Memoria C++</h3>
          
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex flex-col pr-2">
              <span className="font-annotation text-xs font-bold text-primary">Simular delete en memoria</span>
              <span className="font-annotation text-[10px] text-on-surface-variant leading-tight">
                {deleteEnabled 
                  ? 'Libera el nodo inmediatamente (correcto)' 
                  : 'Desactiva el borrado para causar leaks'}
              </span>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={deleteEnabled}
                onChange={(e) => onDeleteToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-primary after:border-primary after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary"></div>
            </div>
          </label>

          {/* Heap warning */}
          {totalHeapNodes > 12 && (
            <div className="p-3 bg-error-container/20 border border-error/20 text-error rounded-DEFAULT font-annotation text-xs flex gap-2">
              <span className="material-symbols-outlined text-[16px]">warning</span>
              <div>
                <strong className="block mb-0.5">¡Heap virtual congestionado!</strong>
                El heap tiene {totalHeapNodes} nodos. En C++ esto podría causar un desborde si continúas acumulando leaks. ¡Usa 'delete' para desocupar memoria!
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
