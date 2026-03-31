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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      account_requests: {
        Row: {
          account_name: string | null
          balance_deducted: boolean | null
          created_at: string
          currency: string | null
          facebook_email: string | null
          id: string
          platform: string
          preferred_limit: string | null
          status: string
          timezone: string | null
          user_id: string
        }
        Insert: {
          account_name?: string | null
          balance_deducted?: boolean | null
          created_at?: string
          currency?: string | null
          facebook_email?: string | null
          id?: string
          platform?: string
          preferred_limit?: string | null
          status?: string
          timezone?: string | null
          user_id: string
        }
        Update: {
          account_name?: string | null
          balance_deducted?: boolean | null
          created_at?: string
          currency?: string | null
          facebook_email?: string | null
          id?: string
          platform?: string
          preferred_limit?: string | null
          status?: string
          timezone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_account_cache: {
        Row: {
          account_id: string
          amount_spent: number | null
          id: string
          last_fetched_at: string | null
          spend_cap: number | null
        }
        Insert: {
          account_id: string
          amount_spent?: number | null
          id?: string
          last_fetched_at?: string | null
          spend_cap?: number | null
        }
        Update: {
          account_id?: string
          amount_spent?: number | null
          id?: string
          last_fetched_at?: string | null
          spend_cap?: number | null
        }
        Relationships: []
      }
      ad_account_transactions: {
        Row: {
          ad_account_id: string
          amount: number | null
          created_at: string
          id: string
          new_amount_spent: number | null
          new_spend_limit: number | null
          old_amount_spent: number | null
          old_spend_limit: number | null
          type: string
          user_id: string | null
        }
        Insert: {
          ad_account_id: string
          amount?: number | null
          created_at?: string
          id?: string
          new_amount_spent?: number | null
          new_spend_limit?: number | null
          old_amount_spent?: number | null
          old_spend_limit?: number | null
          type: string
          user_id?: string | null
        }
        Update: {
          ad_account_id?: string
          amount?: number | null
          created_at?: string
          id?: string
          new_amount_spent?: number | null
          new_spend_limit?: number | null
          old_amount_spent?: number | null
          old_spend_limit?: number | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_account_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_accounts: {
        Row: {
          account_id: string
          account_name: string
          amount_spent: number
          assigned_at: string | null
          created_at: string
          currency: string
          current_spend: number
          disabled_reason: string | null
          display_name: string | null
          facebook_email: string | null
          id: string
          is_disabled: boolean | null
          platform: string
          spend_limit: number
          status: string
          timezone: string
          user_account_name: string | null
          user_id: string | null
        }
        Insert: {
          account_id: string
          account_name: string
          amount_spent?: number
          assigned_at?: string | null
          created_at?: string
          currency?: string
          current_spend?: number
          disabled_reason?: string | null
          display_name?: string | null
          facebook_email?: string | null
          id?: string
          is_disabled?: boolean | null
          platform?: string
          spend_limit?: number
          status?: string
          timezone?: string
          user_account_name?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string
          account_name?: string
          amount_spent?: number
          assigned_at?: string | null
          created_at?: string
          currency?: string
          current_spend?: number
          disabled_reason?: string | null
          display_name?: string | null
          facebook_email?: string | null
          id?: string
          is_disabled?: boolean | null
          platform?: string
          spend_limit?: number
          status?: string
          timezone?: string
          user_account_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_custom_metrics: {
        Row: {
          alert_enabled: boolean | null
          alert_type: string | null
          created_at: string | null
          formula: string
          id: string
          name: string
          threshold: number | null
        }
        Insert: {
          alert_enabled?: boolean | null
          alert_type?: string | null
          created_at?: string | null
          formula: string
          id?: string
          name: string
          threshold?: number | null
        }
        Update: {
          alert_enabled?: boolean | null
          alert_type?: string | null
          created_at?: string | null
          formula?: string
          id?: string
          name?: string
          threshold?: number | null
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          daily_report_settings: Json | null
          id: string
          notification_settings: Json | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          daily_report_settings?: Json | null
          id?: string
          notification_settings?: Json | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          daily_report_settings?: Json | null
          id?: string
          notification_settings?: Json | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      commission_settings: {
        Row: {
          id: string
          rate: number
          updated_at: string
        }
        Insert: {
          id?: string
          rate?: number
          updated_at?: string
        }
        Update: {
          id?: string
          rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          invoice_number: string
          pdf_url: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          invoice_number: string
          pdf_url?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_number?: string
          pdf_url?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string | null
          recipient_type: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          recipient_type?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          recipient_type?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          daily_report_settings: Json | null
          disabled_reason: string | null
          email: string | null
          full_name: string | null
          id: string
          is_disabled: boolean | null
          notification_settings: Json | null
          timezone: string | null
          wallet_balance: number
        }
        Insert: {
          created_at?: string
          daily_report_settings?: Json | null
          disabled_reason?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_disabled?: boolean | null
          notification_settings?: Json | null
          timezone?: string | null
          wallet_balance?: number
        }
        Update: {
          created_at?: string
          daily_report_settings?: Json | null
          disabled_reason?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_disabled?: boolean | null
          notification_settings?: Json | null
          timezone?: string | null
          wallet_balance?: number
        }
        Relationships: []
      }
      spend_history: {
        Row: {
          amount_spent: number | null
          commission_earned: number | null
          created_at: string
          id: string
          period_end: string | null
          period_start: string | null
          user_id: string | null
        }
        Insert: {
          amount_spent?: number | null
          commission_earned?: number | null
          created_at?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          user_id?: string | null
        }
        Update: {
          amount_spent?: number | null
          commission_earned?: number | null
          created_at?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spend_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      topup_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          currency: string
          id: string
          payment_method: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topup_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          ad_account_id: string | null
          amount: number
          commission: number | null
          created_at: string
          currency: string
          id: string
          payment_method: string | null
          status: string
          stripe_payment_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          ad_account_id?: string | null
          amount: number
          commission?: number | null
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string | null
          status?: string
          stripe_payment_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          ad_account_id?: string | null
          amount?: number
          commission?: number | null
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string | null
          status?: string
          stripe_payment_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_commission_overrides: {
        Row: {
          id: string
          rate: number
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          rate: number
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          rate?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_commission_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_custom_metrics: {
        Row: {
          alert_enabled: boolean | null
          alert_type: string | null
          created_at: string | null
          formula: string
          id: string
          name: string
          threshold: number | null
          user_id: string
        }
        Insert: {
          alert_enabled?: boolean | null
          alert_type?: string | null
          created_at?: string | null
          formula: string
          id?: string
          name: string
          threshold?: number | null
          user_id: string
        }
        Update: {
          alert_enabled?: boolean | null
          alert_type?: string | null
          created_at?: string | null
          formula?: string
          id?: string
          name?: string
          threshold?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_custom_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_reset_stats: { Args: never; Returns: undefined }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
