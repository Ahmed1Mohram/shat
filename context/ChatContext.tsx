import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ChatContextType, Conversation, Message, User, Story, Call, ReactionType } from '../types';
import { supabaseService, supabase } from '../services/supabaseService';
import { generateGeminiResponse } from '../services/geminiService';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// WebRTC Configuration (STUN Servers)
const RTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
    ]
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [stories, setStories] = useState<Story[]>([]);
    const [friends, setFriends] = useState<User[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isDataLoaded, setIsDataLoaded] = useState(false);

    // Keep references for stale closures in realtime listeners
    const conversationsRef = useRef(conversations);
    useEffect(() => {
        conversationsRef.current = conversations;
    }, [conversations]);

    // Notification Settings
    const [showNotificationContent, setShowNotificationContent] = useState(() => {
        const saved = localStorage.getItem('notif_show_content');
        return saved !== null ? saved === 'true' : true;
    });

    // Save notification preference
    useEffect(() => {
        localStorage.setItem('notif_show_content', String(showNotificationContent));
    }, [showNotificationContent]);

    // Request notification permission on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // Notification sound using Web Audio API
    const playNotificationSound = () => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
            oscillator.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.4);
        } catch (e) { /* Audio not available */ }
    };

    // Show browser push notification
    const showBrowserNotification = (senderName: string, senderAvatar: string, messageText: string) => {
        if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
            const title = showNotificationContent ? senderName : 'Bat Man';
            const body = showNotificationContent ? (messageText || '📎 Media') : 'New Message';
            const notification = new Notification(title, {
                body,
                icon: senderAvatar || '/cae1afd7f0f92784a8fb32251f4ed8f0.jpg',
                badge: '/cae1afd7f0f92784a8fb32251f4ed8f0.jpg',
                silent: true,
                tag: 'bat-man-msg',
            });
            notification.onclick = () => { window.focus(); notification.close(); };
            setTimeout(() => notification.close(), 5000);
        }
        playNotificationSound();
    };

    // Call State
    const [activeCall, setActiveCall] = useState<Call | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

    // WebRTC Refs
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const processingBotReply = useRef(false);

    // --- WebRTC Logic ---

    const initializePeerConnection = () => {
        const pc = new RTCPeerConnection(RTC_CONFIG);

        pc.onicecandidate = (event) => {
            if (event.candidate && activeCall) {
                const targetId = activeCall.caller.id === user?.id ? activeCall.receiverId : activeCall.caller.id;
                supabase.channel(`signaling_${targetId}`).send({
                    type: 'broadcast',
                    event: 'ice-candidate',
                    payload: { candidate: event.candidate, from: user?.id }
                });
            }
        };

        pc.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                endCall();
                toast.error("Call connection lost");
            }
        };

        peerConnectionRef.current = pc;
        return pc;
    };

    const getMediaStream = async (isVideo: boolean) => {
        try {
            // High Quality Audio Constraints
            const stream = await navigator.mediaDevices.getUserMedia({
                video: isVideo,
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 2,
                    sampleRate: 48000, // High Fidelity
                    sampleSize: 16
                }
            });
            setLocalStream(stream);
            return stream;
        } catch (err) {
            console.error("Error accessing media devices", err);
            toast.error("Could not access microphone/camera");
            return null;
        }
    };

    const startCall = async (receiver: User, isVideo: boolean) => {
        if (!user) return;

        const newCall: Call = {
            id: uuidv4(),
            caller: user,
            receiverId: receiver.id,
            status: 'dialing',
            isVideo
        };
        setActiveCall(newCall);

        const stream = await getMediaStream(isVideo);
        if (!stream) {
            setActiveCall(null);
            return;
        }

        const pc = initializePeerConnection();
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // Create Offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Send Signal
        await supabase.channel(`signaling_${receiver.id}`).send({
            type: 'broadcast',
            event: 'call-offer',
            payload: {
                offer,
                caller: user,
                callId: newCall.id,
                isVideo
            }
        });
    };

    const acceptCall = async () => {
        if (!activeCall || !user || !peerConnectionRef.current) return;

        const stream = await getMediaStream(activeCall.isVideo);
        if (!stream) return; // Should handle error

        const pc = peerConnectionRef.current;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        if (pc.remoteDescription) {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            setActiveCall(prev => prev ? { ...prev, status: 'connected', startedAt: Date.now() } : null);

            await supabase.channel(`signaling_${activeCall.caller.id}`).send({
                type: 'broadcast',
                event: 'call-answer',
                payload: { answer, from: user.id }
            });
        }
    };

    const endCall = () => {
        if (activeCall && user) {
            const targetId = activeCall.caller.id === user.id ? activeCall.receiverId : activeCall.caller.id;
            supabase.channel(`signaling_${targetId}`).send({
                type: 'broadcast',
                event: 'end-call',
                payload: { from: user.id }
            });
        }

        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        setRemoteStream(null);
        setActiveCall(null);
    };

    // --- Existing Chat Logic + Signaling Listeners ---

    useEffect(() => {
        if (!user) {
            setIsDataLoaded(true);
            return;
        }

        setIsDataLoaded(false);

        supabaseService.sendHeartbeat(user.id);
        const heartbeatInterval = setInterval(() => {
            supabaseService.sendHeartbeat(user.id);
        }, 120000);

        const loadData = async () => {
            try {
                const [convs, sts, fnds] = await Promise.all([
                    supabaseService.getConversations(user.id),
                    supabaseService.getStories(user.id),
                    supabaseService.getFriends(user.id)
                ]);
                setConversations(convs);
                setStories(sts);
                setFriends(fnds);

                if (convs.length > 0 && !currentConversationId && window.innerWidth >= 768) {
                    selectConversation(convs[0].id);
                }
            } catch (error) {
                console.error("Error loading chat data", error);
            } finally {
                setIsDataLoaded(true);
            }
        };
        loadData();

        // 1. Signaling Channel for Calls
        const signalingChannel = supabase.channel(`signaling_${user.id}`);
        signalingChannel
            .on('broadcast', { event: 'call-offer' }, async ({ payload }) => {
                // Incoming Call
                if (activeCall) return; // Busy

                // Initialize PC early to handle Offer
                const pc = initializePeerConnection();
                await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));

                setActiveCall({
                    id: payload.callId,
                    caller: payload.caller,
                    receiverId: user.id,
                    status: 'incoming',
                    isVideo: payload.isVideo
                });
            })
            .on('broadcast', { event: 'call-answer' }, async ({ payload }) => {
                // Answer Received (Caller side)
                if (peerConnectionRef.current) {
                    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
                    setActiveCall(prev => prev ? { ...prev, status: 'connected', startedAt: Date.now() } : null);
                }
            })
            .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
                if (peerConnectionRef.current && payload.candidate) {
                    try {
                        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
                    } catch (e) { console.error("Error adding ice candidate", e); }
                }
            })
            .on('broadcast', { event: 'end-call' }, () => {
                // Cleanup without sending another end signal
                if (localStream) {
                    localStream.getTracks().forEach(track => track.stop());
                    setLocalStream(null);
                }
                if (peerConnectionRef.current) {
                    peerConnectionRef.current.close();
                    peerConnectionRef.current = null;
                }
                setRemoteStream(null);
                setActiveCall(null);
                toast("Call ended");
            })
            .subscribe();


        // 2. Chat Data Subscriptions
        const msgSub = supabaseService.subscribeToMessages((msg) => {
            if (currentConversationId === msg.conversationId) {
                setMessages(prev => {
                    const existingIndex = prev.findIndex(m => m.id === msg.id);
                    if (existingIndex > -1) {
                        const newArr = [...prev];
                        newArr[existingIndex] = { ...newArr[existingIndex], ...msg };
                        return newArr;
                    }
                    return [...prev, msg];
                });
                if (msg.senderId !== user.id && msg.status !== 'seen') {
                    supabaseService.markMessagesAsSeen(currentConversationId, user.id);
                }
            }
            setConversations(prev => {
                const exists = prev.find(c => c.id === msg.conversationId);
                if (exists) {
                    return prev.map(c => c.id === msg.conversationId ? {
                        ...c,
                        lastMessage: msg,
                        unreadCount: (currentConversationId === msg.conversationId) ? 0 : (msg.senderId !== user.id && msg.status !== 'seen' ? c.unreadCount + 1 : c.unreadCount)
                    } : c);
                } else {
                    loadData();
                    return prev;
                }
            });
            if (msg.senderId !== user.id && msg.status === 'sent' && currentConversationId !== msg.conversationId) {
                supabaseService.markMessagesAsDelivered(msg.conversationId, user.id);
                // Show notification toast for new message
                const conversation = conversationsRef.current.find(c => c.id === msg.conversationId);
                const sender = conversation?.participants.find(p => p.id === msg.senderId) || conversation?.participants[0];
                toast((t) => (
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => { toast.dismiss(t.id); selectConversation(msg.conversationId); }}>
                        <img src={sender?.avatar || '/cae1afd7f0f92784a8fb32251f4ed8f0.jpg'} className="w-10 h-10 rounded-full object-cover" />
                        <div className="flex flex-col">
                            <span className="font-semibold text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>{sender?.username || 'New Message'}</span>
                            <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[200px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                                {msg.text || (msg.attachments?.length ? '📎 Media' : 'Media')}
                            </span>
                        </div>
                    </div>
                ), {
                    icon: '💬',
                    duration: 4000,
                    position: 'top-right',
                    style: {
                        background: 'white',
                        color: '#1a1a2e',
                        borderRadius: '12px',
                        padding: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    },
                });

                // Browser push notification with sound (even if tab is focused if user wants, but browser restricts without focus sometimes. We'll play the sound regardless)
                showBrowserNotification(
                    sender?.username || 'New Message',
                    sender?.avatar || '/cae1afd7f0f92784a8fb32251f4ed8f0.jpg',
                    msg.text || (msg.attachments?.length ? '📎 Media' : '')
                );
            }
        });

        const typingSub = supabaseService.subscribeToTyping((payload) => {
            setConversations(prev => prev.map(c =>
                c.id === payload.conversationId ? { ...c, isTyping: payload.isTyping } : c
            ));
        });

        const storySub = supabaseService.subscribeToStories((story) => {
            setStories(prev => [story, ...prev.filter(s => s.id !== story.id)]);
            toast('New story updated!', { icon: '🍩' });
        });

        const userStatusSub = supabaseService.subscribeToUserStatus((updatedUser) => {
            setConversations(prev => prev.map(c => ({
                ...c,
                participants: c.participants.map(p => p.id === updatedUser.id ? { ...p, isOnline: updatedUser.isOnline, lastActive: updatedUser.lastActive } : p)
            })));
            setFriends(prev => prev.map(f => f.id === updatedUser.id ? { ...f, isOnline: updatedUser.isOnline, lastActive: updatedUser.lastActive } : f));
        });

        return () => {
            clearInterval(heartbeatInterval);
            supabase.removeChannel(signalingChannel);
            supabase.removeChannel(msgSub);
            supabase.removeChannel(typingSub);
            supabase.removeChannel(storySub);
            supabase.removeChannel(userStatusSub);
            supabaseService.logout(user.id);
        };
    }, [user, currentConversationId]);

    const selectConversation = async (id: string) => {
        setCurrentConversationId(id);
        if (!id) return;
        setIsLoadingMessages(true);
        try {
            const history = await supabaseService.getMessages(id);
            setMessages(history);
            setConversations(prev => prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c));
            await supabaseService.markMessagesAsSeen(id, user!.id);
        } finally {
            setIsLoadingMessages(false);
        }
    };

    const searchUsers = async (query: string) => {
        if (!user) return [];
        return await supabaseService.searchUsers(query, user.id);
    };

    const sendFriendRequest = async (targetUserId: string) => {
        if (!user) return;
        try {
            await supabaseService.sendFriendRequest(user.id, targetUserId);
            toast.success("Friend request sent!");
        } catch (e) { toast.error("Failed to send request"); }
    };

    const acceptFriendRequest = async (requesterId: string) => {
        if (!user) return;
        try {
            await supabaseService.acceptFriendRequest(user.id, requesterId);
            toast.success("Friend request accepted!");
            const fnds = await supabaseService.getFriends(user.id);
            setFriends(fnds);
        } catch (e) { toast.error("Failed to accept"); }
    };

    const getPendingRequests = async () => {
        if (!user) return [];
        return await supabaseService.getPendingRequests(user.id);
    };

    const createConversation = async (targetUserId: string) => {
        if (!user) return;
        const existing = conversations.find(c => c.participants[0]?.id === targetUserId);
        if (existing) {
            selectConversation(existing.id);
            return;
        }
        try {
            const newConvId = await supabaseService.createConversation(user.id, targetUserId);
            const convs = await supabaseService.getConversations(user.id);
            setConversations(convs);
            selectConversation(newConvId);
        } catch (error: any) {
            toast.error("Failed to start conversation");
        }
    };

    const postStory = async (data: Partial<Story>, file: File | null) => {
        if (!user) return;
        let mediaUrl = null;
        if (file) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            await new Promise(resolve => reader.onload = resolve);
            mediaUrl = reader.result as string;
        }
        try {
            await supabaseService.createStory(user.id, { ...data, mediaUrl });
            toast.success("Story posted!");
        } catch (e) { toast.error("Failed to post story"); }
    };

    const deleteStory = async (storyId: string) => {
        try {
            await supabaseService.deleteStory(storyId);
            setStories(prev => prev.filter(s => s.id !== storyId));
            toast.success("Story deleted");
        } catch (e) { toast.error("Could not delete story"); }
    };

    const markStoryViewed = async (storyId: string) => {
        if (!user) return;
        const story = stories.find(s => s.id === storyId);
        if (story && !story.viewers.includes(user.id)) {
            await supabaseService.markStoryViewed(storyId, user.id, story.viewers);
            setStories(prev => prev.map(s => s.id === storyId ? { ...s, viewers: [...s.viewers, user.id], isViewed: true } : s));
        }
    };

    const sendMessage = async (text: string, files: (File | { type: string; url: string; name: string })[] = []) => {
        if (!user || !currentConversationId) return;
        const tempId = `temp-${Date.now()}`;
        const tempAttachments = await Promise.all(files.map(async (file) => {
            // If it's already a pre-built attachment object (e.g., GIF URL, drawing data URL)
            if ('url' in file && 'type' in file && !(file instanceof File)) {
                return file as { type: 'image' | 'audio' | 'file'; url: string; name: string };
            }
            // Otherwise it's a File, convert to base64
            const f = file as File;
            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.readAsDataURL(f);
            });
            let type: 'image' | 'audio' | 'file' = 'file';
            if (f.type.startsWith('image/')) type = 'image';
            else if (f.type.startsWith('audio/')) type = 'audio';
            return { type, url: base64, name: f.name };
        }));

        const optimisticMsg: Message = {
            id: tempId,
            conversationId: currentConversationId,
            senderId: user.id,
            text,
            createdAt: new Date().toISOString(),
            status: 'sent',
            attachments: tempAttachments
        };
        setMessages(prev => [...prev, optimisticMsg]);

        try {
            const sentMsg = await supabaseService.sendMessage(currentConversationId, user.id, text, tempAttachments);
            if (sentMsg) {
                setMessages(prev => prev.map(m => m.id === tempId ? sentMsg : m));
            }
        } catch (e) {
            toast.error("Failed to send message");
            setMessages(prev => prev.filter(m => m.id !== tempId));
            return;
        }

        const currentConv = conversations.find(c => c.id === currentConversationId);
        const participant = currentConv?.participants[0];
        const isGemini = participant?.isBot || participant?.username === 'Gemini AI';
        if (isGemini && !processingBotReply.current) {
            processingBotReply.current = true;
            supabaseService.sendTyping(currentConversationId, true);
            try {
                const replyText = await generateGeminiResponse(text);
                setTimeout(async () => {
                    await supabaseService.sendMessage(currentConversationId, participant!.id, replyText);
                    supabaseService.sendTyping(currentConversationId, false);
                    processingBotReply.current = false;
                }, 1500);
            } catch (e) { processingBotReply.current = false; }
        }
    };

    const sendStoryReply = async (story: Story, text: string) => {
        if (!user) return;
        try {
            let conv = conversations.find(c => c.participants.some(p => p.id === story.userId));
            let convId = conv?.id;
            if (!convId) {
                convId = await supabaseService.createConversation(user.id, story.userId);
                const convs = await supabaseService.getConversations(user.id);
                setConversations(convs);
            }
            const storyLabel =
                story.mediaType === 'text'
                    ? (story.textContent ? `“${story.textContent.slice(0, 40)}${story.textContent.length > 40 ? '…' : ''}”` : 'story')
                    : `${story.mediaType} story`;

            const replyText = `Reply to your ${storyLabel}: ${text}`;

            // If it's an image story, include it as an attachment so it previews nicely in chat.
            if (story.mediaType === 'image' && story.mediaUrl) {
                await supabaseService.sendMessage(convId!, user.id, replyText, [
                    { type: 'image', url: story.mediaUrl, name: 'story_image' },
                ]);
            } else if (story.mediaType === 'audio' && story.mediaUrl) {
                await supabaseService.sendMessage(convId!, user.id, replyText, [
                    { type: 'audio', url: story.mediaUrl, name: 'story_audio' },
                ]);
            } else {
                await supabaseService.sendMessage(convId!, user.id, replyText);
            }

            // Jump to the conversation like Instagram does when you reply to a story
            await selectConversation(convId!);
            toast.success("Sent!");
        } catch (e) { toast.error("Failed to send reply"); }
    };

    const blockUser = async (targetId: string) => {
        if (!user) return;
        try {
            await supabaseService.blockUser(user.id, targetId);
            setConversations(prev => prev.map(c => {
                if (c.participants.some(p => p.id === targetId)) {
                    return { ...c, participants: c.participants.map(p => p.id === targetId ? { ...p, blockedByMe: true } : p) };
                }
                return c;
            }));
            toast.success("User blocked");
        } catch (e) { toast.error("Failed to block"); }
    };

    const unblockUser = async (targetId: string) => {
        if (!user) return;
        try {
            await supabaseService.unblockUser(user.id, targetId);
            setConversations(prev => prev.map(c => {
                if (c.participants.some(p => p.id === targetId)) {
                    return { ...c, participants: c.participants.map(p => p.id === targetId ? { ...p, blockedByMe: false } : p) };
                }
                return c;
            }));
            toast.success("User unblocked");
        } catch (e) { toast.error("Failed to unblock"); }
    };

    // Message Reactions
    const addReaction = async (messageId: string, reactionType: ReactionType) => {
        if (!user) return;
        try {
            setMessages(prev => prev.map(msg => {
                if (msg.id === messageId) {
                    const existingReactions = msg.reactions || [];
                    const myExistingReaction = existingReactions.find(r => r.userId === user.id);

                    if (myExistingReaction) {
                        // Replace existing reaction
                        return {
                            ...msg,
                            reactions: existingReactions.map(r =>
                                r.userId === user.id ? { ...r, type: reactionType } : r
                            )
                        };
                    } else {
                        // Add new reaction
                        return {
                            ...msg,
                            reactions: [...existingReactions, { userId: user.id, type: reactionType }]
                        };
                    }
                }
                return msg;
            }));
            // TODO: Save to database
        } catch (e) {
            toast.error("Failed to add reaction");
        }
    };

    const removeReaction = async (messageId: string) => {
        if (!user) return;
        try {
            setMessages(prev => prev.map(msg => {
                if (msg.id === messageId) {
                    return {
                        ...msg,
                        reactions: (msg.reactions || []).filter(r => r.userId !== user.id)
                    };
                }
                return msg;
            }));
            // TODO: Remove from database
        } catch (e) {
            toast.error("Failed to remove reaction");
        }
    };

    // Reply to Message
    const replyToMessage = async (messageId: string, text: string, attachments: File[] = []) => {
        if (!user || !currentConversationId) return;
        const replyToMsg = messages.find(m => m.id === messageId);
        if (!replyToMsg) return;

        const tempId = `temp-${Date.now()}`;
        const tempAttachments = await Promise.all(attachments.map(async (file) => {
            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.readAsDataURL(file);
            });
            let type: 'image' | 'audio' | 'file' = 'file';
            if (file.type.startsWith('image/')) type = 'image';
            else if (file.type.startsWith('audio/')) type = 'audio';
            return { type, url: base64, name: file.name };
        }));

        const optimisticMsg: Message = {
            id: tempId,
            conversationId: currentConversationId,
            senderId: user.id,
            text,
            createdAt: new Date().toISOString(),
            status: 'sent',
            attachments: tempAttachments,
            replyTo: messageId
        };
        setMessages(prev => [...prev, optimisticMsg]);

        try {
            const sentMsg = await supabaseService.sendMessage(currentConversationId, user.id, text, tempAttachments);
            if (sentMsg) {
                setMessages(prev => prev.map(m => m.id === tempId ? { ...sentMsg, replyTo: messageId } : m));
            }
        } catch (e) {
            toast.error("Failed to send reply");
            setMessages(prev => prev.filter(m => m.id !== tempId));
        }
    };

    // Forward Message
    const forwardMessage = async (messageId: string, targetConversationId: string) => {
        if (!user) return;
        const msgToForward = messages.find(m => m.id === messageId);
        if (!msgToForward) return;

        // Show modal to select conversation (simplified for now)
        toast("Select a conversation to forward to");
        // TODO: Implement forward modal
    };

    // Edit Message
    const editMessage = async (messageId: string, newText: string) => {
        if (!user || !newText.trim()) return;
        try {
            setMessages(prev => prev.map(msg =>
                msg.id === messageId
                    ? { ...msg, text: newText, isEdited: true, updatedAt: new Date().toISOString() }
                    : msg
            ));
            // TODO: Save to database
            toast.success("Message edited");
        } catch (e) {
            toast.error("Failed to edit message");
        }
    };

    // Delete Message
    const deleteMessage = async (messageId: string, deleteFor: 'me' | 'everyone') => {
        if (!user) return;
        try {
            if (deleteFor === 'everyone') {
                setMessages(prev => prev.map(msg =>
                    msg.id === messageId
                        ? { ...msg, isDeleted: true, deletedFor: 'everyone', text: '' }
                        : msg
                ));
            } else {
                setMessages(prev => prev.filter(msg => msg.id !== messageId));
            }
            // TODO: Save to database
            toast.success("Message deleted");
        } catch (e) {
            toast.error("Failed to delete message");
        }
    };

    // Pin Message
    const pinMessage = async (messageId: string) => {
        if (!user) return;
        try {
            setMessages(prev => prev.map(msg =>
                msg.id === messageId ? { ...msg, isPinned: true } : { ...msg, isPinned: false }
            ));
            // TODO: Save to database
            toast.success("Message pinned");
        } catch (e) {
            toast.error("Failed to pin message");
        }
    };

    // Unpin Message
    const unpinMessage = async (messageId: string) => {
        if (!user) return;
        try {
            setMessages(prev => prev.map(msg =>
                msg.id === messageId ? { ...msg, isPinned: false } : msg
            ));
            // TODO: Save to database
            toast.success("Message unpinned");
        } catch (e) {
            toast.error("Failed to unpin message");
        }
    };

    // Copy Message
    const copyMessage = (messageId: string) => {
        const msg = messages.find(m => m.id === messageId);
        if (msg && msg.text) {
            navigator.clipboard.writeText(msg.text);
            toast.success("Message copied");
        }
    };

    // Toggle Vanish Mode
    const toggleVanishMode = async (conversationId: string) => {
        if (!user) return;
        try {
            setConversations(prev => prev.map(conv =>
                conv.id === conversationId
                    ? { ...conv, isVanishMode: !conv.isVanishMode }
                    : conv
            ));
            toast.success(`Vanish mode ${conversations.find(c => c.id === conversationId)?.isVanishMode ? 'disabled' : 'enabled'}`);
            // TODO: Save to database
        } catch (e) {
            toast.error("Failed to toggle vanish mode");
        }
    };

    // Group Chat Functions (Placeholders)
    const createGroup = async (name: string, participants: string[]) => {
        if (!user) return;
        toast("Group creation feature coming soon");
        // TODO: Implement
    };

    const addGroupMember = async (conversationId: string, userId: string) => {
        toast("Add member feature coming soon");
        // TODO: Implement
    };

    const removeGroupMember = async (conversationId: string, userId: string) => {
        toast("Remove member feature coming soon");
        // TODO: Implement
    };

    const updateGroupInfo = async (conversationId: string, name?: string, avatar?: File) => {
        toast("Update group info feature coming soon");
        // TODO: Implement
    };

    const leaveGroup = async (conversationId: string) => {
        toast("Leave group feature coming soon");
        // TODO: Implement
    };

    const muteConversation = async (conversationId: string) => {
        if (!user) return;
        try {
            setConversations(prev => prev.map(conv =>
                conv.id === conversationId
                    ? { ...conv, muted: !conv.muted }
                    : conv
            ));
            toast.success(`Conversation ${conversations.find(c => c.id === conversationId)?.muted ? 'unmuted' : 'muted'}`);
        } catch (e) {
            toast.error("Failed to mute conversation");
        }
    };

    return (
        <ChatContext.Provider value={{
            conversations,
            currentConversationId,
            messages,
            stories,
            friends,
            selectConversation,
            sendMessage,
            isLoadingMessages,
            isDataLoaded,
            isConnected: true,
            searchUsers,
            createConversation,
            postStory,
            deleteStory,
            markStoryViewed,
            sendFriendRequest,
            acceptFriendRequest,
            getPendingRequests,
            sendStoryReply,
            blockUser,
            unblockUser,
            // Message Interactions
            addReaction,
            removeReaction,
            replyToMessage,
            forwardMessage,
            editMessage,
            deleteMessage,
            pinMessage,
            unpinMessage,
            copyMessage,
            toggleVanishMode,
            // Group Chat
            createGroup,
            addGroupMember,
            removeGroupMember,
            updateGroupInfo,
            leaveGroup,
            muteConversation,
            // Call Exports
            activeCall,
            startCall,
            acceptCall,
            endCall,
            localStream,
            remoteStream,
            // Notification Settings
            showNotificationContent,
            setShowNotificationContent
        }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) throw new Error('useChat must be used within a ChatProvider');
    return context;
};