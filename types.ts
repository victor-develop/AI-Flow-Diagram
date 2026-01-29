
export interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  type: 'process' | 'decision' | 'start' | 'end';
  color?: string;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface CanvasState {
  nodes: Node[];
  edges: Edge[];
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isThought?: boolean;
}

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export enum ActionID {
  ADD_NODE = 'addNode',
  UPDATE_NODE = 'updateNode',
  DELETE_NODE = 'deleteNode',
  CONNECT_NODES = 'connectNodes',
  CLEAR_CANVAS = 'clearCanvas',
  GET_CANVAS_STATE = 'getCanvasState'
}
