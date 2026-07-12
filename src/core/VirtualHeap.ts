import type { HeapNode } from './types';

export class VirtualHeap {
  private static instance: VirtualHeap | null = null;
  private memory: Map<string, HeapNode> = new Map();
  private nextAddress: number = 0x1000;
  private enabledDelete: boolean = true;

  private constructor() {}

  public static getInstance(): VirtualHeap {
    if (!VirtualHeap.instance) {
      VirtualHeap.instance = new VirtualHeap();
    }
    return VirtualHeap.instance;
  }

  public setEnabledDelete(enabled: boolean): void {
    this.enabledDelete = enabled;
  }

  public getEnabledDelete(): boolean {
    return this.enabledDelete;
  }

  public alloc(data: any, extra: Partial<HeapNode> = {}): string {
    const addr = `0x${this.nextAddress.toString(16).toUpperCase()}`;
    this.nextAddress += 4;
    this.memory.set(addr, {
      address: addr,
      data,
      next: null,
      prev: null,
      left: null,
      right: null,
      ...extra
    } as HeapNode);
    return addr;
  }

  public get(addr: string): HeapNode | undefined {
    return this.memory.get(addr);
  }

  public update(addr: string, updateFn: (node: HeapNode) => void): void {
    const node = this.memory.get(addr);
    if (node) {
      updateFn(node);
    }
  }

  public free(addr: string): void {
    if (this.enabledDelete) {
      this.memory.delete(addr);
    }
  }

  public getMemorySnapshot(): Record<string, HeapNode> {
    const snapshot: Record<string, HeapNode> = {};
    this.memory.forEach((node, addr) => {
      snapshot[addr] = JSON.parse(JSON.stringify(node));
    });
    return snapshot;
  }

  public clear(): void {
    this.memory.clear();
    this.nextAddress = 0x1000;
  }

  /**
   * Performs reachability analysis (BFS) starting from the active root pointers.
   * Any node in the Virtual Heap that cannot be reached from the roots is flagged as a leak.
   */
  public detectLeaks(activeRoots: string[]): string[] {
    const visited = new Set<string>();
    const queue: string[] = [];

    // Enqueue valid, existing root nodes
    activeRoots.forEach(root => {
      if (root && this.memory.has(root)) {
        queue.push(root);
        visited.add(root);
      }
    });

    while (queue.length > 0) {
      const currentAddr = queue.shift()!;
      const node = this.memory.get(currentAddr);
      if (!node) continue;

      // Add adjacent nodes to queue
      const neighbors = [node.next, node.prev, node.left, node.right];
      for (const nextAddr of neighbors) {
        if (nextAddr && this.memory.has(nextAddr) && !visited.has(nextAddr)) {
          visited.add(nextAddr);
          queue.push(nextAddr);
        }
      }
    }

    // Identify leaked nodes (allocated in memory but unreachable)
    const leaks: string[] = [];
    this.memory.forEach((_, addr) => {
      if (!visited.has(addr)) {
        leaks.push(addr);
      }
    });

    return leaks;
  }
}
