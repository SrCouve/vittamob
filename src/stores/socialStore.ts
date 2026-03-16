import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// ── Types ──

interface RelationshipStatus {
  i_follow: boolean;
  they_follow: boolean;
  is_mutual: boolean;
  is_blocked: boolean;
  i_requested: boolean;
  they_requested: boolean;
}

export interface PublicProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  is_private: boolean;
  interests?: string[];
  points_balance?: number;
  streak_days?: number;
  weight_kg?: number | null;
  height_cm?: number | null;
  total_lessons?: number;
  total_hours?: number;
  has_strava?: boolean;
  hide_routes?: boolean;
  followers_count: number;
  following_count: number;
  created_at?: string;
  relationship: RelationshipStatus;
  limited: boolean;
}

export interface UserListItem {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  is_private: boolean;
  followers_count: number;
}

export interface FollowRequestItem {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  followers_count: number;
  created_at: string;
}

interface SocialState {
  // Profile being viewed
  viewingProfile: PublicProfile | null;
  isLoadingProfile: boolean;

  // Lists
  followers: UserListItem[];
  following: UserListItem[];
  friends: UserListItem[];
  searchResults: UserListItem[];

  // Follow requests
  followRequests: FollowRequestItem[];
  followRequestsCount: number;

  // Mutual follows
  mutualFollows: { id: string; name: string; avatar_url: string | null }[];
  mutualFollowsCount: number;

  // Loading states
  isLoadingList: boolean;
  isLoadingSearch: boolean;
  isFollowLoading: Record<string, boolean>;

  // Mute state
  isMuted: boolean;

  // Own counts (for perfil.tsx)
  myFollowersCount: number;
  myFollowingCount: number;
  myFriendsCount: number;

  // Actions
  fetchPublicProfile: (viewerId: string, targetId: string) => Promise<void>;
  followUser: (followerId: string, followingId: string) => Promise<'mutual' | 'followed' | 'requested' | 'error'>;
  unfollowUser: (followerId: string, followingId: string) => Promise<void>;
  cancelRequest: (requesterId: string, targetId: string) => Promise<void>;
  acceptRequest: (targetId: string, requesterId: string) => Promise<boolean>;
  declineRequest: (targetId: string, requesterId: string) => Promise<void>;
  fetchFollowRequests: (userId: string) => Promise<void>;
  fetchMutualFollows: (viewerId: string, targetId: string) => Promise<void>;
  blockUser: (blockerId: string, blockedId: string) => Promise<void>;
  unblockUser: (blockerId: string, blockedId: string) => Promise<void>;
  fetchFollowers: (userId: string, viewerId: string, offset?: number) => Promise<void>;
  fetchFollowing: (userId: string, viewerId: string, offset?: number) => Promise<void>;
  fetchFriends: (userId: string, viewerId: string) => Promise<void>;
  fetchMyCounts: (userId: string) => Promise<void>;
  searchUsers: (query: string, viewerId: string) => Promise<void>;
  muteUser: (muterId: string, mutedId: string) => Promise<void>;
  unmuteUser: (muterId: string, mutedId: string) => Promise<void>;
  checkMuted: (muterId: string, mutedId: string) => Promise<void>;
  removeFollower: (userId: string, followerId: string) => Promise<void>;
  clearProfile: () => void;
}

// ── Store ──

