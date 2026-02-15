import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../context/ChatContext';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const CallModal: React.FC = () => {
    const { activeCall, endCall, acceptCall, localStream, remoteStream } = useChat();
    const [isMuted, setIsMuted] = useState(false);
    
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    if (!activeCall) return null;

    const isIncoming = activeCall.status === 'incoming';
    const isConnected = activeCall.status === 'connected';

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
            setIsMuted(!isMuted);
        }
    };

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            >
                <div className="w-full max-w-md bg-gradient-to-b from-gray-900 to-black rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col relative h-[80vh] md:h-[600px]">
                    
                    {/* Background / Remote Video */}
                    <div className="absolute inset-0 bg-gray-800">
                         {activeCall.isVideo && remoteStream ? (
                             <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                         ) : (
                             // Audio Call Background Animation
                             <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
                                 <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05]"></div>
                                 <div className="w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
                                 
                                 {/* Audio Element for Remote Audio */}
                                 {remoteStream && <audio ref={el => { if(el) el.srcObject = remoteStream }} autoPlay />}
                             </div>
                         )}
                    </div>

                    {/* Local Video Picture-in-Picture */}
                    {activeCall.isVideo && localStream && (
                        <div className="absolute top-4 right-4 w-32 h-48 bg-black rounded-xl overflow-hidden shadow-xl border border-white/20 z-10">
                            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        </div>
                    )}

                    {/* Call Info Overlay */}
                    <div className="relative z-20 flex-1 flex flex-col items-center pt-20">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 rounded-full"></div>
                            <img 
                                src={activeCall.caller.avatar} 
                                alt="Caller" 
                                className="w-32 h-32 rounded-full border-4 border-white/10 shadow-2xl object-cover relative z-10"
                            />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">{activeCall.caller.username}</h2>
                        <p className="text-blue-300 font-medium animate-pulse">
                            {activeCall.status === 'dialing' ? 'Calling...' : 
                             activeCall.status === 'incoming' ? 'Incoming Call...' : 
                             activeCall.status === 'connected' ? 'Connected' : 'Ending...'}
                        </p>
                    </div>

                    {/* Controls */}
                    <div className="relative z-20 p-8 pb-12">
                        <div className="flex items-center justify-center gap-6">
                            {isIncoming ? (
                                <>
                                    <button 
                                        onClick={endCall}
                                        className="flex flex-col items-center gap-2 group"
                                    >
                                        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg group-hover:bg-red-600 transition-colors">
                                            <PhoneOff size={32} className="text-white" />
                                        </div>
                                        <span className="text-xs font-medium text-white/70">Decline</span>
                                    </button>
                                    
                                    <button 
                                        onClick={acceptCall}
                                        className="flex flex-col items-center gap-2 group"
                                    >
                                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg group-hover:bg-green-600 transition-colors animate-bounce">
                                            <Phone size={32} className="text-white" />
                                        </div>
                                        <span className="text-xs font-medium text-white/70">Accept</span>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button 
                                        onClick={toggleMute}
                                        className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-md border transition-all ${isMuted ? 'bg-white text-black border-white' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}
                                    >
                                        {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                                    </button>
                                    
                                    <button 
                                        onClick={endCall}
                                        className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-xl hover:bg-red-600 transition-transform hover:scale-105 active:scale-95"
                                    >
                                        <PhoneOff size={40} className="text-white" />
                                    </button>

                                    {/* Disabled Video Toggle for Audio-Only focus in this prompt, but structure is here */}
                                    <div className="w-14 h-14 opacity-50 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                                         <VideoOff size={24} className="text-white/50" />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};