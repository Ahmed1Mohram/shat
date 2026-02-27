import React, { useState, useRef, useEffect } from 'react';
import { Message, ReactionType } from '../types';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Check, CheckCheck, ThumbsUp, Heart, Smile, Meh, Frown, Angry, Reply, Forward, MoreVertical, X, Edit2, Trash2, Pin, Copy, CheckCircle2, Eye, EyeOff, Flame, Type, Globe, Sparkles } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import twemoji from 'twemoji';
import toast from 'react-hot-toast';
import { useChatTheme } from './ChatThemePicker';

interface Props {
  message: Message;
  isOwn: boolean;
  senderAvatar?: string;
  replyToMessage?: Message;
  conversationParticipants?: any[];
  isGroup?: boolean;
  searchQuery?: string;
}

// Highlight matching text with yellow background
const HighlightedText: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query || query.trim().length < 1) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-300/80 text-black rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

const CustomAudioPlayer: React.FC<{ src: string; isOwn: boolean }> = ({ src, isOwn }) => {
  const { currentTheme } = useChatTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const dur = audioRef.current.duration;
      setCurrentTime(current);
      setProgress((current / dur) * 100);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      const bars = Array.from({ length: 50 }, () => Math.random() * 100);
      setWaveform(bars);
    }
  };

  // Voice-to-Text Transcription
  const transcribeAudio = () => {
    if (transcript) { setTranscript(null); return; }
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Speech recognition not supported in this browser');
      return;
    }
    setIsTranscribing(true);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA'; // Arabic first, then fallback
    recognition.continuous = true;
    recognition.interimResults = true;
    let finalText = '';

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(finalText + interim || 'Listening...');
    };

    recognition.onerror = () => {
      setIsTranscribing(false);
      if (!finalText) setTranscript('Could not transcribe audio');
    };

    recognition.onend = () => {
      setIsTranscribing(false);
      if (!finalText) setTranscript(prev => prev || 'No speech detected');
    };

    // Play audio through speaker and let mic pick it up
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
    }
    recognition.start();

    // Stop after audio ends + 2s buffer
    const stopTime = (duration || 10) * 1000 + 2000;
    setTimeout(() => {
      try { recognition.stop(); } catch (e) { }
    }, stopTime);
  };

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      const updateWaveform = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const bars = Array.from(dataArray.slice(0, 50), val => (val / 255) * 100);
          setWaveform(bars);
        }
        animationFrameRef.current = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const displayBars = waveform.length > 0 ? waveform : Array.from({ length: 50 }, (_, i) => 30 + Math.sin(i * 0.3) * 20);

  return (
    <div className="flex flex-col">
      <div className={`flex items-center gap-3 p-3 rounded-[20px] w-full max-w-[260px] select-none transition-all hover:scale-[1.02] ${isOwn ? 'bg-white/10' : 'bg-white/5'} ${!isOwn ? 'rounded-bl-[5px]' : 'rounded-br-[5px]'}`}>
        <button
          onClick={togglePlay}
          className={`w-10 h-10 flex items-center justify-center rounded-full shadow-md transition-all active:scale-95 hover:scale-110 flex-shrink-0 ${isOwn ? 'bg-white/90 text-[#1a1a2e] hover:bg-white' : 'bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20'}`}
        >
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
        </button>

        <div className="flex flex-col flex-1 gap-1.5 min-w-0 overflow-hidden">
          <div className="flex items-center gap-0.5 h-8 opacity-90 w-full overflow-hidden">
            {displayBars.map((height, i) => (
              <motion.div
                key={i}
                className={`w-0.5 rounded-full ${isOwn ? 'bg-white' : 'bg-current'}`}
                animate={{
                  height: isPlaying ? `${Math.max(15, height)}%` : `${height}%`,
                  opacity: isPlaying ? (i < (progress / 100) * displayBars.length ? 1 : 0.4) : 0.6
                }}
                transition={{ duration: 0.1, ease: "easeOut" }}
              />
            ))}
          </div>
          <div className={`text-[10px] font-bold ml-0.5 ${isOwn ? 'text-white/90' : 'opacity-70'}`} style={{ fontFamily: 'Inter, sans-serif' }}>
            {isPlaying ? formatTime(currentTime) : (isFinite(duration) && duration > 0 ? formatTime(duration) : '--:--')}
          </div>
        </div>

        {/* Transcribe Button */}
        <button
          onClick={transcribeAudio}
          className={`w-8 h-8 flex items-center justify-center rounded-full transition-all flex-shrink-0 ${isTranscribing ? 'animate-pulse bg-blue-500 text-white' : transcript ? 'bg-green-500 text-white' : isOwn ? 'bg-white/20 text-white/70 hover:bg-white/30' : 'bg-black/5 dark:bg-white/10 opacity-70 hover:opacity-100'}`}
          title={transcript ? 'إخفاء النص' : 'تحويل إلى نص'}
        >
          <Type size={14} strokeWidth={2.5} />
        </button>

        <audio
          ref={audioRef}
          src={src}
          className="hidden"
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onLoadedMetadata={handleLoadedMetadata}
        />
      </div>
      {/* Transcript Display */}
      <AnimatePresence>
        {transcript && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`px-3 py-2 text-xs rounded-b-[20px] -mt-2 pt-3 ${isOwn ? 'bg-white/10 text-white/90' : 'bg-black/10 dark:bg-white/5 opacity-90'}`}
          >
            <div className="flex items-center gap-1 mb-1">
              <Type size={10} />
              <span className="font-bold text-[10px] uppercase tracking-wider">Transcript</span>
            </div>
            <p className="leading-relaxed" style={{ fontFamily: '-apple-system, sans-serif' }}>{transcript}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AppleEmoji: React.FC<{ emoji: string; className?: string }> = ({ emoji, className = "w-6 h-6" }) => {
  return (
    <span
      className={`inline-block align-middle ${className}`}
      dangerouslySetInnerHTML={{
        __html: twemoji.parse(emoji, {
          attributes: () => ({ style: 'width: 100%; height: 100%; display: block;' }),
          callback: function (icon) {
            return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/${icon}.png`;
          }
        })
      }}
    />
  );
};

const REACTION_EMOJIS: Record<ReactionType, string> = {
  like: '👍',
  love: '❤️',
  haha: '😂',
  wow: '😮',
  sad: '😢',
  angry: '🔥'
};

const REACTION_COLORS: Record<ReactionType, string> = {
  like: 'text-blue-500',
  love: 'text-red-500',
  haha: 'text-yellow-500',
  wow: 'text-yellow-400',
  sad: 'text-blue-400',
  angry: 'text-orange-500'
};

export const MessageBubble: React.FC<Props> = ({ message, isOwn, senderAvatar, replyToMessage, conversationParticipants = [], isGroup = false, searchQuery = '' }) => {
  const { currentTheme } = useChatTheme();
  const { addReaction, removeReaction, replyToMessage: replyToMsg, forwardMessage, editMessage, deleteMessage, pinMessage, unpinMessage, copyMessage } = useChat();
  const { user } = useAuth();
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);

  const [swipeStart, setSwipeStart] = useState<{ x: number; y: number } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [viewOnceRevealed, setViewOnceRevealed] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);

  // Smart Reply Suggestions
  const getSmartReplies = (): string[] => {
    if (isOwn || !message.text || message.isDeleted) return [];
    const text = message.text.toLowerCase();
    if (text.includes('?') || text.includes('؟')) return ['نعم 👍', 'لا ❌', 'مش متأكد 🤔', 'بعدين أقولك'];
    if (text.includes('شكر') || text.includes('thank')) return ['العفو! 😊', '❤️', 'ولا يهمك!'];
    if (text.includes('سلام') || text.includes('hi') || text.includes('hello') || text.includes('اهلا')) return ['أهلاً! 👋', 'هلا والله! 😄', 'كيفك؟'];
    if (text.includes('😂') || text.includes('هههه') || text.includes('lol')) return ['😂😂😂', '💀', 'ميت من الضحك'];
    if (text.includes('حب') || text.includes('love') || text.includes('❤')) return ['❤️❤️', 'وأنا كمان! 🥰', '😘'];
    if (text.includes('تمام') || text.includes('ok') || text.includes('اوك')) return ['👍', 'حلو!', 'تمام 👌'];
    return ['👍', '❤️', '😂', '👌'];
  };

  const isOnlyEmojis = message.text && /^(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff]){1,3}$/.test(message.text.trim());

  const myReaction = message.reactions?.find(r => r.userId === user?.id);

  const handleReaction = async (type: ReactionType) => {
    if (myReaction?.type === type) {
      await removeReaction(message.id);
    } else {
      await addReaction(message.id, type);
    }
    setShowReactions(false);
  };

  const handleReply = () => {
    if ((window as any).requestReply) {
      (window as any).requestReply(message.id);
    }
    setShowMenu(false);
  };

  const handleForward = () => {
    forwardMessage(message.id, '');
    setShowMenu(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setSwipeStart({ x: touch.clientX, y: touch.clientY });
    setIsSwiping(false);

    const timer = setTimeout(() => {
      setShowReactions(true);
      setIsSwiping(false);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeStart) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeStart.x;
    const deltaY = touch.clientY - swipeStart.y;

    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      setIsSwiping(true);
      setSwipeOffset(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (!swipeStart) return;

    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    if (swipeOffset > 60 && !isOwn) {
      handleReply();
    }

    if (swipeOffset < -60) {
      if (!showReactions) {
        setShowReactions(true);
      }
      if (swipeOffset < -100) {
        setTimeout(async () => {
          await addReaction(message.id, 'like');
        }, 150);
      }
    }

    setSwipeStart(null);
    setSwipeOffset(0);
    setIsSwiping(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setSwipeStart({ x: e.clientX, y: e.clientY });
    setIsSwiping(false);

    const timer = setTimeout(() => {
      setShowReactions(true);
      setIsSwiping(false);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!swipeStart || e.buttons !== 1) return;

    const deltaX = e.clientX - swipeStart.x;
    const deltaY = e.clientY - swipeStart.y;

    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      setIsSwiping(true);
      setSwipeOffset(deltaX);
    }
  };

  const handleMouseUp = () => {
    if (!swipeStart) return;

    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    if (swipeOffset > 60 && !isOwn) {
      handleReply();
    }

    if (swipeOffset < -60) {
      if (!showReactions) {
        setShowReactions(true);
      }
      if (swipeOffset < -100) {
        setTimeout(async () => {
          await addReaction(message.id, 'like');
        }, 150);
      }
    }

    setSwipeStart(null);
    setSwipeOffset(0);
    setIsSwiping(false);
  };

  const handleMouseLeave = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setSwipeStart(null);
    setSwipeOffset(0);
    setIsSwiping(false);
  };

  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  return (
    <motion.div
      ref={messageRef}
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`group flex w-full mb-1 relative ${isOwn ? 'justify-end' : 'justify-start'}`}
      onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {isSwiping && swipeOffset > 40 && !isOwn && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, x: -20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-0 text-gray-500"
        >
          <Reply size={24} />
        </motion.div>
      )}

      {isSwiping && swipeOffset < -40 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-0 text-red-500"
        >
          <Heart size={24} fill="currentColor" />
        </motion.div>
      )}

      <div
        className={`flex flex-col max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} z-10 transition-transform duration-75 ease-out`}
        style={{ transform: `translateX(${swipeOffset}px)` }}
      >

        {replyToMessage && (
          <div className={`text-xs mb-1.5 px-3 py-2 rounded-2xl border-l-[3px] backdrop-blur-sm ${isOwn ? 'border-violet-400 bg-white/10 dark:bg-white/10 self-end mr-1 text-black dark:text-white' : 'border-purple-500 bg-black/10 dark:bg-white/5 self-start ml-1 text-black dark:text-white'}`}>
            <span className="font-bold opacity-70 block mb-0.5 text-[10px] tracking-wide uppercase">{replyToMessage.senderId === user?.id ? '↩ أنت' : '↩ هم'}</span>
            <span className="italic line-clamp-1 opacity-60">{replyToMessage.text || 'مرفق'}</span>
          </div>
        )}

        <div className="relative flex items-end gap-2">
          {!isOwn && isGroup && (
            <div className="flex-shrink-0 mb-1">
              <img src={senderAvatar} className="w-7 h-7 rounded-full object-cover border border-gray-100 dark:border-gray-800" />
            </div>
          )}

          <div className="flex flex-col gap-1 min-w-0">

            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-col gap-1 mb-1">
                {message.isViewOnce && !isOwn && message.viewOnceOpened ? (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm italic">
                    <EyeOff size={16} />
                    <span>تم فتح الصورة</span>
                  </div>
                ) : message.isViewOnce && isOwn ? (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-sm">
                    <Flame size={16} />
                    <span>صورة تُشاهد مرة واحدة</span>
                  </div>
                ) : message.attachments.map((att, i) => (
                  att.type === 'image' ? (
                    message.isViewOnce && !isOwn ? (
                      <div key={i} className="relative cursor-pointer" onClick={() => { if (!viewOnceRevealed) { setViewOnceRevealed(true); setTimeout(() => setViewOnceRevealed(false), 5000); } }}>
                        <img
                          src={att.url}
                          alt="attachment"
                          className={`rounded-2xl max-h-80 object-cover shadow-sm transition-all duration-500 ${viewOnceRevealed ? '' : 'blur-[20px] brightness-50'} ${isOwn ? 'rounded-br-[4px]' : 'rounded-bl-[4px]'}`}
                        />
                        {!viewOnceRevealed && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                            <Eye size={32} className="mb-2" />
                            <span className="text-sm font-medium">اضغط لعرض الصورة</span>
                          </div>
                        )}
                        {viewOnceRevealed && (
                          <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <Flame size={12} /> تُشاهد مرة واحدة
                          </div>
                        )}
                      </div>
                    ) : (
                      <img key={i} src={att.url} alt="attachment" className={`rounded-2xl max-h-80 object-cover shadow-sm hover:shadow-md transition-shadow ${isOwn ? 'rounded-br-[4px]' : 'rounded-bl-[4px]'}`} />
                    )
                  ) : att.type === 'audio' || att.name === 'voice_message.webm' || att.url.startsWith('data:audio') ? (
                    <div key={i} className={`rounded-2xl overflow-hidden shadow-lg ${isOwn ? `${currentTheme.bubbleOwn} text-white border border-white/10` : `${currentTheme.bubbleReceived} border-white/10`}`}>
                      <CustomAudioPlayer src={att.url} isOwn={isOwn} />
                    </div>
                  ) : (
                    <div key={i} className="p-4 bg-gray-100 dark:bg-dark-card rounded-2xl flex items-center gap-3 shadow-sm border border-gray-200 dark:border-gray-800">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold">PDF</div>
                      <span className="text-sm font-medium truncate underline text-gray-700 dark:text-gray-300">{att.name}</span>
                    </div>
                  )
                ))}
              </div>
            )}

            {message.text && (
              isOnlyEmojis ? (
                <div
                  className="px-2 py-1 text-6xl leading-none drop-shadow-sm transition-transform hover:scale-110 cursor-default select-none emoji-text"
                  style={{
                    display: 'inline-block',
                    lineHeight: '1',
                    verticalAlign: 'middle'
                  }}
                >
                  <span
                    style={{ display: 'inline-block' }}
                    dangerouslySetInnerHTML={{
                      __html: twemoji.parse(message.text, {
                        attributes: () => ({ style: 'display: inline-block; vertical-align: middle; height: 1em; width: 1em; margin: 0;' }),
                        callback: function (icon, options, variant) {
                          return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/${icon}.png`;
                        }
                      })
                    }}
                  />
                </div>
              ) : (
                <>
                  <div
                    dir="auto"
                    className={`relative px-4 pt-2.5 pb-[22px] rounded-[20px] text-[15px] leading-[1.55] break-words whitespace-pre-wrap emoji-text overflow-hidden ${isOwn
                      ? `${currentTheme.bubbleOwn} text-white rounded-br-[5px] shadow-[0_4px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-white/10`
                      : `${currentTheme.bubbleReceived} border-b-transparent rounded-bl-[5px] shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]`
                      }`}
                  >
                    {isEditing && isOwn ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              editMessage(message.id, editText);
                              setIsEditing(false);
                            }
                            if (e.key === 'Escape') {
                              setIsEditing(false);
                              setEditText(message.text);
                            }
                          }}
                          className="flex-1 bg-transparent border-none outline-none text-inherit"
                          autoFocus
                        />
                        <button
                          onClick={() => { editMessage(message.id, editText); setIsEditing(false); }}
                          className="text-blue-500 text-xs font-semibold"
                        >
                          حفظ
                        </button>
                        <button
                          onClick={() => { setIsEditing(false); setEditText(message.text); }}
                          className="text-gray-500 text-xs"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <>
                        <span style={{ lineHeight: '1.6', wordBreak: 'break-word' }}>
                          {message.isDeleted ? (
                            <span className="italic text-gray-400 dark:text-gray-500">
                              {message.deletedFor === 'everyone' ? 'تم حذف هذه الرسالة' : 'أنت حذفت هذه الرسالة'}
                            </span>
                          ) : message.text && (message.text.startsWith('data:image') || message.text.startsWith('https://media.tenor') || message.text.match(/^https?:\/\/.+\.(gif|png|jpg|jpeg|webp)(\?.*)?$/i)) ? (
                            <img src={message.text} alt="media" className="rounded-2xl max-h-80 object-cover" />
                          ) : searchQuery && message.text ? (
                            <HighlightedText text={message.text} query={searchQuery} />
                          ) : (
                            <span dangerouslySetInnerHTML={{
                              __html: twemoji.parse(message.text, {
                                attributes: () => ({ style: 'display: inline-block; vertical-align: -0.2em; height: 1.25em; width: 1.25em; margin: 0 .05em 0 .1em;' }),
                                callback: function (icon, options, variant) {
                                  return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/${icon}.png`;
                                }
                              })
                            }} />
                          )}
                        </span>
                        {message.isEdited && (
                          <span className="text-[10px] opacity-50 mr-1 italic">(عُدِّل)</span>
                        )}
                        {message.isPinned && (
                          <Pin size={11} className="text-yellow-300 mr-1 inline" fill="currentColor" />
                        )}
                      </>
                    )}
                    {/* Embedded timestamp inside bubble */}
                    <div className={`absolute bottom-1.5 ${isOwn ? 'left-3' : 'right-3'} flex items-center gap-1`}>
                      <span className={`text-[10px] font-medium ${isOwn ? 'text-white/55' : 'text-white/40'}`}>
                        {format(new Date(message.createdAt), 'h:mm a')}
                      </span>
                      {isOwn && (
                        <span className="text-white/70">
                          {message.status === 'seen' || (message.seenBy && message.seenBy.length > 0)
                            ? <CheckCheck size={13} strokeWidth={2.5} className="text-blue-300" />
                            : <Check size={13} strokeWidth={2.5} className="text-white/60" />}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Translate Button */}
                  {message.text && !message.isDeleted && !isOnlyEmojis && (
                    <div className="mt-1">
                      <button
                        onClick={async () => {
                          if (translatedText) { setTranslatedText(null); return; }
                          setIsTranslating(true);
                          try {
                            const isArabic = /[\u0600-\u06FF]/.test(message.text);
                            const langPair = isArabic ? 'ar|en' : 'en|ar';
                            const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(message.text)}&langpair=${langPair}`);
                            const data = await res.json();
                            setTranslatedText(data.responseData?.translatedText || 'Translation failed');
                          } catch { setTranslatedText('Translation failed'); }
                          setIsTranslating(false);
                        }}
                        className={`flex items-center gap-1 text-[10px] font-medium transition-all ${translatedText ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400'}`}
                      >
                        <Globe size={11} />
                        {isTranslating ? 'Translating...' : translatedText ? 'Hide translation' : 'Translate'}
                      </button>
                      <AnimatePresence>
                        {translatedText && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className={`text-xs mt-1 px-2 py-1.5 rounded-lg ${isOwn ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'}`}
                            style={{ fontFamily: '-apple-system, sans-serif' }}
                          >
                            🌍 {translatedText}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </>
              )
            )}
          </div>

          <div className={`absolute ${isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 mx-2 z-20 h-full`}>
            <div className="relative">
              <button
                onClick={() => setShowReactions(!showReactions)}
                className={`px-2 py-1.5 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 ${myReaction
                  ? 'bg-violet-500/30 backdrop-blur-sm border border-violet-400/40'
                  : 'bg-black/50 backdrop-blur-md border border-white/15 hover:bg-black/70'
                  }`}
              >
                {myReaction ? (
                  <AppleEmoji emoji={REACTION_EMOJIS[myReaction.type]} className="w-5 h-5 block" />
                ) : (
                  <AppleEmoji emoji="🤍" className="w-[18px] h-[18px] block opacity-70 drop-shadow-sm" />
                )}
              </button>

              <AnimatePresence>
                {showReactions && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.7, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.7, y: 8 }}
                    transition={{ type: 'spring', damping: 18, stiffness: 350 }}
                    className={`absolute bottom-full mb-3 flex gap-1.5 bg-[#0d0d1a]/95 backdrop-blur-xl rounded-full px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-white/12 z-50 ${isOwn ? 'right-0' : 'left-0'}`}
                  >
                    {Object.entries(REACTION_EMOJIS).map(([type, emoji]) => (
                      <motion.button
                        key={type}
                        whileHover={{ scale: 1.35, y: -4 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleReaction(type as ReactionType)}
                        className={`w-9 h-9 flex items-center justify-center rounded-full text-xl transition-colors ${myReaction?.type === type
                          ? 'bg-violet-500/40 ring-2 ring-violet-400'
                          : 'hover:bg-white/10'
                          }`}
                      >
                        <AppleEmoji emoji={emoji} className="w-[26px] h-[26px] block drop-shadow-md" />
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 bg-black/60 dark:bg-black/80 backdrop-blur-md rounded-full shadow-lg border border-white/10 hover:scale-110 transition-all hover:bg-black/70"
              >
                <MoreVertical size={14} className="text-white" />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: 8 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    className={`absolute ${isOwn ? 'right-0' : 'left-0'} bottom-full mb-2 bg-[#111]/90 dark:bg-[#0a0a0a]/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 overflow-hidden min-w-[160px] z-50`}
                  >
                    <button
                      onClick={() => { copyMessage(message.id); setShowMenu(false); }}
                      className="w-full px-4 py-3 text-right text-sm hover:bg-white/8 flex items-center gap-3 text-gray-200 transition-colors"
                    >
                      <Copy size={16} className="text-gray-400" />
                      نسخ
                    </button>
                    <button
                      onClick={handleReply}
                      className="w-full px-4 py-3 text-right text-sm hover:bg-white/8 flex items-center gap-3 text-gray-200 transition-colors"
                    >
                      <Reply size={16} className="text-gray-400" />
                      رد
                    </button>
                    <button
                      onClick={handleForward}
                      className="w-full px-4 py-3 text-right text-sm hover:bg-white/8 flex items-center gap-3 text-gray-200 transition-colors"
                    >
                      <Forward size={16} className="text-gray-400" />
                      تحويل
                    </button>
                    {isOwn && (
                      <>
                        <button
                          onClick={() => { setIsEditing(true); setEditText(message.text); setShowMenu(false); }}
                          className="w-full px-4 py-3 text-right text-sm hover:bg-white/8 flex items-center gap-3 text-gray-200 transition-colors"
                        >
                          <Edit2 size={16} className="text-gray-400" />
                          تعديل
                        </button>
                        <button
                          onClick={() => { deleteMessage(message.id, 'me'); setShowMenu(false); }}
                          className="w-full px-4 py-3 text-right text-sm hover:bg-red-500/20 flex items-center gap-3 text-red-400 transition-colors"
                        >
                          <Trash2 size={16} />
                          حذف لي
                        </button>
                        <button
                          onClick={() => { deleteMessage(message.id, 'everyone'); setShowMenu(false); }}
                          className="w-full px-4 py-3 text-right text-sm hover:bg-red-500/20 flex items-center gap-3 text-red-400 transition-colors"
                        >
                          <Trash2 size={16} />
                          حذف للجميع
                        </button>
                      </>
                    )}
                    <div className="h-px bg-white/8 mx-3" />
                    <button
                      onClick={() => { message.isPinned ? unpinMessage(message.id) : pinMessage(message.id); setShowMenu(false); }}
                      className="w-full px-4 py-3 text-right text-sm hover:bg-white/8 flex items-center gap-3 text-gray-200 transition-colors"
                    >
                      <Pin size={16} className={`text-gray-400 ${message.isPinned ? 'fill-current text-yellow-400' : ''}`} />
                      {message.isPinned ? 'إلغاء التثبيت' : 'تثبيت'}
                    </button>
                    <button
                      onClick={() => { setShowMenu(false); toast(message.isBookmarked ? 'تم إزالة الحفظ' : 'تم حفظ الرسالة ✨'); }}
                      className="w-full px-4 py-3 text-right text-sm hover:bg-white/8 flex items-center gap-3 text-gray-200 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={message.isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={message.isBookmarked ? 'text-yellow-400' : 'text-gray-400'}><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" /></svg>
                      {message.isBookmarked ? 'إلغاء الحفظ' : 'حفظ'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>



        {message.reactions && message.reactions.length > 0 && (
          <div className={`mt-1.5 flex items-center gap-1.5 flex-wrap ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(
              message.reactions.reduce((acc, r) => {
                acc[r.type] = (acc[r.type] || 0) + 1;
                return acc;
              }, {} as Record<ReactionType, number>)
            ).map(([type, count]) => (
              <motion.button
                key={type}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', damping: 15, stiffness: 400 }}
                onClick={() => handleReaction(type as ReactionType)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[13px] border border-white/15 backdrop-blur-md shadow-md"
                style={{
                  background: myReaction?.type === (type as ReactionType)
                    ? 'rgba(124,58,237,0.35)'
                    : isOwn
                      ? 'rgba(255,255,255,0.18)'
                      : currentTheme.reactionBg,
                  boxShadow: myReaction?.type === (type as ReactionType)
                    ? '0 0 8px rgba(124,58,237,0.4)'
                    : '0 2px 8px rgba(0,0,0,0.25)',
                }}
              >
                <AppleEmoji emoji={REACTION_EMOJIS[type as ReactionType]} className="w-[14px] h-[14px] block shadow-[0_1px_2px_rgba(0,0,0,0.2)]" />
                {(count as number) > 1 && (
                  <span className="text-[10px] font-bold text-white/85">{count as number}</span>
                )}
              </motion.button>
            ))}
          </div>
        )}




      </div>
    </motion.div >
  );
};
