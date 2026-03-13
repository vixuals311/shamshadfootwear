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
      admin_security_settings: {
        Row: {
          admin_pin_hash: string | null
          created_at: string
          id: string
          require_pin_on_login: boolean
          session_timeout_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_pin_hash?: string | null
          created_at?: string
          id?: string
          require_pin_on_login?: boolean
          session_timeout_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_pin_hash?: string | null
          created_at?: string
          id?: string
          require_pin_on_login?: boolean
          session_timeout_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      application_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      cheques: {
        Row: {
          amount: number
          bank_name: string | null
          cheque_date: string
          cheque_number: string
          created_at: string
          created_by: string | null
          given_to: string
          id: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          bank_name?: string | null
          cheque_date: string
          cheque_number: string
          created_at?: string
          created_by?: string | null
          given_to: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_name?: string | null
          cheque_date?: string
          cheque_number?: string
          created_at?: string
          created_by?: string | null
          given_to?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          current_balance: number
          email: string | null
          id: string
          invoice_count: number
          name: string
          opening_balance: number
          phone: string
          portal_pin: string | null
          reference_number: string | null
          total_spent: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          current_balance?: number
          email?: string | null
          id?: string
          invoice_count?: number
          name: string
          opening_balance?: number
          phone: string
          portal_pin?: string | null
          reference_number?: string | null
          total_spent?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          current_balance?: number
          email?: string | null
          id?: string
          invoice_count?: number
          name?: string
          opening_balance?: number
          phone?: string
          portal_pin?: string | null
          reference_number?: string | null
          total_spent?: number
          updated_at?: string
        }
        Relationships: []
      }
      default_size_ranges: {
        Row: {
          category: Database["public"]["Enums"]["product_category"]
          created_at: string
          display_order: number
          id: string
          pairs_per_bundle: number
          size_range: string
        }
        Insert: {
          category: Database["public"]["Enums"]["product_category"]
          created_at?: string
          display_order?: number
          id?: string
          pairs_per_bundle?: number
          size_range: string
        }
        Update: {
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string
          display_order?: number
          id?: string
          pairs_per_bundle?: number
          size_range?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          article_number: string
          brand_name: string | null
          created_at: string
          discount_per_pair: number
          id: string
          invoice_id: string
          price_per_pair: number
          product_id: string | null
          product_name: string
          quantity: number
          size_range: string
          total: number
          total_pairs: number
        }
        Insert: {
          article_number: string
          brand_name?: string | null
          created_at?: string
          discount_per_pair?: number
          id?: string
          invoice_id: string
          price_per_pair: number
          product_id?: string | null
          product_name: string
          quantity?: number
          size_range: string
          total: number
          total_pairs: number
        }
        Update: {
          article_number?: string
          brand_name?: string | null
          created_at?: string
          discount_per_pair?: number
          id?: string
          invoice_id?: string
          price_per_pair?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
          size_range?: string
          total?: number
          total_pairs?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          account_id: string | null
          amount_received: number
          balance_due: number
          client_id: string | null
          created_at: string
          created_by: string | null
          credit_applied: number
          id: string
          invoice_number: string
          payment_method: string
          status: string
          subtotal: number
          tax: number
          total: number
          total_bundles: number
          total_discount: number
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount_received?: number
          balance_due?: number
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_applied?: number
          id?: string
          invoice_number: string
          payment_method?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          total_bundles?: number
          total_discount?: number
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount_received?: number
          balance_due?: number
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_applied?: number
          id?: string
          invoice_number?: string
          payment_method?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          total_bundles?: number
          total_discount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "payment_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_bills: {
        Row: {
          amount: number
          bill_number: string
          client_id: string
          created_at: string
          created_by: string | null
          date: string
          id: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          bill_number: string
          client_id: string
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bill_number?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_bills_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payment_accounts: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      product_size_bundles: {
        Row: {
          cost_per_pair: number | null
          created_at: string
          id: string
          pairs_per_bundle: number
          price_per_pair: number
          product_id: string
          quantity: number
          size_range: string
        }
        Insert: {
          cost_per_pair?: number | null
          created_at?: string
          id?: string
          pairs_per_bundle?: number
          price_per_pair: number
          product_id: string
          quantity?: number
          size_range: string
        }
        Update: {
          cost_per_pair?: number | null
          created_at?: string
          id?: string
          pairs_per_bundle?: number
          price_per_pair?: number
          product_id?: string
          quantity?: number
          size_range?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_size_bundles_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          article_number: string
          brand_id: string | null
          category: string
          created_at: string
          gender: Database["public"]["Enums"]["product_category"]
          id: string
          name: string
          pairs_per_dozen: number
          stock_dozens: number
          supplier: string | null
          updated_at: string
        }
        Insert: {
          article_number: string
          brand_id?: string | null
          category?: string
          created_at?: string
          gender?: Database["public"]["Enums"]["product_category"]
          id?: string
          name: string
          pairs_per_dozen?: number
          stock_dozens?: number
          supplier?: string | null
          updated_at?: string
        }
        Update: {
          article_number?: string
          brand_id?: string | null
          category?: string
          created_at?: string
          gender?: Database["public"]["Enums"]["product_category"]
          id?: string
          name?: string
          pairs_per_dozen?: number
          stock_dozens?: number
          supplier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recoveries: {
        Row: {
          amount: number
          city: string | null
          client_id: string | null
          created_at: string
          date: string
          id: string
          notes: string | null
          recorded_by: string | null
          type: string
        }
        Insert: {
          amount: number
          city?: string | null
          client_id?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          type?: string
        }
        Update: {
          amount?: number
          city?: string | null
          client_id?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "recoveries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_client_amounts: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          id: string
          recovery_id: string
        }
        Insert: {
          amount: number
          client_id?: string | null
          created_at?: string
          id?: string
          recovery_id: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          id?: string
          recovery_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recovery_client_amounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_client_amounts_recovery_id_fkey"
            columns: ["recovery_id"]
            isOneToOne: false
            referencedRelation: "recoveries"
            referencedColumns: ["id"]
          },
        ]
      }
      return_items: {
        Row: {
          article_number: string
          brand_name: string | null
          created_at: string
          id: string
          invoice_item_id: string | null
          pairs_returned: number
          price_per_pair: number
          product_id: string | null
          product_name: string
          return_id: string
          size_range: string
          total: number
        }
        Insert: {
          article_number: string
          brand_name?: string | null
          created_at?: string
          id?: string
          invoice_item_id?: string | null
          pairs_returned: number
          price_per_pair: number
          product_id?: string | null
          product_name: string
          return_id: string
          size_range: string
          total: number
        }
        Update: {
          article_number?: string
          brand_name?: string | null
          created_at?: string
          id?: string
          invoice_item_id?: string | null
          pairs_returned?: number
          price_per_pair?: number
          product_id?: string | null
          product_name?: string
          return_id?: string
          size_range?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "return_items_invoice_item_id_fkey"
            columns: ["invoice_item_id"]
            isOneToOne: false
            referencedRelation: "invoice_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          adjustment_type: string
          client_id: string | null
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          notes: string | null
          restock: boolean
          return_number: string
          total_amount: number
        }
        Insert: {
          adjustment_type?: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          notes?: string | null
          restock?: boolean
          return_number: string
          total_amount?: number
        }
        Update: {
          adjustment_type?: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          notes?: string | null
          restock?: boolean
          return_number?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "returns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      user_page_permissions: {
        Row: {
          created_at: string
          has_access: boolean
          id: string
          page_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          has_access?: boolean
          id?: string
          page_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          has_access?: boolean
          id?: string
          page_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          enforce_single_session: boolean
          id: string
          max_devices: number
          role: Database["public"]["Enums"]["app_role"]
          session_timeout_minutes: number
          user_id: string
        }
        Insert: {
          created_at?: string
          enforce_single_session?: boolean
          id?: string
          max_devices?: number
          role?: Database["public"]["Enums"]["app_role"]
          session_timeout_minutes?: number
          user_id: string
        }
        Update: {
          created_at?: string
          enforce_single_session?: boolean
          id?: string
          max_devices?: number
          role?: Database["public"]["Enums"]["app_role"]
          session_timeout_minutes?: number
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          device_info: string | null
          expires_at: string
          id: string
          ip_address: string | null
          is_active: boolean
          last_active_at: string
          session_token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_active_at?: string
          session_token: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_active_at?: string
          session_token?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_admins_exist: { Args: never; Returns: boolean }
      get_user_page_access: {
        Args: { _user_id: string }
        Returns: {
          has_access: boolean
          page_key: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      notify_admins: {
        Args: { _message: string; _title: string; _type?: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "biller" | "cashier" | "biller_cashier" | "manager"
      product_category: "men" | "women" | "children" | "unisex"
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
      app_role: ["admin", "biller", "cashier", "biller_cashier", "manager"],
      product_category: ["men", "women", "children", "unisex"],
    },
  },
} as const
