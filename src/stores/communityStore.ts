import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export type PostType = 'lesson_complete' | 'module_complete' | 'streak' | 'challenge_join' | 'text' | 'photo';
export type FeedFilter = 'all' | 'conquistas' | 'desafios' | 'fotos';

export interface CommunityPost {
  id: string;
  user_id: string;
  type: PostType;
  content: string | null;
  metadata: Record<string, any>;
  energia_count: number;
  comment_count: number;
  created_at: string;
  // Joined from profiles
  user_name: string;
  user_avatar: string | null;
  image_url: string | null;
  // Client-side state
  has_reacted: boolean;
}

export interface TopMember {
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  weekly_km: number;
  weekly_energia: number;
  post_count: number;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name: string;
  user_avatar: string | null;
}

interface CommentsCache {
  items: PostComment[];
  hasMore: boolean;
  isLoading: boolean;
}

interface CommunityState {
  posts: CommunityPost[];
  comments: Record<string, CommentsCache>;
  topMembers: TopMember[];
  isLoading: boolean;
  isLoadingMore: boolean;
  isPosting: boolean;
  hasMore: boolean;
  feedFilter: FeedFilter;

  setFeedFilter: (filter: FeedFilter) => void;
  fetchPosts: (refresh?: boolean) => Promise<void>;
  loadMorePosts: () => Promise<void>;
  createPost: (userId: string, type: PostType, content?: string, metadata?: Record<string, any>, imageUri?: string) => Promise<void>;
  deletePost: (postId: string, userId: string) => Promise<void>;
  toggleEnergia: (postId: string, userId: string) => Promise<void>;
  fetchComments: (postId: string, loadMore?: boolean) => Promise<void>;
  addComment: (postId: string, userId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string, postId: string, userId: string) => Promise<void>;
  fetchTopMembers: () => Promise<void>;
}

const POST_PAGE_SIZE = 20;
const COMMENT_PAGE_SIZE = 20;
const MAX_CACHED_POSTS = 5; // LRU: keep comments for last 5 opened posts

// Track comment cache access order for LRU eviction
let cacheAccessOrder: string[] = [];

function touchCache(postId: string) {
  cacheAccessOrder = cacheAccessOrder.filter(id => id !== postId);
  cacheAccessOrder.push(postId);
}

function getEvictionIds(): string[] {
  if (cacheAccessOrder.length <= MAX_CACHED_POSTS) return [];
  return cacheAccessOrder.slice(0, cacheAccessOrder.length - MAX_CACHED_POSTS);
}

// Legacy fallback: direct table query (no block/privacy filtering)
// Used when the get_filtered_feed RPC is not yet deployed
async function fetchPostsLegacy(
  set: (partial: Partial<CommunityState>) => void,
  get: () => CommunityState,
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;

    const { data: posts, error } = await supabase
      .from('community_posts')
      .select(`*, profiles (name, avatar_url)`)
      .order('created_at', { ascending: false })
      .limit(POST_PAGE_SIZE);

    if (error) throw error;

    let reactedPostIds = new Set<string>();
    if (currentUserId && posts && posts.length > 0) {
      const { data: reactions } = await supabase
        .from('post_reactions')
        .select('post_id')
        .eq('user_id', currentUserId)
        .in('post_id', posts.map(p => p.id));
      reactedPostIds = new Set((reactions ?? []).map(r => r.post_id));
    }

    const mapped: CommunityPost[] = (posts ?? []).map((p: any) => ({
      id: p.id,
      user_id: p.user_id,
      type: p.type,
      content: p.content,
      metadata: p.metadata ?? {},
      energia_count: p.energia_count ?? 0,
      comment_count: p.comment_count ?? 0,
      image_url: p.image_url ?? null,
      created_at: p.created_at,
      user_name: p.profiles?.name ?? 'Usuário',
      user_avatar: p.profiles?.avatar_url ?? null,
      has_reacted: reactedPostIds.has(p.id),
    }));

    set({ posts: mapped, isLoading: false, hasMore: (posts?.length ?? 0) >= POST_PAGE_SIZE });
  } catch (e) {
    console.error('fetchPostsLegacy error:', e);
    set({ isLoading: false });
  }
}

