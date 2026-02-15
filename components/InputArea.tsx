import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { Smile, Image as ImageIcon, Paperclip, Send, X, Mic, Square, Trash2, Play, Pause } from 'lucide-react';
import EmojiPicker, { Theme as EmojiTheme, EmojiStyle } from 'emoji-picker-react';
import { useTheme } from '../context/ThemeContext';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';

export const InputArea: React.FC = () => {
  const { sendMessage } = useChat();
  const { theme } = useTheme();
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  // Preview Player State
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
      return () => {
          if (timerRef.current) clearInterval(timerRef.current);
      };
  }, []);

  const handleSend = async () => {
    if ((!text.trim() && attachments.length === 0 && !audioBlob)) return;
    
    const filesToSend = [...attachments];
    
    // If we have an audio blob, convert to File and push to attachments
    if (audioBlob) {
        const audioFile = new File([audioBlob], "voice_message.webm", { type: 'audio/webm' });
        filesToSend.push(audioFile);
    }

    await sendMessage(text, filesToSend);
    
    // Reset state
    setText('');
    setAttachments([]);
    setAudioBlob(null);
    setShowEmoji(false);
    setIsPlayingPreview(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // --- Audio Recording Logic ---

  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorderRef.current = new MediaRecorder(stream);
          chunksRef.current = [];

          mediaRecorderRef.current.ondataavailable = (e) => {
              if (e.data.size > 0) chunksRef.current.push(e.data);
          };

          mediaRecorderRef.current.onstop = () => {
              const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
              setAudioBlob(blob);
              stream.getTracks().forEach(track => track.stop()); // Stop mic
          };

          mediaRecorderRef.current.start();
          setIsRecording(true);
          setRecordingTime(0);
          timerRef.current = setInterval(() => {
              setRecordingTime(prev => prev + 1);
          }, 1000);

      } catch (err) {
          toast.error("Microphone access denied");
      }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          if (timerRef.current) clearInterval(timerRef.current);
      }
  };

  const cancelRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          if (timerRef.current) clearInterval(timerRef.current);
      }
      setAudioBlob(null);
      chunksRef.current = [];
      setIsPlayingPreview(false);
  };

  const togglePreview = () => {
      if (!previewAudioRef.current) return;
      if (isPlayingPreview) {
          previewAudioRef.current.pause();
      } else {
          previewAudioRef.current.play();
      }
      setIsPlayingPreview(!isPlayingPreview);
  };

  const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="p-3 bg-white dark:bg-dark-surface border-t border-gray-100 dark:border-gray-800">
      {/* Attachments Preview */}
      <AnimatePresence>
        {(attachments.length > 0 || audioBlob) && (
            <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex gap-3 mb-3 overflow-x-auto pb-2 scrollbar-hide"
            >
            {attachments.map((file, i) => (
                <div key={i} className="relative group flex-shrink-0">
                {file.type.startsWith('image/') ? (
                    <img src={URL.createObjectURL(file)} className="w-16 h-16 object-cover rounded-xl border dark:border-gray-700" />
                ) : (
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center border dark:border-gray-600">
                        <Paperclip size={20} className="text-gray-500" />
                    </div>
                )}
                <button 
                    onClick={() => removeAttachment(i)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-md"
                >
                    <X size={12} />
                </button>
                </div>
            ))}
            
            {audioBlob && (
                <div className="relative group flex-shrink-0 flex items-center gap-2 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 pl-2 pr-4 py-2 rounded-2xl border border-blue-100 dark:border-blue-800">
                    <button 
                        onClick={togglePreview}
                        className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-blue-600 transition-colors"
                    >
                        {isPlayingPreview ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                    </button>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-300">Voice Note</span>
                        <span className="text-[10px] text-blue-500/80 dark:text-blue-300/70">{formatTime(recordingTime)}</span>
                    </div>
                    
                    <audio 
                        ref={previewAudioRef} 
                        src={URL.createObjectURL(audioBlob)} 
                        onEnded={() => setIsPlayingPreview(false)} 
                        className="hidden" 
                    />

                    <button 
                        onClick={cancelRecording}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md"
                    >
                        <X size={12} />
                    </button>
                </div>
            )}
            </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-2">
        {isRecording ? (
             <div className="flex-1 flex items-center justify-between bg-gradient-to-r from-red-50 to-white dark:from-red-900/20 dark:to-dark-surface rounded-full px-1 py-1 border border-red-100 dark:border-red-800/30 shadow-inner">
                 <div className="flex items-center gap-3 px-4 py-2">
                     <div className="relative">
                         <span className="w-3 h-3 bg-red-500 rounded-full animate-ping absolute top-0 left-0 opacity-75"></span>
                         <span className="w-3 h-3 bg-red-500 rounded-full relative block"></span>
                     </div>
                     <span className="text-red-600 dark:text-red-400 font-mono font-medium">{formatTime(recordingTime)}</span>
                 </div>
                 <div className="flex gap-1 pr-1">
                     <button onClick={cancelRecording} className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"><Trash2 size={20} /></button>
                     <button onClick={stopRecording} className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md transition-all active:scale-95"><Send size={18} className="ml-0.5" /></button>
                 </div>
             </div>
        ) : (
            <>
                <div className="flex gap-1 pb-2 text-primary-500">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <ImageIcon size={22} />
                    </button>
                    <input 
                        type="file" 
                        multiple 
                        className="hidden" 
                        ref={fileInputRef} 
                        onChange={handleFileChange}
                    />
                    {/* Emoji Trigger */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowEmoji(!showEmoji)}
                            className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors ${showEmoji ? 'bg-gray-100 dark:bg-gray-700 text-primary-600' : ''}`}
                        >
                            <Smile size={22} />
                        </button>
                        
                        <AnimatePresence>
                            {showEmoji && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                    className="absolute bottom-12 left-0 z-50 shadow-2xl rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 origin-bottom-left"
                                >
                                    <EmojiPicker 
                                        theme={theme === 'dark' ? EmojiTheme.DARK : EmojiTheme.LIGHT}
                                        emojiStyle={EmojiStyle.APPLE}
                                        onEmojiClick={(emoji) => setText(prev => prev + emoji.emoji)}
                                        width={300}
                                        height={400}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    
                    <button 
                        onClick={startRecording}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <Mic size={22} />
                    </button>
                </div>

                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-3xl px-5 py-3 focus-within:ring-2 focus-within:ring-primary-500/50 transition-all border border-transparent dark:border-gray-700">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Message..."
                        rows={1}
                        className="w-full bg-transparent border-none outline-none resize-none max-h-32 py-0 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                        style={{ minHeight: '24px' }}
                    />
                </div>

                <button 
                    onClick={handleSend}
                    disabled={!text.trim() && attachments.length === 0 && !audioBlob}
                    className="p-3 bg-primary-500 text-white rounded-full hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-primary-500/30"
                >
                    <Send size={20} className={(text.trim() || attachments.length > 0 || audioBlob) ? 'ml-0.5' : ''} />
                </button>
            </>
        )}
      </div>
    </div>
  );
};