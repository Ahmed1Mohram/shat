import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../context/ChatContext';
import { MessageBubble } from './MessageBubble';
import { InputArea } from './InputArea';
import { Phone, Video, Info, ArrowLeft, MoreVertical, Ban, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export const ChatWindow: React.FC = () => {
  const { currentConversationId, conversations, messages, selectConversation, blockUser, unblockUser, startCall } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showMenu, setShowMenu] = useState(false);

  const conversation = conversations.find(c => c.id === currentConversationId);
  const participant = conversation?.participants[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, conversation?.isTyping]);

  if (!conversation || !participant) return null;

  const getStatusText = () => {
      if (participant.blockedByMe) return 'Blocked';
      if (participant.blockedMe) return 'Unavailable';
      if (participant.isOnline) return 'Active now';
      if (participant.lastActive) {
          try {
              return `Active ${formatDistanceToNow(new Date(participant.lastActive), { addSuffix: true })}`;
          } catch (e) { return 'Offline'; }
      }
      return 'Offline';
  };

  const handleBlockAction = async () => {
      if (participant.blockedByMe) {
          await unblockUser(participant.id);
      } else {
          await blockUser(participant.id);
      }
      setShowMenu(false);
  };

  return (
    <motion.div 
      key={currentConversationId}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col h-full bg-white/60 dark:bg-black/40 backdrop-blur-md relative overflow-hidden transition-colors duration-300"
    >
      {/* Glass Header */}
      <div className="flex items-center justify-between px-6 py-4 glass-header sticky top-0 z-20 transition-colors duration-300">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => selectConversation('')}
            className="md:hidden p-2 -ml-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft size={22} className="text-gray-700 dark:text-white" />
          </button>
          
          <div className="relative cursor-pointer">
            <img src={participant.avatar} alt={participant.username} className="w-10 h-10 rounded-full object-cover shadow-sm ring-1 ring-black/5 dark:ring-white/10" />
             {participant.isOnline && !participant.blockedByMe && !participant.blockedMe && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-black rounded-full"></div>
             )}
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2 leading-none">
                {participant.username}
                {participant.isBot && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-blue-500 to-fuchsia-500 text-white shadow-sm tracking-wide">AI</span>}
            </h3>
            <p className={`text-xs font-medium mt-1 ${participant.blockedByMe || participant.blockedMe ? 'text-red-500' : participant.isOnline ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}`}>
              {getStatusText()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-blue-500 relative">
          <button 
            onClick={() => startCall(participant, false)} // Start Audio Call
            className="p-2.5 hover:bg-blue-50 dark:hover:bg-white/10 rounded-full transition-all"
            title="Voice Call"
          >
            <Phone size={20} />
          </button>
          <button 
            onClick={() => startCall(participant, true)} // Start Video Call
            className="p-2.5 hover:bg-blue-50 dark:hover:bg-white/10 rounded-full transition-all"
            title="Video Call"
          >
            <Video size={20} />
          </button>
          <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="p-2.5 hover:bg-blue-50 dark:hover:bg-white/10 rounded-full transition-all">
                <MoreVertical size={20} />
              </button>
              <AnimatePresence>
                  {showMenu && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-12 w-48 bg-white dark:bg-[#1a2333] rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-30"
                      >
                          <button 
                            onClick={handleBlockAction}
                            className={`w-full text-left px-4 py-3 text-sm font-medium flex items-center gap-2 transition-colors ${participant.blockedByMe ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                          >
                              {participant.blockedByMe ? <><CheckCircle size={16}/> Unblock User</> : <><Ban size={16}/> Block User</>}
                          </button>
                      </motion.div>
                  )}
              </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2 bg-transparent relative z-10 scroll-smooth">
        {messages.map((msg, index) => {
          return (
            <MessageBubble 
              key={msg.id} 
              message={msg} 
              isOwn={msg.senderId !== participant.id} 
              senderAvatar={participant.avatar}
            />
          );
        })}
        
        {conversation.isTyping && !participant.blockedByMe && !participant.blockedMe && (
           <div className="flex items-end gap-2 animate-fade-in">
               <img src={participant.avatar} className="w-8 h-8 rounded-full mb-1 border border-white/50 shadow-sm" />
               <div className="bg-white/80 dark:bg-dark-card/80 p-3.5 rounded-2xl rounded-bl-none shadow-sm backdrop-blur-sm">
                   <div className="flex gap-1.5">
                       <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                       <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                       <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                   </div>
               </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="relative z-20">
        {participant.blockedByMe ? (
            <div className="p-4 bg-gray-100 dark:bg-dark-surface/80 text-center border-t border-gray-200 dark:border-white/5 transition-colors duration-300">
                <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">You have blocked this user. <button onClick={handleBlockAction} className="text-blue-500 hover:underline">Unblock</button> to send messages.</span>
            </div>
        ) : participant.blockedMe ? (
            <div className="p-4 bg-gray-100 dark:bg-dark-surface/80 text-center border-t border-gray-200 dark:border-white/5 transition-colors duration-300">
                <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">You cannot send messages to this conversation.</span>
            </div>
        ) : (
            <InputArea />
        )}
      </div>
    </motion.div>
  );
};