async function loadMorePostsLegacy(
  set: (partial: Partial<CommunityState>) => void,
  get: () => CommunityState,
) {
  const state = get();
  try {
    const lastPost = state.posts[state.posts.length - 1];
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;

    const { data: posts, error } = await supabase
      .from('community_posts')
      .select(`*, profiles (name, avatar_url)`)
      .order('created_at', { ascending: false })
      .lt('created_at', lastPost.created_at)
      .limit(POST_PAGE_SIZE);

    if (error) throw error;

    let reactedPostIds = new Set<string>();
    if (currentUserId && posts && posts.length > 0) {
      const { data: reactions } = await supabase
        .from('post_reactions')
        .select('post_id')
        .eq('user_id', currentUserId)
        .in('post_id', posts.map(p => p.id));
      reactedPostIds = new Set((reactions ?? []).map(r => r.post_id));
    }

    const mapped: CommunityPost[] = (posts ?? []).map((p: any) => ({
      id: p.id,
      user_id: p.user_id,
      type: p.type,
      content: p.content,
      metadata: p.metadata ?? {},
      energia_count: p.energia_count ?? 0,
      comment_count: p.comment_count ?? 0,
      image_url: p.image_url ?? null,
      created_at: p.created_at,
      user_name: p.profiles?.name ?? 'Usuário',
      user_avatar: p.profiles?.avatar_url ?? null,
      has_reacted: reactedPostIds.has(p.id),
    }));

    set({
      posts: [...state.posts, ...mapped],
      isLoadingMore: false,
      hasMore: (posts?.length ?? 0) >= POST_PAGE_SIZE,
    });
  } catch (e) {
    console.error('loadMorePostsLegacy error:', e);
    set({ isLoadingMore: false });
  }
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  posts: [],
  comments: {},
  topMembers: [],
  isLoading: false,
  isLoadingMore: false,
  isPosting: false,
  hasMore: true,
  feedFilter: 'all' as FeedFilter,

  setFeedFilter: (filter: FeedFilter) => {
    set({ feedFilter: filter });
  },

  fetchPosts: async (refresh = false) => {
    const state = get();
    if (state.isLoading) return;
    set({ isLoading: true });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      if (!currentUserId) {
        set({ isLoading: false });
        return;
      }

      // Use filtered RPC that excludes blocked users and private profiles
      const { data: posts, error } = await supabase.rpc('get_filtered_feed', {
        p_viewer_id: currentUserId,
        p_limit: POST_PAGE_SIZE,
        p_offset: 0,
        p_filter: state.feedFilter,
      });

      if (error) {
        // Fallback: if RPC not deployed, use legacy direct query
        if (error.code === '42883') {
          console.warn('get_filtered_feed RPC not deployed, using legacy query');
          return await fetchPostsLegacy(set, get);
        }
        throw error;
      }

      const mapped: CommunityPost[] = (posts ?? []).map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        type: p.type,
        content: p.content,
        metadata: p.metadata ?? {},
        energia_count: p.energia_count ?? 0,
        comment_count: p.comment_count ?? 0,
        image_url: p.image_url ?? null,
        created_at: p.created_at,
        user_name: p.user_name ?? 'Usuário',
        user_avatar: p.avatar_url ?? null,
        has_reacted: p.user_has_energia ?? false,
      }));

      set({ posts: mapped, isLoading: false, hasMore: (posts?.length ?? 0) >= POST_PAGE_SIZE });
    } catch (e) {
      console.error('fetchPosts error:', e);
      set({ isLoading: false });
    }
  },

  loadMorePosts: async () => {
    const state = get();
    if (state.isLoadingMore || !state.hasMore || state.posts.length === 0) return;
    set({ isLoadingMore: true });

    try {
      const lastPost = state.posts[state.posts.length - 1];
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      if (!currentUserId) {
        set({ isLoadingMore: false });
        return;
      }

      // Use cursor-based filtered RPC
      const { data: posts, error } = await supabase.rpc('get_filtered_feed_before', {
        p_viewer_id: currentUserId,
        p_before: lastPost.created_at,
        p_limit: POST_PAGE_SIZE,
        p_filter: state.feedFilter,
      });

      if (error) {
        // Fallback: legacy direct query if RPC not deployed
        if (error.code === '42883') {
          console.warn('get_filtered_feed_before RPC not deployed, using legacy query');
          return await loadMorePostsLegacy(set, get);
        }
        throw error;
      }

      const mapped: CommunityPost[] = (posts ?? []).map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        type: p.type,
        content: p.content,
        metadata: p.metadata ?? {},
        energia_count: p.energia_count ?? 0,
        comment_count: p.comment_count ?? 0,
        image_url: p.image_url ?? null,
        created_at: p.created_at,
        user_name: p.user_name ?? 'Usuário',
        user_avatar: p.avatar_url ?? null,
        has_reacted: p.user_has_energia ?? false,
      }));

      set({
        posts: [...state.posts, ...mapped],
        isLoadingMore: false,
        hasMore: (posts?.length ?? 0) >= POST_PAGE_SIZE,
      });
    } catch (e) {
      console.error('loadMorePosts error:', e);
      set({ isLoadingMore: false });
    }
  },

  createPost: async (userId, type, content, metadata = {}, imageUri) => {
    set({ isPosting: true });
    try {
      let imageUrl: string | null = null;

      // Upload image to Supabase Storage if provided
      if (imageUri) {
        const ext = imageUri.split('.').pop()?.toLowerCase() ?? 'jpg';
        const fileName = `${userId}/${Date.now()}.${ext}`;
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const arrayBuffer = await new Response(blob).arrayBuffer();

        const { error: uploadErr } = await supabase.storage
          .from('community-images')
          .upload(fileName, arrayBuffer, {
            contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
            upsert: false,
          });

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from('community-images')
          .getPublicUrl(fileName);

        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase
        .from('community_posts')
        .insert({
          user_id: userId,
          type: imageUri ? 'photo' : type,
          content: content ?? null,
          metadata,
          image_url: imageUrl,
        });

      if (error) throw error;

      // Refresh feed
      await get().fetchPosts(true);
    } catch (e) {
      console.error('createPost error:', e);
    } finally {
      set({ isPosting: false });
    }
  },

  deletePost: async (postId, userId) => {
    // Optimistic removal
    const prevPosts = get().posts;
    set({ posts: prevPosts.filter(p => p.id !== postId) });

    try {
      const { data, error } = await supabase.rpc('delete_post', {
        p_post_id: postId,
        p_user_id: userId,
      });

      if (error) {
        // Fallback: direct delete if RPC not deployed
        if (error.code === '42883') {
          const { error: delErr } = await supabase
            .from('community_posts')
            .delete()
            .eq('id', postId)
            .eq('user_id', userId);
          if (delErr) throw delErr;
        } else {
          throw error;
        }
      }

      // Clean up comments cache for this post
      const updatedComments = { ...get().comments };
      delete updatedComments[postId];
      cacheAccessOrder = cacheAccessOrder.filter(id => id !== postId);
      set({ comments: updatedComments });
    } catch (e) {
      console.error('deletePost error:', e);
      // Revert optimistic removal
      set({ posts: prevPosts });
    }
  },

  toggleEnergia: async (postId, userId) => {
    // Optimistic update
    const posts = get().posts.map(p => {
      if (p.id !== postId) return p;
      const newReacted = !p.has_reacted;
      return {
        ...p,
        has_reacted: newReacted,
        energia_count: newReacted ? p.energia_count + 1 : Math.max(p.energia_count - 1, 0),
      };
    });
    set({ posts });

    try {
      const { error } = await supabase.rpc('toggle_energia', {
        p_post_id: postId,
        p_user_id: userId,
      });
      if (error) throw error;
    } catch (e) {
      console.error('toggleEnergia error:', e);
      // Revert optimistic update
      get().fetchPosts(true);
    }
  },

  // Paginated comments: initial load or load more
  fetchComments: async (postId, loadMore = false) => {
    const existing = get().comments[postId];

    // If already loading, skip
    if (existing?.isLoading) return;

    // Mark loading
    set({
      comments: {
        ...get().comments,
        [postId]: { items: existing?.items ?? [], hasMore: existing?.hasMore ?? true, isLoading: true },
      },
    });

    try {
      let query = supabase
        .from('post_comments')
        .select(`
          *,
          profiles (name, avatar_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .limit(COMMENT_PAGE_SIZE);

      // Cursor-based pagination: load older comments
      if (loadMore && existing?.items && existing.items.length > 0) {
        const oldestComment = existing.items[existing.items.length - 1];
        query = query.lt('created_at', oldestComment.created_at);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped: PostComment[] = (data ?? []).map((c: any) => ({
        id: c.id,
        post_id: c.post_id,
        user_id: c.user_id,
        content: c.content,
        created_at: c.created_at,
        user_name: c.profiles?.name ?? 'Usuário',
        user_avatar: c.profiles?.avatar_url ?? null,
      }));

      // Reverse to show oldest first in UI
      mapped.reverse();

      const newItems = loadMore && existing?.items
        ? [...mapped, ...existing.items] // prepend older comments
        : mapped;

      // LRU: touch this post and evict old caches
      touchCache(postId);
      const evictIds = getEvictionIds();
      const updatedComments = { ...get().comments };
      for (const id of evictIds) {
        delete updatedComments[id];
        cacheAccessOrder = cacheAccessOrder.filter(cid => cid !== id);
      }

      updatedComments[postId] = {
        items: newItems,
        hasMore: (data?.length ?? 0) >= COMMENT_PAGE_SIZE,
        isLoading: false,
      };

      set({ comments: updatedComments });
    } catch (e) {
      console.error('fetchComments error:', e);
      set({
        comments: {
          ...get().comments,
          [postId]: { items: existing?.items ?? [], hasMore: existing?.hasMore ?? true, isLoading: false },
        },
      });
    }
  },

  // Atomic comment: insert + increment count in one RPC call
  addComment: async (postId, userId, content) => {
    try {
      const { data, error } = await supabase.rpc('add_comment', {
        p_post_id: postId,
        p_user_id: userId,
        p_content: content,
      });

      if (error) {
        // Fallback: if RPC not deployed yet, use two-step approach
        if (error.message?.includes('function') || error.code === '42883') {
          const { error: insertErr } = await supabase
            .from('post_comments')
            .insert({ post_id: postId, user_id: userId, content });
          if (insertErr) throw insertErr;
          await supabase.rpc('increment_comment_count', { p_post_id: postId });
        } else {
          throw error;
        }
      }

      // Optimistic: add comment to local cache immediately
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profileData } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', userId)
        .single();

      const newComment: PostComment = {
        id: data?.comment_id ?? crypto.randomUUID(),
        post_id: postId,
        user_id: userId,
        content,
        created_at: new Date().toISOString(),
        user_name: profileData?.name ?? 'Usuário',
        user_avatar: profileData?.avatar_url ?? null,
      };

      const existing = get().comments[postId];
      set({
        comments: {
          ...get().comments,
          [postId]: {
            items: [...(existing?.items ?? []), newComment],
            hasMore: existing?.hasMore ?? true,
            isLoading: false,
          },
        },
      });

      // Optimistic count increment on post
      const posts = get().posts.map(p =>
        p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p
      );
      set({ posts });
    } catch (e) {
      console.error('addComment error:', e);
    }
  },

  deleteComment: async (commentId, postId, userId) => {
    // Optimistic removal
    const existing = get().comments[postId];
    if (existing) {
      set({
        comments: {
          ...get().comments,
          [postId]: {
            ...existing,
            items: existing.items.filter(c => c.id !== commentId),
          },
        },
      });
    }

    // Decrement post comment count
    const posts = get().posts.map(p =>
      p.id === postId ? { ...p, comment_count: Math.max(p.comment_count - 1, 0) } : p
    );
    set({ posts });

    try {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', userId);
      if (error) throw error;
    } catch (e) {
      console.error('deleteComment error:', e);
      // Revert — refetch
      get().fetchComments(postId);
    }
  },

  fetchTopMembers: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      if (!currentUserId) return;

      // Try filtered version first (excludes blocked users)
      const { data, error } = await supabase.rpc('get_weekly_top_members_filtered', {
        p_viewer_id: currentUserId,
        p_limit: 5,
      });

      if (error) {
        // Fallback: try legacy unfiltered RPC
        if (error.code === '42883') {
          const { data: legacyData, error: legacyErr } = await supabase.rpc('get_weekly_top_members', { p_limit: 5 });
          if (legacyErr) {
            if (legacyErr.code === '42883') {
              console.warn('get_weekly_top_members RPC not deployed yet');
              return;
            }
            throw legacyErr;
          }
          set({ topMembers: (legacyData ?? []).map((m: any) => ({
            user_id: m.user_id,
            user_name: m.user_name ?? 'Usuário',
            avatar_url: m.avatar_url ?? null,
            weekly_km: Number(m.weekly_km) || 0,
            weekly_energia: Number(m.weekly_energia) || 0,
            post_count: Number(m.post_count) || 0,
          })) });
          return;
        }
        throw error;
      }

      set({ topMembers: (data ?? []).map((m: any) => ({
        user_id: m.user_id,
        user_name: m.user_name ?? 'Usuário',
        avatar_url: m.avatar_url ?? null,
        weekly_km: Number(m.weekly_km) || 0,
        weekly_energia: Number(m.weekly_energia) || 0,
        post_count: Number(m.post_count) || 0,
      })) });
    } catch (e) {
      console.error('fetchTopMembers error:', e);
    }
  },
}));
