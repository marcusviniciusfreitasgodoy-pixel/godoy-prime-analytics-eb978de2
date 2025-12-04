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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      condominios_mapeamento: {
        Row: {
          created_at: string | null
          id: string
          logradouro_padrao: string
          microbairro: string | null
          nome_condominio: string
          numero_fim: number | null
          numero_inicio: number | null
          padrao_construtivo: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          logradouro_padrao: string
          microbairro?: string | null
          nome_condominio: string
          numero_fim?: number | null
          numero_inicio?: number | null
          padrao_construtivo?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          logradouro_padrao?: string
          microbairro?: string | null
          nome_condominio?: string
          numero_fim?: number | null
          numero_inicio?: number | null
          padrao_construtivo?: string | null
        }
        Relationships: []
      }
      ia_valuation_weights: {
        Row: {
          category: string | null
          created_at: string | null
          descricao: string | null
          factor_key: string | null
          id: string
          is_active: boolean | null
          label: string | null
          multiplier: number | null
          nome_variavel: string | null
          order_index: number | null
          parametro: string | null
          peso_valor: number | null
          tipo_imovel: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          descricao?: string | null
          factor_key?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          multiplier?: number | null
          nome_variavel?: string | null
          order_index?: number | null
          parametro?: string | null
          peso_valor?: number | null
          tipo_imovel?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          descricao?: string | null
          factor_key?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          multiplier?: number | null
          nome_variavel?: string | null
          order_index?: number | null
          parametro?: string | null
          peso_valor?: number | null
          tipo_imovel?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      itbi_transactions: {
        Row: {
          area_m2: number
          bairro: string | null
          complemento: string | null
          created_at: string | null
          data_transacao: string
          id: string
          logradouro: string
          numero: string | null
          percentual_transferido: number | null
          tipologia: string | null
          total_transacoes: number
          updated_at: string | null
          uso: Database["public"]["Enums"]["uso_imovel"]
          valor_m2: number | null
          valor_transacao: number
        }
        Insert: {
          area_m2: number
          bairro?: string | null
          complemento?: string | null
          created_at?: string | null
          data_transacao: string
          id?: string
          logradouro: string
          numero?: string | null
          percentual_transferido?: number | null
          tipologia?: string | null
          total_transacoes?: number
          updated_at?: string | null
          uso?: Database["public"]["Enums"]["uso_imovel"]
          valor_m2?: number | null
          valor_transacao: number
        }
        Update: {
          area_m2?: number
          bairro?: string | null
          complemento?: string | null
          created_at?: string | null
          data_transacao?: string
          id?: string
          logradouro?: string
          numero?: string | null
          percentual_transferido?: number | null
          tipologia?: string | null
          total_transacoes?: number
          updated_at?: string | null
          uso?: Database["public"]["Enums"]["uso_imovel"]
          valor_m2?: number | null
          valor_transacao?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      valuation_characteristics: {
        Row: {
          category: string
          category_cap_max: number
          category_cap_min: number
          category_name: string
          char_code: string
          char_description: string | null
          char_name: string
          char_type: string
          created_at: string | null
          display_order: number
          id: string
          is_active: boolean | null
          updated_at: string | null
          weight_value: number
        }
        Insert: {
          category: string
          category_cap_max: number
          category_cap_min: number
          category_name: string
          char_code: string
          char_description?: string | null
          char_name: string
          char_type: string
          created_at?: string | null
          display_order: number
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          weight_value: number
        }
        Update: {
          category?: string
          category_cap_max?: number
          category_cap_min?: number
          category_name?: string
          char_code?: string
          char_description?: string | null
          char_name?: string
          char_type?: string
          created_at?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          weight_value?: number
        }
        Relationships: []
      }
      valuation_documentation_factors: {
        Row: {
          action_required: string
          adjustment: number | null
          created_at: string | null
          description: string | null
          display_order: number
          factor: number | null
          id: string
          is_active: boolean | null
          severity: string
          status_code: string
          status_name: string
        }
        Insert: {
          action_required: string
          adjustment?: number | null
          created_at?: string | null
          description?: string | null
          display_order: number
          factor?: number | null
          id?: string
          is_active?: boolean | null
          severity: string
          status_code: string
          status_name: string
        }
        Update: {
          action_required?: string
          adjustment?: number | null
          created_at?: string | null
          description?: string | null
          display_order?: number
          factor?: number | null
          id?: string
          is_active?: boolean | null
          severity?: string
          status_code?: string
          status_name?: string
        }
        Relationships: []
      }
      valuation_responses: {
        Row: {
          characteristic_id: string
          created_at: string | null
          id: string
          response_value: string
          valuation_id: string
          weight_applied: number | null
        }
        Insert: {
          characteristic_id: string
          created_at?: string | null
          id?: string
          response_value: string
          valuation_id: string
          weight_applied?: number | null
        }
        Update: {
          characteristic_id?: string
          created_at?: string | null
          id?: string
          response_value?: string
          valuation_id?: string
          weight_applied?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "valuation_responses_characteristic_id_fkey"
            columns: ["characteristic_id"]
            isOneToOne: false
            referencedRelation: "valuation_characteristics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "valuation_responses_valuation_id_fkey"
            columns: ["valuation_id"]
            isOneToOne: false
            referencedRelation: "valuations"
            referencedColumns: ["id"]
          },
        ]
      }
      valuations: {
        Row: {
          anuncio_max_m2: number | null
          anuncio_med_m2: number | null
          anuncio_min_m2: number | null
          auto_capped: boolean | null
          bairro: string
          base_price_custom_m2: number | null
          base_price_selected: string | null
          combined_max_m2: number
          combined_med_m2: number
          combined_min_m2: number
          confidence_level: string
          confidence_score: number
          created_at: string | null
          documentation_factor: number
          documentation_notes: string | null
          documentation_status: string
          final_value_max: number
          final_value_med: number
          final_value_min: number
          id: string
          itbi_max_m2: number
          itbi_med_m2: number
          itbi_min_m2: number
          itbi_transaction_count: number | null
          logradouro: string
          numero: string | null
          pdf_generated: boolean | null
          property_area_m2: number
          property_type: string | null
          recommendation_action: string | null
          recommendation_details: Json | null
          recommendation_title: string | null
          spread_percentage: number
          total_adjustment: number
          trend_direction: string | null
          trend_percentage: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          anuncio_max_m2?: number | null
          anuncio_med_m2?: number | null
          anuncio_min_m2?: number | null
          auto_capped?: boolean | null
          bairro?: string
          base_price_custom_m2?: number | null
          base_price_selected?: string | null
          combined_max_m2: number
          combined_med_m2: number
          combined_min_m2: number
          confidence_level: string
          confidence_score: number
          created_at?: string | null
          documentation_factor: number
          documentation_notes?: string | null
          documentation_status: string
          final_value_max: number
          final_value_med: number
          final_value_min: number
          id?: string
          itbi_max_m2: number
          itbi_med_m2: number
          itbi_min_m2: number
          itbi_transaction_count?: number | null
          logradouro: string
          numero?: string | null
          pdf_generated?: boolean | null
          property_area_m2: number
          property_type?: string | null
          recommendation_action?: string | null
          recommendation_details?: Json | null
          recommendation_title?: string | null
          spread_percentage: number
          total_adjustment: number
          trend_direction?: string | null
          trend_percentage?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          anuncio_max_m2?: number | null
          anuncio_med_m2?: number | null
          anuncio_min_m2?: number | null
          auto_capped?: boolean | null
          bairro?: string
          base_price_custom_m2?: number | null
          base_price_selected?: string | null
          combined_max_m2?: number
          combined_med_m2?: number
          combined_min_m2?: number
          confidence_level?: string
          confidence_score?: number
          created_at?: string | null
          documentation_factor?: number
          documentation_notes?: string | null
          documentation_status?: string
          final_value_max?: number
          final_value_med?: number
          final_value_min?: number
          id?: string
          itbi_max_m2?: number
          itbi_med_m2?: number
          itbi_min_m2?: number
          itbi_transaction_count?: number | null
          logradouro?: string
          numero?: string | null
          pdf_generated?: boolean | null
          property_area_m2?: number
          property_type?: string | null
          recommendation_action?: string | null
          recommendation_details?: Json | null
          recommendation_title?: string | null
          spread_percentage?: number
          total_adjustment?: number
          trend_direction?: string | null
          trend_percentage?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      view_ranking_microbairros: {
        Row: {
          mediana_m2: number | null
          microbairro: string | null
          preco_max_m2: number | null
          preco_medio_m2: number | null
          preco_min_m2: number | null
          total_transacoes: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "corretor" | "gerente"
      uso_imovel: "Residencial" | "Comercial"
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
      app_role: ["admin", "corretor", "gerente"],
      uso_imovel: ["Residencial", "Comercial"],
    },
  },
} as const
