'use client';

import { useState, useEffect, useRef } from 'react';
import { Users, Plus, MessageCircle, Calendar, BookOpen, Share2, Phone, PhoneOff, Copy, UserPlus, Mic, MicOff, Video, VideoOff, LogOut } from 'lucide-react';

interface StudyGroup {
  id: string;
  name: string;
  subject: string;
  description: string;
  members: string[];
  createdBy: string;
  createdAt: string;
  messages: Message[];
  maxMembers: number;
}

interface Message {
  id: string;
  author: string;
  content: string;
  timestamp: string;
}

interface PeerConnection {
  id: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

export default function StudyGroups() {
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [userName, setUserName] = useState('');
  const [joinGroupId, setJoinGroupId] = useState('');
  const [isInCall, setIsInCall] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messagePollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const savedGroups = localStorage.getItem('studyGroups');
    const savedUserName = localStorage.getItem('userName');
    
    if (savedGroups) setGroups(JSON.parse(savedGroups));
    if (savedUserName) setUserName(savedUserName);
    
    // Check URL hash for shared group
    const hash = window.location.hash;
    if (hash.startsWith('#join=')) {
      try {
        const groupData = hash.replace('#join=', '');
        const decodedGroup = JSON.parse(atob(groupData));
        
        // Add shared group to local storage if not exists
        const currentGroups = savedGroups ? JSON.parse(savedGroups) : [];
        const existingGroup = currentGroups.find((g: StudyGroup) => g.id === decodedGroup.id);
        
        if (!existingGroup) {
          const updatedGroups = [...currentGroups, decodedGroup];
          setGroups(updatedGroups);
          localStorage.setItem('studyGroups', JSON.stringify(updatedGroups));
        }
        
        // Auto-select the shared group and show join form
        setSelectedGroup(decodedGroup);
        setJoinGroupId(decodedGroup.id);
        setShowJoinForm(true);
        
        // Clear hash
        window.history.replaceState(null, '', window.location.pathname);
      } catch (error) {
        console.error('Invalid share link');
      }
    }
  }, []);

  const saveGroups = (newGroups: StudyGroup[]) => {
    setGroups(newGroups);
    localStorage.setItem('studyGroups', JSON.stringify(newGroups));
  };

  const createGroup = (formData: FormData) => {
    if (!userName) {
      const name = prompt('Enter your name:');
      if (!name) return;
      setUserName(name);
      localStorage.setItem('userName', name);
    }

    const newGroup: StudyGroup = {
      id: Date.now().toString(),
      name: formData.get('name') as string,
      subject: formData.get('subject') as string,
      description: formData.get('description') as string,
      members: [userName],
      createdBy: userName,
      createdAt: new Date().toISOString(),
      messages: [],
      maxMembers: 5
    };

    saveGroups([...groups, newGroup]);
    setShowCreateForm(false);
  };

  const joinGroup = (groupId: string) => {
    if (!userName) {
      const name = prompt('Enter your name:');
      if (!name) return;
      setUserName(name);
      localStorage.setItem('userName', name);
    }

    const updatedGroups = groups.map(group => {
      if (group.id === groupId && !group.members.includes(userName) && group.members.length < group.maxMembers) {
        // Add join notification message
        const joinMessage: Message = {
          id: Date.now().toString(),
          author: 'System',
          content: `${userName} joined the group`,
          timestamp: new Date().toISOString()
        };
        return { 
          ...group, 
          members: [...group.members, userName],
          messages: [...group.messages, joinMessage]
        };
      }
      return group;
    });
    saveGroups(updatedGroups);
  };

  const joinByGroupId = () => {
    const group = groups.find(g => g.id === joinGroupId);
    
    if (!group) {
      alert('Group not found! Make sure the Group ID is correct.');
      return;
    }
    
    if (group.members.length >= group.maxMembers) {
      alert('Group is full!');
      return;
    }
    
    joinGroup(joinGroupId);
    setShowJoinForm(false);
    setJoinGroupId('');
    setSelectedGroup(group);
  };

  const leaveGroup = (groupId: string) => {
    const updatedGroups = groups.map(group => {
      if (group.id === groupId && group.members.includes(userName)) {
        const leaveMessage: Message = {
          id: Date.now().toString(),
          author: 'System',
          content: `${userName} left the group`,
          timestamp: new Date().toISOString()
        };
        return { 
          ...group, 
          members: group.members.filter(member => member !== userName),
          messages: [...group.messages, leaveMessage]
        };
      }
      return group;
    });
    saveGroups(updatedGroups);
    setSelectedGroup(null);
  };

  const copyGroupId = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    
    // Encode group data in URL hash for cross-device sharing
    const groupData = btoa(JSON.stringify({
      id: group.id,
      name: group.name,
      subject: group.subject,
      description: group.description,
      createdBy: group.createdBy,
      createdAt: group.createdAt,
      members: group.members,
      maxMembers: group.maxMembers,
      messages: group.messages
    }));
    
    const shareUrl = `${window.location.origin}/study-groups#join=${groupData}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Share link copied! Send this to your friends to join the group.');
  };

  const sendMessage = (groupId: string, content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      author: userName || 'System',
      content,
      timestamp: new Date().toISOString()
    };

    const updatedGroups = groups.map(group =>
      group.id === groupId
        ? { ...group, messages: [...group.messages, message] }
        : group
    );
    saveGroups(updatedGroups);
    
    // Update selected group immediately
    const updatedSelectedGroup = updatedGroups.find(g => g.id === groupId);
    if (updatedSelectedGroup) {
      setSelectedGroup(updatedSelectedGroup);
    }
  };

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setIsInCall(true);
      
      connectToSignaling();
      
      if (selectedGroup) {
        sendMessage(selectedGroup.id, `${userName} joined the call`);
      }
      
      startMessagePolling();
    } catch (error) {
      alert('Camera/microphone access denied');
    }
  };

  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    peers.forEach(peer => peer.connection.close());
    setPeers(new Map());
    setRemoteStreams(new Map());
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (selectedGroup) {
      sendMessage(selectedGroup.id, `${userName} left the call`);
    }
    
    setIsInCall(false);
    setIsMuted(false);
    setIsVideoOff(false);
    
    if (messagePollingRef.current) {
      clearInterval(messagePollingRef.current);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const connectToSignaling = () => {
    const ws = new WebSocket(`wss://socketsbay.com/wss/v2/1/${selectedGroup?.id}/`);
    wsRef.current = ws;
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join-room', user: userName }));
    };
    
    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'user-joined':
          if (data.user !== userName) {
            await createPeerConnection(data.user);
          }
          break;
        case 'offer':
          await handleOffer(data.offer, data.from);
          break;
        case 'answer':
          await handleAnswer(data.answer, data.from);
          break;
        case 'ice-candidate':
          await handleIceCandidate(data.candidate, data.from);
          break;
      }
    };
  };

  const createPeerConnection = async (peerId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }
    
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemoteStreams(prev => new Map(prev.set(peerId, remoteStream)));
    };
    
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate,
          to: peerId
        }));
      }
    };
    
    setPeers(prev => new Map(prev.set(peerId, { id: peerId, connection: pc })));
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'offer',
        offer,
        to: peerId
      }));
    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit, from: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }
    
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemoteStreams(prev => new Map(prev.set(from, remoteStream)));
    };
    
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate,
          to: from
        }));
      }
    };
    
    setPeers(prev => new Map(prev.set(from, { id: from, connection: pc })));
    
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'answer',
        answer,
        to: from
      }));
    }
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit, from: string) => {
    const peer = peers.get(from);
    if (peer) {
      await peer.connection.setRemoteDescription(answer);
    }
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit, from: string) => {
    const peer = peers.get(from);
    if (peer) {
      await peer.connection.addIceCandidate(candidate);
    }
  };

  // Simulate real-time message polling (replace with WebSocket in production)
  const startMessagePolling = () => {
    messagePollingRef.current = setInterval(() => {
      const savedGroups = localStorage.getItem('studyGroups');
      if (savedGroups && selectedGroup) {
        const currentGroups = JSON.parse(savedGroups);
        const updatedGroup = currentGroups.find((g: StudyGroup) => g.id === selectedGroup.id);
        if (updatedGroup && updatedGroup.messages.length !== selectedGroup.messages.length) {
          setSelectedGroup(updatedGroup);
          setGroups(currentGroups);
        }
      }
    }, 2000); // Poll every 2 seconds
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (messagePollingRef.current) {
        clearInterval(messagePollingRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Users className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Study Groups</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Groups List */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-white rounded-xl shadow-lg p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg lg:text-xl font-semibold">Groups</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowJoinForm(true)}
                    className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 text-sm lg:text-base"
                    title="Join by ID"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 text-sm lg:text-base"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {groups.map(group => (
                  <div
                    key={group.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedGroup?.id === group.id ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedGroup(group)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{group.name}</h3>
                        <p className="text-sm text-gray-600">{group.subject}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <Users className="w-3 h-3" />
                          {group.members.length}/{group.maxMembers} members
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyGroupId(group.id);
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                        title="Share Group Link"
                      >
                        <Share2 className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Group Details/Chat */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            {selectedGroup ? (
              <GroupChat
                group={selectedGroup}
                userName={userName}
                onSendMessage={sendMessage}
                onJoinGroup={joinGroup}
                onLeaveGroup={leaveGroup}
                isInCall={isInCall}
                onStartCall={startCall}
                onEndCall={endCall}
                onToggleMute={toggleMute}
                onToggleVideo={toggleVideo}
                isMuted={isMuted}
                isVideoOff={isVideoOff}
                localVideoRef={localVideoRef}
                remoteStreams={remoteStreams}
              />
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8 text-center">
                <BookOpen className="w-12 h-12 lg:w-16 lg:h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg lg:text-xl font-semibold mb-2">Select a Study Group</h3>
                <p className="text-gray-600 text-sm lg:text-base">Choose a group to start collaborating</p>
              </div>
            )}
          </div>
        </div>

        {/* Create Group Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold mb-4">Create Study Group</h3>
              <form action={createGroup}>
                <input
                  name="name"
                  placeholder="Group Name"
                  className="w-full p-3 border rounded-lg mb-3"
                  required
                />
                <input
                  name="subject"
                  placeholder="Subject"
                  className="w-full p-3 border rounded-lg mb-3"
                  required
                />
                <textarea
                  name="description"
                  placeholder="Description"
                  className="w-full p-3 border rounded-lg mb-4 h-20"
                  required
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 bg-gray-300 py-2 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Join Group Modal */}
        {showJoinForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold mb-4">Join Study Group</h3>
              <input
                value={joinGroupId}
                onChange={(e) => setJoinGroupId(e.target.value)}
                placeholder="Enter Group ID"
                className="w-full p-3 border rounded-lg mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={joinByGroupId}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                >
                  Join
                </button>
                <button
                  onClick={() => setShowJoinForm(false)}
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

function GroupChat({ group, userName, onSendMessage, onJoinGroup, onLeaveGroup, isInCall, onStartCall, onEndCall, onToggleMute, onToggleVideo, isMuted, isVideoOff, localVideoRef, remoteStreams }: {
  group: StudyGroup;
  userName: string;
  onSendMessage: (groupId: string, content: string) => void;
  onJoinGroup: (groupId: string) => void;
  onLeaveGroup: (groupId: string) => void;
  isInCall: boolean;
  onStartCall: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  isMuted: boolean;
  isVideoOff: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteStreams: Map<string, MediaStream>;
}) {
  const [message, setMessage] = useState('');
  const isMember = group.members.includes(userName);
  const canJoin = group.members.length < group.maxMembers;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(group.id, message);
      setMessage('');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg flex flex-col h-[500px] lg:h-auto">
      <div className="p-3 lg:p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm lg:text-base truncate">{group.name}</h3>
            <p className="text-xs lg:text-sm text-gray-600 truncate">{group.subject}</p>
            <p className="text-xs text-gray-500 truncate">
              {group.members.length}/{group.maxMembers} members: {group.members.join(', ')}
            </p>
          </div>
          <div className="flex gap-1 lg:gap-2 ml-2">
            {isMember && (
              <>
                {isInCall && (
                  <>
                    <button
                      onClick={onToggleMute}
                      className={`p-2 rounded-lg text-white text-xs lg:text-sm ${
                        isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'
                      }`}
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <MicOff className="w-3 h-3 lg:w-4 lg:h-4" /> : <Mic className="w-3 h-3 lg:w-4 lg:h-4" />}
                    </button>
                    <button
                      onClick={onToggleVideo}
                      className={`p-2 rounded-lg text-white text-xs lg:text-sm ${
                        isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'
                      }`}
                      title={isVideoOff ? 'Turn on video' : 'Turn off video'}
                    >
                      {isVideoOff ? <VideoOff className="w-3 h-3 lg:w-4 lg:h-4" /> : <Video className="w-3 h-3 lg:w-4 lg:h-4" />}
                    </button>
                  </>
                )}
                <button
                  onClick={isInCall ? onEndCall : onStartCall}
                  className={`p-2 rounded-lg text-white text-xs lg:text-sm ${
                    isInCall ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isInCall ? <PhoneOff className="w-3 h-3 lg:w-4 lg:h-4" /> : <Phone className="w-3 h-3 lg:w-4 lg:h-4" />}
                </button>
                <button
                  onClick={() => onLeaveGroup(group.id)}
                  className="p-2 rounded-lg text-white text-xs lg:text-sm bg-red-600 hover:bg-red-700"
                  title="Leave Group"
                >
                  <LogOut className="w-3 h-3 lg:w-4 lg:h-4" />
                </button>
              </>
            )}
            {!isMember && canJoin && (
              <button
                onClick={() => onJoinGroup(group.id)}
                className="bg-green-600 text-white px-2 lg:px-4 py-2 rounded-lg hover:bg-green-700 text-xs lg:text-sm"
              >
                Join
              </button>
            )}
            {!canJoin && !isMember && (
              <span className="text-red-600 text-xs lg:text-sm">Full</span>
            )}
          </div>
        </div>
      </div>

      {/* Video Call Area */}
      {isInCall && (
        <div className="p-2 lg:p-4 bg-gray-100 border-b">
          <div className="grid grid-cols-2 gap-2 lg:gap-4">
            <div className="relative">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                className="w-full h-24 lg:h-32 bg-black rounded-lg object-cover"
              />
              <span className="absolute bottom-1 left-1 text-white text-xs bg-black/50 px-1 py-0.5 rounded">
                You {isMuted && '🔇'} {isVideoOff && '📹'}
              </span>
            </div>
            {Array.from(remoteStreams.entries()).map(([peerId, stream]) => (
              <RemoteVideo key={peerId} stream={stream} peerId={peerId} />
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 p-3 lg:p-4 overflow-y-auto min-h-0">
        {group.messages.map(msg => (
          <div key={msg.id} className="mb-2 lg:mb-3">
            {msg.author === 'System' ? (
              <div className="text-center">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {msg.content}
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-xs lg:text-sm">{msg.author}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs lg:text-sm bg-gray-100 p-2 rounded break-words">{msg.content}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {isMember && (
        <form onSubmit={handleSend} className="p-3 lg:p-4 border-t flex gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded-lg text-sm lg:text-base"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-3 lg:px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
}

function RemoteVideo({ stream, peerId }: { stream: MediaStream; peerId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  
  return (
    <div className="relative">
      <video
        ref={videoRef}
        autoPlay
        className="w-full h-24 lg:h-32 bg-gray-800 rounded-lg object-cover"
      />
      <span className="absolute bottom-1 left-1 text-white text-xs bg-black/50 px-1 py-0.5 rounded">
        {peerId}
      </span>
    </div>
  );
}