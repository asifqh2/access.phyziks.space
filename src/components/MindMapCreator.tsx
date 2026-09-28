'use client';

import { useState, useEffect, useRef } from 'react';
import { Hand, Brain, Plus, Download, Trash2, Edit3, Maximize2, Minimize2 } from 'lucide-react';

interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color: string;
  type?: 'topic' | 'note';
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
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [showNodeEditor, setShowNodeEditor] = useState(false);
  const [nodeText, setNodeText] = useState('');
  const [nodeType, setNodeType] = useState<'topic' | 'note'>('topic');
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] = useState(false);
  const [disconnectMode, setDisconnectMode] = useState(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [isMobile, setIsMobile] = useState(false);

  // Drag and Drop Refs
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
  const noteColors = ['#FEF3C7', '#FEE2E2', '#DCFCE7', '#DBEAFE', '#F3E8FF', '#FFEDD5']; // Softer colors for notes

  const DEFAULT_TOPIC_SIZE = 60;
  const DEFAULT_NOTE_WIDTH = 140;
  const DEFAULT_NOTE_HEIGHT = 100;

  useEffect(() => {
    const saved = localStorage.getItem('mindMaps');
    if (saved) setMindMaps(JSON.parse(saved));
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      updateCanvasSize();
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const updateCanvasSize = () => {
    if (canvasRef.current) {
      const container = canvasRef.current.parentElement;
      if (container) {
        const width = Math.min(container.clientWidth - 32, 800);
        const height = window.innerWidth < 768 ? 400 : 600;
        setCanvasSize({ width, height });
      }
    }
  };

  useEffect(() => {
    drawMindMap();
  }, [currentMap, selectedNode]);

  // Handle Delete key for node deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNode && !showNodeEditor) {
        deleteNode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, showNodeEditor, currentMap]); // Dependencies needed for deleteNode to work correctly

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
        width: DEFAULT_TOPIC_SIZE,
        height: DEFAULT_TOPIC_SIZE,
        color: colors[0],
        type: 'topic',
        connections: []
      }],
      createdAt: new Date().toISOString()
    };
    setCurrentMap(newMap);
    saveMindMaps([...mindMaps, newMap]);
  };

  const deleteMindMap = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updatedMaps = mindMaps.filter(m => m.id !== id);
    saveMindMaps(updatedMaps);

    if (currentMap?.id === id) {
      setCurrentMap(updatedMaps.length > 0 ? updatedMaps[0] : null);
    }
  };

  const handleSort = () => {
    // Duplicate items
    const _mindMaps = [...mindMaps];

    // Remove and save the dragged item content
    if (dragItem.current === null || dragOverItem.current === null) return;

    const draggedItemContent = _mindMaps.splice(dragItem.current, 1)[0];

    // Switch the position
    _mindMaps.splice(dragOverItem.current, 0, draggedItemContent);

    // Update refs
    dragItem.current = dragOverItem.current;
    dragOverItem.current = null;

    // Update state
    saveMindMaps(_mindMaps);
  };

  const addNode = (x: number, y: number, type: 'topic' | 'note' = 'topic') => {
    if (!currentMap) return;

    const newNode: MindMapNode = {
      id: Date.now().toString(),
      text: nodeText || (type === 'topic' ? 'New Topic' : 'New Note'),
      x,
      y,
      width: type === 'topic' ? DEFAULT_TOPIC_SIZE : DEFAULT_NOTE_WIDTH,
      height: type === 'topic' ? DEFAULT_TOPIC_SIZE : DEFAULT_NOTE_HEIGHT,
      color: type === 'topic'
        ? colors[Math.floor(Math.random() * colors.length)]
        : noteColors[Math.floor(Math.random() * noteColors.length)],
      type,
      connections: []
    };

    const updatedMap = {
      ...currentMap,
      nodes: [...currentMap.nodes, newNode]
    };

    setCurrentMap(updatedMap);
    saveMindMaps(mindMaps.map(m => m.id === currentMap.id ? updatedMap : m));
    setShowNodeEditor(false);
    setNodeText('');
    setNodeType('topic');
  };

  const getLines = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  const drawMindMap = () => {
    const canvas = canvasRef.current;
    if (!canvas || !currentMap) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connections first (behind nodes)
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

      if (node.type === 'note') {
        const width = node.width || DEFAULT_NOTE_WIDTH;
        const height = node.height || DEFAULT_NOTE_HEIGHT;
        const x = node.x - width / 2;
        const y = node.y - height / 2;

        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;
        ctx.fillRect(x, y, width, height);
        ctx.shadowColor = 'transparent';

        if (selectedNode === node.id) {
          ctx.strokeStyle = '#1F2937';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, width, height);
        }

        ctx.fillStyle = '#1F2937';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const lineHeight = 20;
        const lines = getLines(ctx, node.text, width - 20);
        let currentY = node.y - ((lines.length - 1) * lineHeight) / 2;

        lines.forEach(line => {
          ctx.fillText(line, node.x, currentY);
          currentY += lineHeight;
        });

      } else {
        // Topic (Circle)
        const size = node.width || DEFAULT_TOPIC_SIZE;
        const radius = size / 2;

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        ctx.fill();

        if (selectedNode === node.id) {
          ctx.strokeStyle = '#1F2937';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.text.substring(0, 10), node.x, node.y);
      }
    });

  };

  const getNodeAtPosition = (x: number, y: number) => {
    if (!currentMap) return null;
    // Iterate in reverse to select top-most node first
    for (let i = currentMap.nodes.length - 1; i >= 0; i--) {
      const node = currentMap.nodes[i];
      if (node.type === 'note') {
        const width = node.width || DEFAULT_NOTE_WIDTH;
        const height = node.height || DEFAULT_NOTE_HEIGHT;
        if (x >= node.x - width / 2 && x <= node.x + width / 2 &&
          y >= node.y - height / 2 && y <= node.y + height / 2) {
          return node;
        }
      } else {
        const size = node.width || DEFAULT_TOPIC_SIZE;
        const radius = size / 2;
        const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
        if (distance <= radius) return node;
      }
    }
    return null;
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const getViewCenter = () => {
    if (canvasRef.current) {
      const width = canvasRef.current.width;
      const height = canvasRef.current.height;
      return {
        x: width / 2,
        y: height / 2
      };
    }
    return { x: 400, y: 300 };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentMap) return;
    const { x, y } = getMousePos(e);

    const clickedNode = getNodeAtPosition(x, y);

    if (connectionMode && clickedNode) {
      if (!connectionStart) {
        setConnectionStart(clickedNode.id);
        setSelectedNode(clickedNode.id);
      } else if (connectionStart !== clickedNode.id) {
        const updatedMap = {
          ...currentMap,
          nodes: currentMap.nodes.map(node =>
            node.id === connectionStart
              ? { ...node, connections: [...new Set([...node.connections, clickedNode.id])] }
              : node
          )
        };
        setCurrentMap(updatedMap);
        saveMindMaps(mindMaps.map(m => m.id === currentMap.id ? updatedMap : m));
        setConnectionStart(null);
        setConnectionMode(false);
      }
    } else if (disconnectMode && clickedNode) {
      if (!connectionStart) {
        setConnectionStart(clickedNode.id);
        setSelectedNode(clickedNode.id);
      } else if (connectionStart !== clickedNode.id) {
        removeConnection(connectionStart, clickedNode.id);
        setConnectionStart(null);
        setDisconnectMode(false);
      }
    } else if (clickedNode && !connectionMode && !disconnectMode) {
      setDraggingNode(clickedNode.id);
      setSelectedNode(clickedNode.id);
    } else {
      // Clicked on empty space
      if (!connectionMode && !disconnectMode) {
        setSelectedNode(null);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingNode || !currentMap) return;
    const { x, y } = getMousePos(e);

    const updatedMap = {
      ...currentMap,
      nodes: currentMap.nodes.map(node =>
        node.id === draggingNode ? { ...node, x, y } : node
      )
    };
    setCurrentMap(updatedMap);
    drawMindMap();
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (draggingNode && currentMap) {
      saveMindMaps(mindMaps.map(m => m.id === currentMap.id ? currentMap : m));
      setDraggingNode(null);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    handleMouseDown(e as any);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    handleMouseMove(e as any);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    handleMouseUp(e as any);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMousePos(e);

    const clickedNode = getNodeAtPosition(x, y);

    if (clickedNode) {
      // Edit existing
      setNodeText(clickedNode.text);
      setEditingNode(clickedNode.id);
      setNodeType(clickedNode.type || 'topic');
      setShowNodeEditor(true);
    } else {
      // Create new Topic
      setSelectedNode(null);
      setNodeType('topic');
      (window as any).newNodePosition = { x, y };
      setShowNodeEditor(true);
    }
  };

  const toggleConnectionMode = () => {
    setConnectionMode(!connectionMode);
    setDisconnectMode(false);
    setConnectionStart(null);
  };

  const toggleDisconnectMode = () => {
    setDisconnectMode(!disconnectMode);
    setConnectionMode(false);
    setConnectionStart(null);
  };

  const removeConnection = (nodeId: string, connId: string) => {
    if (!currentMap) return;
    const updatedMap = {
      ...currentMap,
      nodes: currentMap.nodes.map(node =>
        node.id === nodeId
          ? { ...node, connections: node.connections.filter(c => c !== connId) }
          : node
      )
    };
    setCurrentMap(updatedMap);
    saveMindMaps(mindMaps.map(m => m.id === currentMap.id ? updatedMap : m));
  };

  const editNode = () => {
    if (!selectedNode || !currentMap) return;
    const node = currentMap.nodes.find(n => n.id === selectedNode);
    if (node) {
      setNodeText(node.text);
      setEditingNode(selectedNode);
      setNodeType(node.type || 'topic');
      setShowNodeEditor(true);
    }
  };

  const updateNode = () => {
    if (!currentMap || !editingNode) return;
    const updatedMap = {
      ...currentMap,
      nodes: currentMap.nodes.map(node =>
        node.id === editingNode ? { ...node, text: nodeText } : node
      )
    };
    setCurrentMap(updatedMap);
    saveMindMaps(mindMaps.map(m => m.id === currentMap.id ? updatedMap : m));
    setShowNodeEditor(false);
    setNodeText('');
    setEditingNode(null);
  };

  const resizeNode = (delta: number) => {
    if (!currentMap || !selectedNode) return;

    const updatedMap = {
      ...currentMap,
      nodes: currentMap.nodes.map(node => {
        if (node.id !== selectedNode) return node;

        // Use larger, fixed increments (20px) for visibility
        const step = 20 * delta;

        if (node.type === 'note') {
          const currentW = node.width || DEFAULT_NOTE_WIDTH;
          const currentH = node.height || DEFAULT_NOTE_HEIGHT;
          return {
            ...node,
            width: Math.max(60, currentW + step),
            height: Math.max(60, currentH + step)
          };
        } else {
          // Topic
          const currentSize = node.width || DEFAULT_TOPIC_SIZE;
          return {
            ...node,
            width: Math.max(30, currentSize + step)
          };
        }
      })
    };

    setCurrentMap(updatedMap);
    saveMindMaps(mindMaps.map(m => m.id === currentMap.id ? updatedMap : m));
  };

  const deleteNode = () => {
    if (!currentMap || !selectedNode) return;

    const updatedMap = {
      ...currentMap,
      nodes: currentMap.nodes.filter(n => n.id !== selectedNode)
    };

    setCurrentMap(updatedMap);
    saveMindMaps(mindMaps.map(m => m.id === currentMap.id ? updatedMap : m));
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-lg p-4 max-h-[300px] lg:max-h-none overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">My Maps</h2>
              <button
                onClick={createNewMap}
                className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700"
                title="New Mind Map"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {mindMaps.map((map, index) => (
                <div
                  key={map.id}
                  draggable
                  onDragStart={(e) => {
                    dragItem.current = index;
                    // Optional: set ghost image
                  }}
                  onDragEnter={(e) => {
                    dragOverItem.current = index;
                  }}
                  onDragEnd={handleSort}
                  onDragOver={(e) => e.preventDefault()}
                  className={`p-3 rounded-lg border cursor-move transition-colors ${currentMap?.id === map.id ? 'bg-purple-50 border-purple-300' : 'hover:bg-gray-50'
                    }`}
                  onClick={() => setCurrentMap(map)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-sm">{map.title}</h3>
                      <p className="text-xs text-gray-500">{map.nodes.length} nodes</p>
                    </div>
                    <button
                      onClick={(e) => deleteMindMap(e, map.id)}
                      className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50"
                      title="Delete Map"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg p-4">
              {currentMap && (
                <div className="flex flex-col md:flex-row items-start md:items-center gap-2 mb-4">
                  <input
                    value={currentMap.title}
                    onChange={(e) => {
                      const updatedMap = { ...currentMap, title: e.target.value };
                      setCurrentMap(updatedMap);
                      saveMindMaps(mindMaps.map(m => m.id === currentMap.id ? updatedMap : m));
                    }}
                    className="font-semibold text-lg bg-transparent border-b border-gray-300 focus:border-purple-500 outline-none w-full md:w-auto"
                  />
                  <div className="flex gap-1 w-full md:w-auto overflow-x-auto pb-1">
                    {/* Add Buttons */}
                    <button
                      onClick={() => {
                        setNodeType('topic');
                        setShowNodeEditor(true);
                        (window as any).newNodePosition = getViewCenter();
                      }}
                      className="bg-indigo-600 text-white px-2 py-1 rounded text-xs md:text-sm hover:bg-indigo-700 flex items-center gap-1 whitespace-nowrap flex-shrink-0"
                      title="Add Topic"
                    >
                      <Plus className="w-3 h-3" /> {!isMobile && 'Topic'}
                    </button>
                    <button
                      onClick={() => {
                        setNodeType('note');
                        setShowNodeEditor(true);
                        (window as any).newNodePosition = getViewCenter();
                      }}
                      className="bg-yellow-500 text-white px-2 py-1 rounded text-xs md:text-sm hover:bg-yellow-600 flex items-center gap-1 whitespace-nowrap flex-shrink-0"
                      title="Add Note"
                    >
                      <Plus className="w-3 h-3" /> {!isMobile && 'Note'}
                    </button>

                    <button
                      onClick={toggleConnectionMode}
                      className={`px-2 py-1 rounded text-xs md:text-sm whitespace-nowrap flex-shrink-0 ${connectionMode
                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                    >
                      {isMobile ? '🔗' : (connectionMode ? (connectionStart ? 'Target' : 'Start') : 'Connect')}
                    </button>

                    <button
                      onClick={toggleDisconnectMode}
                      className={`px-2 py-1 rounded text-xs md:text-sm whitespace-nowrap flex-shrink-0 ${disconnectMode
                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                        : 'bg-red-600 text-white hover:bg-red-700'
                        }`}
                    >
                      {isMobile ? '✂️' : (disconnectMode ? (connectionStart ? 'Target' : 'Start') : 'Disconnect')}
                    </button>

                    {selectedNode && (
                      <>
                        <button
                          onClick={() => resizeNode(1)}
                          className="bg-gray-100 text-gray-700 p-1 rounded hover:bg-gray-200 flex-shrink-0"
                          title="Increase Size"
                        >
                          <Maximize2 className="w-3 h-3 md:w-4 md:h-4" />
                        </button>
                        <button
                          onClick={() => resizeNode(-1)}
                          className="bg-gray-100 text-gray-700 p-1 rounded hover:bg-gray-200 flex-shrink-0"
                          title="Decrease Size"
                        >
                          <Minimize2 className="w-3 h-3 md:w-4 md:h-4" />
                        </button>
                        <button
                          onClick={editNode}
                          className="bg-purple-600 text-white p-1 rounded hover:bg-purple-700 flex-shrink-0"
                          title="Edit Node"
                        >
                          <Edit3 className="w-3 h-3 md:w-4 md:h-4" />
                        </button>
                        <button
                          onClick={deleteNode}
                          className="bg-red-600 text-white p-1 rounded hover:bg-red-700 flex-shrink-0"
                          title="Delete Node"
                        >
                          <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={exportAsImage}
                      className="bg-green-600 text-white p-1 rounded hover:bg-green-700 flex-shrink-0"
                      title="Export as Image"
                    >
                      <Download className="w-3 h-3 md:w-4 md:h-4" />
                    </button>
                  </div>
                </div>
              )}

              <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                className={`border rounded-lg w-full touch-none ${connectionMode ? 'cursor-crosshair'
                  : disconnectMode ? 'cursor-not-allowed'
                  : draggingNode ? 'cursor-grabbing'
                    : 'cursor-pointer'
                  }`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onDoubleClick={handleDoubleClick}
                onMouseLeave={() => setDraggingNode(null)}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
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

        {showNodeEditor && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
              <h3 className="text-lg font-semibold mb-4">
                {editingNode ? 'Edit ' : 'New '}{nodeType === 'note' ? 'Note' : 'Topic'}
              </h3>
              <input
                value={nodeText}
                onChange={(e) => setNodeText(e.target.value)}
                placeholder={nodeType === 'note' ? "Note content..." : "Topic name..."}
                className="w-full p-3 border rounded-lg mb-4 focus:ring-2 focus:ring-purple-500 outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    editingNode ? updateNode() : (() => {
                      const pos = (window as any).newNodePosition;
                      if (pos) addNode(pos.x, pos.y, nodeType);
                    })();
                  } else if (e.key === 'Escape') {
                    setShowNodeEditor(false);
                    setNodeText('');
                    setEditingNode(null);
                  }
                }}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (editingNode) {
                      updateNode();
                    } else {
                      const pos = (window as any).newNodePosition;
                      if (pos) addNode(pos.x, pos.y, nodeType);
                    }
                  }}
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
                >
                  {editingNode ? 'Update' : 'Add'}
                </button>
                <button
                  onClick={() => {
                    setShowNodeEditor(false);
                    setNodeText('');
                    setEditingNode(null);
                  }}
                  className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedNode && currentMap && !isMobile && (
          <div className="fixed bottom-4 right-4 bg-white rounded-xl shadow-lg p-4 max-w-xs">
            <h3 className="font-semibold mb-2">Node Info</h3>
            {(() => {
              const node = currentMap.nodes.find(n => n.id === selectedNode);
              if (!node) return null;
              return (
                <>
                  <p className="text-sm mb-2"><strong>Text:</strong> {node.text}</p>
                  <p className="text-sm mb-2"><strong>Connections:</strong> {node.connections.length}</p>
                  {node.connections.length > 0 && (
                    <div className="space-y-1">
                      {node.connections.map(connId => {
                        const connNode = currentMap.nodes.find(n => n.id === connId);
                        return connNode ? (
                          <div key={connId} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                            <span>{connNode.text}</span>
                            <button
                              onClick={() => removeConnection(node.id, connId)}
                              className="text-red-600 hover:text-red-800"
                            >
                              ✕
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
