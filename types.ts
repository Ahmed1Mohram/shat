export interface User {
  id: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
  isBot?: boolean;
  isDemo?: boolean;
  friendshipStatus?: 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'self';
  blockedByMe?: boolean;
  blockedMe?: boolean;
  lastActive?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  status: 'sent' | 'delivered' | 'seen';
  attachments?: Attachment[];
}

export interface Attachment {
  type: 'image' | 'file' | 'audio';
  url: string;
  name: string;
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  isTyping?: boolean;
}

export interface Story {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  mediaUrl?: string; 
  mediaType: 'image' | 'video' | 'text' | 'audio';
  textContent?: string;
  backgroundColor?: string;
  fontStyle?: string;
  viewers: string[]; 
  createdAt: string;
  isViewed?: boolean; 
}

export type Theme = 'light' | 'dark';

// New Call Interface
export interface Call {
  id: string;
  caller: User;
  receiverId: string;
  status: 'dialing' | 'incoming' | 'connected' | 'ended';
  isVideo: boolean;
  startedAt?: number;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfileImage: (file: File) => Promise<void>;
  isLoading: boolean;
}

export interface ChatContextType {
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Message[];
  stories: Story[];
  friends: User[];
  selectConversation: (id: string) => void;
  sendMessage: (text: string, attachments?: File[]) => Promise<void>;
  isLoadingMessages: boolean;
  isDataLoaded: boolean;
  isConnected: boolean;
  searchUsers: (query: string) => Promise<User[]>;
  sendFriendRequest: (targetUserId: string) => Promise<void>;
  acceptFriendRequest: (requesterId: string) => Promise<void>;
  getPendingRequests: () => Promise<User[]>;
  createConversation: (targetUserId: string) => void;
  postStory: (data: Partial<Story>, file: File | null) => Promise<void>;
  deleteStory: (storyId: string) => Promise<void>;
  markStoryViewed: (storyId: string) => Promise<void>;
  sendStoryReply: (story: Story, text: string) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  
  // Call Functionality
  activeCall: Call | null;
  startCall: (receiver: User, isVideo: boolean) => void;
  acceptCall: () => void;
  endCall: () => void;
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
}

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}