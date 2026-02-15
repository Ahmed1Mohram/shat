import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, Conversation, Message, Story } from '../types';

const SUPABASE_URL = 'https://civppgiqoctejlqclokh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpdnBwZ2lxb2N0ZWpscWNsb2toIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMDY3MTIsImV4cCI6MjA4NjU4MjcxMn0.-T9d7yxoFpa4tqhPkGER_Uhz-h8tgytupRaW_KmYumk';

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export class SupabaseService {
  
  // --- Auth (User Management) ---
  
  async login(username: string, password: string): Promise<User> {
    const { data: existingUser, error } = await supabase
      .from('users')
      .select('*')
      .ilike('username', username)
      .maybeSingle();

    if (error) throw error;
    
    // Check if user exists
    if (!existingUser) throw new Error("الحساب غير موجود");

    // In a real app, use bcrypt on server side. For this demo, we compare direct strings.
    if (existingUser.password !== password) {
        throw new Error("كلمة المرور غير صحيحة");
    }

    // Update status immediately on login
    await supabase.from('users').update({ 
        is_online: true,
        last_active: new Date().toISOString() 
    }).eq('id', existingUser.id);
    
    return this.mapUser(existingUser);
  }

  async signup(username: string, password: string): Promise<User> {
      // Check if user exists first
      const { data: existing } = await supabase.from('users').select('id').ilike('username', username).maybeSingle();
      if (existing) throw new Error("Username already taken");

      const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        username,
        password, // Storing password
        avatar_url: `https://ui-avatars.com/api/?name=${username}&background=0ea5e9&color=fff`,
        is_online: true,
        last_active: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
        if (error.message && error.message.includes("Could not find the 'password' column")) {
            throw new Error("Database error: Missing 'password' column. Please run the SQL migration.");
        }
        throw new Error(error.message || 'Failed to create user');
    }
    
    if (!newUser) throw new Error('Failed to create user');
    return this.mapUser(newUser);
  }

  async logout(userId: string) {
    await supabase.from('users').update({ 
        is_online: false,
        last_active: new Date().toISOString()
    }).eq('id', userId);
  }

  async sendHeartbeat(userId: string) {
      await supabase.from('users').update({
          is_online: true,
          last_active: new Date().toISOString()
      }).eq('id', userId);
  }

  async updateUserAvatar(userId: string, avatarUrl: string): Promise<void> {
    const { error } = await supabase.from('users').update({ avatar_url: avatarUrl }).eq('id', userId);
    if (error) throw error;
  }

  subscribeToUserStatus(callback: (user: User) => void) {
      return supabase.channel('public:users_status')
          .on('postgres_changes', 
              { event: 'UPDATE', schema: 'public', table: 'users' }, 
              (payload) => callback(this.mapUser(payload.new))
          ).subscribe();
  }

  // --- Search & Friendship ---

  async searchUsers(query: string, currentUserId: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('username', `%${query}%`)
      .limit(20);

    if (error) return [];

    // Check friendship status for each result
    const usersWithStatus = await Promise.all(data.map(async (u) => {
        const mapped = this.mapUser(u);
        if (u.id === currentUserId) {
            mapped.friendshipStatus = 'self';
            return mapped;
        }

        // Check DB for friendship
        const { data: rel } = await supabase
            .from('friendships')
            .select('*')
            .or(`and(requester_id.eq.${currentUserId},addressee_id.eq.${u.id}),and(requester_id.eq.${u.id},addressee_id.eq.${currentUserId})`)
            .maybeSingle();
        
        if (!rel) {
            mapped.friendshipStatus = 'none';
        } else if (rel.status === 'accepted') {
            mapped.friendshipStatus = 'accepted';
        } else if (rel.requester_id === currentUserId) {
            mapped.friendshipStatus = 'pending_sent';
        } else {
            mapped.friendshipStatus = 'pending_received';
        }
        return mapped;
    }));

    return usersWithStatus;
  }

  async sendFriendRequest(requesterId: string, addresseeId: string) {
      await supabase.from('friendships').insert({
          requester_id: requesterId,
          addressee_id: addresseeId,
          status: 'pending'
      });
  }

  async acceptFriendRequest(userId: string, requesterId: string) {
      await supabase.from('friendships')
        .update({ status: 'accepted' })
        .eq('addressee_id', userId)
        .eq('requester_id', requesterId);
  }

  async getPendingRequests(userId: string): Promise<User[]> {
      const { data } = await supabase
        .from('friendships')
        .select('requester_id, users!friendships_requester_id_fkey(*)') // Join requester details
        .eq('addressee_id', userId)
        .eq('status', 'pending');
      
      return data ? data.map((d: any) => ({ ...this.mapUser(d.users), friendshipStatus: 'pending_received' })) : [];
  }

  async getFriendIds(userId: string): Promise<string[]> {
    const { data } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
    
    if (!data) return [];
    
    // Extract the ID that isn't the current user's ID
    return data.map(r => r.requester_id === userId ? r.addressee_id : r.requester_id);
  }
  
  async getFriends(userId: string): Promise<User[]> {
      const friendIds = await this.getFriendIds(userId);
      if (friendIds.length === 0) return [];
      
      const { data } = await supabase
        .from('users')
        .select('*')
        .in('id', friendIds);
        
      if (!data) return [];
      
      return data.map(u => ({
          ...this.mapUser(u),
          friendshipStatus: 'accepted'
      }));
  }

  // --- Blocking ---
  
  async blockUser(blockerId: string, blockedId: string) {
      await supabase.from('blocks').insert({ blocker_id: blockerId, blocked_id: blockedId });
  }

  async unblockUser(blockerId: string, blockedId: string) {
      await supabase.from('blocks').delete().match({ blocker_id: blockerId, blocked_id: blockedId });
  }

  async checkBlockStatus(userId: string, targetId: string): Promise<{blockedByMe: boolean, blockedMe: boolean}> {
      const { data: blockedByMe } = await supabase.from('blocks').select('*').match({ blocker_id: userId, blocked_id: targetId }).maybeSingle();
      const { data: blockedMe } = await supabase.from('blocks').select('*').match({ blocker_id: targetId, blocked_id: userId }).maybeSingle();
      return { blockedByMe: !!blockedByMe, blockedMe: !!blockedMe };
  }

  // --- Stories ---

  async getStories(currentUserId: string): Promise<Story[]> {
    const yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000)).toISOString();
    
    const friendIds = await this.getFriendIds(currentUserId);
    const allowedIds = [currentUserId, ...friendIds];

    const { data, error } = await supabase
        .from('stories')
        .select('*, users(username, avatar_url)')
        .gt('created_at', yesterday)
        .in('user_id', allowedIds)
        .order('created_at', { ascending: false });

    if (error) return [];
    
    return data.map((row: any) => {
        const viewers = row.viewers ? (typeof row.viewers === 'string' ? JSON.parse(row.viewers) : row.viewers) : [];
        return {
            id: row.id,
            userId: row.user_id,
            username: row.users?.username || 'Unknown',
            userAvatar: row.users?.avatar_url,
            mediaUrl: row.media_url,
            mediaType: row.media_type || 'image',
            textContent: row.text_content,
            backgroundColor: row.background_color,
            fontStyle: row.font_style,
            viewers: viewers,
            createdAt: row.created_at,
            isViewed: viewers.includes(currentUserId)
        };
    });
  }

  async createStory(userId: string, storyData: Partial<Story>): Promise<void> {
    const { error } = await supabase.from('stories').insert({
        user_id: userId,
        media_url: storyData.mediaUrl,
        media_type: storyData.mediaType,
        text_content: storyData.textContent,
        background_color: storyData.backgroundColor,
        font_style: storyData.fontStyle,
        viewers: []
    });
    if (error) throw error;
  }

  async deleteStory(storyId: string) {
      await supabase.from('stories').delete().eq('id', storyId);
  }

  async markStoryViewed(storyId: string, userId: string, currentViewers: string[]) {
      if (currentViewers.includes(userId)) return;
      
      const newViewers = [...currentViewers, userId];
      await supabase.from('stories')
        .update({ viewers: newViewers })
        .eq('id', storyId);
  }

  // --- Conversations ---

  async getConversations(userId: string): Promise<Conversation[]> {
    const { data: myParticipations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (!myParticipations?.length) return [];
    const convIds = myParticipations.map(p => p.conversation_id);

    const { data: allParticipants } = await supabase
      .from('conversation_participants')
      .select('conversation_id, unread_count, users(*)')
      .in('conversation_id', convIds);

    const { data: lastMessages } = await supabase
      .from('messages')
      .select('*')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false });

    // Fetch blocks to augment user status
    const { data: myBlocks } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', userId);
    const { data: blockedMe } = await supabase.from('blocks').select('blocker_id').eq('blocked_id', userId);

    const blockedByIds = new Set(myBlocks?.map(b => b.blocked_id));
    const blockedMeIds = new Set(blockedMe?.map(b => b.blocker_id));

    const conversationsMap = new Map<string, Conversation>();

    allParticipants?.forEach((row: any) => {
        const convId = row.conversation_id;
        const participantUser = this.mapUser(row.users);
        
        // Inject block status
        participantUser.blockedByMe = blockedByIds.has(participantUser.id);
        participantUser.blockedMe = blockedMeIds.has(participantUser.id);
        
        if (!conversationsMap.has(convId)) {
            const lastMsgRaw = lastMessages?.find(m => m.conversation_id === convId);
            conversationsMap.set(convId, {
                id: convId,
                participants: [],
                unreadCount: 0,
                lastMessage: lastMsgRaw ? this.mapMessage(lastMsgRaw) : undefined
            });
        }
        const conv = conversationsMap.get(convId)!;
        const isSelf = participantUser.id === userId;
        if (!isSelf) conv.participants.push(participantUser);
        else conv.unreadCount = row.unread_count || 0;
    });

    return Array.from(conversationsMap.values()).map(c => {
        if (c.participants.length === 0) {
           const selfRow = allParticipants?.find((p: any) => p.conversation_id === c.id && p.users?.id === userId);
           if (selfRow) c.participants.push(this.mapUser(selfRow.users));
        }
        return c;
    });
  }

  async createConversation(userId: string, targetUserId: string): Promise<string> {
    const { data, error } = await supabase.from('conversations').insert({}).select().single();
    if (error || !data) throw error || new Error("Failed to create conversation");
    
    // Explicitly cast to any to handle type inference issues with Supabase result
    const conv = data as any;

    const participants = [{ conversation_id: conv.id, user_id: userId }];
    if (targetUserId !== userId) participants.push({ conversation_id: conv.id, user_id: targetUserId });

    const { error: partError } = await supabase.from('conversation_participants').insert(participants);
    if (partError) throw partError;
    return conv.id;
  }

  // --- Messages & Realtime ---
  
  async getMessages(conversationId: string): Promise<Message[]> {
    const { data } = await supabase
      .from('messages')
      .select('*, attachments(*)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    return (data || []).map(this.mapMessage);
  }

  async sendMessage(conversationId: string, senderId: string, text: string, attachments: {type: 'image'|'audio'|'file', url: string, name: string}[] = []): Promise<Message | null> {
    // Check block status implicitly handled by frontend but good to double check via RLS or logic if strict
    const { data: msg, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: senderId, text, status: 'sent' })
      .select().single();

    if (error || !msg) return null;

    if (attachments.length > 0) {
        const attachmentRows = attachments.map(att => ({
            message_id: msg.id,
            type: att.type,
            url: att.url,
            name: att.name
        }));
        await supabase.from('attachments').insert(attachmentRows);
    }

    const mapped = this.mapMessage(msg);
    mapped.attachments = attachments as any; // Optimistic attachment inclusion
    return mapped;
  }

  async markMessagesAsDelivered(conversationId: string, currentUserId: string) {
    // Update messages SENT by OTHERS to ME in this conversation that are currently 'sent'
    await supabase.from('messages')
        .update({ status: 'delivered' })
        .eq('conversation_id', conversationId)
        .neq('sender_id', currentUserId)
        .eq('status', 'sent');
  }

  async markMessagesAsSeen(conversationId: string, currentUserId: string) {
      // Update messages SENT by OTHERS to ME in this conversation that are NOT 'seen'
      await supabase.from('messages')
          .update({ status: 'seen' })
          .eq('conversation_id', conversationId)
          .neq('sender_id', currentUserId)
          .neq('status', 'seen');
          
      // Also reset unread count
      await supabase.from('conversation_participants')
          .update({ unread_count: 0 })
          .eq('conversation_id', conversationId)
          .eq('user_id', currentUserId);
  }
  
  subscribeToMessages(callback: (msg: Message) => void) {
    return supabase.channel('public:messages')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async (payload) => {
            if (payload.eventType === 'INSERT') {
                const { data } = await supabase.from('messages').select('*, attachments(*)').eq('id', payload.new.id).single();
                if (data) callback(this.mapMessage(data));
                else callback(this.mapMessage(payload.new));
            } else if (payload.eventType === 'UPDATE') {
                // Return updated status to client so sender sees "Seen" checkmark
                callback(this.mapMessage(payload.new));
            }
    }).subscribe();
  }
  
  subscribeToTyping(callback: (payload: any) => void) {
      return supabase.channel('typing_room').on('broadcast', { event: 'typing' }, payload => callback(payload.payload)).subscribe();
  }
  
  async sendTyping(conversationId: string, isTyping: boolean) {
      const channel = supabase.channel('typing_room');
      await channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') await channel.send({ type: 'broadcast', event: 'typing', payload: { conversationId, isTyping } });
      });
  }

  subscribeToStories(callback: (story: Story) => void) {
      return supabase.channel('public:stories').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stories' }, async (payload) => {
            const { data } = await supabase.from('users').select('username, avatar_url').eq('id', payload.new.user_id).single();
            const viewers = payload.new.viewers ? (typeof payload.new.viewers === 'string' ? JSON.parse(payload.new.viewers) : payload.new.viewers) : [];
            const fullStory: Story = {
                id: payload.new.id,
                userId: payload.new.user_id,
                username: data?.username || 'Unknown',
                userAvatar: data?.avatar_url,
                mediaUrl: payload.new.media_url,
                mediaType: payload.new.media_type,
                textContent: payload.new.text_content,
                backgroundColor: payload.new.background_color,
                fontStyle: payload.new.font_style,
                viewers: viewers,
                createdAt: payload.new.created_at
            };
            callback(fullStory);
        }).subscribe();
  }

  private mapUser(row: any): User {
    return {
      id: row.id,
      username: row.username,
      avatar: row.avatar_url,
      isOnline: row.is_online,
      isBot: row.is_bot,
      lastActive: row.last_active,
      // Block status needs to be merged from outside or defaults false
      blockedByMe: false, 
      blockedMe: false
    };
  }

  private mapMessage(row: any): Message {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      text: row.text,
      createdAt: row.created_at,
      status: row.status,
      attachments: row.attachments || [] 
    };
  }
}

export const supabaseService = new SupabaseService();