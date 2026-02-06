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
      agendamentos_visita: {
        Row: {
          codigo_imovel: string | null
          corretor_id: string | null
          created_at: string | null
          data_hora: string
          data_hora_opcao2: string | null
          email_visitante: string | null
          endereco_imovel: string
          id: string
          lead_id: string | null
          lembrete_enviado: boolean | null
          lembrete_enviado_at: string | null
          nome_visitante: string
          notas: string | null
          origem: Database["public"]["Enums"]["origem_agendamento"] | null
          status: Database["public"]["Enums"]["status_visita"]
          telefone_visitante: string
          tipo_servico: Database["public"]["Enums"]["tipo_servico_visita"]
          updated_at: string | null
        }
        Insert: {
          codigo_imovel?: string | null
          corretor_id?: string | null
          created_at?: string | null
          data_hora: string
          data_hora_opcao2?: string | null
          email_visitante?: string | null
          endereco_imovel: string
          id?: string
          lead_id?: string | null
          lembrete_enviado?: boolean | null
          lembrete_enviado_at?: string | null
          nome_visitante: string
          notas?: string | null
          origem?: Database["public"]["Enums"]["origem_agendamento"] | null
          status?: Database["public"]["Enums"]["status_visita"]
          telefone_visitante: string
          tipo_servico?: Database["public"]["Enums"]["tipo_servico_visita"]
          updated_at?: string | null
        }
        Update: {
          codigo_imovel?: string | null
          corretor_id?: string | null
          created_at?: string | null
          data_hora?: string
          data_hora_opcao2?: string | null
          email_visitante?: string | null
          endereco_imovel?: string
          id?: string
          lead_id?: string | null
          lembrete_enviado?: boolean | null
          lembrete_enviado_at?: string | null
          nome_visitante?: string
          notas?: string | null
          origem?: Database["public"]["Enums"]["origem_agendamento"] | null
          status?: Database["public"]["Enums"]["status_visita"]
          telefone_visitante?: string
          tipo_servico?: Database["public"]["Enums"]["tipo_servico_visita"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_visita_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      bairros_cache: {
        Row: {
          bairro: string
          total_transacoes: number
          updated_at: string
        }
        Insert: {
          bairro: string
          total_transacoes?: number
          updated_at?: string
        }
        Update: {
          bairro?: string
          total_transacoes?: number
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      condominios_mapeamento: {
        Row: {
          created_at: string | null
          endereco_completo: string | null
          google_place_id: string | null
          id: string
          latitude: number | null
          logradouro_itbi_normalizado: string | null
          logradouro_padrao: string
          longitude: number | null
          microbairro: string | null
          nome_condominio: string
          numero_fim: number | null
          numero_inicio: number | null
          padrao_construtivo: string | null
          ruas_internas: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          endereco_completo?: string | null
          google_place_id?: string | null
          id?: string
          latitude?: number | null
          logradouro_itbi_normalizado?: string | null
          logradouro_padrao: string
          longitude?: number | null
          microbairro?: string | null
          nome_condominio: string
          numero_fim?: number | null
          numero_inicio?: number | null
          padrao_construtivo?: string | null
          ruas_internas?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          endereco_completo?: string | null
          google_place_id?: string | null
          id?: string
          latitude?: number | null
          logradouro_itbi_normalizado?: string | null
          logradouro_padrao?: string
          longitude?: number | null
          microbairro?: string | null
          nome_condominio?: string
          numero_fim?: number | null
          numero_inicio?: number | null
          padrao_construtivo?: string | null
          ruas_internas?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      disponibilidade_corretor: {
        Row: {
          ativo: boolean | null
          corretor_id: string
          created_at: string | null
          data: string
          horarios_disponiveis: string[] | null
          id: string
        }
        Insert: {
          ativo?: boolean | null
          corretor_id: string
          created_at?: string | null
          data: string
          horarios_disponiveis?: string[] | null
          id?: string
        }
        Update: {
          ativo?: boolean | null
          corretor_id?: string
          created_at?: string | null
          data?: string
          horarios_disponiveis?: string[] | null
          id?: string
        }
        Relationships: []
      }
      feedbacks_visita: {
        Row: {
          atende_necessidades: boolean | null
          avaliacao_geral: number | null
          compraria_imovel: boolean | null
          conexao_imovel: number | null
          created_at: string | null
          efeito_uau: string[] | null
          efeito_uau_detalhe: string | null
          ficha_visita_id: string
          gostaria_fazer_proposta: boolean | null
          id: string
          nivel_interesse:
            | Database["public"]["Enums"]["nivel_interesse_visita"]
            | null
          o_que_alteraria: string | null
          o_que_mais_gostou: string | null
          o_que_menos_gostou: string | null
          percepcao_valor:
            | Database["public"]["Enums"]["percepcao_valor_visita"]
            | null
          ponto_resistencia: string | null
          pontos_negativos: string | null
          pontos_positivos: string | null
          sugestoes_melhoria: string | null
          valor_ofertaria: number | null
        }
        Insert: {
          atende_necessidades?: boolean | null
          avaliacao_geral?: number | null
          compraria_imovel?: boolean | null
          conexao_imovel?: number | null
          created_at?: string | null
          efeito_uau?: string[] | null
          efeito_uau_detalhe?: string | null
          ficha_visita_id: string
          gostaria_fazer_proposta?: boolean | null
          id?: string
          nivel_interesse?:
            | Database["public"]["Enums"]["nivel_interesse_visita"]
            | null
          o_que_alteraria?: string | null
          o_que_mais_gostou?: string | null
          o_que_menos_gostou?: string | null
          percepcao_valor?:
            | Database["public"]["Enums"]["percepcao_valor_visita"]
            | null
          ponto_resistencia?: string | null
          pontos_negativos?: string | null
          pontos_positivos?: string | null
          sugestoes_melhoria?: string | null
          valor_ofertaria?: number | null
        }
        Update: {
          atende_necessidades?: boolean | null
          avaliacao_geral?: number | null
          compraria_imovel?: boolean | null
          conexao_imovel?: number | null
          created_at?: string | null
          efeito_uau?: string[] | null
          efeito_uau_detalhe?: string | null
          ficha_visita_id?: string
          gostaria_fazer_proposta?: boolean | null
          id?: string
          nivel_interesse?:
            | Database["public"]["Enums"]["nivel_interesse_visita"]
            | null
          o_que_alteraria?: string | null
          o_que_mais_gostou?: string | null
          o_que_menos_gostou?: string | null
          percepcao_valor?:
            | Database["public"]["Enums"]["percepcao_valor_visita"]
            | null
          ponto_resistencia?: string | null
          pontos_negativos?: string | null
          pontos_positivos?: string | null
          sugestoes_melhoria?: string | null
          valor_ofertaria?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_visita_ficha_visita_id_fkey"
            columns: ["ficha_visita_id"]
            isOneToOne: false
            referencedRelation: "fichas_visita"
            referencedColumns: ["id"]
          },
        ]
      }
      fichas_visita: {
        Row: {
          assinatura_corretor: string | null
          assinatura_visitante: string | null
          codigo: string
          codigo_imovel: string | null
          corretor_id: string | null
          cpf_visitante: string
          created_at: string | null
          data_visita: string
          email_visitante: string | null
          endereco_imovel: string
          id: string
          nome_corretor: string
          nome_proprietario: string
          nome_visitante: string
          notas: string | null
          status: Database["public"]["Enums"]["status_visita"]
          telefone_visitante: string
          updated_at: string | null
          valor_imovel: number | null
        }
        Insert: {
          assinatura_corretor?: string | null
          assinatura_visitante?: string | null
          codigo: string
          codigo_imovel?: string | null
          corretor_id?: string | null
          cpf_visitante: string
          created_at?: string | null
          data_visita?: string
          email_visitante?: string | null
          endereco_imovel: string
          id?: string
          nome_corretor: string
          nome_proprietario: string
          nome_visitante: string
          notas?: string | null
          status?: Database["public"]["Enums"]["status_visita"]
          telefone_visitante: string
          updated_at?: string | null
          valor_imovel?: number | null
        }
        Update: {
          assinatura_corretor?: string | null
          assinatura_visitante?: string | null
          codigo?: string
          codigo_imovel?: string | null
          corretor_id?: string | null
          cpf_visitante?: string
          created_at?: string | null
          data_visita?: string
          email_visitante?: string | null
          endereco_imovel?: string
          id?: string
          nome_corretor?: string
          nome_proprietario?: string
          nome_visitante?: string
          notas?: string | null
          status?: Database["public"]["Enums"]["status_visita"]
          telefone_visitante?: string
          updated_at?: string | null
          valor_imovel?: number | null
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
          microbairro: string | null
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
          microbairro?: string | null
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
          microbairro?: string | null
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
      leads: {
        Row: {
          aceita_marketing: boolean | null
          area_interesse: number | null
          bairro_interesse: string | null
          banheiros: number | null
          convertido: boolean | null
          created_at: string
          diferenciais_imovel: string | null
          email: string
          endereco_imovel_analise: string | null
          evaluation_count: number | null
          id: string
          interesse: string | null
          nome: string
          notas: string | null
          objetivo: string | null
          origem: string | null
          preferencia_contato: string | null
          quartos: number | null
          suites: number | null
          telefone: string
          updated_at: string
          urgencia: string | null
          vagas: number | null
          valor_interesse: number | null
          valor_pedido_vendedor: number | null
        }
        Insert: {
          aceita_marketing?: boolean | null
          area_interesse?: number | null
          bairro_interesse?: string | null
          banheiros?: number | null
          convertido?: boolean | null
          created_at?: string
          diferenciais_imovel?: string | null
          email: string
          endereco_imovel_analise?: string | null
          evaluation_count?: number | null
          id?: string
          interesse?: string | null
          nome: string
          notas?: string | null
          objetivo?: string | null
          origem?: string | null
          preferencia_contato?: string | null
          quartos?: number | null
          suites?: number | null
          telefone: string
          updated_at?: string
          urgencia?: string | null
          vagas?: number | null
          valor_interesse?: number | null
          valor_pedido_vendedor?: number | null
        }
        Update: {
          aceita_marketing?: boolean | null
          area_interesse?: number | null
          bairro_interesse?: string | null
          banheiros?: number | null
          convertido?: boolean | null
          created_at?: string
          diferenciais_imovel?: string | null
          email?: string
          endereco_imovel_analise?: string | null
          evaluation_count?: number | null
          id?: string
          interesse?: string | null
          nome?: string
          notas?: string | null
          objetivo?: string | null
          origem?: string | null
          preferencia_contato?: string | null
          quartos?: number | null
          suites?: number | null
          telefone?: string
          updated_at?: string
          urgencia?: string | null
          vagas?: number | null
          valor_interesse?: number | null
          valor_pedido_vendedor?: number | null
        }
        Relationships: []
      }
      logradouros_geo: {
        Row: {
          bairro: string
          cod_trecho: number | null
          created_at: string | null
          hierarquia: string | null
          id: string
          last_sync: string | null
          latitude: number | null
          logradouro: string
          longitude: number | null
          tipo_logradouro: string | null
          velocidade_regulamentada: number | null
        }
        Insert: {
          bairro: string
          cod_trecho?: number | null
          created_at?: string | null
          hierarquia?: string | null
          id?: string
          last_sync?: string | null
          latitude?: number | null
          logradouro: string
          longitude?: number | null
          tipo_logradouro?: string | null
          velocidade_regulamentada?: number | null
        }
        Update: {
          bairro?: string
          cod_trecho?: number | null
          created_at?: string | null
          hierarquia?: string | null
          id?: string
          last_sync?: string | null
          latitude?: number | null
          logradouro?: string
          longitude?: number | null
          tipo_logradouro?: string | null
          velocidade_regulamentada?: number | null
        }
        Relationships: []
      }
      logradouros_normalizacao: {
        Row: {
          bairro: string | null
          created_at: string
          id: string
          logradouro_normalizado: string
          logradouro_original: string
          tipo_logradouro: string | null
        }
        Insert: {
          bairro?: string | null
          created_at?: string
          id?: string
          logradouro_normalizado: string
          logradouro_original: string
          tipo_logradouro?: string | null
        }
        Update: {
          bairro?: string | null
          created_at?: string
          id?: string
          logradouro_normalizado?: string
          logradouro_original?: string
          tipo_logradouro?: string | null
        }
        Relationships: []
      }
      microbairros_geo: {
        Row: {
          bairro: string
          created_at: string | null
          id: string
          keywords: string[] | null
          lat_max: number | null
          lat_min: number | null
          latitude_centro: number | null
          lng_max: number | null
          lng_min: number | null
          longitude_centro: number | null
          nome: string
          updated_at: string | null
        }
        Insert: {
          bairro?: string
          created_at?: string | null
          id?: string
          keywords?: string[] | null
          lat_max?: number | null
          lat_min?: number | null
          latitude_centro?: number | null
          lng_max?: number | null
          lng_min?: number | null
          longitude_centro?: number | null
          nome: string
          updated_at?: string | null
        }
        Update: {
          bairro?: string
          created_at?: string | null
          id?: string
          keywords?: string[] | null
          lat_max?: number | null
          lat_min?: number | null
          latitude_centro?: number | null
          lng_max?: number | null
          lng_min?: number | null
          longitude_centro?: number | null
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          id: string
          lembrete_horas_antes: number
          updated_at: string
          user_id: string | null
          whatsapp_cancelamento: boolean
          whatsapp_confirmacao: boolean
          whatsapp_lembrete: boolean
          whatsapp_reagendamento: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          lembrete_horas_antes?: number
          updated_at?: string
          user_id?: string | null
          whatsapp_cancelamento?: boolean
          whatsapp_confirmacao?: boolean
          whatsapp_lembrete?: boolean
          whatsapp_reagendamento?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          lembrete_horas_antes?: number
          updated_at?: string
          user_id?: string | null
          whatsapp_cancelamento?: boolean
          whatsapp_confirmacao?: boolean
          whatsapp_lembrete?: boolean
          whatsapp_reagendamento?: boolean
        }
        Relationships: []
      }
      pricing_strategies: {
        Row: {
          corretagem_atracao: number | null
          corretagem_mercado: number | null
          corretagem_premium: number | null
          created_at: string
          estrategia_recomendada: string
          estrategia_selecionada: string | null
          id: string
          is_new_listing: boolean
          liquido_atracao: number | null
          liquido_mercado: number | null
          liquido_min_atracao: number | null
          liquido_min_mercado: number | null
          liquido_min_premium: number | null
          liquido_premium: number | null
          p_atracao: number
          p_mercado: number
          p_premium: number
          piso_planejado_atracao: number | null
          piso_planejado_mercado: number | null
          piso_planejado_premium: number | null
          plano_ajuste_ativo: boolean | null
          preco_anuncio_atracao: number | null
          preco_anuncio_mercado: number | null
          preco_anuncio_premium: number | null
          premio_liquido_pct_atracao: number | null
          premio_liquido_pct_mercado: number | null
          premio_liquido_pct_premium: number | null
          q1_tempo_mercado: string | null
          q2_concorrencia: string | null
          q3_prioridade: string | null
          q4_horizonte_tempo: string | null
          q5_situacao_financeira: string | null
          q6_estado_mercado: string | null
          q7_clientes_potenciais: string | null
          q8_pronto_vender: string | null
          q9_padrao_imovel: string | null
          status: string
          updated_at: string
          user_id: string
          valor_itbi: number
          valuation_id: string | null
        }
        Insert: {
          corretagem_atracao?: number | null
          corretagem_mercado?: number | null
          corretagem_premium?: number | null
          created_at?: string
          estrategia_recomendada: string
          estrategia_selecionada?: string | null
          id?: string
          is_new_listing?: boolean
          liquido_atracao?: number | null
          liquido_mercado?: number | null
          liquido_min_atracao?: number | null
          liquido_min_mercado?: number | null
          liquido_min_premium?: number | null
          liquido_premium?: number | null
          p_atracao?: number
          p_mercado?: number
          p_premium?: number
          piso_planejado_atracao?: number | null
          piso_planejado_mercado?: number | null
          piso_planejado_premium?: number | null
          plano_ajuste_ativo?: boolean | null
          preco_anuncio_atracao?: number | null
          preco_anuncio_mercado?: number | null
          preco_anuncio_premium?: number | null
          premio_liquido_pct_atracao?: number | null
          premio_liquido_pct_mercado?: number | null
          premio_liquido_pct_premium?: number | null
          q1_tempo_mercado?: string | null
          q2_concorrencia?: string | null
          q3_prioridade?: string | null
          q4_horizonte_tempo?: string | null
          q5_situacao_financeira?: string | null
          q6_estado_mercado?: string | null
          q7_clientes_potenciais?: string | null
          q8_pronto_vender?: string | null
          q9_padrao_imovel?: string | null
          status?: string
          updated_at?: string
          user_id: string
          valor_itbi: number
          valuation_id?: string | null
        }
        Update: {
          corretagem_atracao?: number | null
          corretagem_mercado?: number | null
          corretagem_premium?: number | null
          created_at?: string
          estrategia_recomendada?: string
          estrategia_selecionada?: string | null
          id?: string
          is_new_listing?: boolean
          liquido_atracao?: number | null
          liquido_mercado?: number | null
          liquido_min_atracao?: number | null
          liquido_min_mercado?: number | null
          liquido_min_premium?: number | null
          liquido_premium?: number | null
          p_atracao?: number
          p_mercado?: number
          p_premium?: number
          piso_planejado_atracao?: number | null
          piso_planejado_mercado?: number | null
          piso_planejado_premium?: number | null
          plano_ajuste_ativo?: boolean | null
          preco_anuncio_atracao?: number | null
          preco_anuncio_mercado?: number | null
          preco_anuncio_premium?: number | null
          premio_liquido_pct_atracao?: number | null
          premio_liquido_pct_mercado?: number | null
          premio_liquido_pct_premium?: number | null
          q1_tempo_mercado?: string | null
          q2_concorrencia?: string | null
          q3_prioridade?: string | null
          q4_horizonte_tempo?: string | null
          q5_situacao_financeira?: string | null
          q6_estado_mercado?: string | null
          q7_clientes_potenciais?: string | null
          q8_pronto_vender?: string | null
          q9_padrao_imovel?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          valor_itbi?: number
          valuation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_strategies_valuation_id_fkey"
            columns: ["valuation_id"]
            isOneToOne: false
            referencedRelation: "valuations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          creci: string | null
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          creci?: string | null
          email?: string | null
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          creci?: string | null
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rate_limit_log: {
        Row: {
          created_at: string | null
          function_name: string
          id: string
          identifier: string
          request_count: number | null
          window_start: string
        }
        Insert: {
          created_at?: string | null
          function_name: string
          id?: string
          identifier: string
          request_count?: number | null
          window_start: string
        }
        Update: {
          created_at?: string | null
          function_name?: string
          id?: string
          identifier?: string
          request_count?: number | null
          window_start?: string
        }
        Relationships: []
      }
      sofia_knowledge_base: {
        Row: {
          category: string
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          keywords: string[] | null
          source: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          source?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          source?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          action_details: Json | null
          action_type: string
          created_at: string
          id: string
          page_path: string | null
          user_id: string
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          created_at?: string
          id?: string
          page_path?: string | null
          user_id: string
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          created_at?: string
          id?: string
          page_path?: string | null
          user_id?: string
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
          applies_to: string | null
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
          applies_to?: string | null
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
          applies_to?: string | null
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
          andar: string | null
          anuncio_fontes: Json | null
          anuncio_max_m2: number | null
          anuncio_med_m2: number | null
          anuncio_min_m2: number | null
          area_terreno_m2: number | null
          auto_capped: boolean | null
          bairro: string
          banheiros: number | null
          base_price_custom_m2: number | null
          base_price_selected: string | null
          bonus_terreno: number | null
          combined_max_m2: number
          combined_med_m2: number
          combined_min_m2: number
          complemento: string | null
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
          nome_condominio: string | null
          numero: string | null
          observacoes_imovel: string | null
          pdf_generated: boolean | null
          property_area_m2: number
          property_type: string | null
          proporcao_terreno: number | null
          proprietario: string | null
          quartos: number | null
          recommendation_action: string | null
          recommendation_details: Json | null
          recommendation_title: string | null
          spread_percentage: number
          suites: number | null
          telefone: string | null
          total_adjustment: number
          trend_direction: string | null
          trend_percentage: number | null
          updated_at: string | null
          user_id: string | null
          vagas: number | null
        }
        Insert: {
          andar?: string | null
          anuncio_fontes?: Json | null
          anuncio_max_m2?: number | null
          anuncio_med_m2?: number | null
          anuncio_min_m2?: number | null
          area_terreno_m2?: number | null
          auto_capped?: boolean | null
          bairro?: string
          banheiros?: number | null
          base_price_custom_m2?: number | null
          base_price_selected?: string | null
          bonus_terreno?: number | null
          combined_max_m2: number
          combined_med_m2: number
          combined_min_m2: number
          complemento?: string | null
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
          nome_condominio?: string | null
          numero?: string | null
          observacoes_imovel?: string | null
          pdf_generated?: boolean | null
          property_area_m2: number
          property_type?: string | null
          proporcao_terreno?: number | null
          proprietario?: string | null
          quartos?: number | null
          recommendation_action?: string | null
          recommendation_details?: Json | null
          recommendation_title?: string | null
          spread_percentage: number
          suites?: number | null
          telefone?: string | null
          total_adjustment: number
          trend_direction?: string | null
          trend_percentage?: number | null
          updated_at?: string | null
          user_id?: string | null
          vagas?: number | null
        }
        Update: {
          andar?: string | null
          anuncio_fontes?: Json | null
          anuncio_max_m2?: number | null
          anuncio_med_m2?: number | null
          anuncio_min_m2?: number | null
          area_terreno_m2?: number | null
          auto_capped?: boolean | null
          bairro?: string
          banheiros?: number | null
          base_price_custom_m2?: number | null
          base_price_selected?: string | null
          bonus_terreno?: number | null
          combined_max_m2?: number
          combined_med_m2?: number
          combined_min_m2?: number
          complemento?: string | null
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
          nome_condominio?: string | null
          numero?: string | null
          observacoes_imovel?: string | null
          pdf_generated?: boolean | null
          property_area_m2?: number
          property_type?: string | null
          proporcao_terreno?: number | null
          proprietario?: string | null
          quartos?: number | null
          recommendation_action?: string | null
          recommendation_details?: Json | null
          recommendation_title?: string | null
          spread_percentage?: number
          suites?: number | null
          telefone?: string | null
          total_adjustment?: number
          trend_direction?: string | null
          trend_percentage?: number | null
          updated_at?: string | null
          user_id?: string | null
          vagas?: number | null
        }
        Relationships: []
      }
      vistoria_checklist_categories: {
        Row: {
          applies_to: string
          category_id: string
          created_at: string | null
          display_order: number
          id: string
          is_active: boolean | null
          title: string
          updated_at: string | null
          weight: number
        }
        Insert: {
          applies_to?: string
          category_id: string
          created_at?: string | null
          display_order: number
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string | null
          weight?: number
        }
        Update: {
          applies_to?: string
          category_id?: string
          created_at?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
          weight?: number
        }
        Relationships: []
      }
      vistoria_checklist_items: {
        Row: {
          category_id: string
          created_at: string | null
          display_order: number
          id: string
          is_active: boolean | null
          item_id: string
          label: string
          tooltip: string | null
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          display_order: number
          id?: string
          is_active?: boolean | null
          item_id: string
          label: string
          tooltip?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          item_id?: string
          label?: string
          tooltip?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vistoria_checklist_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vistoria_checklist_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      vistorias: {
        Row: {
          ajuste_percentual: number | null
          area_m2: number | null
          bairro: string
          banheiros: number | null
          checklist_data: Json | null
          complemento: string | null
          created_at: string
          critical_count: number | null
          data_vistoria: string | null
          final_score: number | null
          id: string
          logradouro: string
          nome_condominio: string | null
          numero: string | null
          observacoes: string | null
          pdf_generated: boolean | null
          progress: number | null
          proprietario: string | null
          quartos: number | null
          suites: number | null
          telefone: string | null
          tipo_imovel: string | null
          tipo_vistoria: string | null
          updated_at: string
          user_id: string | null
          vagas: number | null
          valor_ajustado: number | null
          valor_avaliacao: number | null
          valuation_id: string | null
          vistoriador: string | null
        }
        Insert: {
          ajuste_percentual?: number | null
          area_m2?: number | null
          bairro?: string
          banheiros?: number | null
          checklist_data?: Json | null
          complemento?: string | null
          created_at?: string
          critical_count?: number | null
          data_vistoria?: string | null
          final_score?: number | null
          id?: string
          logradouro: string
          nome_condominio?: string | null
          numero?: string | null
          observacoes?: string | null
          pdf_generated?: boolean | null
          progress?: number | null
          proprietario?: string | null
          quartos?: number | null
          suites?: number | null
          telefone?: string | null
          tipo_imovel?: string | null
          tipo_vistoria?: string | null
          updated_at?: string
          user_id?: string | null
          vagas?: number | null
          valor_ajustado?: number | null
          valor_avaliacao?: number | null
          valuation_id?: string | null
          vistoriador?: string | null
        }
        Update: {
          ajuste_percentual?: number | null
          area_m2?: number | null
          bairro?: string
          banheiros?: number | null
          checklist_data?: Json | null
          complemento?: string | null
          created_at?: string
          critical_count?: number | null
          data_vistoria?: string | null
          final_score?: number | null
          id?: string
          logradouro?: string
          nome_condominio?: string | null
          numero?: string | null
          observacoes?: string | null
          pdf_generated?: boolean | null
          progress?: number | null
          proprietario?: string | null
          quartos?: number | null
          suites?: number | null
          telefone?: string | null
          tipo_imovel?: string | null
          tipo_vistoria?: string | null
          updated_at?: string
          user_id?: string | null
          vagas?: number | null
          valor_ajustado?: number | null
          valor_avaliacao?: number | null
          valuation_id?: string | null
          vistoriador?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vistorias_valuation_id_fkey"
            columns: ["valuation_id"]
            isOneToOne: false
            referencedRelation: "valuations"
            referencedColumns: ["id"]
          },
        ]
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
      view_user_activity_summary: {
        Row: {
          active_days: number | null
          exports: number | null
          first_activity: string | null
          full_name: string | null
          last_activity: string | null
          logins: number | null
          phone: string | null
          searches: number | null
          total_actions: number | null
          user_id: string | null
          valuations: number | null
          vistorias: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_lead_exists: {
        Args: { lead_email: string }
        Returns: {
          current_count: number
          exists_flag: boolean
        }[]
      }
      check_rate_limit: {
        Args: {
          p_function_name: string
          p_identifier: string
          p_max_requests?: number
          p_window_seconds?: number
        }
        Returns: {
          allowed: boolean
          current_count: number
          remaining: number
          reset_at: string
        }[]
      }
      cleanup_rate_limit_logs: { Args: never; Returns: number }
      generate_visit_code: { Args: never; Returns: string }
      get_ficha_by_codigo: {
        Args: { p_codigo: string }
        Returns: {
          codigo: string
          data_visita: string
          endereco_imovel: string
          id: string
          nome_corretor: string
          status: Database["public"]["Enums"]["status_visita"]
        }[]
      }
      get_ficha_for_signature: {
        Args: { p_codigo: string }
        Returns: {
          assinatura_corretor: string
          assinatura_visitante: string
          codigo: string
          data_visita: string
          endereco_imovel: string
          id: string
          nome_corretor: string
          status: Database["public"]["Enums"]["status_visita"]
        }[]
      }
      get_vault_secret: { Args: { secret_name: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_lead_evaluation: {
        Args: { lead_email: string }
        Returns: undefined
      }
      search_bairros_fuzzy: {
        Args: { result_limit?: number; search_term: string }
        Returns: {
          bairro: string
          similarity_score: number
          total_transacoes: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      update_lead_by_email: {
        Args: {
          p_aceita_marketing?: boolean
          p_area_interesse?: number
          p_bairro_interesse?: string
          p_banheiros?: number
          p_diferenciais_imovel?: string
          p_email: string
          p_endereco_imovel_analise?: string
          p_interesse?: string
          p_nome?: string
          p_objetivo?: string
          p_preferencia_contato?: string
          p_quartos?: number
          p_suites?: number
          p_telefone?: string
          p_urgencia?: string
          p_vagas?: number
          p_valor_interesse?: number
          p_valor_pedido_vendedor?: number
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "corretor" | "gerente"
      nivel_interesse_visita: "baixo" | "medio" | "alto" | "muito_alto"
      origem_agendamento:
        | "site"
        | "indicacao"
        | "whatsapp"
        | "instagram"
        | "facebook"
        | "google"
        | "outro"
      percepcao_valor_visita: "abaixo" | "justo" | "acima"
      status_visita: "agendada" | "confirmada" | "realizada" | "cancelada"
      tipo_servico_visita: "visita" | "avaliacao" | "consultoria" | "fotografia"
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
      nivel_interesse_visita: ["baixo", "medio", "alto", "muito_alto"],
      origem_agendamento: [
        "site",
        "indicacao",
        "whatsapp",
        "instagram",
        "facebook",
        "google",
        "outro",
      ],
      percepcao_valor_visita: ["abaixo", "justo", "acima"],
      status_visita: ["agendada", "confirmada", "realizada", "cancelada"],
      tipo_servico_visita: ["visita", "avaliacao", "consultoria", "fotografia"],
      uso_imovel: ["Residencial", "Comercial"],
    },
  },
} as const
