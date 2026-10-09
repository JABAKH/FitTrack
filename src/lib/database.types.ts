export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      activities: {
        Row: {
          calories: number | null;
          day: string;
          distance_m: number;
          duration_seconds: number;
          ended_at: string;
          id: string;
          kind: string;
          route: Json;
          started_at: string;
          step_source: string | null;
          steps: number | null;
          user_id: string;
        };
        Insert: {
          calories?: number | null;
          day: string;
          distance_m: number;
          duration_seconds: number;
          ended_at: string;
          id: string;
          kind: string;
          route?: Json;
          started_at: string;
          step_source?: string | null;
          steps?: number | null;
          user_id: string;
        };
        Update: {
          calories?: number | null;
          day?: string;
          distance_m?: number;
          duration_seconds?: number;
          ended_at?: string;
          id?: string;
          kind?: string;
          route?: Json;
          started_at?: string;
          step_source?: string | null;
          steps?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      conversations: {
        Row: {
          created_at: string;
          id: string;
          trainer_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          trainer_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          trainer_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_trainer_id_fkey";
            columns: ["trainer_id"];
            isOneToOne: false;
            referencedRelation: "trainers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      daily_steps: {
        Row: {
          day: string;
          source: string;
          steps: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          day: string;
          source: string;
          steps: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          day?: string;
          source?: string;
          steps?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_steps_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      fitness_goals: {
        Row: {
          daily_steps: number;
          target_weight_kg: number | null;
          user_id: string;
          weekly_activity_minutes: number;
        };
        Insert: {
          daily_steps?: number;
          target_weight_kg?: number | null;
          user_id: string;
          weekly_activity_minutes?: number;
        };
        Update: {
          daily_steps?: number;
          target_weight_kg?: number | null;
          user_id?: string;
          weekly_activity_minutes?: number;
        };
        Relationships: [
          {
            foreignKeyName: "fitness_goals_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      food_logs: {
        Row: {
          calories: number;
          carbs_g: number;
          created_at: string;
          day: string;
          fat_g: number;
          id: string;
          name: string;
          protein_g: number;
          user_id: string;
        };
        Insert: {
          calories: number;
          carbs_g?: number;
          created_at?: string;
          day: string;
          fat_g?: number;
          id?: string;
          name: string;
          protein_g?: number;
          user_id: string;
        };
        Update: {
          calories?: number;
          carbs_g?: number;
          created_at?: string;
          day?: string;
          fat_g?: number;
          id?: string;
          name?: string;
          protein_g?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "food_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          conversation_id: string;
          created_at: string;
          id: string;
          sender_id: string;
        };
        Insert: {
          body: string;
          conversation_id: string;
          created_at?: string;
          id: string;
          sender_id: string;
        };
        Update: {
          body?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      notification_preferences: {
        Row: {
          activity: boolean;
          expo_push_token: string | null;
          messages: boolean;
          renewals: boolean;
          steps: boolean;
          user_id: string;
          weight: boolean;
        };
        Insert: {
          activity?: boolean;
          expo_push_token?: string | null;
          messages?: boolean;
          renewals?: boolean;
          steps?: boolean;
          user_id: string;
          weight?: boolean;
        };
        Update: {
          activity?: boolean;
          expo_push_token?: string | null;
          messages?: boolean;
          renewals?: boolean;
          steps?: boolean;
          user_id?: string;
          weight?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      nutrition_goals: {
        Row: {
          calories: number;
          carbs_g: number;
          fat_g: number;
          protein_g: number;
          user_id: string;
        };
        Insert: {
          calories?: number;
          carbs_g?: number;
          fat_g?: number;
          protein_g?: number;
          user_id: string;
        };
        Update: {
          calories?: number;
          carbs_g?: number;
          fat_g?: number;
          protein_g?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "nutrition_goals_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      payments: {
        Row: {
          amount_centavos: number;
          currency: string;
          id: string;
          paid_at: string;
          status: string;
          stripe_invoice_id: string;
          user_id: string | null;
        };
        Insert: {
          amount_centavos: number;
          currency: string;
          id?: string;
          paid_at?: string;
          status: string;
          stripe_invoice_id: string;
          user_id?: string | null;
        };
        Update: {
          amount_centavos?: number;
          currency?: string;
          id?: string;
          paid_at?: string;
          status?: string;
          stripe_invoice_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          birth_date: string | null;
          created_at: string;
          full_name: string;
          height_cm: number | null;
          sex: string | null;
          theme: string;
          units: string;
          user_id: string;
          weight_kg: number | null;
        };
        Insert: {
          avatar_path?: string | null;
          birth_date?: string | null;
          created_at?: string;
          full_name?: string;
          height_cm?: number | null;
          sex?: string | null;
          theme?: string;
          units?: string;
          user_id: string;
          weight_kg?: number | null;
        };
        Update: {
          avatar_path?: string | null;
          birth_date?: string | null;
          created_at?: string;
          full_name?: string;
          height_cm?: number | null;
          sex?: string | null;
          theme?: string;
          units?: string;
          user_id?: string;
          weight_kg?: number | null;
        };
        Relationships: [];
      };
      trainer_changes: {
        Row: {
          changed_at: string;
          id: string;
          month: string;
          previous_trainer_id: string;
          subscription_id: string;
          trainer_id: string;
          user_id: string;
        };
        Insert: {
          changed_at?: string;
          id?: string;
          month: string;
          previous_trainer_id: string;
          subscription_id: string;
          trainer_id: string;
          user_id: string;
        };
        Update: {
          changed_at?: string;
          id?: string;
          month?: string;
          previous_trainer_id?: string;
          subscription_id?: string;
          trainer_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trainer_changes_previous_trainer_id_fkey";
            columns: ["previous_trainer_id"];
            isOneToOne: false;
            referencedRelation: "trainers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trainer_changes_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "trainer_subscriptions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trainer_changes_trainer_id_fkey";
            columns: ["trainer_id"];
            isOneToOne: false;
            referencedRelation: "trainers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trainer_changes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      trainer_subscriptions: {
        Row: {
          billing_attempt: string | null;
          cancel_at_period_end: boolean;
          checkout_session_id: string | null;
          created_at: string;
          current_period_end: string | null;
          id: string;
          status: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          trainer_id: string;
          user_id: string;
        };
        Insert: {
          billing_attempt?: string | null;
          cancel_at_period_end?: boolean;
          checkout_session_id?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          status: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          trainer_id: string;
          user_id: string;
        };
        Update: {
          billing_attempt?: string | null;
          cancel_at_period_end?: boolean;
          checkout_session_id?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          trainer_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trainer_subscriptions_trainer_id_fkey";
            columns: ["trainer_id"];
            isOneToOne: false;
            referencedRelation: "trainers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trainer_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      trainers: {
        Row: {
          active: boolean;
          avatar_path: string | null;
          avatar_url: string | null;
          bio: string;
          experience_years: number;
          id: string;
          is_preview: boolean;
          name: string;
          photo_credit: string | null;
          rating: number | null;
          sex: string;
          specialty: string;
          user_id: string | null;
        };
        Insert: {
          active?: boolean;
          avatar_path?: string | null;
          avatar_url?: string | null;
          bio?: string;
          experience_years: number;
          id?: string;
          is_preview?: boolean;
          name: string;
          photo_credit?: string | null;
          rating?: number | null;
          sex: string;
          specialty: string;
          user_id?: string | null;
        };
        Update: {
          active?: boolean;
          avatar_path?: string | null;
          avatar_url?: string | null;
          bio?: string;
          experience_years?: number;
          id?: string;
          is_preview?: boolean;
          name?: string;
          photo_credit?: string | null;
          rating?: number | null;
          sex?: string;
          specialty?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "trainers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      weight_history: {
        Row: {
          day: string;
          id: string;
          user_id: string;
          weight_kg: number;
        };
        Insert: {
          day: string;
          id?: string;
          user_id: string;
          weight_kg: number;
        };
        Update: {
          day?: string;
          id?: string;
          user_id?: string;
          weight_kg?: number;
        };
        Relationships: [
          {
            foreignKeyName: "weight_history_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      acquire_billing_lock: { Args: { p_user: string }; Returns: boolean };
      change_trainer: {
        Args: { p_trainer: string; p_user: string };
        Returns: string;
      };
      record_activity: { Args: { p_activity: Json }; Returns: undefined };
      record_steps: {
        Args: { p_day: string; p_source: string; p_steps: number };
        Returns: undefined;
      };
      release_billing_lock: { Args: { p_user: string }; Returns: undefined };
      session_is_active: {
        Args: { p_session: string; p_user: string };
        Returns: boolean;
      };
      sync_billing: {
        Args: {
          p_attempt: string;
          p_event: string;
          p_payment?: Json;
          p_subscription: Json;
          p_user: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
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
    Enums: {},
  },
} as const;
