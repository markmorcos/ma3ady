export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      appointment_events: {
        Row: {
          appointment_id: string
          by_user_id: string | null
          created_at: string
          event_type: string
          id: string
          payload: Json
        }
        Insert: {
          appointment_id: string
          by_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
        }
        Update: {
          appointment_id?: string
          by_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "appointment_events_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          cancelled_at: string | null
          cancelled_by_user_id: string | null
          created_at: string
          ends_at: string
          guest_contact_id: string | null
          id: string
          manage_token_hash: string
          notes: string | null
          service_id: string
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by_user_id?: string | null
          created_at?: string
          ends_at: string
          guest_contact_id?: string | null
          id?: string
          manage_token_hash: string
          notes?: string | null
          service_id: string
          starts_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by_user_id?: string | null
          created_at?: string
          ends_at?: string
          guest_contact_id?: string | null
          id?: string
          manage_token_hash?: string
          notes?: string | null
          service_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_guest_contact_id_fkey"
            columns: ["guest_contact_id"]
            isOneToOne: false
            referencedRelation: "guest_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_exceptions: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          kind: Database["public"]["Enums"]["availability_exception_kind"]
          reason: string | null
          service_id: string | null
          starts_at: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          kind: Database["public"]["Enums"]["availability_exception_kind"]
          reason?: string | null
          service_id?: string | null
          starts_at: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["availability_exception_kind"]
          reason?: string | null
          service_id?: string | null
          starts_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_exceptions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_exceptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_rules: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          service_id: string | null
          start_time: string
          tenant_id: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          service_id?: string | null
          start_time: string
          tenant_id: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          service_id?: string | null
          start_time?: string
          tenant_id?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_rules_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_contacts: {
        Row: {
          claimed_by_user_id: string | null
          created_at: string
          email: string
          id: string
          locale: string | null
          name: string
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          claimed_by_user_id?: string | null
          created_at?: string
          email: string
          id?: string
          locale?: string | null
          name: string
          phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          claimed_by_user_id?: string | null
          created_at?: string
          email?: string
          id?: string
          locale?: string | null
          name?: string
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_memberships: {
        Row: {
          email: string
          invited_at: string
          invited_by_user_id: string | null
          role: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
        }
        Insert: {
          email: string
          invited_at?: string
          invited_by_user_id?: string | null
          role: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
        }
        Update: {
          email?: string
          invited_at?: string
          invited_by_user_id?: string | null
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_timezone_override: string | null
          first_signed_in_at: string | null
          full_name: string | null
          id: string
          locale: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_timezone_override?: string | null
          first_signed_in_at?: string | null
          full_name?: string | null
          id: string
          locale?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_timezone_override?: string | null
          first_signed_in_at?: string | null
          full_name?: string | null
          id?: string
          locale?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reserved_slugs: {
        Row: {
          slug: string
        }
        Insert: {
          slug: string
        }
        Update: {
          slug?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean
          buffer_after_min: number
          buffer_before_min: number
          created_at: string
          daily_cap: number | null
          description: string | null
          duration_minutes: number
          id: string
          max_advance_days: number
          min_notice_min: number
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          buffer_after_min?: number
          buffer_before_min?: number
          created_at?: string
          daily_cap?: number | null
          description?: string | null
          duration_minutes: number
          id?: string
          max_advance_days?: number
          min_notice_min?: number
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          buffer_after_min?: number
          buffer_before_min?: number
          created_at?: string
          daily_cap?: number | null
          description?: string | null
          duration_minutes?: number
          id?: string
          max_advance_days?: number
          min_notice_min?: number
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_audit_events: {
        Row: {
          by_kind: Database["public"]["Enums"]["tenant_audit_actor_kind"]
          by_user_id: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["tenant_audit_event_kind"]
          payload: Json
          target_id: string | null
          target_kind: string
          tenant_id: string
        }
        Insert: {
          by_kind?: Database["public"]["Enums"]["tenant_audit_actor_kind"]
          by_user_id?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["tenant_audit_event_kind"]
          payload?: Json
          target_id?: string | null
          target_kind: string
          tenant_id: string
        }
        Update: {
          by_kind?: Database["public"]["Enums"]["tenant_audit_actor_kind"]
          by_user_id?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["tenant_audit_event_kind"]
          payload?: Json
          target_id?: string | null
          target_kind?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_audit_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          brand_color: string | null
          cancellation_policy: string | null
          created_at: string
          default_locale: string
          id: string
          location: string | null
          name: string
          slug: string
          timezone: string
          type: Database["public"]["Enums"]["tenant_type"]
          updated_at: string
        }
        Insert: {
          brand_color?: string | null
          cancellation_policy?: string | null
          created_at?: string
          default_locale: string
          id?: string
          location?: string | null
          name: string
          slug: string
          timezone: string
          type?: Database["public"]["Enums"]["tenant_type"]
          updated_at?: string
        }
        Update: {
          brand_color?: string | null
          cancellation_policy?: string | null
          created_at?: string
          default_locale?: string
          id?: string
          location?: string | null
          name?: string
          slug?: string
          timezone?: string
          type?: Database["public"]["Enums"]["tenant_type"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assert_slug_available: { Args: { p_slug: string }; Returns: undefined }
      book_appointment: {
        Args: {
          p_guest_email: string
          p_guest_name: string
          p_guest_phone?: string
          p_service_id: string
          p_starts_at: string
          p_tenant_slug: string
        }
        Returns: {
          appointment_id: string
          manage_token: string
        }[]
      }
      check_slug_availability: {
        Args: { p_slug: string }
        Returns: {
          available: boolean
          reason: string
        }[]
      }
      compute_available_slots: {
        Args: {
          p_range_end: string
          p_range_start: string
          p_service_id: string
          p_tenant_slug: string
        }
        Returns: {
          ends_at: string
          starts_at: string
        }[]
      }
      current_user_is_member_of: {
        Args: { p_tenant: string }
        Returns: boolean
      }
      current_user_role_in: {
        Args: { p_tenant: string }
        Returns: Database["public"]["Enums"]["tenant_role"]
      }
      purge_old_audit_events: { Args: never; Returns: number }
      record_audit: {
        Args: {
          p_kind: string
          p_payload: Json
          p_target_id: string
          p_target_kind: string
          p_tenant_id: string
        }
        Returns: undefined
      }
      tenant_id_from_slug: { Args: { p_slug: string }; Returns: string }
      tg_jsonb_diff_keys: {
        Args: { p_after: Json; p_before: Json }
        Returns: string[]
      }
      verify_manage_token: { Args: { p_token: string }; Returns: string }
    }
    Enums: {
      appointment_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "no_show"
      availability_exception_kind: "block" | "extra"
      tenant_audit_actor_kind: "user" | "system" | "guest_token"
      tenant_audit_event_kind:
        | "tenant.updated"
        | "member.added"
        | "member.role_changed"
        | "member.removed"
        | "service.created"
        | "service.updated"
        | "service.deactivated"
        | "service.activated"
        | "service.removed"
        | "availability_rule.created"
        | "availability_rule.updated"
        | "availability_rule.deleted"
        | "availability_exception.created"
        | "availability_exception.updated"
        | "availability_exception.deleted"
      tenant_role: "owner" | "admin" | "staff" | "customer"
      tenant_type: "generic" | "salon" | "clinic" | "auto"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      appointment_status: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "no_show",
      ],
      availability_exception_kind: ["block", "extra"],
      tenant_audit_actor_kind: ["user", "system", "guest_token"],
      tenant_audit_event_kind: [
        "tenant.updated",
        "member.added",
        "member.role_changed",
        "member.removed",
        "service.created",
        "service.updated",
        "service.deactivated",
        "service.activated",
        "service.removed",
        "availability_rule.created",
        "availability_rule.updated",
        "availability_rule.deleted",
        "availability_exception.created",
        "availability_exception.updated",
        "availability_exception.deleted",
      ],
      tenant_role: ["owner", "admin", "staff", "customer"],
      tenant_type: ["generic", "salon", "clinic", "auto"],
    },
  },
} as const

