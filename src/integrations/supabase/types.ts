export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      bookings: {
        Row: {
          booking_date: string;
          club_id: string;
          code: string;
          created_at: string;
          hours: number;
          id: string;
          player_name: string;
          player_phone: string;
          seat: number | null;
          start_time: string;
          status: string;
          updated_at: string;
          user_id: string;
          zone: string;
        };
        Insert: {
          booking_date: string;
          club_id: string;
          code: string;
          created_at?: string;
          hours?: number;
          id?: string;
          player_name?: string;
          player_phone?: string;
          seat?: number | null;
          start_time: string;
          status?: string;
          updated_at?: string;
          user_id: string;
          zone?: string;
        };
        Update: {
          booking_date?: string;
          club_id?: string;
          code?: string;
          created_at?: string;
          hours?: number;
          id?: string;
          player_name?: string;
          player_phone?: string;
          seat?: number | null;
          start_time?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
          zone?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
        ];
      };
      club_staff: {
        Row: {
          club_id: string;
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          club_id: string;
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          club_id?: string;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "club_staff_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
        ];
      };
      clubs: {
        Row: {
          address: string;
          applied_at: string;
          city: string;
          cover: string;
          created_at: string;
          description: string;
          id: string;
          lat: number;
          lng: number;
          name: string;
          open_from: string;
          open_to: string;
          owner_id: string | null;
          phone: string;
          price_per_hour: number;
          rating: number;
          rejection_reason: string | null;
          reviews_count: number;
          specs: string;
          status: string;
          total_seats: number;
          vip_price_per_hour: number;
          vip_seats: number;
        };
        Insert: {
          address?: string;
          applied_at?: string;
          city?: string;
          cover?: string;
          created_at?: string;
          description?: string;
          id?: string;
          lat?: number;
          lng?: number;
          name: string;
          open_from?: string;
          open_to?: string;
          owner_id?: string | null;
          phone?: string;
          price_per_hour?: number;
          rating?: number;
          rejection_reason?: string | null;
          reviews_count?: number;
          specs?: string;
          status?: string;
          total_seats?: number;
          vip_price_per_hour?: number;
          vip_seats?: number;
        };
        Update: {
          address?: string;
          applied_at?: string;
          city?: string;
          cover?: string;
          created_at?: string;
          description?: string;
          id?: string;
          lat?: number;
          lng?: number;
          name?: string;
          open_from?: string;
          open_to?: string;
          owner_id?: string | null;
          phone?: string;
          price_per_hour?: number;
          rating?: number;
          rejection_reason?: string | null;
          reviews_count?: number;
          specs?: string;
          status?: string;
          total_seats?: number;
          vip_price_per_hour?: number;
          vip_seats?: number;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          author_name: string;
          club_id: string;
          created_at: string;
          id: string;
          read_at: string | null;
          sender: string;
          text: string;
          user_id: string;
        };
        Insert: {
          author_name?: string;
          club_id: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          sender: string;
          text: string;
          user_id: string;
        };
        Update: {
          author_name?: string;
          club_id?: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          sender?: string;
          text?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      club_products: {
        Row: {
          category: string;
          club_id: string;
          created_at: string;
          description: string;
          id: string;
          image_url: string;
          is_active: boolean;
          name: string;
          old_price_kzt: number | null;
          price_kzt: number;
          size_label: string;
          sort_order: number;
        };
        Insert: {
          category?: string;
          club_id: string;
          created_at?: string;
          description?: string;
          id?: string;
          image_url?: string;
          is_active?: boolean;
          name: string;
          old_price_kzt?: number | null;
          price_kzt?: number;
          size_label?: string;
          sort_order?: number;
        };
        Update: {
          category?: string;
          club_id?: string;
          created_at?: string;
          description?: string;
          id?: string;
          image_url?: string;
          is_active?: boolean;
          name?: string;
          old_price_kzt?: number | null;
          price_kzt?: number;
          size_label?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          booking_id: string | null;
          club_id: string;
          code: string;
          comment: string;
          created_at: string;
          id: string;
          items: Json;
          player_name: string;
          seat: number | null;
          status: string;
          total_kzt: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          booking_id?: string | null;
          club_id: string;
          code: string;
          comment?: string;
          created_at?: string;
          id?: string;
          items?: Json;
          player_name?: string;
          seat?: number | null;
          status?: string;
          total_kzt?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          booking_id?: string | null;
          club_id?: string;
          code?: string;
          comment?: string;
          created_at?: string;
          id?: string;
          items?: Json;
          player_name?: string;
          seat?: number | null;
          status?: string;
          total_kzt?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount_kzt: number;
          created_at: string;
          id: string;
          kind: string;
          label: string;
          method: string;
          plan_id: string | null;
          receipt_number: string;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string;
          user_id: string;
        };
        Insert: {
          amount_kzt?: number;
          created_at?: string;
          id?: string;
          kind?: string;
          label?: string;
          method?: string;
          plan_id?: string | null;
          receipt_number?: string;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          user_id: string;
        };
        Update: {
          amount_kzt?: number;
          created_at?: string;
          id?: string;
          kind?: string;
          label?: string;
          method?: string;
          plan_id?: string | null;
          receipt_number?: string;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      player_subscriptions: {
        Row: {
          created_at: string;
          hours_left: number | null;
          hours_total: number | null;
          id: string;
          plan_id: string;
          started_at: string;
          status: string;
          updated_at: string;
          user_id: string;
          valid_until: string;
        };
        Insert: {
          created_at?: string;
          hours_left?: number | null;
          hours_total?: number | null;
          id?: string;
          plan_id: string;
          started_at?: string;
          status?: string;
          updated_at?: string;
          user_id: string;
          valid_until: string;
        };
        Update: {
          created_at?: string;
          hours_left?: number | null;
          hours_total?: number | null;
          id?: string;
          plan_id?: string;
          started_at?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
          valid_until?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          city: string;
          club_id: string | null;
          created_at: string;
          email: string;
          id: string;
          name: string;
          phone: string;
        };
        Insert: {
          city?: string;
          club_id?: string | null;
          created_at?: string;
          email?: string;
          id: string;
          name?: string;
          phone?: string;
        };
        Update: {
          city?: string;
          club_id?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          name?: string;
          phone?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          author_name: string;
          club_id: string;
          created_at: string;
          id: string;
          rating: number;
          text: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          author_name?: string;
          club_id: string;
          created_at?: string;
          id?: string;
          rating: number;
          text?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          author_name?: string;
          club_id?: string;
          created_at?: string;
          id?: string;
          rating?: number;
          text?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_club_member: {
        Args: { _club_id: string; _user_id: string };
        Returns: boolean;
      };
      occupied_seats: {
        Args: { _club_id: string; _date: string; _hours: number; _start: string };
        Returns: number[];
      };
      resubmit_club: { Args: { _club_id: string }; Returns: boolean };
    };
    Enums: {
      app_role: "player" | "club_admin" | "owner" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["player", "club_admin", "owner", "admin"],
    },
  },
} as const;
