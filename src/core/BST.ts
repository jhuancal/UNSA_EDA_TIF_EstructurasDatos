import { VirtualHeap } from './VirtualHeap';
import type { HeapNode, SimulationStep } from './types';

export class BSTSimulator {
  private root: string | null = null;
  private heap: VirtualHeap;

  constructor() {
    this.heap = VirtualHeap.getInstance();
  }

  public getRoot(): string | null {
    return this.root;
  }

  public setRoot(ptr: string | null): void {
    this.root = ptr;
  }

  public clear(): void {
    this.root = null;
    this.heap.clear();
  }

  public generateInsertSteps(value: number): SimulationStep[] {
    const steps: SimulationStep[] = [];
    const h = this.heap;
    let stepCount = 1;

    const makeStep = (operation: string, activeNodes: string[], pointersOverride?: Record<string, string | null>) => {
      const roots = this.root ? [this.root] : [];
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
        pointers: pointersOverride || { root: this.root },
        activeNodes,
        complexity: 'O(log n)',
        leakAddresses: h.detectLeaks(tempRoots)
      });
    };

    // 1. Allocate new node
    const newAddr = h.alloc(value, { left: null, right: null });
    makeStep(`[C++] Node* nuevo = new Node(${value}); -> Nodo asignado en ${newAddr}`, [newAddr]);

    if (!this.root) {
      this.root = newAddr;
      makeStep(`[C++] root = nuevo; -> El árbol estaba vacío, nuevo nodo se convierte en la raíz`, [newAddr]);
      return steps;
    }

    let currAddr = this.root;
    makeStep(`Iniciando búsqueda de inserción desde la raíz en ${currAddr}`, [currAddr]);

    while (true) {
      const currNode: HeapNode = h.get(currAddr)!;
      makeStep(`Comparando el valor ${value} con el valor de la dirección ${currAddr} (${currNode.data})`, [currAddr]);

      if (value === currNode.data) {
        makeStep(`El valor ${value} ya existe en el árbol en ${currAddr}. No se permiten duplicados.`, [currAddr]);
        // Release the newly allocated node since we didn't insert it
        h.free(newAddr);
        break;
      } else if (value < currNode.data) {
        makeStep(`Como ${value} < ${currNode.data}, avanzamos por la izquierda.`, [currAddr]);
        if (currNode.left === null) {
          h.update(currAddr, node => {
            node.left = newAddr;
          });
          makeStep(`[C++] curr->left = nuevo; -> Insertando nuevo nodo en la dirección ${newAddr} a la izquierda de ${currAddr}`, [currAddr, newAddr]);
          break;
        } else {
          currAddr = currNode.left;
          makeStep(`curr = curr->left; -> Moviéndonos al nodo izquierdo ${currAddr}`, [currAddr]);
        }
      } else {
        makeStep(`Como ${value} > ${currNode.data}, avanzamos por la derecha.`, [currAddr]);
        if (currNode.right === null) {
          h.update(currAddr, node => {
            node.right = newAddr;
          });
          makeStep(`[C++] curr->right = nuevo; -> Insertando nuevo nodo en la dirección ${newAddr} a la derecha de ${currAddr}`, [currAddr, newAddr]);
          break;
        } else {
          currAddr = currNode.right;
          makeStep(`curr = curr->right; -> Moviéndonos al nodo derecho ${currAddr}`, [currAddr]);
        }
      }
    }

    return steps;
  }

  public generateRemoveSteps(value: number): SimulationStep[] {
    const steps: SimulationStep[] = [];
    const h = this.heap;
    let stepCount = 1;

    const makeStep = (operation: string, activeNodes: string[], pointersOverride?: Record<string, string | null>, tempRootsOverride?: string[]) => {
      const roots = this.root ? [this.root] : [];
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
        pointers: pointersOverride || { root: this.root },
        activeNodes,
        complexity: 'O(log n)',
        leakAddresses: h.detectLeaks(tempRoots)
      });
    };

    if (!this.root) {
      makeStep('Intento de eliminación en un árbol vacío.', []);
      return steps;
    }

    // Phase 1: Search the node and its parent
    let parentAddr: string | null = null;
    let currAddr: string | null = this.root;
    let found = false;

    makeStep(`Buscando nodo con valor ${value} para eliminar, iniciando desde la raíz (${currAddr})`, [currAddr]);

    while (currAddr !== null) {
      const currNode: HeapNode = h.get(currAddr)!;
      makeStep(`Comparando valor buscado (${value}) con ${currNode.data} en ${currAddr}`, [currAddr], { root: this.root, curr: currAddr, parent: parentAddr });

      if (value === currNode.data) {
        found = true;
        makeStep(`¡Nodo encontrado en ${currAddr}!`, [currAddr], { root: this.root, curr: currAddr, parent: parentAddr });
        break;
      } else if (value < currNode.data) {
        parentAddr = currAddr;
        currAddr = currNode.left;
        makeStep(`Como ${value} < ${currNode.data}, buscamos en el subárbol izquierdo`, [parentAddr], { root: this.root, curr: currAddr, parent: parentAddr });
      } else {
        parentAddr = currAddr;
        currAddr = currNode.right;
        makeStep(`Como ${value} > ${currNode.data}, buscamos en el subárbol derecho`, [parentAddr], { root: this.root, curr: currAddr, parent: parentAddr });
      }
    }

    if (!found || currAddr === null) {
      makeStep(`El valor ${value} no existe en el árbol. Operación cancelada.`, []);
      return steps;
    }

    // Helper to disconnect node from its parent
    const replaceChildInParent = (oldChild: string, newChild: string | null) => {
      if (parentAddr === null) {
        this.root = newChild;
      } else {
        const pNode = h.get(parentAddr)!;
        if (pNode.left === oldChild) {
          h.update(parentAddr, n => { n.left = newChild; });
        } else if (pNode.right === oldChild) {
          h.update(parentAddr, n => { n.right = newChild; });
        }
      }
    };

    let targetDeleteAddr = currAddr;
    const nodeToDelete = h.get(targetDeleteAddr)!;

    // Case A: Node has two children
    if (nodeToDelete.left !== null && nodeToDelete.right !== null) {
      makeStep(`El nodo ${targetDeleteAddr} tiene dos hijos (izq: ${nodeToDelete.left}, der: ${nodeToDelete.right}). Buscaremos el predecesor en orden.`, [targetDeleteAddr]);

      // Predecessor is the maximum in left subtree
      let predParentAddr = targetDeleteAddr;
      let predAddr: string = nodeToDelete.left;
      makeStep(`Buscando predecesor: moviéndonos a la izquierda una vez: ${predAddr}`, [predAddr], { root: this.root, pred: predAddr });

      while (true) {
        const predNode = h.get(predAddr)!;
        if (predNode.right === null) {
          break;
        }
        predParentAddr = predAddr;
        predAddr = predNode.right;
        makeStep(`Buscando predecesor: avanzando a la derecha: ${predAddr}`, [predAddr], { root: this.root, pred: predAddr, predParent: predParentAddr });
      }

      const predNode = h.get(predAddr)!;
      makeStep(`¡Predecesor en orden encontrado en ${predAddr} (valor ${predNode.data})!`, [predAddr], { root: this.root, pred: predAddr });

      // Copy data from predecessor to curr node
      const predVal = predNode.data;
      h.update(targetDeleteAddr, n => {
        n.data = predVal;
      });
      makeStep(`Copiando el valor del predecesor (${predVal}) al nodo objetivo (${targetDeleteAddr})`, [targetDeleteAddr, predAddr], { root: this.root, target: targetDeleteAddr, pred: predAddr });

      // Now we delete the predecessor node instead
      parentAddr = predParentAddr;
      targetDeleteAddr = predAddr;
    }

    // Now targetDeleteAddr has AT MOST one child (either Case B: 1 child, or Case C: 0 children)
    const delNode = h.get(targetDeleteAddr)!;
    const childAddr = delNode.left !== null ? delNode.left : delNode.right;

    makeStep(
      `Eliminando el nodo en ${targetDeleteAddr}. ` + 
      (childAddr ? `Tiene un hijo en ${childAddr}. Reenlazando al padre.` : 'Es un nodo hoja. Desconectando de su padre.'),
      [targetDeleteAddr, ...(childAddr ? [childAddr] : [])],
      { root: this.root, target: targetDeleteAddr, child: childAddr }
    );

    // Re-link parent to the child
    replaceChildInParent(targetDeleteAddr, childAddr);
    
    // Disconnect targetDeleteAddr pointers
    h.update(targetDeleteAddr, n => {
      n.left = null;
      n.right = null;
    });

    const tempRoots = [this.root, targetDeleteAddr].filter((r): r is string => r !== null);
    makeStep(`[C++] Desconectando los enlaces del nodo a eliminar (${targetDeleteAddr})`, [targetDeleteAddr], { root: this.root }, tempRoots);

    // Free memory
    const deleteEnabled = h.getEnabledDelete();
    if (deleteEnabled) {
      h.free(targetDeleteAddr);
      makeStep(`[C++] delete node; -> Memoria en la dirección ${targetDeleteAddr} liberada correctamente.`, [], { root: this.root });
    } else {
      makeStep(`[C++] (Fuga de Memoria) Se omitió 'delete node;'. La dirección ${targetDeleteAddr} queda huérfana en el Heap.`, [targetDeleteAddr], { root: this.root });
    }

    return steps;
  }
}
