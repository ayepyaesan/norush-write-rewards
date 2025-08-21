export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_progress: {
        Row: {
          created_at: string
          date: string
          goal_words: number
          id: string
          refund_earned_mmk: number | null
          status: string
          task_id: string
          updated_at: string
          user_id: string
          words_written: number | null
        }
        Insert: {
          created_at?: string
          date?: string
          goal_words: number
          id?: string
          refund_earned_mmk?: number | null
          status?: string
          task_id: string
          updated_at?: string
          user_id: string
          words_written?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          goal_words?: number
          id?: string
          refund_earned_mmk?: number | null
          status?: string
          task_id?: string
          updated_at?: string
          user_id?: string
          words_written?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_progress_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          merchant_phone: string
          payment_code: string | null
          payment_status: string
          reviewed_at: string | null
          screenshot_url: string | null
          task_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          merchant_phone?: string
          payment_code?: string | null
          payment_status?: string
          reviewed_at?: string | null
          screenshot_url?: string | null
          task_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          merchant_phone?: string
          payment_code?: string | null
          payment_status?: string
          reviewed_at?: string | null
          screenshot_url?: string | null
          task_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          has_access: boolean | null
          id: string
          kpay_name: string | null
          kpay_phone: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          has_access?: boolean | null
          id?: string
          kpay_name?: string | null
          kpay_phone?: string | null
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          has_access?: boolean | null
          id?: string
          kpay_name?: string | null
          kpay_phone?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          refund_amount_mmk: number
          refund_date: string
          status: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          refund_amount_mmk: number
          refund_date?: string
          status?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          refund_amount_mmk?: number
          refund_date?: string
          status?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_requests: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          kpay_name: string | null
          kpay_phone: string | null
          password: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          kpay_name?: string | null
          kpay_phone?: string | null
          password: string
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          kpay_name?: string | null
          kpay_phone?: string | null
          password?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          base_rate_per_word: number | null
          created_at: string
          deadline: string | null
          deposit_amount: number
          duration_days: number
          id: string
          refund_earned_mmk: number | null
          status: string
          task_name: string
          updated_at: string
          user_id: string | null
          word_count: number
        }
        Insert: {
          base_rate_per_word?: number | null
          created_at?: string
          deadline?: string | null
          deposit_amount: number
          duration_days: number
          id?: string
          refund_earned_mmk?: number | null
          status?: string
          task_name: string
          updated_at?: string
          user_id?: string | null
          word_count: number
        }
        Update: {
          base_rate_per_word?: number | null
          created_at?: string
          deadline?: string | null
          deposit_amount?: number
          duration_days?: number
          id?: string
          refund_earned_mmk?: number | null
          status?: string
          task_name?: string
          updated_at?: string
          user_id?: string | null
          word_count?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_daily_progress_entries: {
        Args: {
          p_duration_days: number
          p_start_date?: string
          p_task_id: string
          p_user_id: string
          p_word_count: number
        }
        Returns: undefined
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
