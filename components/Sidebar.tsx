import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useTheme } from '../context/ThemeContext';
import { Search, Moon, Sun, LogOut, UserPlus, PlusCircle, Image as ImageIcon, X, Edit2, Users, Check, Trash2, Video, Type, Send, Heart, Smile, Mic, Square, Play, Pause, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { User, Story } from '../types';
import toast from 'react-hot-toast';

// 15 Custom Background Colors
const BG_COLORS = [
    '#000000', '#1e293b', '#dc2626', '#ea580c', '#d97706', 
    '#16a34a', '#059669', '#0d9488', '#0891b2', '#0284c7', 
    '#2563eb', '#4f46e5', '#7c3aed', '#9333ea', '#c026d3'
];

// Font Styles
const FONTS = [
    { name: 'Modern', class: 'font-sans' },
    { name: 'Classic', class: 'font-serif' },
    { name: 'Mono', class: 'font-mono' },
    { name: 'Bold', class: 'font-black' },
    { name: 'Italic', class: 'italic' },
];

export const Sidebar: React.FC = () => {
  const { user, logout, updateProfileImage } = useAuth();
  const { conversations, selectConversation, currentConversationId, searchUsers, createConversation, stories, postStory, markStoryViewed, deleteStory, sendFriendRequest, acceptFriendRequest, getPendingRequests, sendStoryReply, friends } = useChat();
  const { theme, toggleTheme } = useTheme();
  
  const [activeTab, setActiveTab] = useState<'chats' | 'people' | 'stories'>('chats');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Modals
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showStoryCreateModal, setShowStoryCreateModal] = useState(false);
  const [viewingStory, setViewingStory] = useState<Story | null>(null);

  const profileInputRef = useRef<HTMLInputElement>(null);

  // Load pending requests when switching to 'people' tab
  useEffect(() => {
      if(activeTab === 'people') {
          getPendingRequests().then(setPendingRequests);
      }
  }, [activeTab]);

  // Debounced search
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchTerm.trim()) {
        setIsSearching(true);
        const results = await searchUsers(searchTerm);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const handleUserAction = (targetUser: User) => {
    if (targetUser.friendshipStatus === 'accepted' || targetUser.friendshipStatus === 'self') {
        createConversation(targetUser.id);
        setActiveTab('chats');
        setSearchTerm('');
    } else if (targetUser.friendshipStatus === 'none') {
        sendFriendRequest(targetUser.id);
        // Optimistic update
        setSearchResults(prev => prev.map(u => u.id === targetUser.id ? { ...u, friendshipStatus: 'pending_sent' } : u));
    }
  };

  const handleProfileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
          updateProfileImage(e.target.files[0]);
          setShowProfileModal(false);
      }
  };

  const openStory = (story: Story) => {
      markStoryViewed(story.id);
      setViewingStory(story);
  };

  const startChatWithFriend = (friendId: string) => {
      createConversation(friendId);
      setActiveTab('chats');
  };

  return (
    <div className="flex flex-col h-full bg-transparent relative overflow-hidden">
      {/* Refined Header */}
      <div className="px-6 pt-8 pb-4 relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setShowProfileModal(true)}>
             <div className="relative">
                <img src={user?.avatar} alt={user?.username} className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10 dark:ring-white/10 shadow-sm" />
                {user?.isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-dark-surface rounded-full"></div>
                )}
             </div>
             <div className="flex flex-col">
                 <h3 className="font-semibold text-lg dark:text-white leading-tight tracking-tight">{user?.username}</h3>
                 <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">My Account</span>
             </div>
          </div>
          <div className="flex gap-1">
            <button onClick={toggleTheme} className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all">
              {theme === 'dark' ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
            </button>
            <button onClick={logout} className="p-2.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/10 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-all">
                <LogOut size={18} strokeWidth={2} />
            </button>
          </div>
        </div>
        
        {/* Minimal Search */}
        <div className="relative mb-6 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-dark-card/50 border border-transparent focus:border-blue-500/20 rounded-xl text-sm outline-none dark:text-gray-200 transition-all focus:bg-white dark:focus:bg-dark-card/80"
          />
        </div>

        {/* Minimal Tabs */}
        <div className="flex p-1 gap-1 mb-2">
            {['chats', 'people', 'stories'].map((tab) => (
                <button 
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`flex-1 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                        activeTab === tab 
                        ? 'text-blue-600 dark:text-white bg-blue-50 dark:bg-white/10' 
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                >
                    {tab}
                </button>
            ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 relative z-10">
        <AnimatePresence mode="wait">
            {searchTerm.trim() ? (
                // Search Results
                <motion.div 
                    key="search-results"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                >
                    <div className="px-2 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {isSearching ? 'Searching...' : `Found ${searchResults.length} results`}
                    </div>
                    {searchResults.map(result => (
                        <div key={result.id} className="p-3 rounded-2xl bg-white/50 dark:bg-dark-card/50 hover:bg-white dark:hover:bg-dark-card border border-transparent hover:border-gray-100 dark:hover:border-white/10 flex items-center gap-3 transition-all cursor-pointer">
                            <img src={result.avatar} alt={result.username} className="w-12 h-12 rounded-full object-cover" />
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-900 dark:text-white">
                                    {result.username}
                                    {result.id === user?.id && <span className="ml-2 text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded border border-blue-200">You</span>}
                                </h4>
                                <p className="text-xs text-gray-500 capitalize">{result.friendshipStatus?.replace('_', ' ')}</p>
                            </div>
                            <button 
                                onClick={() => handleUserAction(result)}
                                className={`p-2.5 rounded-full shadow-sm transition-transform active:scale-90 ${
                                    result.friendshipStatus === 'accepted' || result.friendshipStatus === 'self' 
                                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                                    : result.friendshipStatus === 'pending_sent' 
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-white dark:bg-gray-700 text-blue-500'
                                }`}
                                disabled={result.friendshipStatus === 'pending_sent'}
                            >
                                {result.friendshipStatus === 'accepted' || result.friendshipStatus === 'self' ? <Users size={18} /> : 
                                 result.friendshipStatus === 'pending_received' ? <Check size={18} /> : <UserPlus size={18} />}
                            </button>
                        </div>
                    ))}
                </motion.div>
            ) : activeTab === 'chats' ? (
                // Chats List
                <motion.div key="chats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1">
                     {conversations.map(conv => {
                        const participant = conv.participants[0] || user!;
                        const isActive = currentConversationId === conv.id;
                        return (
                            <motion.div
                                key={conv.id}
                                layout
                                onClick={() => selectConversation(conv.id)}
                                className={`p-3 rounded-2xl cursor-pointer transition-all border ${
                                    isActive 
                                    ? 'bg-blue-700/80 backdrop-blur-md text-white shadow-lg shadow-blue-900/40 border-blue-500/50 scale-[1.02]' 
                                    : 'bg-transparent hover:bg-gray-50 dark:hover:bg-white/5 border-transparent'
                                } flex items-center gap-3 group`}
                            >
                                <div className="relative">
                                    <img src={participant.avatar} className={`relative w-12 h-12 rounded-full object-cover border ${isActive ? 'border-white/20' : 'border-gray-100 dark:border-gray-700'}`} />
                                    {participant.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-dark-surface rounded-full z-10"></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline">
                                        <h4 className={`font-semibold text-sm truncate ${isActive ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{participant.username}</h4>
                                        {conv.lastMessage && <span className={`text-[10px] ${isActive ? 'text-white/60' : 'text-gray-400'}`}>{formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: false }).replace('about ', '')}</span>}
                                    </div>
                                    <div className="flex justify-between items-center mt-0.5">
                                        <p className={`text-xs truncate ${isActive ? 'text-white/80' : conv.unreadCount > 0 ? 'font-semibold text-gray-800 dark:text-gray-100' : 'text-gray-500'}`}>
                                            {conv.isTyping ? <span className="italic animate-pulse">Typing...</span> : (conv.lastMessage?.text || 'Start chatting')}
                                        </p>
                                        {conv.unreadCount > 0 && <span className="min-w-[1.25rem] h-5 px-1.5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">{conv.unreadCount}</span>}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            ) : activeTab === 'people' ? (
                // People
                <motion.div key="people" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {pendingRequests.length > 0 && (
                        <div className="mb-4">
                            <div className="px-2 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Friend Requests</div>
                            {pendingRequests.map(req => (
                                <div key={req.id} className="p-3 rounded-2xl bg-white/60 dark:bg-dark-card border border-gray-100 dark:border-white/10 flex items-center gap-3">
                                    <img src={req.avatar} className="w-10 h-10 rounded-full" />
                                    <div className="flex-1"><h4 className="font-bold dark:text-white">{req.username}</h4></div>
                                    <button onClick={() => { acceptFriendRequest(req.id); setPendingRequests(prev => prev.filter(r => r.id !== req.id)); }} className="p-2 bg-green-500 text-white rounded-full shadow-lg shadow-green-500/30 hover:scale-105 transition-transform"><Check size={18} /></button>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <div className="mb-4">
                         <div className="px-2 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                             <span>My Friends ({friends.length})</span>
                             <Users size={14} />
                         </div>
                         {friends.length === 0 ? (
                             <div className="flex flex-col items-center justify-center mt-8 text-center opacity-50 p-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                                <Users size={32} className="mb-2" />
                                <p className="text-sm">No friends yet.</p>
                                <p className="text-xs">Search to add people!</p>
                            </div>
                         ) : (
                             <div className="space-y-2">
                                 {friends.map(friend => (
                                     <div key={friend.id} onClick={() => startChatWithFriend(friend.id)} className="p-3 rounded-2xl bg-white/50 dark:bg-dark-card/50 hover:bg-white dark:hover:bg-dark-card flex items-center gap-3 cursor-pointer group transition-colors">
                                         <div className="relative">
                                             <img src={friend.avatar} className="w-12 h-12 rounded-full object-cover" />
                                             {friend.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-dark-surface rounded-full"></div>}
                                         </div>
                                         <div className="flex-1">
                                             <h4 className="font-bold text-gray-900 dark:text-white">{friend.username}</h4>
                                             <p className="text-[10px] text-gray-500">{friend.isOnline ? 'Online now' : 'Offline'}</p>
                                         </div>
                                         <button className="p-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                             <MessageCircle size={18} />
                                         </button>
                                     </div>
                                 ))}
                             </div>
                         )}
                    </div>
                </motion.div>
            ) : (
                // Stories Grid
                <motion.div key="stories" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-2 gap-3">
                    <div onClick={() => setShowStoryCreateModal(true)} className="aspect-[4/5] rounded-2xl bg-gradient-to-b from-gray-50 to-gray-100 dark:from-white/5 dark:to-white/10 border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition-colors group">
                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <PlusCircle size={24} />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Create Story</span>
                    </div>
                    {stories.map(story => {
                        const isSeen = story.isViewed;
                        return (
                            <div key={story.id} onClick={() => openStory(story)} className={`aspect-[4/5] rounded-2xl relative overflow-hidden cursor-pointer group p-[2px] shadow-sm ${!isSeen ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600' : 'bg-gray-300 dark:bg-gray-700'}`}>
                                <div className="w-full h-full rounded-xl overflow-hidden relative bg-black/90">
                                    {story.mediaType === 'image' && story.mediaUrl ? (
                                        <img src={story.mediaUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100" />
                                    ) : story.mediaType === 'video' && story.mediaUrl ? (
                                        <video src={story.mediaUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" />
                                    ) : story.mediaType === 'audio' ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center p-4" style={{ backgroundColor: story.backgroundColor || '#0284c7' }}>
                                            <div className="p-3 bg-white/20 rounded-full mb-2 backdrop-blur-sm border border-white/20">
                                                <Mic size={24} className="text-white" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center p-2 text-center text-white text-xs font-bold break-words" style={{ backgroundColor: story.backgroundColor || '#000', fontFamily: story.fontStyle || 'sans-serif' }}>
                                            {story.textContent}
                                        </div>
                                    )}
                                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent"></div>
                                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                                        <img src={story.userAvatar} className="w-5 h-5 rounded-full border border-white" />
                                        <span className="text-[10px] text-white font-bold truncate max-w-[80px]">{story.username}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* --- MODALS --- */}

      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-dark-surface w-full max-w-sm rounded-3xl p-6 shadow-2xl relative overflow-hidden border border-gray-200 dark:border-gray-800">
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-blue-500 to-purple-600"></div>
                <button onClick={() => setShowProfileModal(false)} className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-1"><X /></button>
                <div className="flex flex-col items-center gap-4 relative mt-8">
                    <div className="relative group cursor-pointer" onClick={() => profileInputRef.current?.click()}>
                        <img src={user?.avatar} className="w-28 h-28 rounded-full object-cover ring-4 ring-white dark:ring-dark-surface shadow-xl" />
                        <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Edit2 className="text-white" />
                        </div>
                    </div>
                    <div className="text-center">
                        <h3 className="text-2xl font-bold dark:text-white">{user?.username}</h3>
                        <p className="text-blue-500 font-medium text-sm">Online</p>
                    </div>
                    <button onClick={() => profileInputRef.current?.click()} className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold transition-colors w-full">Change Photo</button>
                    <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={handleProfileUpload} />
                </div>
            </div>
        </div>
      )}

      {showStoryCreateModal && (
          <AdvancedStoryCreator onClose={() => setShowStoryCreateModal(false)} onPost={postStory} />
      )}

      {viewingStory && (
          <StoryViewer 
            story={viewingStory} 
            onClose={() => setViewingStory(null)} 
            currentUserId={user?.id || ''} 
            onDelete={deleteStory}
            onReply={sendStoryReply}
          />
      )}
    </div>
  );
};

// ... (Sub Components AdvancedStoryCreator and StoryViewer remain largely the same, just keeping them for file completeness if needed, but the main logic is in Sidebar)
const AdvancedStoryCreator: React.FC<{ onClose: () => void, onPost: (d: Partial<Story>, f: File|null) => Promise<void> }> = ({ onClose, onPost }) => {
    const [mode, setMode] = useState<'text' | 'media' | 'audio'>('text');
    const [text, setText] = useState('');
    const [bgColor, setBgColor] = useState(BG_COLORS[0]);
    const [font, setFont] = useState(FONTS[0]);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    
    // Audio State
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<any>(null);
    
    // Preview Audio
    const [isPlayingPreview, setIsPlayingPreview] = useState(false);
    const previewAudioRef = useRef<HTMLAudioElement | null>(null);
    
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => { if(timerRef.current) clearInterval(timerRef.current); }
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];
            mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
            mediaRecorderRef.current.onstop = () => {
                setAudioBlob(new Blob(chunksRef.current, { type: 'audio/webm' }));
                stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => setRecordingTime(p => p+1), 1000);
        } catch(e) { 
            console.error(e);
            toast.error("Mic error: Check permissions"); 
        }
    };

    const stopRecording = () => {
        if(mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if(timerRef.current) clearInterval(timerRef.current);
        }
    };
    
    const togglePreview = () => {
        if(!previewAudioRef.current) return;
        if(isPlayingPreview) {
            previewAudioRef.current.pause();
        } else {
            previewAudioRef.current.play();
        }
        setIsPlayingPreview(!isPlayingPreview);
    };

    const handleSubmit = async () => {
        if (mode === 'text' && !text) return;
        if (mode === 'media' && !file) return;
        if (mode === 'audio' && !audioBlob) return;

        setLoading(true);
        let finalFile = file;
        
        if (mode === 'audio' && audioBlob) {
            finalFile = new File([audioBlob], "story_audio.webm", { type: 'audio/webm' });
        }

        const storyData: Partial<Story> = {
            mediaType: mode === 'media' ? (file?.type.startsWith('video/') ? 'video' : 'image') : mode === 'audio' ? 'audio' : 'text',
            textContent: text,
            backgroundColor: (mode === 'text' || mode === 'audio') ? bgColor : undefined,
            fontStyle: mode === 'text' ? font.class : undefined
        };
        await onPost(storyData, finalFile);
        setLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <div className="flex justify-between items-center p-6 text-white z-10">
                <button onClick={onClose}><X size={32} /></button>
                <div className="flex gap-6 bg-black/40 backdrop-blur-md px-6 py-2 rounded-full">
                    <button onClick={() => setMode('text')} className={`font-bold tracking-wider ${mode === 'text' ? 'text-primary-500' : 'text-gray-400'}`}>TEXT</button>
                    <button onClick={() => setMode('media')} className={`font-bold tracking-wider ${mode === 'media' ? 'text-primary-500' : 'text-gray-400'}`}>MEDIA</button>
                    <button onClick={() => setMode('audio')} className={`font-bold tracking-wider ${mode === 'audio' ? 'text-primary-500' : 'text-gray-400'}`}>AUDIO</button>
                </div>
                <button onClick={handleSubmit} disabled={loading} className="font-bold text-lg text-primary-500 hover:text-primary-400 disabled:opacity-50">{loading ? '...' : 'Post'}</button>
            </div>

            <div className="flex-1 flex items-center justify-center relative bg-gray-900 overflow-hidden">
                {mode === 'text' ? (
                    <div className="w-full h-full flex items-center justify-center p-8 transition-colors duration-500" style={{ backgroundColor: bgColor }}>
                        <textarea 
                            value={text} 
                            onChange={e => setText(e.target.value)} 
                            placeholder="Type something..." 
                            className={`w-full bg-transparent text-white text-center text-4xl font-bold outline-none resize-none placeholder-white/50 ${font.class}`}
                            autoFocus
                        />
                    </div>
                ) : mode === 'media' ? (
                    <div className="w-full h-full flex items-center justify-center bg-black" onClick={() => fileRef.current?.click()}>
                        {file ? (
                            file.type.startsWith('video/') ? 
                            <video src={URL.createObjectURL(file)} className="max-w-full max-h-full" controls /> : 
                            <img src={URL.createObjectURL(file)} className="max-w-full max-h-full object-contain" />
                        ) : (
                            <div className="text-center text-gray-500 cursor-pointer hover:text-white transition-colors">
                                <div className="mb-4 flex justify-center"><ImageIcon size={64} /></div>
                                <p className="text-xl font-medium">Tap to upload</p>
                            </div>
                        )}
                        <input type="file" ref={fileRef} className="hidden" accept="image/*,video/*" onChange={e => setFile(e.target.files?.[0] || null)} />
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 transition-colors duration-500" style={{ backgroundColor: bgColor }}>
                         {isRecording ? (
                             <div className="flex flex-col items-center animate-pulse">
                                 <Mic size={80} className="text-white mb-8" />
                                 <h2 className="text-4xl text-white font-bold mb-12 font-mono tracking-widest">{recordingTime}s</h2>
                                 <button onClick={stopRecording} className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform"><Square fill="white" size={32} className="text-white" /></button>
                             </div>
                         ) : audioBlob ? (
                             <div className="flex flex-col items-center">
                                 <div className="p-8 bg-white/20 rounded-full mb-8 backdrop-blur-md border-2 border-white/30 cursor-pointer hover:bg-white/30 transition-colors" onClick={togglePreview}>
                                    {isPlayingPreview ? <Pause size={48} fill="white" className="text-white" /> : <Play size={48} fill="white" className="text-white ml-2" />}
                                 </div>
                                 
                                 <audio ref={previewAudioRef} src={URL.createObjectURL(audioBlob)} onEnded={() => setIsPlayingPreview(false)} className="hidden" />
                                 
                                 <button onClick={() => { setAudioBlob(null); setIsPlayingPreview(false); }} className="text-white font-bold border-b border-white pb-1">Record Again</button>
                             </div>
                         ) : (
                             <div className="flex flex-col items-center">
                                 <h2 className="text-2xl text-white/80 mb-12 font-medium">Tap to Record</h2>
                                 <button onClick={startRecording} className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center shadow-2xl shadow-red-500/50 hover:scale-110 transition-transform"><Mic size={40} className="text-white" /></button>
                             </div>
                         )}
                    </div>
                )}
                
                {/* Controls for Text & Audio Mode (BG Color) */}
                {(mode === 'text' || mode === 'audio') && (
                    <div className="absolute bottom-0 w-full p-6 bg-gradient-to-t from-black/80 to-transparent">
                        {mode === 'text' && (
                             <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide justify-center">
                                {FONTS.map(f => (
                                    <button key={f.name} onClick={() => setFont(f)} className={`px-4 py-1.5 rounded-full border text-sm font-bold ${font.name === f.name ? 'bg-white text-black' : 'text-white border-white/50 hover:bg-white/10'}`}>{f.name}</button>
                                ))}
                            </div>
                        )}
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide justify-center">
                            {BG_COLORS.map(c => (
                                <button key={c} onClick={() => setBgColor(c)} className={`w-8 h-8 rounded-full shadow-lg flex-shrink-0 transition-transform ${bgColor === c ? 'ring-2 ring-white scale-125' : 'hover:scale-110'}`} style={{ backgroundColor: c }} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const StoryViewer: React.FC<{ 
    story: Story, 
    onClose: () => void, 
    currentUserId: string, 
    onDelete: (id: string) => void,
    onReply: (story: Story, text: string) => void 
}> = ({ story, onClose, currentUserId, onDelete, onReply }) => {
    const [progress, setProgress] = useState(0);
    const [replyText, setReplyText] = useState('');
    const [isPaused, setIsPaused] = useState(false);
    
    // Audio Player State for Story
    const [isAudioPlaying, setIsAudioPlaying] = useState(true);
    const storyAudioRef = useRef<HTMLAudioElement | null>(null);

    const isOwner = story.userId === currentUserId;

    useEffect(() => {
        if (isPaused) return;
        const duration = story.mediaType === 'video' || story.mediaType === 'audio' ? 15000 : 5000; // Longer for audio/video
        const interval = 50; 
        const step = 100 / (duration / interval);

        const timer = setInterval(() => {
            setProgress(old => {
                if (old >= 100) {
                    clearInterval(timer);
                    onClose();
                    return 100;
                }
                return old + step;
            });
        }, interval);
        return () => clearInterval(timer);
    }, [isPaused, story.mediaType]);

    const handleSendReply = () => {
        if (!replyText.trim()) return;
        onReply(story, replyText);
        setReplyText('');
    };

    const handleQuickReaction = (emoji: string) => {
        onReply(story, emoji);
    };

    const toggleAudio = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent pausing the story progress when clicking the button
        if(storyAudioRef.current) {
            if(isAudioPlaying) {
                storyAudioRef.current.pause();
                setIsPaused(true);
            } else {
                storyAudioRef.current.play();
                setIsPaused(false);
            }
            setIsAudioPlaying(!isAudioPlaying);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-8">
             <div className="relative w-full max-w-[400px] h-full md:h-[85vh] bg-black md:rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-white/10">
                  {/* Progress */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 z-20 flex gap-1 px-1 pt-2">
                      <div className="h-full flex-1 bg-white/30 rounded-full overflow-hidden">
                           <div className="h-full bg-white transition-all duration-75 ease-linear shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: `${progress}%` }}></div>
                      </div>
                  </div>

                  {/* Header */}
                  <div className="absolute top-6 left-4 z-20 flex items-center gap-3">
                      <img src={story.userAvatar} className="w-9 h-9 rounded-full border border-white/50 shadow-md" />
                      <div className="flex flex-col">
                          <span className="text-white font-bold text-sm shadow-md">{story.username}</span>
                          <span className="text-white/80 text-[10px] shadow-md">{formatDistanceToNow(new Date(story.createdAt))} ago</span>
                      </div>
                  </div>
                  
                  <div className="absolute top-6 right-4 z-20 flex gap-4">
                      {isOwner && (
                          <button onClick={() => { onDelete(story.id); onClose(); }} className="text-white/80 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                      )}
                      <button onClick={onClose} className="text-white hover:scale-110 transition-transform"><X size={24} /></button>
                  </div>

                  {/* Content */}
                  <div 
                    className="flex-1 flex items-center justify-center bg-black relative"
                    onMouseDown={() => setIsPaused(true)}
                    onMouseUp={() => setIsPaused(false)}
                    onTouchStart={() => setIsPaused(true)}
                    onTouchEnd={() => setIsPaused(false)}
                  >
                      {story.mediaType === 'image' && story.mediaUrl ? (
                          <img src={story.mediaUrl} className="max-w-full max-h-full object-contain" />
                      ) : story.mediaType === 'video' && story.mediaUrl ? (
                          <video src={story.mediaUrl} className="max-w-full max-h-full" autoPlay playsInline loop />
                      ) : story.mediaType === 'audio' && story.mediaUrl ? (
                          <div className="w-full h-full flex flex-col items-center justify-center p-8 transition-colors duration-300" style={{ backgroundColor: story.backgroundColor || '#0284c7' }}>
                              <button 
                                onClick={toggleAudio}
                                className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-8 backdrop-blur-md hover:bg-white/30 transition-all active:scale-95 shadow-xl border border-white/20"
                              >
                                  {isAudioPlaying ? <Pause size={40} fill="white" className="text-white" /> : <Play size={40} fill="white" className="text-white ml-2" />}
                              </button>
                              
                              <div className="flex gap-1 h-8 items-center justify-center opacity-80">
                                   {[...Array(5)].map((_, i) => (
                                       <div key={i} className={`w-1.5 bg-white rounded-full ${isAudioPlaying ? 'animate-pulse' : ''}`} style={{ height: isAudioPlaying ? `${Math.random() * 100}%` : '20%', animationDelay: `${i * 100}ms` }}></div>
                                   ))}
                              </div>

                              <audio 
                                ref={storyAudioRef}
                                src={story.mediaUrl} 
                                autoPlay 
                                className="hidden"
                                onPlay={() => setIsAudioPlaying(true)} 
                                onPause={() => setIsAudioPlaying(false)} 
                                onEnded={onClose}
                              />
                          </div>
                      ) : (
                          <div className="w-full h-full flex items-center justify-center p-8 text-white text-3xl font-bold text-center break-words" style={{ backgroundColor: story.backgroundColor || '#000', fontFamily: story.fontStyle }}>
                              {story.textContent}
                          </div>
                      )}
                  </div>
                  
                  {/* Footer (Viewers for Owner, Reply for Others) */}
                  {isOwner ? (
                      <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
                          <div className="flex items-center gap-2 mb-2">
                              <Users size={16} />
                              <span className="text-sm font-medium">{story.viewers.length} Viewers</span>
                          </div>
                      </div>
                  ) : (
                      <div className="absolute bottom-0 w-full p-6 bg-gradient-to-t from-black/80 to-transparent flex flex-col gap-4" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
                          <div className="flex justify-between px-2">
                              {['😂', '😮', '😍', '😢', '🔥', '👏'].map(emoji => (
                                  <button key={emoji} onClick={() => handleQuickReaction(emoji)} className="text-3xl hover:scale-125 transition-transform">{emoji}</button>
                              ))}
                          </div>
                          <div className="flex items-center gap-2">
                              <input 
                                type="text" 
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Send message..." 
                                className="flex-1 bg-white/10 border border-white/30 rounded-full px-5 py-3 text-white placeholder-white/60 outline-none focus:border-white focus:bg-white/20 transition-all backdrop-blur-sm"
                              />
                              <button onClick={handleSendReply} className="p-3 text-white hover:text-primary-400 transition-colors">
                                  <Send size={24} />
                              </button>
                          </div>
                      </div>
                  )}
             </div>
        </div>
    );
};