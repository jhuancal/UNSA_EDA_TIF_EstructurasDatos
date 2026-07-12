import { VirtualHeap } from './VirtualHeap';
import type { SimulationStep } from './types';

export class QueueSimulator {
  private frontPtr: string | null = null;
  private rearPtr: string | null = null;
  private heap: VirtualHeap;

  constructor() {
    this.heap = VirtualHeap.getInstance();
  }

  public getFrontPtr(): string | null {
    return this.frontPtr;
  }

  public getRearPtr(): string | null {
    return this.rearPtr;
  }

  public setPointers(front: string | null, rear: string | null): void {
    this.frontPtr = front;
    this.rearPtr = rear;
  }

  public clear(): void {
    this.frontPtr = null;
    this.rearPtr = null;
  }

  public generateEnqueueSteps(value: number): SimulationStep[] {
    const steps: SimulationStep[] = [];
    const h = this.heap;
    let stepCount = 1;

    const makeStep = (operation: string, activeNodes: string[], pointersOverride?: Record<string, string | null>) => {
      // Keep active nodes (like a newly allocated node) as reachable during construction to avoid premature leak warnings
      const roots = [];
      if (this.frontPtr) roots.push(this.frontPtr);
      if (this.rearPtr) roots.push(this.rearPtr);
      
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
        pointers: pointersOverride || { front: this.frontPtr, rear: this.rearPtr },
        activeNodes,
        complexity: 'O(1)',
        leakAddresses: h.detectLeaks(tempRoots)
      });
    };

    // 1. Allocate new node
    const newAddr = h.alloc(value, { next: null });
    makeStep(`[C++] Node* nuevo = new Node(${value}); -> Asignado en ${newAddr}`, [newAddr]);

    if (!this.frontPtr) {
      // Queue was empty
      this.frontPtr = newAddr;
      this.rearPtr = newAddr;
      makeStep(`[C++] front = rear = nuevo; -> Al estar vacía, front y rear apuntan al nuevo nodo`, [newAddr]);
    } else {
      // Enqueue at rear
      const oldRear = this.rearPtr!;
      h.update(oldRear, node => {
        node.next = newAddr;
      });
      makeStep(`[C++] rear->next = nuevo; -> Enlazando el nodo final actual (${oldRear}) al nuevo nodo`, [oldRear, newAddr]);

      this.rearPtr = newAddr;
      makeStep(`[C++] rear = nuevo; -> Moviendo el puntero rear al nuevo nodo en ${newAddr}`, [newAddr]);
    }

    return steps;
  }

  public generateDequeueSteps(): SimulationStep[] {
    const steps: SimulationStep[] = [];
    const h = this.heap;
    let stepCount = 1;

    const makeStep = (operation: string, activeNodes: string[], pointersOverride?: Record<string, string | null>, tempRootsOverride?: string[]) => {
      const roots = [];
      if (this.frontPtr) roots.push(this.frontPtr);
      if (this.rearPtr) roots.push(this.rearPtr);

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
        pointers: pointersOverride || { front: this.frontPtr, rear: this.rearPtr },
        activeNodes,
        complexity: 'O(1)',
        leakAddresses: h.detectLeaks(tempRoots)
      });
    };

    if (!this.frontPtr) {
      makeStep('Error: Intento de DEQUEUE en una cola vacía (Queue Underflow).', []);
      return steps;
    }

    const popAddr = this.frontPtr;
    const popNode = h.get(popAddr);
    const nextAddr = popNode ? popNode.next || null : null;

    // 1. Reference node to delete
    makeStep(`[C++] Node* temp = front; -> Apuntando puntero temporal al nodo del frente (${popAddr})`, [popAddr]);

    // 2. Move front pointer to next
    this.frontPtr = nextAddr;
    
    let isNowEmpty = false;
    if (this.frontPtr === null) {
      this.rearPtr = null;
      isNowEmpty = true;
    }

    // Keep popAddr in tempRootsOverride so it is not marked as leak yet
    const currentRoots = [];
    if (this.frontPtr) currentRoots.push(this.frontPtr);
    if (this.rearPtr) currentRoots.push(this.rearPtr);
    const tempRoots = [popAddr, ...currentRoots];

    makeStep(
      `[C++] front = front->next; -> Moviendo front al siguiente nodo (${nextAddr || 'NULL'})` + 
      (isNowEmpty ? ' y rear a NULL al quedar vacía' : ''),
      [popAddr],
      { front: this.frontPtr, rear: this.rearPtr, temp: popAddr },
      tempRoots
    );

    // 3. Delete/free memory
    const deleteEnabled = h.getEnabledDelete();
    if (deleteEnabled) {
      h.free(popAddr);
      makeStep(`[C++] delete temp; -> Memoria en ${popAddr} liberada correctamente.`, [], { front: this.frontPtr, rear: this.rearPtr, temp: null });
    } else {
      makeStep(`[C++] (Fuga de Memoria) Se omitió 'delete temp;'. La dirección ${popAddr} queda huérfana en el Heap.`, [popAddr], { front: this.frontPtr, rear: this.rearPtr, temp: null });
    }

    return steps;
  }
}
