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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      balances: {
        Row: {
          amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_cards: {
        Row: {
          bank_name: string
          created_at: string
          credit_limit: number | null
          due_day: number
          id: string
          interest_rate: number | null
          last_paid_date: string | null
          last_paid_for_month: string | null
          outstanding_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_name: string
          created_at?: string
          credit_limit?: number | null
          due_day: number
          id?: string
          interest_rate?: number | null
          last_paid_date?: string | null
          last_paid_for_month?: string | null
          outstanding_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_name?: string
          created_at?: string
          credit_limit?: number | null
          due_day?: number
          id?: string
          interest_rate?: number | null
          last_paid_date?: string | null
          last_paid_for_month?: string | null
          outstanding_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      insurance: {
        Row: {
          created_at: string
          due_day: number
          id: string
          insurance_type: string
          last_paid_date: string | null
          last_paid_for_month: string | null
          policy_start_date: string | null
          policy_term_years: number | null
          premium_amount: number
          sum_assured: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_day: number
          id?: string
          insurance_type: string
          last_paid_date?: string | null
          last_paid_for_month?: string | null
          policy_start_date?: string | null
          policy_term_years?: number | null
          premium_amount: number
          sum_assured?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_day?: number
          id?: string
          insurance_type?: string
          last_paid_date?: string | null
          last_paid_for_month?: string | null
          policy_start_date?: string | null
          policy_term_years?: number | null
          premium_amount?: number
          sum_assured?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loan_foreclosures: {
        Row: {
          charge_pct: number
          created_at: string
          fixed_fee: number
          gst_amount: number
          gst_pct: number
          id: string
          interest_saved: number
          loan_id: string
          notes: string | null
          outstanding_principal: number
          pct_charges: number
          total_charges: number
          total_payable: number
          updated_at: string
          user_id: string
        }
        Insert: {
          charge_pct?: number
          created_at?: string
          fixed_fee?: number
          gst_amount?: number
          gst_pct?: number
          id?: string
          interest_saved?: number
          loan_id: string
          notes?: string | null
          outstanding_principal?: number
          pct_charges?: number
          total_charges?: number
          total_payable?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          charge_pct?: number
          created_at?: string
          fixed_fee?: number
          gst_amount?: number
          gst_pct?: number
          id?: string
          interest_saved?: number
          loan_id?: string
          notes?: string | null
          outstanding_principal?: number
          pct_charges?: number
          total_charges?: number
          total_payable?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_foreclosures_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_prepayments: {
        Row: {
          amount: number
          created_at: string
          gst_pct: number | null
          id: string
          loan_id: string
          note: string | null
          paid_date: string
          part_payment_charge_pct: number | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          gst_pct?: number | null
          id?: string
          loan_id: string
          note?: string | null
          paid_date?: string
          part_payment_charge_pct?: number | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          gst_pct?: number | null
          id?: string
          loan_id?: string
          note?: string | null
          paid_date?: string
          part_payment_charge_pct?: number | null
          user_id?: string
        }
        Relationships: []
      }
      loans: {
        Row: {
          adjusted_first_emi: number | null
          bank_name: string
          bpi_treatment: string | null
          broken_period_days: number | null
          broken_period_interest: number | null
          created_at: string
          disbursement_date: string | null
          due_day: number
          emi_amount: number
          id: string
          interest_rate: number | null
          last_paid_date: string | null
          last_paid_for_month: string | null
          net_disbursed_amount: number | null
          principal_amount: number | null
          start_date: string | null
          tenure_months: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          adjusted_first_emi?: number | null
          bank_name: string
          bpi_treatment?: string | null
          broken_period_days?: number | null
          broken_period_interest?: number | null
          created_at?: string
          disbursement_date?: string | null
          due_day: number
          emi_amount: number
          id?: string
          interest_rate?: number | null
          last_paid_date?: string | null
          last_paid_for_month?: string | null
          net_disbursed_amount?: number | null
          principal_amount?: number | null
          start_date?: string | null
          tenure_months?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          adjusted_first_emi?: number | null
          bank_name?: string
          bpi_treatment?: string | null
          broken_period_days?: number | null
          broken_period_interest?: number | null
          created_at?: string
          disbursement_date?: string | null
          due_day?: number
          emi_amount?: number
          id?: string
          interest_rate?: number | null
          last_paid_date?: string | null
          last_paid_for_month?: string | null
          net_disbursed_amount?: number | null
          principal_amount?: number | null
          start_date?: string | null
          tenure_months?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string
          for_month: string
          id: string
          label: string
          liability_id: string
          liability_kind: string
          paid_date: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          for_month: string
          id?: string
          label: string
          liability_id: string
          liability_kind: string
          paid_date?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          for_month?: string
          id?: string
          label?: string
          liability_id?: string
          liability_kind?: string
          paid_date?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string
          last_name: string | null
          mobile: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_name: string
          last_name?: string | null
          mobile?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_name?: string
          last_name?: string | null
          mobile?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
