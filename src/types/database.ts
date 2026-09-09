// Generated from the live schema (Supabase MCP `generate_typescript_types`).
// Regenerate after any migration. The helper types at the bottom are ours: the
// generated multi-schema versions are unnecessary here, we only use `public`.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.5' };
  public: {
    Tables: {
      admins: {
        Row: { user_id: string };
        Insert: { user_id: string };
        Update: { user_id?: string };
        Relationships: [
          {
            foreignKeyName: 'admins_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      app_config: {
        Row: { key: string; value: string };
        Insert: { key: string; value: string };
        Update: { key?: string; value?: string };
        Relationships: [
        ];
      };
      challenge_members: {
        Row: { challenge_id: string; completed_at: string | null; joined_at: string; user_id: string };
        Insert: { challenge_id: string; completed_at?: string | null; joined_at?: string; user_id: string };
        Update: { challenge_id?: string; completed_at?: string | null; joined_at?: string; user_id?: string };
        Relationships: [
          {
            foreignKeyName: 'challenge_members_challenge_id_fkey';
            columns: ['challenge_id'];
            isOneToOne: false;
            referencedRelation: 'challenges';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'challenge_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      challenge_pubs: {
        Row: { added_by: string | null; challenge_id: string; created_at: string; pub_id: string };
        Insert: { added_by?: string | null; challenge_id: string; created_at?: string; pub_id: string };
        Update: { added_by?: string | null; challenge_id?: string; created_at?: string; pub_id?: string };
        Relationships: [
          {
            foreignKeyName: 'challenge_pubs_added_by_fkey';
            columns: ['added_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'challenge_pubs_challenge_id_fkey';
            columns: ['challenge_id'];
            isOneToOne: false;
            referencedRelation: 'challenges';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'challenge_pubs_pub_id_fkey';
            columns: ['pub_id'];
            isOneToOne: false;
            referencedRelation: 'pubs';
            referencedColumns: ['id'];
          },
        ];
      };
      challenges: {
        Row: {
          color: string;
          created_at: string;
          creator_id: string | null;
          description: string | null;
          icon: string;
          id: string;
          title: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          creator_id?: string | null;
          description?: string | null;
          icon?: string;
          id?: string;
          title: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          creator_id?: string | null;
          description?: string | null;
          icon?: string;
          id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'challenges_creator_id_fkey';
            columns: ['creator_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      checkin_comments: {
        Row: { body: string; checkin_id: string; created_at: string; id: string; user_id: string };
        Insert: { body: string; checkin_id: string; created_at?: string; id?: string; user_id: string };
        Update: { body?: string; checkin_id?: string; created_at?: string; id?: string; user_id?: string };
        Relationships: [
          {
            foreignKeyName: 'checkin_comments_checkin_id_fkey';
            columns: ['checkin_id'];
            isOneToOne: false;
            referencedRelation: 'checkins';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checkin_comments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      checkin_guests: {
        Row: { checkin_id: string; created_at: string; id: string; invited_by: string; name: string };
        Insert: { checkin_id: string; created_at?: string; id?: string; invited_by: string; name: string };
        Update: { checkin_id?: string; created_at?: string; id?: string; invited_by?: string; name?: string };
        Relationships: [
          {
            foreignKeyName: 'checkin_guests_checkin_id_fkey';
            columns: ['checkin_id'];
            isOneToOne: false;
            referencedRelation: 'checkins';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checkin_guests_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      checkin_photos: {
        Row: {
          checkin_id: string;
          created_at: string;
          height: number | null;
          id: string;
          storage_path: string;
          width: number | null;
        };
        Insert: {
          checkin_id: string;
          created_at?: string;
          height?: number | null;
          id?: string;
          storage_path: string;
          width?: number | null;
        };
        Update: {
          checkin_id?: string;
          created_at?: string;
          height?: number | null;
          id?: string;
          storage_path?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'checkin_photos_checkin_id_fkey';
            columns: ['checkin_id'];
            isOneToOne: false;
            referencedRelation: 'checkins';
            referencedColumns: ['id'];
          },
        ];
      };
      checkin_tags: {
        Row: { checkin_id: string; created_at: string; user_id: string };
        Insert: { checkin_id: string; created_at?: string; user_id: string };
        Update: { checkin_id?: string; created_at?: string; user_id?: string };
        Relationships: [
          {
            foreignKeyName: 'checkin_tags_checkin_id_fkey';
            columns: ['checkin_id'];
            isOneToOne: false;
            referencedRelation: 'checkins';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checkin_tags_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      checkin_likes: {
        Row: { checkin_id: string; created_at: string; user_id: string };
        Insert: { checkin_id: string; created_at?: string; user_id: string };
        Update: { checkin_id?: string; created_at?: string; user_id?: string };
        Relationships: [
          { foreignKeyName: 'checkin_likes_checkin_id_fkey'; columns: ['checkin_id']; isOneToOne: false; referencedRelation: 'checkins'; referencedColumns: ['id'] },
          { foreignKeyName: 'checkin_likes_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ];
      };
      checkins: {
        Row: {
          client_id: string;
          created_at: string;
          distance_m: number | null;
          id: string;
          lat: number | null;
          lng: number | null;
          note: string | null;
          pub_id: string;
          rating: number | null;
          user_id: string;
          verified: boolean;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          distance_m?: number | null;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          note?: string | null;
          pub_id: string;
          rating?: number | null;
          user_id: string;
          verified?: boolean;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          distance_m?: number | null;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          note?: string | null;
          pub_id?: string;
          rating?: number | null;
          user_id?: string;
          verified?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'checkins_pub_id_fkey';
            columns: ['pub_id'];
            isOneToOne: false;
            referencedRelation: 'pubs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checkins_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      cheers: {
        Row: { checkin_id: string; created_at: string; id: string; photo_path: string; user_id: string };
        Insert: { checkin_id: string; created_at?: string; id?: string; photo_path: string; user_id: string };
        Update: { checkin_id?: string; created_at?: string; id?: string; photo_path?: string; user_id?: string };
        Relationships: [
          {
            foreignKeyName: 'cheers_checkin_id_fkey';
            columns: ['checkin_id'];
            isOneToOne: false;
            referencedRelation: 'checkins';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cheers_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      comment_likes: {
        Row: { comment_id: string; created_at: string; user_id: string };
        Insert: { comment_id: string; created_at?: string; user_id: string };
        Update: { comment_id?: string; created_at?: string; user_id?: string };
        Relationships: [
          { foreignKeyName: 'comment_likes_comment_id_fkey'; columns: ['comment_id']; isOneToOne: false; referencedRelation: 'checkin_comments'; referencedColumns: ['id'] },
          { foreignKeyName: 'comment_likes_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ];
      };
      friendships: {
        Row: {
          created_at: string;
          requested_by: string;
          responded_at: string | null;
          status: string;
          user_high: string;
          user_low: string;
        };
        Insert: {
          created_at?: string;
          requested_by: string;
          responded_at?: string | null;
          status?: string;
          user_high: string;
          user_low: string;
        };
        Update: {
          created_at?: string;
          requested_by?: string;
          responded_at?: string | null;
          status?: string;
          user_high?: string;
          user_low?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'friendships_requested_by_fkey';
            columns: ['requested_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'friendships_user_high_fkey';
            columns: ['user_high'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'friendships_user_low_fkey';
            columns: ['user_low'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      invite_codes: {
        Row: { code: string; created_at: string; user_id: string };
        Insert: { code: string; created_at?: string; user_id: string };
        Update: { code?: string; created_at?: string; user_id?: string };
        Relationships: [
          {
            foreignKeyName: 'invite_codes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      list_follows: {
        Row: { created_at: string; list_id: string; user_id: string };
        Insert: { created_at?: string; list_id: string; user_id: string };
        Update: { created_at?: string; list_id?: string; user_id?: string };
        Relationships: [
          { foreignKeyName: 'list_follows_list_id_fkey'; columns: ['list_id']; isOneToOne: false; referencedRelation: 'lists'; referencedColumns: ['id'] },
          { foreignKeyName: 'list_follows_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ];
      };
      list_pubs: {
        Row: { added_at: string; list_id: string; note: string | null; position: number; pub_id: string };
        Insert: { added_at?: string; list_id: string; note?: string | null; position?: number; pub_id: string };
        Update: { added_at?: string; list_id?: string; note?: string | null; position?: number; pub_id?: string };
        Relationships: [
          { foreignKeyName: 'list_pubs_list_id_fkey'; columns: ['list_id']; isOneToOne: false; referencedRelation: 'lists'; referencedColumns: ['id'] },
          { foreignKeyName: 'list_pubs_pub_id_fkey'; columns: ['pub_id']; isOneToOne: false; referencedRelation: 'pubs'; referencedColumns: ['id'] },
        ];
      };
      lists: {
        Row: { created_at: string; creator_id: string | null; description: string | null; id: string; title: string };
        Insert: { created_at?: string; creator_id?: string | null; description?: string | null; id?: string; title: string };
        Update: { created_at?: string; creator_id?: string | null; description?: string | null; id?: string; title?: string };
        Relationships: [
          { foreignKeyName: 'lists_creator_id_fkey'; columns: ['creator_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ];
      };
      notifications: {
        Row: { actor_id: string | null; body: string; checkin_id: string | null; created_at: string; id: string; kind: string; pub_id: string | null; read_at: string | null; title: string; user_id: string };
        Insert: { actor_id?: string | null; body: string; checkin_id?: string | null; created_at?: string; id?: string; kind: string; pub_id?: string | null; read_at?: string | null; title: string; user_id: string };
        Update: { actor_id?: string | null; body?: string; checkin_id?: string | null; created_at?: string; id?: string; kind?: string; pub_id?: string | null; read_at?: string | null; title?: string; user_id?: string };
        Relationships: [
          {
            foreignKeyName: 'notifications_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_checkin_id_fkey';
            columns: ['checkin_id'];
            isOneToOne: false;
            referencedRelation: 'checkins';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_pub_id_fkey';
            columns: ['pub_id'];
            isOneToOne: false;
            referencedRelation: 'pubs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string;
          home_city: string | null;
          id: string;
          username: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name: string;
          home_city?: string | null;
          id: string;
          username: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          home_city?: string | null;
          id?: string;
          username?: string;
        };
        Relationships: [];
      };
      pub_corrections: {
        Row: {
          created_at: string;
          detail: string | null;
          id: string;
          pub_id: string;
          status: string;
          type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          detail?: string | null;
          id?: string;
          pub_id: string;
          status?: string;
          type: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          detail?: string | null;
          id?: string;
          pub_id?: string;
          status?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pub_corrections_pub_id_fkey';
            columns: ['pub_id'];
            isOneToOne: false;
            referencedRelation: 'pubs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pub_corrections_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      pub_stats: {
        Row: {
          avg_rating: number | null;
          checkin_count: number;
          last_checkin_at: string | null;
          pub_id: string;
          rating_count: number;
          rating_sum: number;
          visitor_count: number;
        };
        Insert: {
          avg_rating?: number | null;
          checkin_count?: number;
          last_checkin_at?: string | null;
          pub_id: string;
          rating_count?: number;
          rating_sum?: number;
          visitor_count?: number;
        };
        Update: {
          avg_rating?: number | null;
          checkin_count?: number;
          last_checkin_at?: string | null;
          pub_id?: string;
          rating_count?: number;
          rating_sum?: number;
          visitor_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'pub_stats_pub_id_fkey';
            columns: ['pub_id'];
            isOneToOne: true;
            referencedRelation: 'pubs';
            referencedColumns: ['id'];
          },
        ];
      };
      pub_tag_stats: {
        Row: {
          down_votes: number;
          net_votes: number | null;
          pub_id: string;
          tag: string;
          up_votes: number;
        };
        Insert: {
          down_votes?: number;
          net_votes?: number | null;
          pub_id: string;
          tag: string;
          up_votes?: number;
        };
        Update: {
          down_votes?: number;
          net_votes?: number | null;
          pub_id?: string;
          tag?: string;
          up_votes?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'pub_tag_stats_pub_id_fkey';
            columns: ['pub_id'];
            isOneToOne: false;
            referencedRelation: 'pubs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pub_tag_stats_tag_fkey';
            columns: ['tag'];
            isOneToOne: false;
            referencedRelation: 'pub_tags';
            referencedColumns: ['slug'];
          },
        ];
      };
      pub_tag_votes: {
        Row: {
          created_at: string;
          pub_id: string;
          tag: string;
          updated_at: string;
          user_id: string;
          value: number;
        };
        Insert: {
          created_at?: string;
          pub_id: string;
          tag: string;
          updated_at?: string;
          user_id: string;
          value: number;
        };
        Update: {
          created_at?: string;
          pub_id?: string;
          tag?: string;
          updated_at?: string;
          user_id?: string;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'pub_tag_votes_pub_id_fkey';
            columns: ['pub_id'];
            isOneToOne: false;
            referencedRelation: 'pubs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pub_tag_votes_tag_fkey';
            columns: ['tag'];
            isOneToOne: false;
            referencedRelation: 'pub_tags';
            referencedColumns: ['slug'];
          },
          {
            foreignKeyName: 'pub_tag_votes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      pub_tags: {
        Row: { group: string; label: string; slug: string; sort_order: number };
        Insert: { group?: string; label: string; slug: string; sort_order?: number };
        Update: { group?: string; label?: string; slug?: string; sort_order?: number };
        Relationships: [];
      };
      pubs: {
        Row: {
          address: string | null;
          borough: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          lat: number;
          lng: number;
          location: unknown;
          name: string;
          osm_id: number | null;
          osm_type: string | null;
          status: string;
        };
        Insert: {
          address?: string | null;
          borough?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          lat: number;
          lng: number;
          location?: unknown;
          name: string;
          osm_id?: number | null;
          osm_type?: string | null;
          status?: string;
        };
        Update: {
          address?: string | null;
          borough?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          lat?: number;
          lng?: number;
          location?: unknown;
          name?: string;
          osm_id?: number | null;
          osm_type?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pubs_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pubs_osm_type_osm_id_fkey';
            columns: ['osm_type', 'osm_id'];
            isOneToOne: false;
            referencedRelation: 'pubs_osm';
            referencedColumns: ['osm_type', 'osm_id'];
          },
        ];
      };
      pubs_osm: {
        Row: {
          addr_city: string | null;
          addr_housenumber: string | null;
          addr_postcode: string | null;
          addr_street: string | null;
          imported_at: string;
          lat: number;
          lng: number;
          name: string | null;
          opening_hours: string | null;
          osm_id: number;
          osm_type: string;
          tags: Json;
          website: string | null;
        };
        Insert: {
          addr_city?: string | null;
          addr_housenumber?: string | null;
          addr_postcode?: string | null;
          addr_street?: string | null;
          imported_at?: string;
          lat: number;
          lng: number;
          name?: string | null;
          opening_hours?: string | null;
          osm_id: number;
          osm_type: string;
          tags?: Json;
          website?: string | null;
        };
        Update: {
          addr_city?: string | null;
          addr_housenumber?: string | null;
          addr_postcode?: string | null;
          addr_street?: string | null;
          imported_at?: string;
          lat?: number;
          lng?: number;
          name?: string | null;
          opening_hours?: string | null;
          osm_id?: number;
          osm_type?: string;
          tags?: Json;
          website?: string | null;
        };
        Relationships: [];
      };
      push_tokens: {
        Row: { platform: string; token: string; updated_at: string; user_id: string };
        Insert: { platform?: string; token: string; updated_at?: string; user_id: string };
        Update: { platform?: string; token?: string; updated_at?: string; user_id?: string };
        Relationships: [
          {
            foreignKeyName: 'push_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      reports: {
        Row: {
          created_at: string;
          id: string;
          reason: string;
          reporter_id: string;
          status: string;
          target_id: string;
          target_type: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          reason: string;
          reporter_id: string;
          status?: string;
          target_id: string;
          target_type: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          reason?: string;
          reporter_id?: string;
          status?: string;
          target_id?: string;
          target_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reports_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      accept_invite: {
        Args: { invite: string };
        Returns: {
          avatar_url: string | null;
          created_at: string;
          display_name: string;
          home_city: string | null;
          id: string;
          username: string;
        };
        SetofOptions: { from: '*'; to: 'profiles'; isOneToOne: true; isSetofReturn: false };
      };
      admin_stats: { Args: never; Returns: Json };
      are_friends: { Args: { a: string; b: string }; Returns: boolean };
      challenge_list: {
        Args: never;
        Returns: {
          color: string;
          completed_at: string;
          created_at: string;
          creator_id: string;
          creator_name: string;
          description: string;
          done_count: number;
          icon: string;
          id: string;
          joined: boolean;
          member_count: number;
          pub_count: number;
          title: string;
        }[];
      };
      challenge_pub_status: {
        Args: { challenge: string };
        Returns: {
          borough: string;
          done: boolean;
          friends_done: number;
          lat: number;
          lng: number;
          name: string;
          pub_id: string;
        }[];
      };
      delete_my_account: { Args: never; Returns: undefined };
      friends_leaderboard: {
        Args: never;
        Returns: {
          avatar_url: string;
          badge_count: number;
          borough_count: number;
          checkin_count: number;
          display_name: string;
          is_me: boolean;
          month_checkins: number;
          month_pubs: number;
          pub_count: number;
          user_id: string;
          username: string;
        }[];
      };
      generate_invite_code: { Args: never; Returns: string };
      list_index: {
        Args: never;
        Returns: {
          created_at: string;
          creator_id: string;
          creator_name: string;
          description: string;
          follower_count: number;
          following: boolean;
          id: string;
          pub_count: number;
          sample: string[];
          title: string;
        }[];
      };
      list_pub_status: {
        Args: { list: string };
        Returns: {
          avg_rating: number;
          borough: string;
          done: boolean;
          name: string;
          note: string;
          pub_id: string;
          sort_order: number;
        }[];
      };
      map_pubs: {
        Args: {
          max_lat: number;
          max_lng: number;
          max_rows?: number;
          min_lat: number;
          min_lng: number;
          only_active?: boolean;
        };
        Returns: {
          avg_rating: number;
          checkin_count: number;
          friend_avg_rating: number;
          friend_visits: number;
          id: string;
          lat: number;
          lng: number;
          my_rating: number;
          name: string;
          status: string;
          visited_by_me: boolean;
        }[];
      };
      my_month: {
        Args: never;
        Returns: {
          avg_rating: number;
          checkin_count: number;
          month_start: string;
          new_borough_count: number;
          new_pub_count: number;
          pub_count: number;
          top_pub_id: string;
          top_pub_name: string;
          top_pub_visits: number;
        }[];
      };
      my_week: {
        Args: never;
        Returns: {
          best_week: number;
          best_week_start: string;
          new_pubs: number;
          this_week: number;
          weeks_active: number;
        }[];
      };
      nearby_pubs: {
        Args: { in_lat: number; in_lng: number; max_rows?: number; radius_m?: number };
        Returns: {
          address: string;
          avg_rating: number;
          checkin_count: number;
          distance_m: number;
          friend_visits: number;
          id: string;
          lat: number;
          lng: number;
          name: string;
          status: string;
          visited_by_me: boolean;
        }[];
      };
      notify: {
        Args: { p_actor: string; p_body: string; p_checkin: string; p_kind: string; p_pub: string; p_title: string; p_user: string };
        Returns: undefined;
      };
      pub_lists: {
        Args: { pub: string };
        Returns: { creator_name: string; follower_count: number; id: string; note: string; title: string }[];
      };
      pub_rating_histogram: { Args: { pub: string }; Returns: { n: number; star: number }[] };
      refresh_challenge_completion: { Args: { p_challenge: string; p_user: string }; Returns: undefined };
      refresh_pub_stats: { Args: { p: string }; Returns: undefined };
      request_friendship: {
        Args: { target_username: string };
        Returns: {
          created_at: string;
          requested_by: string;
          responded_at: string | null;
          status: string;
          user_high: string;
          user_low: string;
        };
        SetofOptions: { from: '*'; to: 'friendships'; isOneToOne: true; isSetofReturn: false };
      };
      send_weekly_digests: { Args: never; Returns: number };
      user_badges: {
        Args: { target: string };
        Returns: {
          challenge_id: string;
          color: string;
          completed_at: string;
          icon: string;
          title: string;
        }[];
      };
      user_pub_map: {
        Args: { target: string };
        Returns: {
          borough: string;
          last_visit: string;
          lat: number;
          latest_rating: number;
          lng: number;
          name: string;
          pub_id: string;
          visits: number;
        }[];
      };
      user_stats: {
        Args: { target: string };
        Returns: {
          avg_rating: number;
          borough_count: number;
          checkin_count: number;
          pub_count: number;
          rated_count: number;
        }[];
      };
      weekly_summary: {
        Args: never;
        Returns: {
          busiest_checkins: number;
          busiest_display_name: string;
          busiest_user_id: string;
          checkin_count: number;
          new_pub_count: number;
          people_count: number;
          top_pub_id: string;
          top_pub_name: string;
          top_pub_rating: number;
          top_pub_visits: number;
        }[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database['public'];

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update'];
export type FnReturns<T extends keyof PublicSchema['Functions']> =
  PublicSchema['Functions'][T]['Returns'];
