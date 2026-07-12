import { useState, useEffect } from 'react';
import { StackSimulator } from './core/Stack';
import { QueueSimulator } from './core/Queue';
import { DLListSimulator } from './core/DLList';
import { BSTSimulator } from './core/BST';
import { VirtualHeap } from './core/VirtualHeap';
import { Sidebar } from './components/Sidebar';
import { Canvas } from './components/Canvas';
import { CodeLog } from './components/CodeLog';
import { HeapViewer } from './components/HeapViewer';
import type { SimulationStep } from './core/types';

function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'stack' | 'queue' | 'dll' | 'bst'>('home');
  const [steps, setSteps] = useState<SimulationStep[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1000);
  const [deleteEnabled, setDeleteEnabled] = useState<boolean>(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Instantiated simulators (kept stable across renders)
  const [stackSim] = useState(() => new StackSimulator());
  const [queueSim] = useState(() => new QueueSimulator());
  const [dllSim] = useState(() => new DLListSimulator());
  const [bstSim] = useState(() => new BSTSimulator());

  // Autoplay intervals
  useEffect(() => {
    let intervalId: any = null;
    if (isPlaying && steps.length > 0 && currentStepIdx < steps.length - 1) {
      intervalId = setInterval(() => {
        setCurrentStepIdx((prev) => {
          if (prev < steps.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, speed);
    } else {
      setIsPlaying(false);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPlaying, steps, currentStepIdx, speed]);

  const handleTabChange = (tab: 'home' | 'stack' | 'queue' | 'dll' | 'bst') => {
    setActiveTab(tab);
    setIsPlaying(false);
    setSteps([]);
    setCurrentStepIdx(-1);
    setIsMobileMenuOpen(false);

    const h = VirtualHeap.getInstance();
    h.clear();
    h.setEnabledDelete(deleteEnabled);

    if (tab === 'stack') {
      stackSim.clear();
      setLogs(['// Pila (Stack) LIFO iniciada']);
    } else if (tab === 'queue') {
      queueSim.clear();
      setLogs(['// Cola (Queue) FIFO iniciada']);
    } else if (tab === 'dll') {
      dllSim.clear();
      setLogs([
        '// Lista Doble Circular iniciada con centinela',
        `dummy_node = ${dllSim.getDummyAddr()}`,
      ]);
    } else if (tab === 'bst') {
      bstSim.clear();
      setLogs(['// Árbol Binario de Búsqueda iniciado']);
    } else {
      setLogs([]);
    }
  };

  const handleResetStructure = () => {
    setIsPlaying(false);
    setSteps([]);
    setCurrentStepIdx(-1);

    const h = VirtualHeap.getInstance();
    h.clear();

    if (activeTab === 'stack') {
      stackSim.clear();
      setLogs(['// Pila reinicializada']);
    } else if (activeTab === 'queue') {
      queueSim.clear();
      setLogs(['// Cola reinicializada']);
    } else if (activeTab === 'dll') {
      dllSim.clear();
      setLogs([
        '// Lista Doble Circular reinicializada',
        `dummy_node = ${dllSim.getDummyAddr()}`,
      ]);
    } else if (activeTab === 'bst') {
      bstSim.clear();
      setLogs(['// Árbol Binario de Búsqueda vaciado']);
    }
  };

  const handleOperation = (opType: string, val?: number) => {
    setIsPlaying(false);
    let newSteps: SimulationStep[] = [];
    let logMsg = '';

    const h = VirtualHeap.getInstance();
    h.setEnabledDelete(deleteEnabled);

    if (activeTab === 'stack') {
      if (opType === 'push' && val !== undefined) {
        newSteps = stackSim.generatePushSteps(val);
        logMsg = `push(${val})`;
      } else if (opType === 'pop') {
        newSteps = stackSim.generatePopSteps();
        logMsg = `pop()`;
      }
    } else if (activeTab === 'queue') {
      if (opType === 'enqueue' && val !== undefined) {
        newSteps = queueSim.generateEnqueueSteps(val);
        logMsg = `enqueue(${val})`;
      } else if (opType === 'dequeue') {
        newSteps = queueSim.generateDequeueSteps();
        logMsg = `dequeue()`;
      }
    } else if (activeTab === 'dll') {
      if (opType === 'insertFront' && val !== undefined) {
        newSteps = dllSim.generateInsertFrontSteps(val);
        logMsg = `insertFront(${val})`;
      } else if (opType === 'insertBack' && val !== undefined) {
        newSteps = dllSim.generateInsertBackSteps(val);
        logMsg = `insertBack(${val})`;
      } else if (opType === 'remove' && val !== undefined) {
        newSteps = dllSim.generateRemoveSteps(val);
        logMsg = `removeValue(${val})`;
      }
    } else if (activeTab === 'bst') {
      if (opType === 'insert' && val !== undefined) {
        newSteps = bstSim.generateInsertSteps(val);
        logMsg = `insert(${val})`;
      } else if (opType === 'remove' && val !== undefined) {
        newSteps = bstSim.generateRemoveSteps(val);
        logMsg = `remove(${val})`;
      }
    }

    if (newSteps.length > 0) {
      setSteps(newSteps);
      setCurrentStepIdx(0);
      setLogs((prev) => [...prev, logMsg]);

      // Trigger automatic play after setting steps
      setTimeout(() => {
        setIsPlaying(true);
      }, 50);
    }
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    }
  };

  const handleStepBackward = () => {
    setIsPlaying(false);
    if (currentStepIdx > 0) {
      setCurrentStepIdx((prev) => prev - 1);
    }
  };

  const handleDeleteToggle = (enabled: boolean) => {
    setDeleteEnabled(enabled);
    VirtualHeap.getInstance().setEnabledDelete(enabled);
  };

  // Get active state representing the current frame of the simulation
  const getCurrentState = (): SimulationStep => {
    if (currentStepIdx >= 0 && currentStepIdx < steps.length) {
      return steps[currentStepIdx];
    }

    // Return default state before any actions are executed
    const h = VirtualHeap.getInstance();
    const snapshot = h.getMemorySnapshot();

    switch (activeTab) {
      case 'stack':
        return {
          step: 0,
          operation: 'Pila vacía inicializada en memoria. Usa la operación PUSH para apilar elementos.',
          memorySnapshot: {},
          pointers: { top: stackSim.getTopPtr() },
          activeNodes: [],
          complexity: 'O(1)',
          leakAddresses: [],
        };
      case 'queue':
        return {
          step: 0,
          operation: 'Cola vacía inicializada en memoria. Usa la operación ENQUEUE para encolar elementos.',
          memorySnapshot: {},
          pointers: { front: queueSim.getFrontPtr(), rear: queueSim.getRearPtr() },
          activeNodes: [],
          complexity: 'O(1)',
          leakAddresses: [],
        };
      case 'dll':
        return {
          step: 0,
          operation: `Lista circular doblemente enlazada inicializada con un Nodo Dummy (centinela) en ${dllSim.getDummyAddr()}. Observa que se apunta a sí mismo (next y prev).`,
          memorySnapshot: snapshot,
          pointers: { dummy: dllSim.getDummyAddr() },
          activeNodes: [],
          complexity: 'O(1)',
          leakAddresses: [],
        };
      case 'bst':
        return {
          step: 0,
          operation: 'Árbol Binario de Búsqueda vacío inicializado en memoria. Usa la operación INSERTAR para añadir ramas.',
          memorySnapshot: {},
          pointers: { root: bstSim.getRoot() },
          activeNodes: [],
          complexity: 'O(log n)',
          leakAddresses: [],
        };
      default:
        return {
          step: 0,
          operation: '',
          memorySnapshot: {},
          pointers: {},
          activeNodes: [],
          complexity: '',
          leakAddresses: [],
        };
    }
  };

  const currentFrame = getCurrentState();
  const heapNodeCount = Object.keys(currentFrame.memorySnapshot).length;

  return (
    <div className="bg-surface text-on-surface paper-texture min-h-screen flex selection:bg-secondary-container selection:text-on-secondary-container antialiased">
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex w-80 h-screen sticky left-0 top-0 border-r border-primary/20 bg-surface flex-col py-canvas-padding flex-shrink-0">
        <div className="px-gutter mb-12 cursor-pointer" onClick={() => handleTabChange('home')}>
          <h1 className="font-headline-md text-headline-md font-semibold text-primary tracking-tight">Proyecto 2026A</h1>
          <p className="font-annotation text-annotation text-on-surface-variant mt-1.5">Visualizador de Estructuras</p>
        </div>
        <nav className="flex-1 px-gutter space-y-3">
          <button
            onClick={() => handleTabChange('home')}
            className={`w-full flex items-center space-x-4 p-3 rounded-DEFAULT transition-all duration-300 font-body-md text-body-md ${
              activeTab === 'home'
                ? 'text-primary border-r-2 border-primary bg-surface-container-low font-bold'
                : 'text-on-surface-variant opacity-60 hover:opacity-100 hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">home</span>
            <span>Inicio</span>
          </button>
          <button
            onClick={() => handleTabChange('stack')}
            className={`w-full flex items-center space-x-4 p-3 rounded-DEFAULT transition-all duration-300 font-body-md text-body-md ${
              activeTab === 'stack'
                ? 'text-primary border-r-2 border-primary bg-surface-container-low font-bold'
                : 'text-on-surface-variant opacity-60 hover:opacity-100 hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">layers</span>
            <span>Pila (Stack)</span>
          </button>
          <button
            onClick={() => handleTabChange('queue')}
            className={`w-full flex items-center space-x-4 p-3 rounded-DEFAULT transition-all duration-300 font-body-md text-body-md ${
              activeTab === 'queue'
                ? 'text-primary border-r-2 border-primary bg-surface-container-low font-bold'
                : 'text-on-surface-variant opacity-60 hover:opacity-100 hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">queue</span>
            <span>Cola (Queue)</span>
          </button>
          <button
            onClick={() => handleTabChange('dll')}
            className={`w-full flex items-center space-x-4 p-3 rounded-DEFAULT transition-all duration-300 font-body-md text-body-md ${
              activeTab === 'dll'
                ? 'text-primary border-r-2 border-primary bg-surface-container-low font-bold'
                : 'text-on-surface-variant opacity-60 hover:opacity-100 hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">linear_scale</span>
            <span>Lista Doble Circular</span>
          </button>
          <button
            onClick={() => handleTabChange('bst')}
            className={`w-full flex items-center space-x-4 p-3 rounded-DEFAULT transition-all duration-300 font-body-md text-body-md ${
              activeTab === 'bst'
                ? 'text-primary border-r-2 border-primary bg-surface-container-low font-bold'
                : 'text-on-surface-variant opacity-60 hover:opacity-100 hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">account_tree</span>
            <span>Árboles Binarios (BST)</span>
          </button>
        </nav>
        <div className="px-gutter mt-auto flex items-center gap-4 border-t border-primary/10 pt-6">
          <img
            alt="Scholar Profile"
            className="w-10 h-10 rounded-full ink-border object-cover bg-surface-container"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuC5ekuBwocRww6VluBtaGNkEm2InISodcaZj292boIzWDjAd7ExiAVHnlmraTkEM4_6WYjURF28A3pDbzdITBQSNI7XPxThzH2I4EgcFaT6Nff1D4VHYHfeLHWn3mgXD5lJr5_gpd0JQCxQ3KdF2gQ-P1pgW4pAnSB7UdCssY_p-a10leA9ZZIoIZ0QOSr1pWHmSdyRxxc_Z-SztGQv7xHVtGWR8VaHUin5QTG65PM_KXObUbwu7k-v"
          />
          <div>
            <p className="font-body-md text-sm text-primary font-bold">Investigador C++</p>
            <p className="font-annotation text-[11px] text-on-surface-variant">Uso de Heap Virtual</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen relative overflow-x-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex justify-between items-center w-full px-margin-mobile py-4 border-b border-primary/10 bg-surface sticky top-0 z-30">
          <h1 className="font-headline-md text-headline-md italic text-primary font-bold cursor-pointer" onClick={() => handleTabChange('home')}>
            Proyecto 2026A
          </h1>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-primary hover:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined">{isMobileMenuOpen ? 'close' : 'menu'}</span>
          </button>
        </header>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-surface border-b border-primary/20 p-4 flex flex-col gap-2 z-40 shadow-lg font-annotation">
            <button onClick={() => handleTabChange('home')} className="p-3 text-left hover:bg-surface-container rounded-sm">Inicio</button>
            <button onClick={() => handleTabChange('stack')} className="p-3 text-left hover:bg-surface-container rounded-sm">Pila (Stack)</button>
            <button onClick={() => handleTabChange('queue')} className="p-3 text-left hover:bg-surface-container rounded-sm">Cola (Queue)</button>
            <button onClick={() => handleTabChange('dll')} className="p-3 text-left hover:bg-surface-container rounded-sm">Lista Doble Circular</button>
            <button onClick={() => handleTabChange('bst')} className="p-3 text-left hover:bg-surface-container rounded-sm">Árboles Binarios (BST)</button>
          </div>
        )}

        {activeTab === 'home' ? (
          /* Landing Screen (Fundamentos Estructurales) */
          <div className="p-margin-mobile md:p-margin-desktop max-w-6xl mx-auto w-full flex-1 flex flex-col justify-between">
            <div className="mb-12 md:mb-16 mt-8 md:mt-12 max-w-3xl">
              <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-4 leading-tight">
                Fundamentos Estructurales
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                Estudio académico de las 4 topologías fundamentales para el simulador del Proyecto 2026A.
                Analiza de forma interactiva el flujo de información y la gestión de memoria en Pilas, Colas, Listas Dobles y Árboles.
              </p>
            </div>

            {/* Bento Grid Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 flex-1">
              {/* Stack Card */}
              <div
                onClick={() => handleTabChange('stack')}
                className="group cursor-pointer aspect-square md:aspect-auto md:h-80 ink-border p-6 bg-surface hover:ink-border-active transition-all duration-300 flex flex-col justify-between"
              >
                <div className="flex-1 flex justify-center items-center overflow-hidden">
                  <img
                    alt="Pilas"
                    className="w-1/2 h-1/2 object-contain opacity-90 mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBapmyIOnWPzgRiKoLI93kjKchokttnNQIHmto87lmgJmPEMIrt6RbpgmiEbavlQdmz5GS9gGiFeGcqWcBTWyI_TmvOy4RnJSjlqGGx6qfgYbR_M9eZ30YpHgS_cIfubJWV5g3gl7rqAhi4OXNH9QaE15FKb9sF9QITNsmhaBi0eWmOzAGZNG5Y3rq-ntfkKctgbPsSE1g22wrG8gN10xMIvtLlreVFj6bNWSC4WRu_zrV2fg8KEb-J"
                  />
                </div>
                <div className="border-t border-primary/10 pt-4">
                  <h3 className="font-headline-md text-headline-md text-primary group-hover:underline decoration-primary/30 underline-offset-8">
                    Pila (Stack)
                  </h3>
                  <div className="flex justify-between items-center mt-2 font-annotation text-xs text-on-surface-variant">
                    <span>Acceso de datos LIFO (Último en entrar, primero en salir).</span>
                    <span className="font-label-caps text-secondary font-bold">LIFO</span>
                  </div>
                </div>
              </div>

              {/* Queue Card */}
              <div
                onClick={() => handleTabChange('queue')}
                className="group cursor-pointer aspect-square md:aspect-auto md:h-80 ink-border p-6 bg-surface hover:ink-border-active transition-all duration-300 flex flex-col justify-between"
              >
                <div className="flex-1 flex justify-center items-center overflow-hidden">
                  <img
                    alt="Colas"
                    className="w-2/3 h-1/2 object-contain opacity-90 mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBCSL4dj9fPXlQMMOcjpYQdVkpbKI3aEc2qTaUoJfxbBJ8gyTQ9Yz92aM-zbE5-w9_vBYqz8G3sDAUN3gb2-mquhGS-mC2sfBii9p-ixVbStn9wnnfTcGtTcec97ChZ0ICwRofbqp3FRSUs--qAOD-Nj-YlQYoWrSvnsyAQJ93MuxQIxYRFmV4vTeKeGCOve00oWBWVrEaCOGHbyQUFjLaZDow8w28KmDE5hEpjUANZswCjXtePPcym"
                  />
                </div>
                <div className="border-t border-primary/10 pt-4">
                  <h3 className="font-headline-md text-headline-md text-primary group-hover:underline decoration-primary/30 underline-offset-8">
                    Cola (Queue)
                  </h3>
                  <div className="flex justify-between items-center mt-2 font-annotation text-xs text-on-surface-variant">
                    <span>Procesamiento FIFO (Primero en entrar, primero en salir).</span>
                    <span className="font-label-caps text-secondary font-bold">FIFO</span>
                  </div>
                </div>
              </div>

              {/* List Card */}
              <div
                onClick={() => handleTabChange('dll')}
                className="group cursor-pointer aspect-square md:aspect-auto md:h-80 ink-border p-6 bg-surface hover:ink-border-active transition-all duration-300 flex flex-col justify-between"
              >
                <div className="flex-1 flex justify-center items-center overflow-hidden">
                  <img
                    alt="Listas"
                    className="w-2/3 h-2/3 object-contain opacity-90 mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAh5c1IdzujtrMvqSSeNHg8Pf2n-RqDwEHFm8FJ9J7qw_lDG7X-oArXpTSpa7ER7WXI1j7kUey_w45ovsdf12dNmhk3bBlpFVY1tA5Ez-dorogfrphSj8eQvUNLakjwidp8tmX0DV8tPlr-l5nwuNK67q83uwda7Htpnb47FT7BRpvZJziL1FLQTqwYN_uLs7HEKXKzliO2pLG1RBK7QwE9AlfrmXURLVzwaAykRUCmOtsQygAQJ8M5"
                  />
                </div>
                <div className="border-t border-primary/10 pt-4">
                  <h3 className="font-headline-md text-headline-md text-primary group-hover:underline decoration-primary/30 underline-offset-8">
                    Lista Doblemente Enlazada Circular
                  </h3>
                  <div className="flex justify-between items-center mt-2 font-annotation text-xs text-on-surface-variant">
                    <span>Navegación bidireccional continua mediante un Nodo Dummy centinela.</span>
                    <span className="font-label-caps text-secondary font-bold">SENTINEL</span>
                  </div>
                </div>
              </div>

              {/* Tree Card */}
              <div
                onClick={() => handleTabChange('bst')}
                className="group cursor-pointer aspect-square md:aspect-auto md:h-80 ink-border p-6 bg-surface hover:ink-border-active transition-all duration-300 flex flex-col justify-between"
              >
                <div className="flex-1 flex justify-center items-center overflow-hidden">
                  <img
                    alt="Árboles"
                    className="w-2/3 h-2/3 object-contain opacity-90 mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuARfgiPrt2EMSQOY58saw7kpsVW7M1B3zl8_y2qocx9N_DeU8VH8uQIUDjMUT6C4CUmJ32KKaezdv1jqMvGUbBurvJzcgEnk9SI8KQl2wWWVI1IiHU-FNOg4GdJeApcb_ih8SuNwJHkZJjgvK2B1rqRZISeJZm3Olv_t1hog-9I-GQ7LdrG7o6G4pvkat2m2hb0GlNJbAaVs-AI_a99FcSKbhsR0CJ8LoKTZHDsKzJOgDjpswsarKl3"
                  />
                </div>
                <div className="border-t border-primary/10 pt-4">
                  <h3 className="font-headline-md text-headline-md text-primary group-hover:underline decoration-primary/30 underline-offset-8">
                    Árbol Binario de Búsqueda (BST)
                  </h3>
                  <div className="flex justify-between items-center mt-2 font-annotation text-xs text-on-surface-variant">
                    <span>Estructuración jerárquica no lineal y eficiencia logarítmica O(log n).</span>
                    <span className="font-label-caps text-secondary font-bold">BST</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-16 pb-8 flex flex-col items-center justify-center gap-4 text-center">
              <p className="font-annotation text-annotation text-outline/60 italic max-w-lg">
                "La estructura dicta el comportamiento en el núcleo del Proyecto 2026A. Comprender la forma es dominar la función."
              </p>
              <button 
                onClick={() => handleTabChange('stack')}
                className="font-label-caps text-xs text-secondary hover:underline decoration-secondary/30 uppercase tracking-widest font-bold mt-2"
              >
                Comenzar Simulación &gt;
              </button>
            </div>
          </div>
        ) : (
          /* Simulator view split screen */
          <div className="flex flex-1 flex-col lg:flex-row overflow-hidden relative h-screen">
            {/* Left/Main Panel (Canvas & Log Viewers) */}
            <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto gap-4 justify-between h-full lg:max-h-screen">
              {/* Back navigation and reset */}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => handleTabChange('home')}
                  className="flex items-center gap-1.5 font-annotation text-xs text-on-surface-variant hover:text-primary transition-colors font-bold"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Volver al inicio
                </button>
                <button
                  onClick={handleResetStructure}
                  className="flex items-center gap-1 font-annotation text-xs text-on-surface-variant hover:text-error transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                  Reiniciar estructura
                </button>
              </div>

              {/* Dynamic canvas */}
              <div className="flex-1 min-h-[360px] md:min-h-[480px]">
                <Canvas
                  structureType={activeTab}
                  memorySnapshot={currentFrame.memorySnapshot}
                  pointers={currentFrame.pointers}
                  activeNodes={currentFrame.activeNodes}
                  leakAddresses={currentFrame.leakAddresses}
                />
              </div>

              {/* Bottom Row - Split: CodeLog on left, HeapViewer on right */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-shrink-0">
                <CodeLog logs={logs} currentStepLog={currentFrame.operation} />
                <HeapViewer
                  memory={currentFrame.memorySnapshot}
                  leakAddresses={currentFrame.leakAddresses}
                  activeNodes={currentFrame.activeNodes}
                  structureType={activeTab}
                />
              </div>
            </div>

            {/* Right Panel (Controls and Explanation) */}
            <Sidebar
              structureType={activeTab}
              onOperation={handleOperation}
              currentStep={currentStepIdx}
              totalSteps={steps.length}
              isPlaying={isPlaying}
              onPlayPause={() => setIsPlaying(!isPlaying)}
              onStepForward={handleStepForward}
              onStepBackward={handleStepBackward}
              onReset={() => setCurrentStepIdx(0)}
              speed={speed}
              onSpeedChange={setSpeed}
              explanation={currentFrame.operation}
              complexity={currentFrame.complexity}
              activePointers={currentFrame.pointers}
              deleteEnabled={deleteEnabled}
              onDeleteToggle={handleDeleteToggle}
              totalHeapNodes={heapNodeCount}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
