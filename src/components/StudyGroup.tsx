'use client';

import { useState, useEffect, useRef } from 'react';
import type { DataConnection } from 'peerjs';
import { Users, MessageSquare, LogOut, Copy, Send, Play } from 'lucide-react';

interface Message {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: number;
    isSystem?: boolean;
}

interface PeerData {
    id: string;
    conn: DataConnection;
    name: string;
}

export default function StudyGroup() {
    const [peerId, setPeerId] = useState<string>('');
    const [targetId, setTargetId] = useState<string>('');
    const [username, setUsername] = useState<string>('');
    const [isHost, setIsHost] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [connectedPeers, setConnectedPeers] = useState<PeerData[]>([]);
    const [error, setError] = useState<string>('');

    const peerRef = useRef<any>(null); // Use any for Peer to avoid type issues if not fully typed
    const connectionsRef = useRef<PeerData[]>([]);

    useEffect(() => {
        // Dynamically import PeerJS to avoid SSR issues
        const initPeer = async () => {
            const { Peer } = await import('peerjs');
            const peer = new Peer();

            peer.on('open', (id) => {
                setPeerId(id);
            });

            // Host receiving connection
            peer.on('connection', (conn) => {
                handleConnection(conn);
            });

            peer.on('error', (err) => {
                console.error('Peer error:', err);
                setError('Connection error: ' + err.type);
            });

            peerRef.current = peer;
        };

        initPeer();

        return () => {
            if (peerRef.current) {
                peerRef.current.destroy();
            }
        };
    }, []);

    const handleConnection = (conn: DataConnection) => {
        // Logic for Host specifically to check constraints
        // But initially, we don't know if we are host or not just by 'on connection'
        // However, usually only Host sits and waits for connections in this star topology
        // Clients *initiate* the connection.

        conn.on('open', () => {
            // Check max connections (Host only logic, effectively)
            // existing connections + new one + host himself
            // Constraint: Max 5 users. Host + 4 peers.
            if (connectionsRef.current.length >= 4) {
                conn.send({ type: 'error', message: 'Room is full (Max 5 users).' });
                setTimeout(() => conn.close(), 500);
                return;
            }

            // Ask for metadata (username)
            // Note: PeerJS connect options sends metadata, but we can also just wait for a 'join' message
        });

        conn.on('data', (data: any) => {
            handleData(data, conn);
        });

        conn.on('close', () => {
            removePeer(conn.peer);
        });
    };

    const removePeer = (id: string) => {
        const peer = connectionsRef.current.find(p => p.id === id);
        if (peer) {
            addSystemMessage(`${peer.name || 'User'} left the room.`);
            connectionsRef.current = connectionsRef.current.filter(p => p.id !== id);
            setConnectedPeers([...connectionsRef.current]);
            if (isHost) {
                broadcastUserList();
            }
        }
    };

    const addSystemMessage = (text: string) => {
        const msg: Message = {
            id: Date.now().toString() + Math.random(),
            senderId: 'system',
            senderName: 'System',
            text,
            timestamp: Date.now(),
            isSystem: true
        };
        setMessages(prev => [...prev, msg]);
        if (isHost) broadcastMessage(msg);
    };

    const handleData = (data: any, conn: DataConnection) => {
        if (data.type === 'join') {
            // User joining logic
            const newPeer: PeerData = { id: conn.peer, conn, name: data.username };
            connectionsRef.current.push(newPeer);
            setConnectedPeers([...connectionsRef.current]);

            addSystemMessage(`${data.username} joined the room.`);

            // If I am host, broadcast this new user list to everyone
            if (isHost || connectionsRef.current.length > 0) {
                broadcastUserList();
                // Also send existing chat history to new user? (Optional, maybe skip for now for simplicity)
            }
        } else if (data.type === 'chat') {
            // Received chat message
            const msg = data.message;
            setMessages(prev => [...prev, msg]);

            // If I am host, I must relay this to everyone else
            if (isHost) {
                broadcastMessage(msg, conn.peer); // Don't send back to sender
            }
        } else if (data.type === 'list') {
            // Received user list update (Client side)
            // Just simple display logic, maybe not strictly needed for MVP but good for "Visible to each person" constraint
        } else if (data.type === 'error') {
            setError(data.message);
            conn.close();
        }
    };

    const broadcastMessage = (msg: Message, excludePeerId?: string) => {
        connectionsRef.current.forEach(p => {
            if (p.id !== excludePeerId) {
                p.conn.send({ type: 'chat', message: msg });
            }
        });
    };

    const broadcastUserList = () => {
        // Send list of names
        const names = connectionsRef.current.map(p => p.name);
        // Add host name? We need to store host name too.
        // For simplicity, let's just trigger 'chat' updates primarily.
    };

    const createRoom = () => {
        if (!username) {
            setError('Please enter a username');
            return;
        }
        setIsHost(true);
        setIsConnected(true);
        setError('');
        // Wait for peerId to be sure, though it should be set by now. 
        // We will just say "Share the Room ID displayed above".
        addSystemMessage('Room created. Room ID is displayed at the top.');
    };

    const joinRoom = () => {
        if (!username) {
            setError('Please enter a username');
            return;
        }
        if (!targetId || !peerRef.current) {
            setError('Please enter a Room ID');
            return;
        }

        const conn = peerRef.current.connect(targetId);

        conn.on('open', () => {
            setIsConnected(true);
            setIsHost(false);
            setError('');

            // Send join info
            conn.send({ type: 'join', username });

            // Store host connection
            connectionsRef.current = [{ id: targetId, conn, name: 'Host' }];
            setConnectedPeers([{ id: targetId, conn, name: 'Host' }]);
        });

        conn.on('data', (data: any) => {
            if (data.type === 'chat') {
                setMessages(prev => [...prev, data.message]);
            } else if (data.type === 'error') {
                setError(data.message);
                setIsConnected(false);
            }
        });

        conn.on('close', () => {
            setIsConnected(false);
            setError('Disconnected from room.');
            setMessages([]);
        });

        conn.on('error', (err: any) => {
            setError('Connection failed');
        });
    };

    const sendMessage = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim()) return;

        const msg: Message = {
            id: Date.now().toString(),
            senderId: peerId,
            senderName: username,
            text: inputText.trim(),
            timestamp: Date.now()
        };

        // Add to own list
        setMessages(prev => [...prev, msg]);

        // Send to peers
        if (isHost) {
            broadcastMessage(msg);
        } else {
            // Client sends to host
            if (connectionsRef.current[0]) {
                connectionsRef.current[0].conn.send({ type: 'chat', message: msg });
            }
        }

        setInputText('');
    };

    const leaveRoom = () => {
        if (peerRef.current) {
            peerRef.current.destroy();
            // Re-init peer logic if simple destroy is too aggressive, but for "destroy whole" it fits.
            // Actually better to just refresh page or reset state.
            window.location.reload();
        }
    };

    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-xl shadow-lg max-w-md mx-auto mt-10">
                <div className="bg-purple-100 p-4 rounded-full mb-4">
                    <Users className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Study Group</h2>

                <div className="w-full space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="Enter your name"
                        />
                    </div>

                    {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}

                    <div className="flex gap-4 pt-2">
                        <button
                            onClick={createRoom}
                            disabled={!peerId || !username}
                            className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {peerId ? 'Create Room' : 'Initializing Connection...'}
                        </button>
                    </div>

                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
                        <div className="relative flex justify-center text-sm"><span className="px-2 bg-gray-50 text-gray-500">OR</span></div>
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={targetId}
                            onChange={e => setTargetId(e.target.value)}
                            className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="Enter Room ID to Join"
                        />
                        <button
                            onClick={joinRoom}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium transition-colors"
                        >
                            Join
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[600px] max-w-4xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden mt-6 border border-gray-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Users className="w-6 h-6" />
                    <div>
                        <h2 className="font-bold text-lg">Study Group Room</h2>
                        <p className="text-xs opacity-90 text-purple-100">
                            {isHost ? 'Host' : 'Member'} • {connectedPeers.length + 1} Online (Max 5)
                        </p>
                    </div>
                </div>
                <button
                    onClick={leaveRoom}
                    className="bg-white/10 p-2 rounded hover:bg-white/20 transition-colors"
                    title="Leave Room"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>

            {/* Info Bar (Room ID) */}
            <div className="bg-gray-50 p-3 border-b border-gray-100 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                    <span className="font-medium">Room ID:</span>
                    <code className="bg-purple-100 text-purple-800 px-3 py-1 rounded font-bold text-base select-all border border-purple-200">
                        {(isHost ? peerId : targetId) || "Loading ID..."}
                    </code>
                </div>
                <button
                    onClick={() => navigator.clipboard.writeText(isHost ? peerId : targetId)}
                    className="text-purple-600 hover:text-purple-700 flex items-center gap-1 text-xs font-medium bg-purple-50 px-2 py-1 rounded hover:bg-purple-100 transition-colors"
                >
                    <Copy className="w-3 h-3" /> Copy ID
                </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.isSystem ? 'justify-center' : msg.senderId === peerId ? 'justify-end' : 'justify-start'}`}
                    >
                        {msg.isSystem ? (
                            <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                                {msg.text}
                            </span>
                        ) : (
                            <div className={`max-w-[70%] ${msg.senderId === peerId ? 'items-end' : 'items-start'} flex flex-col`}>
                                <span className="text-xs text-gray-500 mb-1 px-1">
                                    {msg.senderId === peerId ? 'You' : msg.senderName}
                                </span>
                                <div className={`p-3 rounded-2xl shadow-sm text-sm ${msg.senderId === peerId
                                    ? 'bg-purple-600 text-white rounded-tr-none'
                                    : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                                    }`}>
                                    {msg.text}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <form onSubmit={sendMessage} className="p-4 bg-white border-t border-gray-100 flex gap-2">
                <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 p-3 border border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                />
                <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="bg-purple-600 text-white p-3 rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    <Send className="w-5 h-5" />
                </button>
            </form>
        </div>
    );
}
