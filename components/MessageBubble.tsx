import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Play, Pause, Check, CheckCheck } from 'lucide-react';

interface Props {
  message: Message;
  isOwn: boolean;
  senderAvatar?: string;
}

const CustomAudioPlayer: React.FC<{ src: string; isOwn: boolean }> = ({ src, isOwn }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

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
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Generate some fake waveform bars
  const bars = Array.from({ length: 20 });

  return (
    <div className={`flex items-center gap-3 p-3 rounded-2xl min-w-[240px] select-none transition-colors ${isOwn ? 'bg-white/20' : 'bg-black/5 dark:bg-white/10'}`}>
      <button 
        onClick={togglePlay}
        className={`w-10 h-10 flex items-center justify-center rounded-full shadow-lg transition-all active:scale-95 ${isOwn ? 'bg-white text-blue-600' : 'bg-blue-500 text-white'}`}
      >
        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
      </button>

      <div className="flex flex-col flex-1 gap-1.5">
        <div className="flex items-center gap-0.5 h-8 opacity-90">
            {bars.map((_, i) => (
                <div 
                    key={i} 
                    className={`w-1 rounded-full transition-all duration-300 ${isOwn ? 'bg-white' : 'bg-gray-400 dark:bg-gray-400'}`}
                    style={{ 
                        height: isPlaying ? `${Math.max(20, Math.random() * 100)}%` : `${30 + Math.sin(i)*20}%`,
                        opacity: (progress / 100) * 20 > i ? 1 : 0.5
                    }}
                />
            ))}
        </div>
        <div className={`text-[10px] font-bold ml-0.5 ${isOwn ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'}`}>
             {isPlaying ? formatTime(currentTime) : formatTime(duration)}
        </div>
      </div>

      <audio 
        ref={audioRef} 
        src={src} 
        className="hidden" 
        onTimeUpdate={handleTimeUpdate} 
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
      />
    </div>
  );
};

export const MessageBubble: React.FC<Props> = ({ message, isOwn, senderAvatar }) => {
  // Check if the text is composed ONLY of emojis (1 to 3)
  // This Regex checks for emoji ranges including variations and joint emojis
  const isOnlyEmojis = message.text && /^(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff]){1,3}$/.test(message.text.trim());

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex items-end gap-2.5 ${isOwn ? 'justify-end' : 'justify-start'} group mb-1`}
    >
      {!isOwn && (
        <img src={senderAvatar} alt="sender" className="w-8 h-8 rounded-full mb-1 border border-white/50 shadow-sm" />
      )}
      
      <div className={`max-w-[75%] relative flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-col gap-2 mb-2">
            {message.attachments.map((att, i) => (
              att.type === 'image' ? (
                <img key={i} src={att.url} alt="attachment" className={`rounded-2xl max-h-72 object-cover shadow-md hover:shadow-xl transition-shadow border-2 ${isOwn ? 'border-blue-400' : 'border-white dark:border-gray-700'}`} />
              ) : att.type === 'audio' || att.name === 'voice_message.webm' || att.url.startsWith('data:audio') ? (
                <div key={i} className={`rounded-2xl overflow-hidden shadow-md ${isOwn ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'bg-white dark:bg-dark-card'}`}>
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

        {/* Text */}
        {message.text && (
            isOnlyEmojis ? (
                // Jumbo Emoji Style (iPhone/Messenger look for standalone emojis)
                <div className="px-2 py-1 text-5xl leading-none drop-shadow-sm transition-transform hover:scale-110 cursor-default select-none">
                    {message.text}
                </div>
            ) : (
                // Normal Text Bubble
                <div 
                className={`px-5 py-2.5 rounded-2xl shadow-sm text-[15px] leading-relaxed break-words whitespace-pre-wrap ${
                    isOwn 
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-sm shadow-blue-500/20' 
                    : 'bg-white dark:bg-[#111a2d] text-gray-800 dark:text-gray-100 rounded-bl-sm border border-gray-100 dark:border-white/5 shadow-sm'
                }`}
                >
                {message.text}
                </div>
            )
        )}

        {/* Status Indicators (Only for Own Messages, hide if big emoji for cleaner look or keep it subtle) */}
        {isOwn && (
            <div className={`flex justify-end mt-1 mr-1 gap-1 ${isOnlyEmojis ? 'opacity-50' : ''}`}>
                {message.status === 'sent' && (
                     <Check size={14} className="text-gray-400" />
                )}
                {message.status === 'delivered' && (
                     <CheckCheck size={14} className="text-gray-400" />
                )}
                {message.status === 'seen' && (
                     <CheckCheck size={14} className="text-blue-500" />
                )}
            </div>
        )}

        {/* Time Tooltip (Hover) */}
        <div className={`absolute -bottom-5 ${isOwn ? 'right-0' : 'left-0'} text-[10px] font-medium text-gray-400 px-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10`}>
            {format(new Date(message.createdAt), 'h:mm a')}
        </div>
      </div>
    </motion.div>
  );
};