export const useSocialStore = create<SocialState>((set, get) => ({
  viewingProfile: null,
  isLoadingProfile: false,

  followers: [],
  following: [],
  friends: [],
  searchResults: [],

  followRequests: [],
  followRequestsCount: 0,

  mutualFollows: [],
  mutualFollowsCount: 0,

  isMuted: false,

  isLoadingList: false,
  isLoadingSearch: false,
  isFollowLoading: {},

  myFollowersCount: 0,
  myFollowingCount: 0,
  myFriendsCount: 0,

  fetchPublicProfile: async (viewerId, targetId) => {
    set({ isLoadingProfile: true });

    try {
      const { data, error } = await supabase.rpc('get_user_public_profile', {
        p_viewer_id: viewerId,
        p_target_id: targetId,
      });

      if (error) {
        console.error('fetchPublicProfile error:', error);
        set({ isLoadingProfile: false });
        return;
      }

      // RPC returns a single row (or array with one element)
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        set({ viewingProfile: null, isLoadingProfile: false });
        return;
      }

      const profile: PublicProfile = {
        id: row.id,
        name: row.name ?? 'Usuário',
        avatar_url: row.avatar_url ?? null,
        bio: row.bio ?? null,
        is_private: row.is_private ?? false,
        interests: row.interests ?? [],
        points_balance: row.points_balance ?? 0,
        streak_days: row.streak_days ?? 0,
        weight_kg: row.weight_kg ?? null,
        height_cm: row.height_cm ?? null,
        total_lessons: row.total_lessons ?? 0,
        total_hours: row.total_hours ?? 0,
        has_strava: row.has_strava ?? false,
        hide_routes: row.hide_routes ?? false,
        followers_count: row.followers_count ?? 0,
        following_count: row.following_count ?? 0,
        created_at: row.created_at ?? null,
        relationship: {
          i_follow: row.relationship?.i_follow ?? false,
          they_follow: row.relationship?.they_follow ?? false,
          is_mutual: row.relationship?.is_mutual ?? false,
          is_blocked: row.relationship?.is_blocked ?? false,
          i_requested: row.relationship?.i_requested ?? false,
          they_requested: row.relationship?.they_requested ?? false,
        },
        limited: row.limited ?? false,
      };

      set({ viewingProfile: profile, isLoadingProfile: false });
    } catch (e) {
      console.error('fetchPublicProfile error:', e);
      set({ isLoadingProfile: false });
    }
  },

  followUser: async (followerId, followingId) => {
    // Set loading for this specific user
    set({ isFollowLoading: { ...get().isFollowLoading, [followingId]: true } });

    // Capture previous values BEFORE any optimistic updates
    const prevProfile = get().viewingProfile;
    const prevFollowingCount = get().myFollowingCount;

    // Optimistic update on viewingProfile
    if (prevProfile && prevProfile.id === followingId) {
      if (prevProfile.is_private && !prevProfile.relationship.they_follow) {
        // Private profile: optimistic → i_requested = true (not i_follow)
        set({
          viewingProfile: {
            ...prevProfile,
            relationship: {
              ...prevProfile.relationship,
              i_requested: true,
            },
          },
        });
      } else {
        // Public profile or they already follow me: optimistic → i_follow = true
        set({
          viewingProfile: {
            ...prevProfile,
            followers_count: prevProfile.followers_count + 1,
            relationship: {
              ...prevProfile.relationship,
              i_follow: true,
              is_mutual: prevProfile.relationship.they_follow,
            },
          },
        });
        // Optimistic increment own following count only for direct follows
        set({ myFollowingCount: prevFollowingCount + 1 });
      }
    }

    try {
      const { data, error } = await supabase.rpc('follow_user', {
        p_follower_id: followerId,
        p_following_id: followingId,
      });

      if (error) {
        console.error('followUser error:', error);

        // Revert optimistic updates
        if (prevProfile && prevProfile.id === followingId) {
          set({ viewingProfile: prevProfile });
        }
        set({ myFollowingCount: prevFollowingCount });
        set({ isFollowLoading: { ...get().isFollowLoading, [followingId]: false } });
        return 'error';
      }

      const result = Array.isArray(data) ? data[0] : data;
      const isRequested = result?.requested ?? false;
      const isMutual = result?.is_mutual ?? false;

      // Update viewingProfile with server-confirmed status
      const currentProfile = get().viewingProfile;
      if (currentProfile && currentProfile.id === followingId) {
        if (isRequested) {
          set({
            viewingProfile: {
              ...currentProfile,
              relationship: {
                ...currentProfile.relationship,
                i_follow: false,
                i_requested: true,
                is_mutual: false,
              },
            },
          });
          // Revert following count if we optimistically incremented
          set({ myFollowingCount: prevFollowingCount });
        } else {
          set({
            viewingProfile: {
              ...currentProfile,
              followers_count: prevProfile
                ? prevProfile.followers_count + 1
                : currentProfile.followers_count,
              relationship: {
                ...currentProfile.relationship,
                i_follow: true,
                i_requested: false,
                is_mutual: isMutual,
              },
            },
          });
        }
      }

      set({ isFollowLoading: { ...get().isFollowLoading, [followingId]: false } });
      return isRequested ? 'requested' : isMutual ? 'mutual' : 'followed';
    } catch (e) {
      console.error('followUser error:', e);

      // Revert optimistic updates
      if (prevProfile && prevProfile.id === followingId) {
        set({ viewingProfile: prevProfile });
      }
      set({ myFollowingCount: prevFollowingCount });
      set({ isFollowLoading: { ...get().isFollowLoading, [followingId]: false } });
      return 'error';
    }
  },

  unfollowUser: async (followerId, followingId) => {
    // If we only have a pending request (not actually following), cancel the request instead
    const currentProfile = get().viewingProfile;
    if (
      currentProfile &&
      currentProfile.id === followingId &&
      currentProfile.relationship.i_requested &&
      !currentProfile.relationship.i_follow
    ) {
      return get().cancelRequest(followerId, followingId);
    }

    set({ isFollowLoading: { ...get().isFollowLoading, [followingId]: true } });

    // Optimistic update on viewingProfile
    const prevProfile = get().viewingProfile;
    if (prevProfile && prevProfile.id === followingId) {
      set({
        viewingProfile: {
          ...prevProfile,
          followers_count: Math.max(prevProfile.followers_count - 1, 0),
          relationship: {
            ...prevProfile.relationship,
            i_follow: false,
            is_mutual: false,
            i_requested: false,
          },
        },
      });
    }

    // Optimistic decrement own following count
    const prevFollowingCount = get().myFollowingCount;
    set({ myFollowingCount: Math.max(prevFollowingCount - 1, 0) });

    try {
      const { error } = await supabase.rpc('unfollow_user', {
        p_follower_id: followerId,
        p_following_id: followingId,
      });

      if (error) {
        console.error('unfollowUser error:', error);

        // Revert optimistic updates
        if (prevProfile && prevProfile.id === followingId) {
          set({ viewingProfile: prevProfile });
        }
        set({ myFollowingCount: prevFollowingCount });
      }
    } catch (e) {
      console.error('unfollowUser error:', e);

      // Revert optimistic updates
      if (prevProfile && prevProfile.id === followingId) {
        set({ viewingProfile: prevProfile });
      }
      set({ myFollowingCount: prevFollowingCount });
    } finally {
      set({ isFollowLoading: { ...get().isFollowLoading, [followingId]: false } });
    }
  },

  cancelRequest: async (requesterId, targetId) => {
    set({ isFollowLoading: { ...get().isFollowLoading, [targetId]: true } });

    // Optimistic update
    const prevProfile = get().viewingProfile;
    if (prevProfile && prevProfile.id === targetId) {
      set({
        viewingProfile: {
          ...prevProfile,
          relationship: {
            ...prevProfile.relationship,
            i_requested: false,
          },
        },
      });
    }

    try {
      const { error } = await supabase.rpc('cancel_follow_request', {
        p_requester_id: requesterId,
        p_target_id: targetId,
      });

      if (error) {
        console.error('cancelRequest error:', error);
        // Revert
        if (prevProfile && prevProfile.id === targetId) {
          set({ viewingProfile: prevProfile });
        }
      }
    } catch (e) {
      console.error('cancelRequest error:', e);
      if (prevProfile && prevProfile.id === targetId) {
        set({ viewingProfile: prevProfile });
      }
    } finally {
      set({ isFollowLoading: { ...get().isFollowLoading, [targetId]: false } });
    }
  },

  acceptRequest: async (targetId, requesterId) => {
    try {
      const { data, error } = await supabase.rpc('accept_follow_request', {
        p_target_id: targetId,
        p_requester_id: requesterId,
      });

      if (error) {
        console.error('acceptRequest error:', error);
        return false;
      }

      // Remove from followRequests list
      const current = get().followRequests;
      set({
        followRequests: current.filter((u) => u.id !== requesterId),
        followRequestsCount: Math.max(get().followRequestsCount - 1, 0),
      });

      // Update viewingProfile if viewing the requester's profile
      const profile = get().viewingProfile;
      if (profile && profile.id === requesterId) {
        const result = Array.isArray(data) ? data[0] : data;
        const isMutual = result?.is_mutual ?? false;
        set({
          viewingProfile: {
            ...profile,
            relationship: {
              ...profile.relationship,
              they_follow: true,
              they_requested: false,
              is_mutual: isMutual,
            },
          },
        });
      }

      // Increment own followers count
      set({ myFollowersCount: get().myFollowersCount + 1 });

      const result = Array.isArray(data) ? data[0] : data;
      return result?.is_mutual ?? false;
    } catch (e) {
      console.error('acceptRequest error:', e);
      return false;
    }
  },

  declineRequest: async (targetId, requesterId) => {
    try {
      const { error } = await supabase.rpc('decline_follow_request', {
        p_target_id: targetId,
        p_requester_id: requesterId,
      });

      if (error) {
        console.error('declineRequest error:', error);
        return;
      }

      // Remove from followRequests list
      const current = get().followRequests;
      set({
        followRequests: current.filter((u) => u.id !== requesterId),
        followRequestsCount: Math.max(get().followRequestsCount - 1, 0),
      });

      // Update viewingProfile if viewing the requester's profile
      const profile = get().viewingProfile;
      if (profile && profile.id === requesterId) {
        set({
          viewingProfile: {
            ...profile,
            relationship: {
              ...profile.relationship,
              they_requested: false,
            },
          },
        });
      }
    } catch (e) {
      console.error('declineRequest error:', e);
    }
  },

  fetchFollowRequests: async (userId) => {
    try {
      const { data, error } = await supabase.rpc('get_follow_requests', {
        p_user_id: userId,
      });

      if (error) {
        // Graceful fallback if RPC not deployed yet
        if (error.code === '42883') {
          console.warn('get_follow_requests RPC not deployed yet');
          return;
        }
        console.error('fetchFollowRequests error:', error);
        return;
      }

      const items: FollowRequestItem[] = (data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name ?? 'Usuário',
        avatar_url: r.avatar_url ?? null,
        bio: r.bio ?? null,
        followers_count: r.followers_count ?? 0,
        created_at: r.created_at ?? new Date().toISOString(),
      }));

      set({
        followRequests: items,
        followRequestsCount: items.length,
      });
    } catch (e) {
      console.error('fetchFollowRequests error:', e);
    }
  },

  fetchMutualFollows: async (viewerId, targetId) => {
    try {
      const { data, error } = await supabase.rpc('get_mutual_follows', {
        p_viewer_id: viewerId,
        p_target_id: targetId,
      });

      if (error) {
        if (error.code === '42883') {
          console.warn('get_mutual_follows RPC not deployed yet');
          return;
        }
        console.error('fetchMutualFollows error:', error);
        return;
      }

      const items = (data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name ?? 'Usuário',
        avatar_url: r.avatar_url ?? null,
      }));

      // Also get total count
      const { data: countData } = await supabase.rpc('count_mutual_follows', {
        p_viewer_id: viewerId,
        p_target_id: targetId,
      });

      const totalCount = typeof countData === 'number' ? countData : items.length;

      set({ mutualFollows: items, mutualFollowsCount: totalCount });
    } catch (e) {
      console.error('fetchMutualFollows error:', e);
    }
  },

  blockUser: async (blockerId, blockedId) => {
    try {
      const { error } = await supabase.rpc('block_user', {
        p_blocker_id: blockerId,
        p_blocked_id: blockedId,
      });

      if (error) {
        console.error('blockUser error:', error);
        return;
      }

      // Clear viewingProfile since user is now blocked
      set({ viewingProfile: null });
      // Refresh counts (block removes mutual follows)
      get().fetchMyCounts(blockerId);
    } catch (e) {
      console.error('blockUser error:', e);
    }
  },

  unblockUser: async (blockerId, blockedId) => {
    try {
      const { error } = await supabase.rpc('unblock_user', {
        p_blocker_id: blockerId,
        p_blocked_id: blockedId,
      });

      if (error) {
        console.error('unblockUser error:', error);
      }
      // Refresh counts
      get().fetchMyCounts(blockerId);
    } catch (e) {
      console.error('unblockUser error:', e);
    }
  },

  fetchFollowers: async (userId, viewerId, offset = 0) => {
    set({ isLoadingList: true });

    try {
      const { data, error } = await supabase.rpc('get_followers', {
        p_user_id: userId,
        p_viewer_id: viewerId,
        p_offset: offset,
      });

      if (error) {
        console.error('fetchFollowers error:', error);
        set({ isLoadingList: false });
        return;
      }

      const items: UserListItem[] = (data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name ?? 'Usuário',
        avatar_url: r.avatar_url ?? null,
        bio: r.bio ?? null,
        is_private: r.is_private ?? false,
        followers_count: r.followers_count ?? 0,
      }));

      // Append if paginating, replace if fresh load
      if (offset > 0) {
        set({ followers: [...get().followers, ...items], isLoadingList: false });
      } else {
        set({ followers: items, isLoadingList: false });
      }
    } catch (e) {
      console.error('fetchFollowers error:', e);
      set({ isLoadingList: false });
    }
  },

  fetchFollowing: async (userId, viewerId, offset = 0) => {
    set({ isLoadingList: true });

    try {
      const { data, error } = await supabase.rpc('get_following', {
        p_user_id: userId,
        p_viewer_id: viewerId,
        p_offset: offset,
      });

      if (error) {
        console.error('fetchFollowing error:', error);
        set({ isLoadingList: false });
        return;
      }

      const items: UserListItem[] = (data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name ?? 'Usuário',
        avatar_url: r.avatar_url ?? null,
        bio: r.bio ?? null,
        is_private: r.is_private ?? false,
        followers_count: r.followers_count ?? 0,
      }));

      if (offset > 0) {
        set({ following: [...get().following, ...items], isLoadingList: false });
      } else {
        set({ following: items, isLoadingList: false });
      }
    } catch (e) {
      console.error('fetchFollowing error:', e);
      set({ isLoadingList: false });
    }
  },

  fetchFriends: async (userId, viewerId) => {
    set({ isLoadingList: true });

    try {
      const { data, error } = await supabase.rpc('get_friends', {
        p_user_id: userId,
        p_viewer_id: viewerId,
      });

      if (error) {
        console.error('fetchFriends error:', error);
        set({ isLoadingList: false });
        return;
      }

      const items: UserListItem[] = (data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name ?? 'Usuário',
        avatar_url: r.avatar_url ?? null,
        bio: r.bio ?? null,
        is_private: r.is_private ?? false,
        followers_count: r.followers_count ?? 0,
      }));

      set({ friends: items, isLoadingList: false });
    } catch (e) {
      console.error('fetchFriends error:', e);
      set({ isLoadingList: false });
    }
  },

  fetchMyCounts: async (userId) => {
    try {
      // Fetch followers_count and following_count from profiles
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('followers_count, following_count')
        .eq('id', userId)
        .single();

      if (profileErr) {
        console.error('fetchMyCounts profile error:', profileErr);
        return;
      }

      const followersCount = profile?.followers_count ?? 0;
      const followingCount = profile?.following_count ?? 0;

      // Count mutual follows (friends) via RPC
      const { data: friendsData, error: friendsErr } = await supabase.rpc('count_friends', {
        p_user_id: userId,
      });

      let friendsCount = 0;
      if (friendsErr) {
        // Fallback: if RPC not deployed, estimate from profile data
        if (friendsErr.code === '42883') {
          console.warn('count_friends RPC not deployed yet');
        } else {
          console.error('fetchMyCounts friends error:', friendsErr);
        }
      } else {
        friendsCount = typeof friendsData === 'number' ? friendsData : (friendsData?.[0]?.count ?? 0);
      }

      set({
        myFollowersCount: followersCount,
        myFollowingCount: followingCount,
        myFriendsCount: friendsCount,
      });
    } catch (e) {
      console.error('fetchMyCounts error:', e);
    }
  },

  searchUsers: async (query, viewerId) => {
    if (!query || query.trim().length === 0) {
      set({ searchResults: [], isLoadingSearch: false });
      return;
    }

    set({ isLoadingSearch: true });

    try {
      const { data, error } = await supabase.rpc('search_users', {
        p_query: query.trim(),
        p_viewer_id: viewerId,
      });

      if (error) {
        console.error('searchUsers error:', error);
        set({ isLoadingSearch: false });
        return;
      }

      const items: UserListItem[] = (data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name ?? 'Usuário',
        avatar_url: r.avatar_url ?? null,
        bio: r.bio ?? null,
        is_private: r.is_private ?? false,
        followers_count: r.followers_count ?? 0,
      }));

      set({ searchResults: items, isLoadingSearch: false });
    } catch (e) {
      console.error('searchUsers error:', e);
      set({ isLoadingSearch: false });
    }
  },

  muteUser: async (muterId, mutedId) => {
    try {
      const { error } = await supabase.rpc('mute_user', {
        p_muter_id: muterId,
        p_muted_id: mutedId,
      });
      if (error) {
        console.error('muteUser error:', error);
        return;
      }
      set({ isMuted: true });
    } catch (e) {
      console.error('muteUser error:', e);
    }
  },

  unmuteUser: async (muterId, mutedId) => {
    try {
      const { error } = await supabase.rpc('unmute_user', {
        p_muter_id: muterId,
        p_muted_id: mutedId,
      });
      if (error) {
        console.error('unmuteUser error:', error);
        return;
      }
      set({ isMuted: false });
    } catch (e) {
      console.error('unmuteUser error:', e);
    }
  },

  checkMuted: async (muterId, mutedId) => {
    try {
      const { data, error } = await supabase.rpc('is_user_muted', {
        p_muter_id: muterId,
        p_muted_id: mutedId,
      });
      if (error) {
        if (error.code === '42883') {
          console.warn('is_user_muted RPC not deployed yet');
          return;
        }
        console.error('checkMuted error:', error);
        return;
      }
      set({ isMuted: !!data });
    } catch (e) {
      console.error('checkMuted error:', e);
    }
  },

  removeFollower: async (userId, followerId) => {
    try {
      const { error } = await supabase.rpc('remove_follower', {
        p_user_id: userId,
        p_follower_id: followerId,
      });
      if (error) {
        console.error('removeFollower error:', error);
        return;
      }
      // Update followers list if loaded
      set((state) => ({
        followers: state.followers.filter((f) => f.id !== followerId),
        myFollowersCount: Math.max(state.myFollowersCount - 1, 0),
      }));
    } catch (e) {
      console.error('removeFollower error:', e);
    }
  },

  clearProfile: () => {
    set({ viewingProfile: null, isMuted: false });
  },
}));
