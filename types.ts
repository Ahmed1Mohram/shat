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

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export interface MessageReaction {
  userId: string;
  type: ReactionType;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
  status: 'sent' | 'delivered' | 'seen';
  attachments?: Attachment[];
  reactions?: MessageReaction[];
  replyTo?: string; // Message ID being replied to
  forwarded?: boolean;
  forwardedFrom?: string; // User ID who forwarded
  seenBy?: string[]; // Array of user IDs who saw the message
  isEdited?: boolean;
  isDeleted?: boolean;
  deletedFor?: 'me' | 'everyone';
  isPinned?: boolean;
  isVanish?: boolean; // Vanish mode message
  expiresAt?: string; // For vanish messages
  isViewOnce?: boolean; // View once message (disappears after viewing)
  viewOnceOpened?: boolean; // Has the view once message been opened
  // Unique Features
  poll?: PollData; // Quick poll
  isBookmarked?: boolean; // Bookmarked message
  scheduledAt?: string; // Scheduled message time
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // Array of user IDs who voted
}

export interface PollData {
  question: string;
  options: PollOption[];
  totalVotes: number;
  isAnonymous?: boolean;
  expiresAt?: string;
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
  isGroup?: boolean;
  groupName?: string;
  groupAvatar?: string;
  groupAdmins?: string[];
  isVanishMode?: boolean;
  muted?: boolean;
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
  sendMessage: (text: string, attachments?: (File | { type: string; url: string; name: string })[]) => Promise<void>;
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

  // Message Reactions & Interactions
  addReaction: (messageId: string, reactionType: ReactionType) => Promise<void>;
  removeReaction: (messageId: string) => Promise<void>;
  replyToMessage: (messageId: string, text: string, attachments?: File[]) => Promise<void>;
  forwardMessage: (messageId: string, targetConversationId: string) => Promise<void>;
  editMessage: (messageId: string, newText: string) => Promise<void>;
  deleteMessage: (messageId: string, deleteFor: 'me' | 'everyone') => Promise<void>;
  pinMessage: (messageId: string) => Promise<void>;
  unpinMessage: (messageId: string) => Promise<void>;
  copyMessage: (messageId: string) => void;
  toggleVanishMode: (conversationId: string) => Promise<void>;

  // Group Chat Functions
  createGroup: (name: string, participants: string[]) => Promise<void>;
  addGroupMember: (conversationId: string, userId: string) => Promise<void>;
  removeGroupMember: (conversationId: string, userId: string) => Promise<void>;
  updateGroupInfo: (conversationId: string, name?: string, avatar?: File) => Promise<void>;
  leaveGroup: (conversationId: string) => Promise<void>;
  muteConversation: (conversationId: string) => Promise<void>;

  // Call Functionality
  activeCall: Call | null;
  startCall: (receiver: User, isVideo: boolean) => void;
  acceptCall: () => void;
  endCall: () => void;
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;

  // Notification Settings
  showNotificationContent: boolean;
  setShowNotificationContent: (value: boolean) => void;
}

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}