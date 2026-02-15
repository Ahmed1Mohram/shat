import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ChatContextType, Conversation, Message, User, Story, Call } from '../types';
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
      if (!activeCall || !user) return;
      
      const stream = await getMediaStream(activeCall.isVideo);
      if (!stream) return; // Should handle error

      const pc = initializePeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // We need to set the remote description (Offer) which we stored temporarily or need to pass
      // Note: In a robust app, we'd store the pending offer in a ref. 
      // For this simplified flow, we assume the signaling logic below handled the offer setting.
      
      // Wait for the stored offer to be set in handleSignaling (see useEffect below)
      if (peerConnectionRef.current?.remoteDescription) {
           const answer = await peerConnectionRef.current.createAnswer();
           await peerConnectionRef.current.setLocalDescription(answer);

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
      } catch (error) {
          console.error("Error loading chat data", error);
      } finally {
          setTimeout(() => setIsDataLoaded(true), 800);
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
                } catch(e) { console.error("Error adding ice candidate", e); }
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
      if(!user) return;
      try {
          await supabaseService.sendFriendRequest(user.id, targetUserId);
          toast.success("Friend request sent!");
      } catch(e) { toast.error("Failed to send request"); }
  };

  const acceptFriendRequest = async (requesterId: string) => {
      if(!user) return;
      try {
          await supabaseService.acceptFriendRequest(user.id, requesterId);
          toast.success("Friend request accepted!");
          const fnds = await supabaseService.getFriends(user.id);
          setFriends(fnds);
      } catch(e) { toast.error("Failed to accept"); }
  };

  const getPendingRequests = async () => {
      if(!user) return [];
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
      } catch(e) { toast.error("Could not delete story"); }
  };

  const markStoryViewed = async (storyId: string) => {
      if(!user) return;
      const story = stories.find(s => s.id === storyId);
      if(story && !story.viewers.includes(user.id)) {
          await supabaseService.markStoryViewed(storyId, user.id, story.viewers);
          setStories(prev => prev.map(s => s.id === storyId ? { ...s, viewers: [...s.viewers, user.id], isViewed: true } : s));
      }
  };

  const sendMessage = async (text: string, files: File[] = []) => {
    if (!user || !currentConversationId) return;
    const tempId = `temp-${Date.now()}`;
    const tempAttachments = await Promise.all(files.map(async (file) => {
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
        attachments: tempAttachments
    };
    setMessages(prev => [...prev, optimisticMsg]);
    
    try {
        const sentMsg = await supabaseService.sendMessage(currentConversationId, user.id, text, tempAttachments);
        if (sentMsg) {
             setMessages(prev => prev.map(m => m.id === tempId ? sentMsg : m));
        }
    } catch(e) {
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
        const replyText = `Replied to your story: ${text}`;
        await supabaseService.sendMessage(convId!, user.id, replyText);
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
      // Call Exports
      activeCall,
      startCall,
      acceptCall,
      endCall,
      localStream,
      remoteStream
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