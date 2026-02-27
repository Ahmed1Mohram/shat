import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../context/ChatContext';
import { useTheme } from '../context/ThemeContext';
import { MessageBubble } from './MessageBubble';
import { InputArea } from './InputArea';
import { Phone, Video, ArrowLeft, MoreVertical, Ban, CheckCircle, Eye, EyeOff, Users, Palette, Info, Search, X as XIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatThemePicker, useChatBackground, ChatThemeCtx } from './ChatThemePicker';

export const ChatWindow: React.FC = () => {
  const { currentConversationId, conversations, messages, selectConversation, blockUser, unblockUser, startCall, toggleVanishMode, muteConversation } = useChat();
  const { theme } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showVanishInfo, setShowVanishInfo] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevMsgCountRef = useRef(0);
  const { background, themeId, customBg, currentTheme, selectTheme, setCustomBackground } = useChatBackground();

  // Compute matched message IDs
  const matchedIds = searchQuery.trim().length > 0
    ? messages
      .filter(m => m.text && m.text.toLowerCase().includes(searchQuery.toLowerCase()) && !m.isDeleted)
      .map(m => m.id)
    : [];

  const scrollToMatch = (idx: number) => {
    const id = matchedIds[idx];
    if (!id) return;
    const el = messageRefs.current[id];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const goToNext = () => {
    const next = (searchMatchIndex + 1) % matchedIds.length;
    setSearchMatchIndex(next);
    scrollToMatch(next);
  };

  const goToPrev = () => {
    const prev = (searchMatchIndex - 1 + matchedIds.length) % matchedIds.length;
    setSearchMatchIndex(prev);
    scrollToMatch(prev);
  };

  const openSearch = () => {
    setShowSearch(true);
    setSearchQuery('');
    setSearchMatchIndex(0);
    setTimeout(() => searchInputRef.current?.focus(), 120);
  };

  const closeSearch = () => {
    setShowSearch(false);
    setSearchQuery('');
    setSearchMatchIndex(0);
  };

  const conversation = conversations.find(c => c.id === currentConversationId);
  const participant = conversation?.participants[0];
  const isGroup = conversation?.isGroup || false;
  const chatBgUrl = '/cae1afd7f0f92784a8fb32251f4ed8f0.jpg';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, conversation?.isTyping]);

  // Confetti Effect on celebration keywords
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const celebrationWords = ['مبروك', 'congrat', '🎉', '🎊', '🥳', 'happy birthday', 'عيد ميلاد', 'مبارك', 'alf mabrook', '🏆', 'won', 'فزت', 'نجحت'];
      const msgLower = lastMsg.text?.toLowerCase() || '';
      if (celebrationWords.some(w => msgLower.includes(w))) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [messages]);

  if (!conversation || !participant) return null;

  const getStatusText = () => {
    if (participant.blockedByMe) return 'محظور';
    if (participant.blockedMe) return 'غير متاح';
    if (conversation?.isTyping) return 'يكتب...';
    if (participant.isOnline) return 'متصل الآن';
    if (participant.lastActive) {
      try {
        return `آخر ظهور منذ ${formatDistanceToNow(new Date(participant.lastActive), { addSuffix: false })}`;
      } catch (e) { return 'غير متصل'; }
    }
    return 'غير متصل';
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
    <ChatThemeCtx.Provider value={{ currentTheme, customBg }}>
      <motion.div
        key={currentConversationId}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex flex-col h-full relative overflow-hidden transition-colors duration-300 bg-white dark:bg-black"
        style={{
          backgroundColor: theme === 'light' ? '#ffffff' : '#000000',
          backgroundImage: conversation?.isVanishMode
            ? `linear-gradient(rgba(0, 0, 0, 0.95), rgba(0, 0, 0, 0.98))`
            : 'none',
        }}
      >
        {/* Header - Instagram Style */}
        <div className={`flex items-center justify-between px-3 md:px-4 py-2 md:py-3 sticky top-0 z-20 border-b safe-top ${theme === 'light'
          ? 'bg-white/95 backdrop-blur-md border-gray-100'
          : 'bg-black/90 backdrop-blur-md border-white/8'
          }`}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => selectConversation('')}
              className="md:hidden p-2 -ml-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
            >
              <ArrowLeft size={24} className="text-black dark:text-white" />
            </button>

            <div className="relative cursor-pointer flex-shrink-0">
              <img src={participant.avatar} alt={participant.username} className="w-9 h-9 md:w-11 md:h-11 rounded-full object-cover border border-gray-100 dark:border-gray-800" />
              {participant.isOnline && !participant.blockedByMe && !participant.blockedMe && (
                <>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white dark:border-black rounded-full shadow-[0_0_0_0_rgba(74,222,128,0.4)] animate-pulse" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400/30 rounded-full animate-ping" />
                </>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3
                className="font-semibold text-base text-black dark:text-white flex items-center gap-2 leading-tight truncate"
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
              >
                <span className="truncate">{participant.username}</span>
                {participant.isBot && (
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 tracking-wide flex-shrink-0"
                    style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}
                  >
                    AI
                  </span>
                )}
              </h3>
              <p
                className={`text-xs mt-0.5 truncate ${participant.blockedByMe || participant.blockedMe ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
              >
                {getStatusText()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-black dark:text-white relative flex-shrink-0">
            {/* Search Button */}
            <button
              onClick={openSearch}
              className={`p-2 rounded-full transition-all ${showSearch ? 'bg-violet-500/20 text-violet-400' : 'hover:bg-gray-100 dark:hover:bg-white/10'}`}
              title="بحث في الشات"
            >
              <Search size={22} strokeWidth={1.5} />
            </button>
            {/* Palette / Theme Picker */}
            <button
              onClick={() => setShowThemePicker(true)}
              className="p-2 hover:bg-white/10 rounded-full transition-all"
              title="خلفية الشات"
            >
              <Palette size={22} strokeWidth={1.5} className="text-violet-400" />
            </button>

            <button
              onClick={() => startCall(participant, false)} // Start Audio Call
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-all"
              title="Voice Call"
            >
              <Phone size={24} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => startCall(participant, true)} // Start Video Call
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-all"
              title="Video Call"
            >
              <Video size={24} strokeWidth={1.5} />
            </button>
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-all">
                <Info size={24} strokeWidth={1.5} />
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
                    {!isGroup && (
                      <button
                        onClick={handleBlockAction}
                        className={`w-full text-left px-4 py-3 text-sm font-medium flex items-center gap-2 transition-colors ${participant.blockedByMe ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                      >
                        {participant.blockedByMe ? <><CheckCircle size={16} /> إلغاء الحظر</> : <><Ban size={16} /> حظر المستخدم</>}
                      </button>
                    )}
                    <button
                      onClick={() => { muteConversation(currentConversationId!); setShowMenu(false); }}
                      className="w-full text-left px-4 py-3 text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      {conversation?.muted ? <><Eye size={16} /> إلغاء الكتم</> : <><EyeOff size={16} /> كتم المحادثة</>}
                    </button>
                    {isGroup && (
                      <button
                        onClick={() => setShowMenu(false)}
                        className="w-full text-left px-4 py-3 text-sm font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <Users size={16} /> معلومات المجموعة
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Search Bar - Modern WhatsApp-style */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 380 }}
              className={`flex items-center gap-2 px-3 py-2 border-b ${theme === 'light'
                ? 'bg-gray-50/95 backdrop-blur-md border-gray-200'
                : 'bg-[#111]/95 backdrop-blur-md border-white/8'
                }`}
            >
              {/* Input */}
              <div className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-full ${theme === 'light' ? 'bg-white border border-gray-200 shadow-sm' : 'bg-white/8 border border-white/10'
                }`}>
                <Search size={14} className="text-gray-400 flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setSearchMatchIndex(0); }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.shiftKey ? goToPrev() : goToNext(); }
                    if (e.key === 'Escape') closeSearch();
                  }}
                  placeholder="بحث في الرسائل..."
                  className="flex-1 bg-transparent outline-none text-sm text-black dark:text-white placeholder:text-gray-400"
                  style={{ fontFamily: '-apple-system, "Segoe UI", sans-serif', direction: 'rtl', minWidth: 0 }}
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setSearchMatchIndex(0); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-white flex-shrink-0">
                    <XIcon size={13} />
                  </button>
                )}
              </div>

              {/* Result count */}
              {searchQuery && (
                <span className="text-xs font-semibold text-gray-400 whitespace-nowrap flex-shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {matchedIds.length === 0 ? 'لا يوجد' : `${searchMatchIndex + 1}/${matchedIds.length}`}
                </span>
              )}

              {/* Up / Down arrows */}
              {matchedIds.length > 1 && (
                <>
                  <button
                    onClick={goToPrev}
                    className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                    title="السابق"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                  </button>
                  <button
                    onClick={goToNext}
                    className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                    title="التالي"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                  </button>
                </>
              )}

              {/* Close */}
              <button
                onClick={closeSearch}
                className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex-shrink-0"
              >
                <XIcon size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Vanish Mode Banner */}
        {conversation?.isVanishMode && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-center text-sm font-semibold"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            <div className="flex items-center justify-center gap-2">
              <EyeOff size={16} />
              <span>وضع الاختفاء مفعّل - الرسائل تختفي بعد المشاهدة</span>
            </div>
          </motion.div>
        )}

        <div
          className="flex-1 overflow-y-auto px-3 md:px-6 py-4 space-y-1 relative z-10 scroll-smooth emoji-text"
          style={{
            fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", "Inter", sans-serif',
            background,
          }}
        >
          {messages.map((msg, index) => {
            const replyToMsg = msg.replyTo ? messages.find(m => m.id === msg.replyTo) : undefined;
            const isActiveMatch = searchQuery.trim().length > 0 && matchedIds[searchMatchIndex] === msg.id;
            return (
              <div
                key={msg.id}
                ref={el => { messageRefs.current[msg.id] = el; }}
                className={isActiveMatch ? 'rounded-2xl ring-2 ring-violet-400/60 ring-offset-1 ring-offset-transparent transition-all duration-300' : ''}
              >
                <MessageBubble
                  message={msg}
                  isOwn={msg.senderId !== participant.id}
                  senderAvatar={participant.avatar}
                  replyToMessage={replyToMsg}
                  conversationParticipants={conversation?.participants || []}
                  isGroup={conversation?.isGroup || false}
                  searchQuery={searchQuery}
                />
              </div>
            );
          })}

          {conversation.isTyping && !participant.blockedByMe && !participant.blockedMe && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-end gap-2.5"
            >
              <img src={participant.avatar} className="w-7 h-7 rounded-full mb-1 border-[1.5px] border-white dark:border-gray-800 shadow-sm object-cover flex-shrink-0" />
              <div className="bg-[#efefef] dark:bg-[#262626] p-3 rounded-3xl rounded-bl-[4px] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <div className="flex gap-1">
                  <motion.span
                    className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                  />
                  <motion.span
                    className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.span
                    className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="relative z-20 safe-bottom input-safe-area">
          {participant.blockedByMe ? (
            <div className="p-4 bg-gray-100 dark:bg-dark-surface/80 text-center border-t border-gray-200 dark:border-white/5 transition-colors duration-300">
              <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">لقد قمت بحظر هذا المستخدم. <button onClick={handleBlockAction} className="text-blue-500 hover:underline">إلغاء الحظر</button> لإرسال الرسائل.</span>
            </div>
          ) : participant.blockedMe ? (
            <div className="p-4 bg-gray-100 dark:bg-dark-surface/80 text-center border-t border-gray-200 dark:border-white/5 transition-colors duration-300">
              <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">لا يمكنك إرسال رسائل في هذه المحادثة.</span>
            </div>
          ) : (
            <InputArea />
          )}
        </div>

        {/* Confetti Celebration Effect */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-5%`,
                  width: `${6 + Math.random() * 8}px`,
                  height: `${6 + Math.random() * 8}px`,
                  backgroundColor: ['#ff6b6b', '#ffd93d', '#6bff6b', '#6b6bff', '#ff6bff', '#6bffff', '#ff9f43', '#a55eea'][Math.floor(Math.random() * 8)],
                  borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              />
            ))}
          </div>
        )}

        <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti-fall linear forwards;
        }
      `}</style>

        {/* Chat Theme Picker Overlay */}
        <ChatThemePicker
          isOpen={showThemePicker}
          onClose={() => setShowThemePicker(false)}
          themeId={themeId}
          customBg={customBg}
          onSelectTheme={selectTheme}
          onSetCustomBg={setCustomBackground}
        />

      </motion.div>
    </ChatThemeCtx.Provider>
  );
};