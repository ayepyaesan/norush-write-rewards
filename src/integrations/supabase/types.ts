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
      admin_activity_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
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
      daily_evaluations: {
        Row: {
          ai_reasoning: string | null
          ai_verdict: string
          content_analyzed: string
          created_at: string
          evaluation_date: string
          flagged_issues: Json | null
          id: string
          milestone_id: string
          quality_checks: Json | null
          rule_violations: Json | null
          task_id: string
          updated_at: string
          user_id: string
          word_count_actual: number
          word_count_target: number
        }
        Insert: {
          ai_reasoning?: string | null
          ai_verdict: string
          content_analyzed: string
          created_at?: string
          evaluation_date?: string
          flagged_issues?: Json | null
          id?: string
          milestone_id: string
          quality_checks?: Json | null
          rule_violations?: Json | null
          task_id: string
          updated_at?: string
          user_id: string
          word_count_actual: number
          word_count_target: number
        }
        Update: {
          ai_reasoning?: string | null
          ai_verdict?: string
          content_analyzed?: string
          created_at?: string
          evaluation_date?: string
          flagged_issues?: Json | null
          id?: string
          milestone_id?: string
          quality_checks?: Json | null
          rule_violations?: Json | null
          task_id?: string
          updated_at?: string
          user_id?: string
          word_count_actual?: number
          word_count_target?: number
        }
        Relationships: []
      }
      daily_milestones: {
        Row: {
          ai_feedback: string | null
          content_quality_score: number | null
          content_validated: boolean | null
          created_at: string | null
          day_number: number
          evaluated_at: string | null
          evaluation_status: string | null
          flagged_for_review: boolean | null
          id: string
          next_day_target: number | null
          paste_attempts: number | null
          refund_amount: number | null
          refund_status: string | null
          required_words: number
          rule_compliance: Json | null
          status: string | null
          target_date: string
          task_id: string
          updated_at: string | null
          user_id: string
          validation_notes: string | null
          words_carried_forward: number | null
          words_deficit: number | null
          words_written: number | null
        }
        Insert: {
          ai_feedback?: string | null
          content_quality_score?: number | null
          content_validated?: boolean | null
          created_at?: string | null
          day_number: number
          evaluated_at?: string | null
          evaluation_status?: string | null
          flagged_for_review?: boolean | null
          id?: string
          next_day_target?: number | null
          paste_attempts?: number | null
          refund_amount?: number | null
          refund_status?: string | null
          required_words: number
          rule_compliance?: Json | null
          status?: string | null
          target_date: string
          task_id: string
          updated_at?: string | null
          user_id: string
          validation_notes?: string | null
          words_carried_forward?: number | null
          words_deficit?: number | null
          words_written?: number | null
        }
        Update: {
          ai_feedback?: string | null
          content_quality_score?: number | null
          content_validated?: boolean | null
          created_at?: string | null
          day_number?: number
          evaluated_at?: string | null
          evaluation_status?: string | null
          flagged_for_review?: boolean | null
          id?: string
          next_day_target?: number | null
          paste_attempts?: number | null
          refund_amount?: number | null
          refund_status?: string | null
          required_words?: number
          rule_compliance?: Json | null
          status?: string | null
          target_date?: string
          task_id?: string
          updated_at?: string | null
          user_id?: string
          validation_notes?: string | null
          words_carried_forward?: number | null
          words_deficit?: number | null
          words_written?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_milestones_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
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
      deposits: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string | null
          id: string
          payment_method: string | null
          payment_status: string | null
          screenshot_url: string | null
          task_id: string
          updated_at: string | null
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string | null
          id?: string
          payment_method?: string | null
          payment_status?: string | null
          screenshot_url?: string | null
          task_id: string
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string | null
          id?: string
          payment_method?: string | null
          payment_status?: string | null
          screenshot_url?: string | null
          task_id?: string
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deposits_task_id_fkey"
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
          status: string
          total_refund_earned: number | null
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
          status?: string
          total_refund_earned?: number | null
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
          status?: string
          total_refund_earned?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      refund_history: {
        Row: {
          created_at: string
          day_number: number
          id: string
          processed_at: string
          processed_by: string | null
          refund_amount: number
          refund_request_id: string
          status: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_number: number
          id?: string
          processed_at?: string
          processed_by?: string | null
          refund_amount: number
          refund_request_id: string
          status?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_number?: number
          id?: string
          processed_at?: string
          processed_by?: string | null
          refund_amount?: number
          refund_request_id?: string
          status?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_refund_history_refund_request"
            columns: ["refund_request_id"]
            isOneToOne: false
            referencedRelation: "refund_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_refund_history_task"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          milestone_id: string
          processed_at: string | null
          processed_by: string | null
          status: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          milestone_id: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          milestone_id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      task_files: {
        Row: {
          content: string | null
          created_at: string | null
          day_number: number
          id: string
          task_id: string
          title: string
          updated_at: string | null
          user_id: string
          word_count: number | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          day_number?: number
          id?: string
          task_id: string
          title?: string
          updated_at?: string | null
          user_id: string
          word_count?: number | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          day_number?: number
          id?: string
          task_id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
          word_count?: number | null
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
      calculate_next_day_target: {
        Args: {
          p_current_day: number
          p_daily_target: number
          p_task_id: string
          p_words_written: number
        }
        Returns: number
      }
      complete_refund: {
        Args: { p_admin_user_id: string; p_refund_request_id: string }
        Returns: undefined
      }
      generate_daily_milestones: {
        Args: {
          p_duration_days: number
          p_start_date?: string
          p_task_id: string
          p_user_id: string
          p_word_count: number
        }
        Returns: undefined
      }
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
