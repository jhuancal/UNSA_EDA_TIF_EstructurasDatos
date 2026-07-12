import { VirtualHeap } from './VirtualHeap';
import type { SimulationStep } from './types';

export class DLListSimulator {
  private dummyAddr: string | null = null;
  private heap: VirtualHeap;

  constructor() {
    this.heap = VirtualHeap.getInstance();
    this.initList();
  }

  public getDummyAddr(): string | null {
    return this.dummyAddr;
  }

  public initList(): void {
    const h = this.heap;
    // Create Dummy/Sentinel Node
    this.dummyAddr = h.alloc(null, { isDummy: true });
    h.update(this.dummyAddr, node => {
      node.next = this.dummyAddr;
      node.prev = this.dummyAddr;
    });
  }

  public clear(): void {
    // We want to free all nodes to avoid leak flags when resetting, or just clear heap
    this.heap.clear();
    this.initList();
  }

  public generateInsertFrontSteps(value: number): SimulationStep[] {
    const steps: SimulationStep[] = [];
    const h = this.heap;
    let stepCount = 1;
    const dummy = this.dummyAddr!;

    const makeStep = (operation: string, activeNodes: string[]) => {
      // In circular list, dummy is always the root.
      const tempRoots = [dummy];
      activeNodes.forEach(node => {
        if (h.get(node) && !tempRoots.includes(node)) {
          tempRoots.push(node);
        }
      });

      steps.push({
        step: stepCount++,
        operation,
        memorySnapshot: h.getMemorySnapshot(),
        pointers: { dummy: this.dummyAddr },
        activeNodes,
        complexity: 'O(1)',
        leakAddresses: h.detectLeaks(tempRoots)
      });
    };

    // 1. Allocate new node
    const newAddr = h.alloc(value, { next: null, prev: null });
    makeStep(`[C++] Node* nuevo = new Node(${value}); -> Nodo asignado en ${newAddr}`, [newAddr]);

    // 2. Identify first node
    const dummyNode = h.get(dummy)!;
    const firstAddr = dummyNode.next!;
    makeStep(`[C++] Node* primero = dummy->next; -> Identificando el primer nodo actual en ${firstAddr}`, [dummy, firstAddr]);

    // 3. Connect new node's next and prev
    h.update(newAddr, node => {
      node.next = firstAddr;
      node.prev = dummy;
    });
    makeStep(`[C++] nuevo->next = primero; nuevo->prev = dummy; -> Configurando los punteros de ${newAddr}`, [newAddr, dummy, firstAddr]);

    // 4. Connect dummy->next to new node
    h.update(dummy, node => {
      node.next = newAddr;
    });
    makeStep(`[C++] dummy->next = nuevo; -> El centinela dummy ahora apunta hacia el nuevo nodo en ${newAddr}`, [dummy, newAddr]);

    // 5. Connect old first->prev to new node
    h.update(firstAddr, node => {
      node.prev = newAddr;
    });
    makeStep(`[C++] primero->prev = nuevo; -> El antiguo primer nodo (${firstAddr}) apunta hacia atrás al nuevo nodo`, [firstAddr, newAddr]);

    return steps;
  }

  public generateInsertBackSteps(value: number): SimulationStep[] {
    const steps: SimulationStep[] = [];
    const h = this.heap;
    let stepCount = 1;
    const dummy = this.dummyAddr!;

    const makeStep = (operation: string, activeNodes: string[]) => {
      const tempRoots = [dummy];
      activeNodes.forEach(node => {
        if (h.get(node) && !tempRoots.includes(node)) {
          tempRoots.push(node);
        }
      });

      steps.push({
        step: stepCount++,
        operation,
        memorySnapshot: h.getMemorySnapshot(),
        pointers: { dummy: this.dummyAddr },
        activeNodes,
        complexity: 'O(1)',
        leakAddresses: h.detectLeaks(tempRoots)
      });
    };

    // 1. Allocate new node
    const newAddr = h.alloc(value, { next: null, prev: null });
    makeStep(`[C++] Node* nuevo = new Node(${value}); -> Nodo asignado en ${newAddr}`, [newAddr]);

    // 2. Identify last node (which is dummy->prev)
    const dummyNode = h.get(dummy)!;
    const lastAddr = dummyNode.prev!;
    makeStep(`[C++] Node* ultimo = dummy->prev; -> Identificando el último nodo actual en ${lastAddr}`, [dummy, lastAddr]);

    // 3. Connect new node's next and prev
    h.update(newAddr, node => {
      node.next = dummy;
      node.prev = lastAddr;
    });
    makeStep(`[C++] nuevo->next = dummy; nuevo->prev = ultimo; -> Configurando enlaces de ${newAddr}`, [newAddr, dummy, lastAddr]);

    // 4. Connect old last->next to new node
    h.update(lastAddr, node => {
      node.next = newAddr;
    });
    makeStep(`[C++] ultimo->next = nuevo; -> El antiguo último nodo (${lastAddr}) apunta hacia el nuevo nodo`, [lastAddr, newAddr]);

    // 5. Connect dummy->prev to new node
    h.update(dummy, node => {
      node.prev = newAddr;
    });
    makeStep(`[C++] dummy->prev = nuevo; -> El centinela dummy ahora apunta hacia atrás al nuevo nodo en ${newAddr}`, [dummy, newAddr]);

    return steps;
  }

