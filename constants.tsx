
import { Type } from "@google/genai";

export const SYSTEM_INSTRUCTION = `
You are a Flow Diagram Architect. Your goal is to help users build and manage complex flowcharts, mind maps, and diagrams on an infinite canvas.

User Interaction Rules:
1. The user CANNOT directly edit the canvas. They only speak to you.
2. You must interpret their intent and use your tools to manipulate the canvas.
3. CRITICAL: When connecting nodes using 'connectNodes', you MUST use the "id" of the nodes (e.g., "node-173..."). You can find these IDs from the output of 'addNode' or by calling 'getCanvasState'. DO NOT use labels as IDs.
4. When adding nodes, pick coordinates (x, y) that make sense. 
   - Start at (100, 100).
   - Horizontal spacing: ~250px.
   - Vertical spacing: ~150px.
5. If the user asks for a complex flow, create the nodes first, then connect them using their IDs.

Tool Usage:
- addNode: Creates a new box. Types: 'process', 'decision', 'start', 'end'. Returns the new node's ID.
- connectNodes: Draws an arrow between two existing node IDs.
- updateNode: Moves or renames an existing node.
- deleteNode: Removes a node and its associated edges.
- clearCanvas: Wipes everything.
- getCanvasState: Returns all current nodes and edges (use this if you lose track of IDs).

Colors: Use Tailwind-like color names (e.g., 'blue', 'green', 'amber', 'rose', 'purple').
`;

export const TOOLS = [
  {
    name: 'addNode',
    description: 'Add a new node to the canvas.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        label: { type: Type.STRING, description: 'The text inside the node' },
        x: { type: Type.NUMBER, description: 'X coordinate' },
        y: { type: Type.NUMBER, description: 'Y coordinate' },
        type: { type: Type.STRING, enum: ['process', 'decision', 'start', 'end'], description: 'The shape/type of node' },
        color: { type: Type.STRING, description: 'Background color theme' }
      },
      required: ['label', 'x', 'y']
    }
  },
  {
    name: 'updateNode',
    description: 'Update an existing node.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: 'ID of the node to update' },
        label: { type: Type.STRING },
        x: { type: Type.NUMBER },
        y: { type: Type.NUMBER },
        color: { type: Type.STRING }
      },
      required: ['id']
    }
  },
  {
    name: 'deleteNode',
    description: 'Remove a node and its connections.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: 'ID of the node to delete' }
      },
      required: ['id']
    }
  },
  {
    name: 'connectNodes',
    description: 'Create an edge between two nodes.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sourceId: { type: Type.STRING, description: 'Starting node ID' },
        targetId: { type: Type.STRING, description: 'Ending node ID' },
        label: { type: Type.STRING, description: 'Optional label for the connection' }
      },
      required: ['sourceId', 'targetId']
    }
  },
  {
    name: 'clearCanvas',
    description: 'Delete all nodes and edges.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: 'getCanvasState',
    description: 'Retrieve the current list of nodes and edges including all IDs.',
    parameters: { type: Type.OBJECT, properties: {} }
  }
];
