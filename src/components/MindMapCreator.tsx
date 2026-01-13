'use client';

import { useState, useEffect, useRef } from 'react';
import { Brain, Plus, Save, Download, Trash2, Edit3 } from 'lucide-react';

interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  connections: string[];
}

interface MindMap {
  id: string;
  title: string;
  nodes: MindMapNode[];
  createdAt: string;
}

export default function MindMapCreator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mindMaps, setMindMaps] = useState<MindMap[]>([]);
  const [currentMap, setCurrentMap] = useState<MindMap | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showNodeEditor, setShowNodeEditor] = useState(false);
  const [nodeText, setNodeText] = useState('');

  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

  useEffect(() => {
    const saved = localStorage.getItem('mindMaps');
    if (saved) setMindMaps(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (currentMap) drawMindMap();
  }, [currentMap]);

  const saveMindMaps = (maps: MindMap[]) => {
    setMindMaps(maps);
    localStorage.setItem('mindMaps', JSON.stringify(maps));
  };

  const createNewMap = () => {
    const newMap: MindMap = {
      id: Date.now().toString(),
      title: 'New Mind Map',
      nodes: [{
        id: '1',
        text: 'Central Topic',
        x: 400,
        y: 300,
        color: colors[0],
        connections: []
      }],
      createdAt: new Date().toISOString()
    };
    setCurrentMap(newMap);
    saveMindMaps([...mindMaps, newMap]);
  };

  const addNode = (x: number, y: number) => {
    if (!currentMap) return;
    
    const newNode: MindMapNode = {
      id: Date.now().toString(),
      text: nodeText || 'New Node',
      x,
      y,
      color: colors[Math.floor(Math.random() * colors.length)],
      connections: []
    };

    const updatedMap = {
      ...currentMap,
      nodes: [...currentMap.nodes, newNode]
    };
    
    setCurrentMap(updatedMap);
    const updatedMaps = mindMaps.map(m => m.id === currentMap.id ? updatedMap : m);
    saveMindMaps(updatedMaps);
    setShowNodeEditor(false);
    setNodeText('');
  };

  const drawMindMap = () => {
    const canvas = canvasRef.current;
    if (!canvas || !currentMap) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connections
    currentMap.nodes.forEach(node => {
      node.connections.forEach(connId => {
        const connNode = currentMap.nodes.find(n => n.id === connId);
        if (connNode) {
          ctx.strokeStyle = '#94A3B8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(connNode.x, connNode.y);
          ctx.stroke();
        }
      });
    });

    // Draw nodes
    currentMap.nodes.forEach(node => {
      ctx.fillStyle = node.color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, 30, 0, 2 * Math.PI);
      ctx.fill();

      if (selectedNode === node.id) {
        ctx.strokeStyle = '#1F2937';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(node.text.substring(0, 8), node.x, node.y + 4);
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !currentMap) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked on existing node
    const clickedNode = currentMap.nodes.find(node => {
      const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
      return distance <= 30;
    });

    if (clickedNode) {
      setSelectedNode(selectedNode === clickedNode.id ? null : clickedNode.id);
    } else {
      setShowNodeEditor(true);
      // Store click position for new node
      (window as any).newNodePosition = { x, y };
    }
  };

  const connectNodes = () => {
    if (!currentMap || !selectedNode) return;

    const otherNodes = currentMap.nodes.filter(n => n.id !== selectedNode);
    if (otherNodes.length === 0) return;

    const targetNode = otherNodes[Math.floor(Math.random() * otherNodes.length)];
    
    const updatedMap = {
      ...currentMap,
      nodes: currentMap.nodes.map(node =>
        node.id === selectedNode
          ? { ...node, connections: [...node.connections, targetNode.id] }
          : node
      )
    };

    setCurrentMap(updatedMap);
    const updatedMaps = mindMaps.map(m => m.id === currentMap.id ? updatedMap : m);
    saveMindMaps(updatedMaps);
  };

  const deleteNode = () => {
    if (!currentMap || !selectedNode) return;

    const updatedMap = {
      ...currentMap,
      nodes: currentMap.nodes.filter(n => n.id !== selectedNode)
    };

    setCurrentMap(updatedMap);
    const updatedMaps = mindMaps.map(m => m.id === currentMap.id ? updatedMap : m);
    saveMindMaps(updatedMaps);
    setSelectedNode(null);
  };

  const exportAsImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `${currentMap?.title || 'mindmap'}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Brain className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold">Mind Map Creator</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Saved Maps */}
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">My Maps</h2>
              <button
                onClick={createNewMap}
                className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2">
              {mindMaps.map(map => (
                <div
                  key={map.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    currentMap?.id === map.id ? 'bg-purple-50 border-purple-300' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setCurrentMap(map)}
                >
                  <h3 className="font-medium text-sm">{map.title}</h3>
                  <p className="text-xs text-gray-500">{map.nodes.length} nodes</p>
                </div>
              ))}
            </div>
          </div>

          {/* Canvas */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg p-4">
              {currentMap && (
                <div className="flex items-center gap-2 mb-4">
                  <input
                    value={currentMap.title}
                    onChange={(e) => {
                      const updatedMap = { ...currentMap, title: e.target.value };
                      setCurrentMap(updatedMap);
                      const updatedMaps = mindMaps.map(m => m.id === currentMap.id ? updatedMap : m);
                      saveMindMaps(updatedMaps);
                    }}
                    className="font-semibold text-lg bg-transparent border-b border-gray-300 focus:border-purple-500 outline-none"
                  />
                  <div className="flex gap-2 ml-auto">
                    {selectedNode && (
                      <>
                        <button
                          onClick={connectNodes}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          Connect
                        </button>
                        <button
                          onClick={deleteNode}
                          className="bg-red-600 text-white p-1 rounded hover:bg-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={exportAsImage}
                      className="bg-green-600 text-white p-1 rounded hover:bg-green-700"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="border rounded-lg cursor-pointer w-full"
                onClick={handleCanvasClick}
              />

              {!currentMap && (
                <div className="text-center py-20">
                  <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Create Your First Mind Map</h3>
                  <p className="text-gray-600 mb-4">Visualize your ideas and concepts</p>
                  <button
                    onClick={createNewMap}
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
                  >
                    Get Started
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Node Editor Modal */}
        {showNodeEditor && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-semibold mb-4">Add Node</h3>
              <input
                value={nodeText}
                onChange={(e) => setNodeText(e.target.value)}
                placeholder="Node text"
                className="w-full p-3 border rounded-lg mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const pos = (window as any).newNodePosition;
                    if (pos) addNode(pos.x, pos.y);
                  }}
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowNodeEditor(false)}
                  className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}