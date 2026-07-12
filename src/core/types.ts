export interface HeapNode {
  address: string;
  data: any;
  next: string | null;
  prev: string | null;
  left: string | null;
  right: string | null;
  isDummy?: boolean;
}

export interface SimulationStep {
  step: number;
  operation: string;
  memorySnapshot: Record<string, HeapNode>;
  pointers: Record<string, string | null>;
  activeNodes: string[];
  complexity: string;
  leakAddresses: string[];
}
