import { User, Conversation, Message, Story } from '../types';

export const DEMO_USER: User = {
    id: 'demo_me',
    username: 'Guest User',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
    isOnline: true,
    isDemo: true
};

export const DEMO_PARTICIPANTS: User[] = [
    { id: 'p1', username: 'Sarah 🌸', isOnline: true, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop', lastActive: new Date().toISOString() },
    { id: 'p2', username: 'John Designer 🎨', isOnline: false, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop', lastActive: new Date(Date.now() - 3600000).toISOString() },
    { id: 'p3', username: 'Gemini AI 🤖', isOnline: true, isBot: true, avatar: 'https://ui-avatars.com/api/?name=Gemini+AI&background=8b5cf6&color=fff' }
];

export const DEMO_CONVERSATIONS: Conversation[] = [
    {
        id: 'c1',
        participants: [DEMO_PARTICIPANTS[0]],
        unreadCount: 2,
        lastMessage: {
            id: 'm_last_1',
            conversationId: 'c1',
            senderId: 'p1',
            text: 'Can’t wait to see you! 💖✨',
            createdAt: new Date().toISOString(),
            status: 'sent'
        }
    },
    {
        id: 'c2',
        participants: [DEMO_PARTICIPANTS[1]],
        unreadCount: 0,
        lastMessage: {
            id: 'm_last_2',
            conversationId: 'c2',
            senderId: 'demo_me',
            text: 'Sure, send over the files 📁',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            status: 'seen'
        }
    },
    {
        id: 'c3',
        participants: [DEMO_PARTICIPANTS[2]],
        unreadCount: 0,
        lastMessage: {
            id: 'm_last_3',
            conversationId: 'c3',
            senderId: 'p3',
            text: 'I can help you plan your trip to Paris.',
            createdAt: new Date().toISOString(),
            status: 'sent'
        }
    }
];

export const DEMO_MESSAGES: Record<string, Message[]> = {
    'c1': [
        {
            id: 'm1',
            conversationId: 'c1',
            senderId: 'p1',
            text: 'Hey bestie! 👋 How are you?',
            createdAt: new Date(Date.now() - 10000000).toISOString(),
            status: 'seen'
        },
        {
            id: 'm2',
            conversationId: 'c1',
            senderId: 'demo_me',
            text: 'I’m doing great! Just working on the new app design 📱. Look at this:',
            createdAt: new Date(Date.now() - 9000000).toISOString(),
            status: 'seen'
        },
        {
            id: 'm3',
            conversationId: 'c1',
            senderId: 'demo_me',
            text: '',
            attachments: [{ type: 'image', url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&h=400&fit=crop', name: 'design.jpg' }],
            createdAt: new Date(Date.now() - 9000000).toISOString(),
            status: 'seen'
        },
        {
            id: 'm4',
            conversationId: 'c1',
            senderId: 'p1',
            text: 'Omg that looks fire!! 🔥🔥 The aesthetics are on point.',
            createdAt: new Date(Date.now() - 8000000).toISOString(),
            status: 'seen'
        },
        {
            id: 'm5',
            conversationId: 'c1',
            senderId: 'p1',
            text: 'Listen to this though... 👀',
            createdAt: new Date(Date.now() - 7000000).toISOString(),
            status: 'seen'
        },
        {
            id: 'm6',
            conversationId: 'c1',
            senderId: 'p1',
            text: '',
            attachments: [{ type: 'audio', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', name: 'tea.mp3' }], // Dummy audio
            createdAt: new Date(Date.now() - 6000000).toISOString(),
            status: 'seen'
        },
        {
            id: 'm7',
            conversationId: 'c1',
            senderId: 'p1',
            text: 'Can’t wait to see you! 💖✨',
            createdAt: new Date().toISOString(),
            status: 'delivered'
        }
    ]
};

export const DEMO_STORIES: Story[] = [
    {
        id: 's1',
        userId: 'p1',
        username: 'Sarah 🌸',
        userAvatar: DEMO_PARTICIPANTS[0].avatar!,
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=600&h=800&fit=crop',
        viewers: [],
        createdAt: new Date().toISOString()
    },
    {
        id: 's2',
        userId: 'p2',
        username: 'John Designer',
        userAvatar: DEMO_PARTICIPANTS[1].avatar!,
        mediaType: 'text',
        textContent: 'Late night coding session 💻☕️',
        backgroundColor: '#7c3aed',
        fontStyle: 'font-mono',
        viewers: [],
        createdAt: new Date().toISOString()
    }
];