  public generateRemoveSteps(value: number): SimulationStep[] {
    const steps: SimulationStep[] = [];
    const h = this.heap;
    let stepCount = 1;
    const dummy = this.dummyAddr!;

    const makeStep = (operation: string, activeNodes: string[], pointersOverride?: Record<string, string | null>, tempRootsOverride?: string[]) => {
      const tempRoots = tempRootsOverride || [dummy];
      activeNodes.forEach(node => {
        if (h.get(node) && !tempRoots.includes(node)) {
          tempRoots.push(node);
        }
      });

      steps.push({
        step: stepCount++,
        operation,
        memorySnapshot: h.getMemorySnapshot(),
        pointers: pointersOverride || { dummy: this.dummyAddr },
        activeNodes,
        complexity: 'O(n)',
        leakAddresses: h.detectLeaks(tempRoots)
      });
    };

    let currAddr = h.get(dummy)!.next!;
    
    // Step 1: Start search at first node
    makeStep(`[C++] Node* curr = dummy->next; -> Iniciando búsqueda en el primer nodo real en ${currAddr}`, [dummy, currAddr], { dummy, curr: currAddr });

    let found = false;
    // Circular traversal loop
    while (currAddr !== dummy) {
      const currNode = h.get(currAddr)!;
      
      // Step 2: Compare value
      if (currNode.data === value) {
        found = true;
        makeStep(`[C++] curr->data == ${value}; -> ¡Coincidencia encontrada en la dirección ${currAddr}!`, [currAddr], { dummy, curr: currAddr });
        break;
      } else {
        makeStep(`[C++] curr->data (${currNode.data}) != ${value}; -> No coincide, pasando al siguiente`, [currAddr], { dummy, curr: currAddr });
        currAddr = currNode.next!;
        makeStep(`[C++] curr = curr->next; -> Avanzando puntero de búsqueda a ${currAddr}`, [currAddr], { dummy, curr: currAddr });
      }
    }

    if (!found) {
      makeStep(`Búsqueda terminada. El valor ${value} no existe en la lista.`, [dummy], { dummy, curr: null });
      return steps;
    }

    // Node is found at currAddr. Let's do unlinking.
    const currNode = h.get(currAddr)!;
    const prevAddr = currNode.prev!;
    const nextAddr = currNode.next!;

    // 1. Identify neighbors
    makeStep(`[C++] Node* prevNode = curr->prev; Node* nextNode = curr->next; -> Identificando vecinos de ${currAddr}`, [currAddr, prevAddr, nextAddr], { dummy, curr: currAddr, prevNode: prevAddr, nextNode: nextAddr });

    // 2. Link prevNode->next to nextNode
    h.update(prevAddr, node => {
      node.next = nextAddr;
    });
    makeStep(`[C++] prevNode->next = nextNode; -> Enlazando ${prevAddr} directamente a ${nextAddr}`, [prevAddr, nextAddr], { dummy, curr: currAddr });

    // 3. Link nextNode->prev to prevNode
    h.update(nextAddr, node => {
      node.prev = prevAddr;
    });
    makeStep(`[C++] nextNode->prev = prevNode; -> Enlazando ${nextAddr} de vuelta a ${prevAddr}`, [prevAddr, nextAddr], { dummy, curr: currAddr });

    // 4. Disconnect curr pointers
    h.update(currAddr, node => {
      node.next = null;
      node.prev = null;
    });
    makeStep(`[C++] curr->next = curr->prev = NULL; -> Aislándolo del resto de la lista`, [currAddr], { dummy, curr: currAddr });

    // 5. Delete/free memory
    const deleteEnabled = h.getEnabledDelete();
    if (deleteEnabled) {
      h.free(currAddr);
      makeStep(`[C++] delete curr; -> Memoria en ${currAddr} liberada correctamente.`, [], { dummy, curr: null });
    } else {
      makeStep(`[C++] (Fuga de Memoria) Se omitió 'delete curr;'. El nodo ${currAddr} queda huérfano e inaccesible.`, [currAddr], { dummy, curr: null });
    }

    return steps;
  }
}
