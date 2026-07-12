import { VirtualHeap } from './VirtualHeap';
import type { SimulationStep } from './types';

export class StackSimulator {
  private topPtr: string | null = null;
  private heap: VirtualHeap;

  constructor() {
    this.heap = VirtualHeap.getInstance();
  }

  public getTopPtr(): string | null {
    return this.topPtr;
  }

  public setTopPtr(ptr: string | null): void {
    this.topPtr = ptr;
  }

  public clear(): void {
    this.topPtr = null;
  }

  public generatePushSteps(value: number): SimulationStep[] {
    const steps: SimulationStep[] = [];
    const h = this.heap;
    let stepCount = 1;

    const makeStep = (operation: string, activeNodes: string[], pointersOverride?: Record<string, string | null>) => {
      const roots = this.topPtr ? [this.topPtr] : [];
      // Keep active nodes (like a newly allocated node) as reachable during construction to avoid premature leak warnings
      const tempRoots = [...roots];
      activeNodes.forEach(node => {
        if (h.get(node) && !tempRoots.includes(node)) {
          tempRoots.push(node);
        }
      });

      steps.push({
        step: stepCount++,
        operation,
        memorySnapshot: h.getMemorySnapshot(),
        pointers: pointersOverride || { top: this.topPtr },
        activeNodes,
        complexity: 'O(1)',
        leakAddresses: h.detectLeaks(tempRoots)
      });
    };

    // 1. Allocate new node
    const newAddr = h.alloc(value, { next: null });
    makeStep(`[C++] Node* nuevo = new Node(${value}); -> Asignado en ${newAddr}`, [newAddr]);

    // 2. Point new node's next to current top
    h.update(newAddr, node => {
      node.next = this.topPtr;
    });
    makeStep(`[C++] nuevo->next = top; -> Enlazando nuevo nodo a ${this.topPtr || 'NULL'}`, [newAddr]);

    // 3. Update top pointer
    this.topPtr = newAddr;
    makeStep(`[C++] top = nuevo; -> El puntero top ahora apunta al nuevo nodo en ${newAddr}`, [newAddr]);

    return steps;
  }

  public generatePopSteps(): SimulationStep[] {
    const steps: SimulationStep[] = [];
    const h = this.heap;
    let stepCount = 1;

    const makeStep = (operation: string, activeNodes: string[], pointersOverride?: Record<string, string | null>, tempRootsOverride?: string[]) => {
      const roots = this.topPtr ? [this.topPtr] : [];
      const tempRoots = tempRootsOverride || [...roots];
      activeNodes.forEach(node => {
        if (h.get(node) && !tempRoots.includes(node)) {
          tempRoots.push(node);
        }
      });

      steps.push({
        step: stepCount++,
        operation,
        memorySnapshot: h.getMemorySnapshot(),
        pointers: pointersOverride || { top: this.topPtr },
        activeNodes,
        complexity: 'O(1)',
        leakAddresses: h.detectLeaks(tempRoots)
      });
    };

    if (!this.topPtr) {
      makeStep('Error: Intento de POP en una pila vacía (Stack Underflow).', []);
      return steps;
    }

    const popAddr = this.topPtr;
    const popNode = h.get(popAddr);
    const nextAddr = popNode ? popNode.next || null : null;

    // 1. Reference node to delete
    // We pass popAddr in tempRootsOverride because it is still pointed to by topPtr, so no leak yet
    makeStep(`[C++] Node* temp = top; -> Apuntando puntero temporal al nodo del tope (${popAddr})`, [popAddr]);

    // 2. Move top pointer to next
    this.topPtr = nextAddr;
    // Now topPtr has changed. If we don't pass temp as a root, it will be marked as leak unless we free it.
    // In C++, the node is still reachable via the local 'temp' pointer, so we add popAddr to tempRootsOverride for this step.
    makeStep(`[C++] top = top->next; -> Moviendo el puntero top al siguiente nodo (${nextAddr || 'NULL'})`, [popAddr], { top: this.topPtr, temp: popAddr }, [popAddr, ...(nextAddr ? [nextAddr] : [])]);

    // 3. Delete/free memory
    const deleteEnabled = h.getEnabledDelete();
    if (deleteEnabled) {
      h.free(popAddr);
      makeStep(`[C++] delete temp; -> Memoria en ${popAddr} liberada correctamente.`, [], { top: this.topPtr, temp: null });
    } else {
      // Do NOT free, so it is orphaned in the virtual heap!
      // Do NOT include popAddr in tempRootsOverride because the temp variable has gone out of scope!
      // This will trigger a leak in the final step!
      makeStep(`[C++] (Fuga de Memoria) Se omitió 'delete temp;'. La dirección ${popAddr} queda huérfana en el Heap.`, [popAddr], { top: this.topPtr, temp: null });
    }

    return steps;
  }
}
