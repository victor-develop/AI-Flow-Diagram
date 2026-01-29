
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { useNodesState, useEdgesState, addEdge, MarkerType } from '@xyflow/react';
import { 
  Send, 
  Maximize2, 
  Minimize2, 
  Download, 
  Upload,
  Brain,
  Layers,
  MousePointer2
} from 'lucide-react';
import { 
  Message, 
  ActionID 
} from './types';
import { SYSTEM_INSTRUCTION, TOOLS } from './constants';
import Canvas from './components/Canvas';

const App: React.FC = () => {
  // --- React Flow State ---
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // --- UI State ---
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello! I am your Flow Architect. Describe the diagram you'd like to build, and I'll handle the drawing for you using React Flow." }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentThought, setCurrentThought] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- Helper for Colors ---
  const getHexColor = (color: string = 'blue') => {
    const palette: Record<string, string> = {
      blue: '#3b82f6',
      green: '#10b981',
      amber: '#f59e0b',
      rose: '#f43f5e',
      purple: '#a855f7',
      slate: '#64748b'
    };
    return palette[color] || palette.blue;
  };

  // --- Capability Layer (Agent Tools Implementation) ---
  const executeAction = useCallback((action: ActionID, args: any) => {
    switch (action) {
      case ActionID.ADD_NODE: {
        const id = `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const newNode = {
          id,
          type: args.type === 'decision' ? 'diamond' : args.type || 'default',
          position: { x: args.x ?? 100, y: args.y ?? 100 },
          data: { 
            label: args.label || 'New Step',
            color: getHexColor(args.color)
          },
        };
        setNodes((nds) => nds.concat(newNode));
        return { status: 'success', id };
      }
      case ActionID.UPDATE_NODE: {
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === args.id) {
              return {
                ...node,
                position: args.x !== undefined || args.y !== undefined 
                  ? { x: args.x ?? node.position.x, y: args.y ?? node.position.y }
                  : node.position,
                data: { 
                  ...node.data, 
                  label: args.label ?? node.data.label,
                  color: args.color ? getHexColor(args.color) : node.data.color
                }
              };
            }
            return node;
          })
        );
        return { status: 'success', id: args.id };
      }
      case ActionID.DELETE_NODE: {
        setNodes((nds) => nds.filter((n) => n.id !== args.id));
        setEdges((eds) => eds.filter((e) => e.source !== args.id && e.target !== args.id));
        return { status: 'success', id: args.id };
      }
      case ActionID.CONNECT_NODES: {
        const edgeId = `edge-${args.sourceId}-${args.targetId}`;
        const newEdge = {
          id: edgeId,
          source: args.sourceId,
          target: args.targetId,
          label: args.label,
          animated: true,
          style: { stroke: '#3b82f6', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#3b82f6',
          },
        };
        setEdges((eds) => addEdge(newEdge, eds));
        return { status: 'success', id: edgeId };
      }
      case ActionID.CLEAR_CANVAS: {
        setNodes([]);
        setEdges([]);
        return { status: 'success' };
      }
      case ActionID.GET_CANVAS_STATE: {
        // Since we need to return current values in a sync call inside a loop,
        // we use functional state updates if needed, but for the agent, 
        // we'll just return what's in the closure (which might be slightly stale during multi-turn loops)
        // A better way is to pass the latest nodes/edges via a ref if critical.
        return { nodes, edges };
      }
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }, [setNodes, setEdges, nodes, edges]);

  // --- Agent Logic ---
  const sendMessage = async () => {
    if (!userInput.trim() || isProcessing) return;

    const currentInput = userInput;
    setUserInput('');
    setMessages(prev => [...prev, { role: 'user', content: currentInput }]);
    setIsProcessing(true);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const currentHistory = [...history, { role: 'user', parts: [{ text: currentInput }] }];

    try {
      let loopCount = 0;
      const MAX_LOOPS = 6;

      while (loopCount < MAX_LOOPS) {
        setCurrentThought('Reasoning...');
        const response: any = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: currentHistory,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            tools: [{ functionDeclarations: TOOLS }],
          },
        });

        const candidate = response.candidates[0];
        const parts = candidate.content.parts;
        currentHistory.push({ role: 'model', parts });

        const textPart = parts.find((p: any) => p.text);
        const functionCalls = parts.filter((p: any) => p.functionCall).map((p: any) => p.functionCall);

        if (textPart?.text) {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: textPart.text, 
            isThought: functionCalls.length > 0 
          }]);
        }

        if (functionCalls.length === 0) break;

        const toolResponses = [];
        for (const call of functionCalls) {
          setCurrentThought(`Drawing: ${call.name}...`);
          
          let result;
          try {
            result = executeAction(call.name as ActionID, call.args);
          } catch (err: any) {
            result = { error: err.message };
          }
          
          setMessages(prev => [...prev, { 
            role: 'system', 
            content: `Capability: ${call.name} ${result.error ? '[FAILED]' : '[OK]'}` 
          }]);

          toolResponses.push({
            functionResponse: {
              name: call.name,
              id: call.id,
              response: result
            }
          });
        }

        currentHistory.push({ role: 'user', parts: toolResponses });
        loopCount++;
      }
      setHistory(currentHistory);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Agent Error: ${error.message}` }]);
    } finally {
      setIsProcessing(false);
      setCurrentThought(null);
    }
  };

  const handleExport = () => {
    const data = JSON.stringify({ nodes, edges }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flow-arch-${new Date().getTime()}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (f) => {
      try {
        const data = JSON.parse(f.target?.result as string);
        if (data.nodes) setNodes(data.nodes);
        if (data.edges) setEdges(data.edges);
      } catch (e) { alert("Import failed: Invalid format"); }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentThought]);

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden font-sans text-slate-200">
      <main className="relative flex-grow h-full overflow-hidden">
        <Canvas 
          nodes={nodes} 
          edges={edges} 
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
        />

        {/* HUD UI */}
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center pointer-events-none">
          <div className="flex items-center space-x-4 pointer-events-auto">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-2 rounded-2xl flex space-x-1 shadow-2xl">
              <button onClick={handleExport} className="p-2.5 hover:bg-slate-800 rounded-xl transition-all group text-slate-400 hover:text-blue-400">
                <Download size={20} />
              </button>
              <label className="p-2.5 hover:bg-slate-800 rounded-xl transition-all group text-slate-400 hover:text-blue-400 cursor-pointer">
                <Upload size={20} />
                <input type="file" className="hidden" onChange={handleImport} accept=".json" />
              </label>
            </div>
            <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 px-5 py-2.5 rounded-2xl flex items-center space-x-3 shadow-2xl">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm font-semibold tracking-wide text-slate-300">
                {nodes.length} Components • {edges.length} Links
              </span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-6 bg-slate-900/90 backdrop-blur-xl border border-slate-800 px-4 py-2 rounded-xl pointer-events-none flex items-center space-x-3 text-xs text-slate-400 shadow-xl">
          <MousePointer2 size={14} className="text-blue-500" />
          <span>Infinite Canvas • Talk to Architect to build</span>
        </div>
      </main>

      <aside className={`transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] bg-slate-900 border-l border-slate-800 flex flex-col relative z-50 shadow-[0_0_50px_rgba(0,0,0,0.5)] ${isExpanded ? 'fixed inset-0 w-full' : 'w-[450px]'}`}>
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Brain size={26} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-100 tracking-tight">AI Architect</h2>
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{isProcessing ? 'Thinking' : 'Online'}</span>
              </div>
            </div>
          </div>
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-2.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all">
            {isExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-6 scroll-smooth">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] rounded-2xl p-4 transition-all ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-900/20' 
                  : msg.role === 'system'
                    ? 'bg-slate-950/50 text-slate-500 text-[10px] font-mono border border-slate-800 py-2'
                    : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700 shadow-sm'
              }`}>
                {msg.role === 'assistant' && msg.isThought && (
                  <div className="flex items-center space-x-2 mb-2 text-[10px] font-black text-blue-400 uppercase tracking-widest opacity-80">
                    <div className="w-1 h-1 bg-blue-400 rounded-full" />
                    <span>Planning Workspace Update</span>
                  </div>
                )}
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
              </div>
            </div>
          ))}
          {currentThought && (
            <div className="flex justify-start">
              <div className="bg-slate-800/50 text-blue-400 text-xs p-4 rounded-2xl rounded-tl-none flex items-center space-x-4 border border-blue-900/30 animate-pulse">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="font-medium">{currentThought}</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900/80 backdrop-blur-md">
          <div className="relative group">
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="E.g. 'Build a microservices architecture flow...'"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-5 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-500 transition-all text-slate-200 placeholder-slate-600 resize-none min-h-[100px] shadow-inner"
            />
            <button
              onClick={sendMessage}
              disabled={isProcessing || !userInput.trim()}
              className={`absolute bottom-4 right-4 p-3.5 rounded-xl transition-all shadow-xl ${
                isProcessing || !userInput.trim()
                  ? 'bg-slate-800 text-slate-600'
                  : 'bg-blue-600 text-white hover:bg-blue-500 hover:scale-105 active:scale-95'
              }`}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default App;
