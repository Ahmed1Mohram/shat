import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { Smile, Image as ImageIcon, Paperclip, Send, X, Mic, Square, Trash2, Play, Pause, Reply, Check, Monitor, Sparkles, Clapperboard, Flame, BarChart3, Clock, Plus, Pencil } from 'lucide-react';
import { Message, PollData } from '../types';
import EmojiPicker, { Theme as EmojiTheme, EmojiStyle } from 'emoji-picker-react';
import { useTheme } from '../context/ThemeContext';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';

export const InputArea: React.FC = () => {
  const { sendMessage, replyToMessage, messages, currentConversationId, conversations, sendTyping } = useChat();
  const conversation = conversations.find(c => c.id === currentConversationId);
  const isVanishMode = conversation?.isVanishMode || false;
  const { theme } = useTheme();
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  const [isLoadingGifs, setIsLoadingGifs] = useState(false);
  const gifSearchTimerRef = useRef<any>(null);
  const [isViewOnce, setIsViewOnce] = useState(false);

  // Unique Feature States
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');

  // Drawing Pad States
  const [showDrawingPad, setShowDrawingPad] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#6366f1');
  const [brushSize, setBrushSize] = useState(3);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // State & Refs
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const isCancelledRef = useRef<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const activeStreamsRef = useRef<MediaStream[]>([]);
  const [recordSystemAudio, setRecordSystemAudio] = useState(false);
  const [isHdMic, setIsHdMic] = useState(false);
  // Typing indicator debounce timer
  const typingTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [audioBlob]);

  // Listen for reply requests
  useEffect(() => {
    const handleReplyRequest = (messageId: string) => {
      const msg = messages.find(m => m.id === messageId);
      if (msg) {
        setReplyingTo(msg);
      }
    };

    // This will be called from MessageBubble
    (window as any).requestReply = handleReplyRequest;

    return () => {
      delete (window as any).requestReply;
    };
  }, [messages]);

  const handleSend = async () => {
    if ((!text.trim() && attachments.length === 0 && !audioBlob)) return;

    const filesToSend = [...attachments];

    // If we have an audio blob, convert to File and push to attachments
    if (audioBlob) {
      const audioFile = new File([audioBlob], "voice_message.webm", { type: 'audio/webm' });
      filesToSend.push(audioFile);
    }

    if (replyingTo) {
      await replyToMessage(replyingTo.id, text, filesToSend);
      setReplyingTo(null);
    } else {
      await sendMessage(text, filesToSend);
    }

    // Reset state + stop typing signal
    setText('');
    setAttachments([]);
    setAudioBlob(null);
    setShowEmoji(false);
    setIsPlayingPreview(false);
    setIsViewOnce(false);
    // Clear typing timer and signal stopped
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    sendTyping(false);
  };

  // Handle text changes with typing indicator
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Signal typing started
    sendTyping(true);
    // Auto-stop after 2s of inactivity
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => sendTyping(false), 2000);
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

  // --- GIF Search Logic ---
  const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ'; // Free Tenor API key

  const fetchGifs = async (query: string) => {
    setIsLoadingGifs(true);
    try {
      const endpoint = query.trim()
        ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=20&media_filter=gif`
        : `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&limit=20&media_filter=gif`;
      const res = await fetch(endpoint);
      const data = await res.json();
      setGifs(data.results || []);
    } catch (err) {
      console.error('GIF fetch error:', err);
    }
    setIsLoadingGifs(false);
  };

  useEffect(() => {
    if (showGifPicker) {
      fetchGifs('');
    }
  }, [showGifPicker]);

  const handleGifSearchChange = (value: string) => {
    setGifSearch(value);
    if (gifSearchTimerRef.current) clearTimeout(gifSearchTimerRef.current);
    gifSearchTimerRef.current = setTimeout(() => fetchGifs(value), 400);
  };

  const sendGif = async (gifUrl: string) => {
    setShowGifPicker(false);
    setGifSearch('');
    // Send GIF as image attachment, not as text
    await sendMessage('', [{ type: 'image', url: gifUrl, name: 'gif.gif' } as any]);
  };

  // --- Poll Logic ---
  const sendPoll = async () => {
    if (!pollQuestion.trim()) { toast.error('Add a question!'); return; }
    const validOptions = pollOptions.filter(o => o.trim());
    if (validOptions.length < 2) { toast.error('Add at least 2 options!'); return; }

    const pollData: PollData = {
      question: pollQuestion,
      options: validOptions.map((text, i) => ({ id: `opt_${i}`, text, votes: [] })),
      totalVotes: 0,
    };

    // Send poll as a JSON-encoded message with poll prefix
    await sendMessage(`📊 POLL: ${pollQuestion}\n${validOptions.map((o, i) => `${i + 1}. ${o}`).join('\n')}`);
    setShowPollCreator(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    toast.success('Poll sent!');
  };

  const addPollOption = () => {
    if (pollOptions.length < 6) setPollOptions([...pollOptions, '']);
  };

  const updatePollOption = (index: number, value: string) => {
    const updated = [...pollOptions];
    updated[index] = value;
    setPollOptions(updated);
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) setPollOptions(pollOptions.filter((_, i) => i !== index));
  };

  // --- Schedule Logic ---
  const sendScheduled = async () => {
    if (!scheduledTime) { toast.error('Pick a time!'); return; }
    if (!text.trim()) { toast.error('Write a message first!'); return; }
    const scheduledDate = new Date(scheduledTime);
    const now = new Date();
    if (scheduledDate <= now) { toast.error('Time must be in the future!'); return; }

    const delay = scheduledDate.getTime() - now.getTime();
    const msgText = text;
    toast.success(`Message scheduled for ${scheduledDate.toLocaleTimeString()}`);
    setText('');
    setShowScheduler(false);
    setScheduledTime('');

    setTimeout(async () => {
      await sendMessage(`⏰ [Scheduled] ${msgText}`);
      toast('Scheduled message sent! ⏰');
    }, delay);
  };

  // --- Drawing Pad Logic ---
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(2, 2);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = brushSize;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctxRef.current = ctx;
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = brushSize;
    ctx.beginPath();
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !ctxRef.current) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (canvas && ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const sendDrawing = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    // Send drawing as image attachment, not as text
    await sendMessage('', [{ type: 'image', url: dataUrl, name: 'doodle.png' } as any]);
    setShowDrawingPad(false);
    toast.success('Doodle sent! \u270F\uFE0F');
  };

  // --- Audio Recording Logic ---

  const startRecording = async () => {
    try {
      let finalStream: MediaStream;
      let micStream: MediaStream | null = null;
      let screenStream: MediaStream | null = null;
      activeStreamsRef.current = [];
      isCancelledRef.current = false; // Reset cancellation state

      if (recordSystemAudio || isHdMic) {
        if (recordSystemAudio) {
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
          });
        }

        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 48000,
            channelCount: 2
          }
        });

        const audioContext = new AudioContext();
        const dest = audioContext.createMediaStreamDestination();

        if (screenStream && screenStream.getAudioTracks().length > 0) {
          const screenSource = audioContext.createMediaStreamSource(screenStream);
          screenSource.connect(dest);
        }

        if (micStream.getAudioTracks().length > 0) {
          const micSource = audioContext.createMediaStreamSource(micStream);

          if (isHdMic) {
            // Apply professional Studio EQ & Compression
            const bassEQ = audioContext.createBiquadFilter();
            bassEQ.type = 'lowshelf';
            bassEQ.frequency.value = 150;
            bassEQ.gain.value = 10; // Punchy deep bass

            const trebleEQ = audioContext.createBiquadFilter();
            trebleEQ.type = 'highshelf';
            trebleEQ.frequency.value = 4000;
            trebleEQ.gain.value = 3; // Crisp presence

            const compressor = audioContext.createDynamicsCompressor();
            compressor.threshold.value = -30;
            compressor.knee.value = 10;
            compressor.ratio.value = 8;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;

            micSource.connect(bassEQ);
            bassEQ.connect(trebleEQ);
            trebleEQ.connect(compressor);
            compressor.connect(dest);
          } else {
            micSource.connect(dest);
          }
        }

        finalStream = dest.stream;
        activeStreamsRef.current = [];
        if (screenStream) {
          activeStreamsRef.current.push(screenStream);
          screenStream.getVideoTracks().forEach(track => track.stop()); // Stop video immediately
        }
        activeStreamsRef.current.push(micStream);
      } else {
        finalStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 48000,
            channelCount: 2
          }
        });
        activeStreamsRef.current = [finalStream];
      }

      // Use mimeType that's widely supported with higher bitrate for clarity
      const options: MediaRecorderOptions = { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 256000 };
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        // Fallback to default with high bitrate
        mediaRecorderRef.current = new MediaRecorder(finalStream, { audioBitsPerSecond: 256000 });
      } else {
        mediaRecorderRef.current = new MediaRecorder(finalStream, options);
      }

      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        if (chunksRef.current.length > 0 && !isCancelledRef.current) {
          const actualMimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
          const blob = new Blob(chunksRef.current, { type: actualMimeType });

          let extension = 'webm';
          if (actualMimeType.includes('mp4') || actualMimeType.includes('m4a')) {
            extension = 'mp4';
          }

          const audioFile = new File([blob], `voice_message.${extension}`, { type: actualMimeType });

          if (replyingTo) {
            await replyToMessage(replyingTo.id, '', [audioFile]);
            setReplyingTo(null);
          } else {
            await sendMessage('', [audioFile]);
          }
        }
        activeStreamsRef.current.forEach(s => s.getTracks().forEach(track => track.stop()));
      };

      mediaRecorderRef.current.onerror = (e) => {
        console.error('MediaRecorder error:', e);
        toast.error("Recording error occurred");
        setIsRecording(false);
        activeStreamsRef.current.forEach(s => s.getTracks().forEach(track => track.stop()));
      };

      mediaRecorderRef.current.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error('Recording error:', err);
      toast.error(err.message || "Microphone/Screen access denied. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          // Request final data block explicitly before stopping for WebAudio streams
          mediaRecorderRef.current.requestData();
          setTimeout(() => {
            if (mediaRecorderRef.current?.state !== 'inactive') {
              mediaRecorderRef.current?.stop();
            }
          }, 100);
        } else {
          // Already inactive but we need to stop tracks
          activeStreamsRef.current.forEach(s => s.getTracks().forEach(track => track.stop()));
        }
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      } catch (err) {
        console.error('Error stopping recording:', err);
        toast.error("Error stopping recording");
        setIsRecording(false);
        activeStreamsRef.current.forEach(s => s.getTracks().forEach(track => track.stop()));
      }
    }
  };

  const cancelRecording = () => {
    isCancelledRef.current = true;
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
    <div className={`px-2 py-2 relative z-20 transition-all duration-300 ${theme === 'light' ? 'bg-white' : 'bg-transparent'}`}>

      {/* Reply Context */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            className="mb-2 mx-1 p-2.5 rounded-2xl bg-gray-100 dark:bg-[#1a1a1a] border-l-4 border-blue-500 flex items-center justify-between shadow-sm"
          >
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-xs font-bold text-blue-500 mb-0.5">ردًا على</p>
              <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                {replyingTo.text || (replyingTo.attachments?.length ? 'مرفق' : 'رسالة صوتية')}
              </p>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors text-gray-500"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Single compact row */}
      <div className={`flex items-end gap-1.5 relative ${isVanishMode ? 'bg-gray-900/50 rounded-3xl p-1' : ''}`}>

        {/* Main Pill */}
        <div className={`flex-1 min-w-0 flex items-end gap-1 px-2 py-1 rounded-[26px] border transition-all ${theme === 'light'
          ? 'bg-gray-100 border-transparent focus-within:bg-white focus-within:border-gray-300'
          : 'bg-white/6 backdrop-blur-md border border-white/10 focus-within:border-violet-500/40 focus-within:bg-white/8'
          }`}>

          {/* Image attach button */}
          <button
            className="p-1.5 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors rounded-full flex-shrink-0 mb-0.5"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon size={20} strokeWidth={1.5} />
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*,.pdf,.doc,.docx,.zip" multiple onChange={handleFileChange} />

          {/* Auto-grow textarea */}
          <textarea
            value={text}
            onChange={(e) => {
              handleTextChange(e);
              // Auto-grow
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder="رسالة..."
            className="flex-1 min-w-0 w-full bg-transparent border-none outline-none text-[15px] resize-none py-2 px-1 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 leading-5"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', height: '36px', minHeight: '36px', maxHeight: '120px', overflowY: 'hidden' }}
            rows={1}
          />

          {/* Right-side buttons: change based on text/recording state */}
          {isRecording ? (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1 bg-red-500 text-white px-2 py-1 rounded-full flex-shrink-0 mb-0.5"
            >
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              <span className="text-xs font-mono min-w-[32px]">{formatTime(recordingTime)}</span>
              <button onClick={cancelRecording} className="p-1 hover:bg-red-600 rounded-full"><X size={14} /></button>
              <button onClick={stopRecording} className="p-1 hover:bg-red-600 rounded-full"><Check size={14} /></button>
            </motion.div>
          ) : text ? (
            <>
              <button
                className="p-1.5 text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-400 transition-colors rounded-full flex-shrink-0 mb-0.5"
                onClick={() => setShowScheduler(!showScheduler)}
                title="Schedule Message"
              >
                <Clock size={18} strokeWidth={1.5} />
              </button>
              <button
                onClick={handleSend}
                disabled={!text.trim() && attachments.length === 0 && !audioBlob}
                className="p-1.5 text-blue-500 font-bold text-[15px] hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex-shrink-0 mb-0.5"
              >
                إرسال
              </button>
            </>
          ) : (
            <>
              {/* GIF */}
              <button
                className="p-1.5 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors rounded-full flex-shrink-0 mb-0.5"
                onClick={() => { setShowGifPicker(!showGifPicker); setShowEmoji(false); }}
              >
                <Clapperboard size={20} strokeWidth={1.5} />
              </button>
              {/* Poll - hidden on mobile to save space */}
              <button
                className="hidden md:flex p-1.5 text-gray-500 hover:text-purple-500 dark:text-gray-400 dark:hover:text-purple-400 transition-colors rounded-full flex-shrink-0 mb-0.5"
                onClick={() => setShowPollCreator(true)}
              >
                <BarChart3 size={20} strokeWidth={1.5} />
              </button>
              {/* Draw - hidden on mobile to save space */}
              <button
                className="hidden md:flex p-1.5 text-gray-500 hover:text-pink-500 dark:text-gray-400 dark:hover:text-pink-400 transition-colors rounded-full flex-shrink-0 mb-0.5"
                onClick={() => { setShowDrawingPad(true); setTimeout(initCanvas, 100); }}
              >
                <Pencil size={20} strokeWidth={1.5} />
              </button>
              {/* Emoji */}
              <button
                className="p-1.5 text-gray-500 hover:text-yellow-500 dark:text-gray-400 dark:hover:text-yellow-400 transition-colors rounded-full flex-shrink-0 mb-0.5"
                onClick={() => { setShowEmoji(!showEmoji); setShowGifPicker(false); }}
              >
                <Smile size={20} strokeWidth={1.5} />
              </button>
            </>
          )}
        </div>

        {/* Recording controls — always visible on mobile */}
        {!text && (
          <div className="flex items-center gap-1.5 flex-shrink-0 z-10 bg-white/50 dark:bg-black/20 p-1 rounded-full backdrop-blur-md">
            {isRecording ? null : (
              <div className="flex items-center gap-1">
                {/* HD Mic toggle */}
                <button
                  onClick={() => setIsHdMic(!isHdMic)}
                  title={isHdMic ? 'جودة عالية' : 'ميك عادي'}
                  className={`w-[34px] h-[34px] flex items-center justify-center rounded-full transition-all ${isHdMic
                    ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                    : 'bg-transparent text-gray-400 hover:bg-black/5 dark:hover:bg-white/10'
                    }`}
                >
                  <Sparkles size={16} strokeWidth={isHdMic ? 2.5 : 1.5} />
                </button>
                {/* Screen audio toggle */}
                <button
                  onClick={() => setRecordSystemAudio(!recordSystemAudio)}
                  title={recordSystemAudio ? 'شاشة + ميك' : 'ميك فقط'}
                  className={`w-[34px] h-[34px] flex items-center justify-center rounded-full transition-all ${recordSystemAudio
                    ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                    : 'bg-transparent text-gray-400 hover:bg-black/5 dark:hover:bg-white/10'
                    }`}
                >
                  <Monitor size={16} strokeWidth={recordSystemAudio ? 2.5 : 1.5} />
                </button>
              </div>
            )}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90 shadow-md ${isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
            >
              <Mic size={18} strokeWidth={2} />
            </button>
          </div>
        )}

      </div>


      {/* Emoji Picker Popup */}
      <AnimatePresence>
        {showEmoji && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute bottom-full left-0 right-0 mb-2 z-50 flex justify-center"
          >
            <div className="shadow-2xl rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 w-full md:w-auto">
              <EmojiPicker
                onEmojiClick={(emojiData) => {
                  setText(prev => prev + emojiData.emoji);
                }}
                theme={theme === 'dark' ? EmojiTheme.DARK : EmojiTheme.LIGHT}
                emojiStyle={EmojiStyle.APPLE}
                width={typeof window !== 'undefined' && window.innerWidth < 768 ? window.innerWidth - 32 : 320}
                height={typeof window !== 'undefined' && window.innerWidth < 768 ? 300 : 380}
                searchPlaceholder="Search emoji..."
                previewConfig={{ showPreview: false }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GIF Picker Popup */}
      <AnimatePresence>
        {showGifPicker && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute bottom-full left-0 right-0 mb-2 z-50 flex justify-center"
          >
            <div className={`shadow-2xl rounded-2xl overflow-hidden border w-full md:w-[340px] ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="p-3">
                <input
                  type="text"
                  value={gifSearch}
                  onChange={(e) => handleGifSearchChange(e.target.value)}
                  placeholder="Search GIFs..."
                  className={`w-full px-3 py-2 rounded-xl text-sm outline-none ${theme === 'dark' ? 'bg-gray-800 text-white placeholder-gray-500' : 'bg-gray-100 text-black placeholder-gray-400'}`}
                  autoFocus
                />
              </div>
              <div className="h-[280px] overflow-y-auto px-2 pb-2">
                {isLoadingGifs ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    {gifs.map((gif: any) => {
                      const url = gif.media_formats?.gif?.url || gif.media_formats?.tinygif?.url;
                      if (!url) return null;
                      return (
                        <button
                          key={gif.id}
                          onClick={() => sendGif(url)}
                          className="rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                        >
                          <img
                            src={gif.media_formats?.tinygif?.url || url}
                            alt={gif.content_description || 'GIF'}
                            className="w-full h-[100px] object-cover"
                            loading="lazy"
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="px-3 py-1.5 text-center">
                <span className={`text-[10px] ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Powered by Tenor</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attachment Previews */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 px-3 py-2 overflow-x-auto"
          >
            {attachments.map((file, index) => (
              <div key={index} className="relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                {file.type.startsWith('image/') ? (
                  <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500 dark:text-gray-400 p-1 text-center break-all">
                    {file.name}
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(index)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow-md"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {/* View Once Toggle */}
            <button
              onClick={() => setIsViewOnce(!isViewOnce)}
              title={isViewOnce ? 'View Once ON' : 'View Once OFF'}
              className={`flex-shrink-0 p-2 rounded-full transition-all ${isViewOnce
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
            >
              <Flame size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Poll Creator Modal */}
      <AnimatePresence>
        {showPollCreator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowPollCreator(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl border ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>📊 Quick Poll</h3>
                <button onClick={() => setShowPollCreator(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <input
                type="text"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Ask a question..."
                className={`w-full px-4 py-3 rounded-xl text-sm outline-none mb-3 font-semibold ${theme === 'dark' ? 'bg-gray-800 text-white placeholder-gray-500' : 'bg-gray-100 text-black placeholder-gray-400'}`}
                autoFocus
              />

              <div className="space-y-2 mb-3">
                {pollOptions.map((opt, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${theme === 'dark' ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-500'}`}>
                      {index + 1}
                    </div>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updatePollOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm outline-none ${theme === 'dark' ? 'bg-gray-800 text-white placeholder-gray-500' : 'bg-gray-100 text-black placeholder-gray-400'}`}
                    />
                    {pollOptions.length > 2 && (
                      <button onClick={() => removePollOption(index)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {pollOptions.length < 6 && (
                <button
                  onClick={addPollOption}
                  className="flex items-center gap-2 text-sm text-blue-500 font-medium mb-4 hover:text-blue-600"
                >
                  <Plus size={16} /> Add option
                </button>
              )}

              <button
                onClick={sendPoll}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all active:scale-95"
              >
                Send Poll 📊
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Schedule Message Popup */}
      <AnimatePresence>
        {showScheduler && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute bottom-full left-0 right-0 mb-2 z-50 flex justify-center"
          >
            <div className={`shadow-2xl rounded-2xl overflow-hidden border p-4 w-[300px] ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={18} className="text-orange-500" />
                <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Schedule Message</span>
              </div>
              <input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-sm outline-none mb-3 ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-black'}`}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowScheduler(false)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium ${theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={sendScheduled}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold shadow-lg"
                >
                  Schedule ⏰
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drawing Pad Modal */}
      <AnimatePresence>
        {showDrawingPad && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4">
              <button onClick={() => setShowDrawingPad(false)} className="p-2 text-white rounded-full hover:bg-white/10">
                <X size={24} />
              </button>
              <h3 className="text-white font-bold text-lg">✏️ Doodle Pad</h3>
              <div className="flex gap-2">
                <button onClick={clearCanvas} className="px-3 py-1.5 text-sm text-white bg-red-500/80 rounded-lg hover:bg-red-500">
                  Clear
                </button>
                <button onClick={sendDrawing} className="px-4 py-1.5 text-sm text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg font-bold shadow-lg">
                  Send ✨
                </button>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 mx-4 mb-4 rounded-2xl overflow-hidden bg-white shadow-2xl">
              <canvas
                ref={canvasRef}
                className="w-full h-full cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>

            {/* Color Picker & Brush Size */}
            <div className="p-4 flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                {['#6366f1', '#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#000000', '#8b5cf6'].map(color => (
                  <button
                    key={color}
                    onClick={() => setDrawColor(color)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${drawColor === color ? 'border-white scale-125 shadow-lg' : 'border-white/30'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <input
                type="range"
                min="1"
                max="15"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-24 accent-indigo-500"
              />
              <span className="text-white/70 text-xs font-mono">{brushSize}px</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};