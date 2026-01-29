
import React, { useMemo } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  BackgroundVariant,
  Panel,
  Handle,
  Position
} from '@xyflow/react';

// Custom Node Component for a more architectural look
const CustomNode = ({ data, selected }: any) => {
  return (
    <div className={`px-5 py-4 rounded-xl border-2 transition-all duration-500 ${selected ? 'scale-105 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'shadow-xl'} flex flex-col items-center justify-center min-w-[150px]`}
         style={{ 
           backgroundColor: `${data.color}22`, 
           borderColor: data.color || '#3b82f6',
           backdropFilter: 'blur(8px)'
         }}>
      <Handle type="target" position={Position.Top} className="!bg-slate-500 !w-2 !h-2 !border-none" />
      <div className="text-slate-100 font-bold text-sm text-center leading-tight">
        {data.label}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500 !w-2 !h-2 !border-none" />
    </div>
  );
};

// Diamond Node for Decisions
const DiamondNode = ({ data, selected }: any) => {
  return (
    <div className={`w-[120px] h-[120px] flex items-center justify-center relative transition-all duration-500 ${selected ? 'scale-105 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : ''}`}>
      <div className="absolute inset-0 rotate-45 border-2 rounded-lg"
           style={{ 
             backgroundColor: `${data.color}22`, 
             borderColor: data.color || '#f59e0b',
             backdropFilter: 'blur(8px)'
           }} />
      <Handle type="target" position={Position.Top} className="!bg-slate-500 !z-20" />
      <div className="text-slate-100 font-bold text-xs text-center leading-tight z-10 p-2 max-w-[80px]">
        {data.label}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500 !z-20" />
    </div>
  );
};

interface CanvasProps {
  nodes: any[];
  edges: any[];
  onNodesChange: any;
  onEdgesChange: any;
}

const Canvas: React.FC<CanvasProps> = ({ nodes, edges, onNodesChange, onEdgesChange }) => {
  const nodeTypes = useMemo(() => ({
    default: CustomNode,
    process: CustomNode,
    start: CustomNode,
    end: CustomNode,
    diamond: DiamondNode,
  }), []);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        // Requirement: User cannot directly edit, but can explore
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        fitView
        colorMode="dark"
        minZoom={0.1}
        maxZoom={4}
      >
        <Background 
            variant={BackgroundVariant.Dots} 
            gap={20} 
            size={1} 
            color="#334155" 
            style={{ backgroundColor: '#020617' }} 
        />
        <Controls />
        <MiniMap 
            nodeColor={(n: any) => n.data?.color || '#3b82f6'} 
            maskColor="rgba(2, 6, 23, 0.7)" 
            style={{ bottom: 20, right: 20 }}
        />
        <Panel position="top-right" className="bg-slate-900/50 backdrop-blur-md p-2 rounded-lg border border-slate-800 text-[10px] text-slate-500 font-mono pointer-events-none">
          ENGINE: XY-FLOW v12
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default Canvas;
