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
          acao_cliente: string | null
          codigo_imovel: string | null
          confirmada_pelo_cliente_at: string | null
          confirmada_pelo_cliente_ip: string | null
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
          motivo_cancelamento_cliente: string | null
          nome_visitante: string
          notas: string | null
          organization_id: string | null
          origem: Database["public"]["Enums"]["origem_agendamento"] | null
          reagendado_para_id: string | null
          status: Database["public"]["Enums"]["status_visita"]
          telefone_visitante: string
          tipo_servico: Database["public"]["Enums"]["tipo_servico_visita"]
          token_confirmacao: string | null
          token_expira_em: string | null
          updated_at: string | null
        }
        Insert: {
          acao_cliente?: string | null
          codigo_imovel?: string | null
          confirmada_pelo_cliente_at?: string | null
          confirmada_pelo_cliente_ip?: string | null
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
          motivo_cancelamento_cliente?: string | null
          nome_visitante: string
          notas?: string | null
          organization_id?: string | null
          origem?: Database["public"]["Enums"]["origem_agendamento"] | null
          reagendado_para_id?: string | null
          status?: Database["public"]["Enums"]["status_visita"]
          telefone_visitante: string
          tipo_servico?: Database["public"]["Enums"]["tipo_servico_visita"]
          token_confirmacao?: string | null
          token_expira_em?: string | null
          updated_at?: string | null
        }
        Update: {
          acao_cliente?: string | null
          codigo_imovel?: string | null
          confirmada_pelo_cliente_at?: string | null
          confirmada_pelo_cliente_ip?: string | null
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
          motivo_cancelamento_cliente?: string | null
          nome_visitante?: string
          notas?: string | null
          organization_id?: string | null
          origem?: Database["public"]["Enums"]["origem_agendamento"] | null
          reagendado_para_id?: string | null
          status?: Database["public"]["Enums"]["status_visita"]
          telefone_visitante?: string
          tipo_servico?: Database["public"]["Enums"]["tipo_servico_visita"]
          token_confirmacao?: string | null
          token_expira_em?: string | null
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
          {
            foreignKeyName: "agendamentos_visita_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_visita_reagendado_para_id_fkey"
            columns: ["reagendado_para_id"]
            isOneToOne: false
            referencedRelation: "agendamentos_visita"
            referencedColumns: ["id"]
          },
        ]
      }
      analista_imobiliario_rate_log: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip_hash: string | null
          status: number
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          ip_hash?: string | null
          status: number
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          ip_hash?: string | null
          status?: number
          user_id?: string
        }
        Relationships: []
      }
      atividades_lead: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          lead_id: string
          metadata: Json | null
          tipo: string
          titulo: string | null
          usuario_id: string | null
          usuario_nome: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          lead_id: string
          metadata?: Json | null
          tipo: string
          titulo?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          lead_id?: string
          metadata?: Json | null
          tipo?: string
          titulo?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atividades_lead_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      autorizacoes_captacao: {
        Row: {
          assinatura_corretor: string | null
          assinatura_proprietario: string | null
          bairro: string
          cep: string | null
          cidade: string
          codigo: string
          complemento: string | null
          corretor_creci: string | null
          corretor_nome: string | null
          created_at: string
          created_by: string | null
          data_assinatura_proprietario: string | null
          data_envio: string | null
          data_recusa: string | null
          data_vencimento: string | null
          data_visualizacao: string | null
          endereco: string
          id: string
          ip_assinatura_proprietario: string | null
          motivo_recusa: string | null
          numero: string | null
          organization_id: string
          pdf_url: string | null
          percentual_honorarios: number
          prazo_dias: number
          proprietario_cpf: string
          proprietario_email: string
          proprietario_nome: string
          proprietario_rg: string | null
          proprietario_rg_orgao: string | null
          proprietario_telefone: string | null
          quartos: number | null
          status: string
          tipo_gestao: string
          token_acesso: string | null
          updated_at: string
          vagas: number | null
          valor_avaliacao: number
          valor_condominio: number | null
          valor_iptu: number | null
          valor_venda: number
          valuation_id: string
        }
        Insert: {
          assinatura_corretor?: string | null
          assinatura_proprietario?: string | null
          bairro: string
          cep?: string | null
          cidade?: string
          codigo: string
          complemento?: string | null
          corretor_creci?: string | null
          corretor_nome?: string | null
          created_at?: string
          created_by?: string | null
          data_assinatura_proprietario?: string | null
          data_envio?: string | null
          data_recusa?: string | null
          data_vencimento?: string | null
          data_visualizacao?: string | null
          endereco: string
          id?: string
          ip_assinatura_proprietario?: string | null
          motivo_recusa?: string | null
          numero?: string | null
          organization_id: string
          pdf_url?: string | null
          percentual_honorarios?: number
          prazo_dias?: number
          proprietario_cpf: string
          proprietario_email: string
          proprietario_nome: string
          proprietario_rg?: string | null
          proprietario_rg_orgao?: string | null
          proprietario_telefone?: string | null
          quartos?: number | null
          status?: string
          tipo_gestao?: string
          token_acesso?: string | null
          updated_at?: string
          vagas?: number | null
          valor_avaliacao: number
          valor_condominio?: number | null
          valor_iptu?: number | null
          valor_venda: number
          valuation_id: string
        }
        Update: {
          assinatura_corretor?: string | null
          assinatura_proprietario?: string | null
          bairro?: string
          cep?: string | null
          cidade?: string
          codigo?: string
          complemento?: string | null
          corretor_creci?: string | null
          corretor_nome?: string | null
          created_at?: string
          created_by?: string | null
          data_assinatura_proprietario?: string | null
          data_envio?: string | null
          data_recusa?: string | null
          data_vencimento?: string | null
          data_visualizacao?: string | null
          endereco?: string
          id?: string
          ip_assinatura_proprietario?: string | null
          motivo_recusa?: string | null
          numero?: string | null
          organization_id?: string
          pdf_url?: string | null
          percentual_honorarios?: number
          prazo_dias?: number
          proprietario_cpf?: string
          proprietario_email?: string
          proprietario_nome?: string
          proprietario_rg?: string | null
          proprietario_rg_orgao?: string | null
          proprietario_telefone?: string | null
          quartos?: number | null
          status?: string
          tipo_gestao?: string
          token_acesso?: string | null
          updated_at?: string
          vagas?: number | null
          valor_avaliacao?: number
          valor_condominio?: number | null
          valor_iptu?: number | null
          valor_venda?: number
          valuation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "autorizacoes_captacao_valuation_id_fkey"
            columns: ["valuation_id"]
            isOneToOne: false
            referencedRelation: "valuations"
            referencedColumns: ["id"]
          },
        ]
      }
      autorizacoes_captacao_eventos: {
        Row: {
          autorizacao_id: string
          created_at: string
          id: string
          ip: string | null
          metadata: Json | null
          tipo: string
          user_agent: string | null
        }
        Insert: {
          autorizacao_id: string
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json | null
          tipo: string
          user_agent?: string | null
        }
        Update: {
          autorizacao_id?: string
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json | null
          tipo?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "autorizacoes_captacao_eventos_autorizacao_id_fkey"
            columns: ["autorizacao_id"]
            isOneToOne: false
            referencedRelation: "autorizacoes_captacao"
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
          andares_predominantes: number | null
          area_lote: number | null
          area_media_unidade_logradouro: number | null
          area_total_construida: number | null
          ativo: boolean
          atualizado_em: string | null
          confianca_identificacao: number | null
          created_at: string | null
          endereco_completo: string | null
          fonte_identificacao: string | null
          geom: unknown
          geom_lote: unknown
          google_editorial_summary: string | null
          google_maps_uri: string | null
          google_photos_refs: string[] | null
          google_place_id: string | null
          google_place_types: string[] | null
          id: string
          latitude: number | null
          logradouro_itbi_normalizado: string | null
          logradouro_padrao: string
          longitude: number | null
          microbairro: string | null
          nome_condominio: string
          numero_fim: number | null
          numero_inicio: number | null
          numero_torres: number | null
          padrao_construtivo: string | null
          preco_medio_m2: number | null
          ruas_internas: string[] | null
          tipologia_predominante: string | null
          total_transacoes_itbi: number | null
          ultima_transacao_itbi: string | null
          unidades_estimadas: number | null
          updated_at: string | null
          valor_venal_estimado: number | null
        }
        Insert: {
          andares_predominantes?: number | null
          area_lote?: number | null
          area_media_unidade_logradouro?: number | null
          area_total_construida?: number | null
          ativo?: boolean
          atualizado_em?: string | null
          confianca_identificacao?: number | null
          created_at?: string | null
          endereco_completo?: string | null
          fonte_identificacao?: string | null
          geom?: unknown
          geom_lote?: unknown
          google_editorial_summary?: string | null
          google_maps_uri?: string | null
          google_photos_refs?: string[] | null
          google_place_id?: string | null
          google_place_types?: string[] | null
          id?: string
          latitude?: number | null
          logradouro_itbi_normalizado?: string | null
          logradouro_padrao: string
          longitude?: number | null
          microbairro?: string | null
          nome_condominio: string
          numero_fim?: number | null
          numero_inicio?: number | null
          numero_torres?: number | null
          padrao_construtivo?: string | null
          preco_medio_m2?: number | null
          ruas_internas?: string[] | null
          tipologia_predominante?: string | null
          total_transacoes_itbi?: number | null
          ultima_transacao_itbi?: string | null
          unidades_estimadas?: number | null
          updated_at?: string | null
          valor_venal_estimado?: number | null
        }
        Update: {
          andares_predominantes?: number | null
          area_lote?: number | null
          area_media_unidade_logradouro?: number | null
          area_total_construida?: number | null
          ativo?: boolean
          atualizado_em?: string | null
          confianca_identificacao?: number | null
          created_at?: string | null
          endereco_completo?: string | null
          fonte_identificacao?: string | null
          geom?: unknown
          geom_lote?: unknown
          google_editorial_summary?: string | null
          google_maps_uri?: string | null
          google_photos_refs?: string[] | null
          google_place_id?: string | null
          google_place_types?: string[] | null
          id?: string
          latitude?: number | null
          logradouro_itbi_normalizado?: string | null
          logradouro_padrao?: string
          longitude?: number | null
          microbairro?: string | null
          nome_condominio?: string
          numero_fim?: number | null
          numero_inicio?: number | null
          numero_torres?: number | null
          padrao_construtivo?: string | null
          preco_medio_m2?: number | null
          ruas_internas?: string[] | null
          tipologia_predominante?: string | null
          total_transacoes_itbi?: number | null
          ultima_transacao_itbi?: string | null
          unidades_estimadas?: number | null
          updated_at?: string | null
          valor_venal_estimado?: number | null
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
          organization_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          corretor_id: string
          created_at?: string | null
          data: string
          horarios_disponiveis?: string[] | null
          id?: string
          organization_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          corretor_id?: string
          created_at?: string | null
          data?: string
          horarios_disponiveis?: string[] | null
          id?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disponibilidade_corretor_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_analyses: {
        Row: {
          alertas: Json | null
          checklist_item: string | null
          confianca: string | null
          created_at: string
          dados_extraidos: Json | null
          expires_at: string | null
          ficha_visita_id: string | null
          file_expires_at: string | null
          file_mime_type: string | null
          file_name: string
          file_path: string | null
          file_size_bytes: number | null
          id: string
          modelo_usado: string | null
          organization_id: string | null
          proximos_passos: Json | null
          raw_response: string | null
          status: string | null
          status_motivo: string | null
          tipo_documento: string | null
          updated_at: string
          user_id: string
          validade: string | null
        }
        Insert: {
          alertas?: Json | null
          checklist_item?: string | null
          confianca?: string | null
          created_at?: string
          dados_extraidos?: Json | null
          expires_at?: string | null
          ficha_visita_id?: string | null
          file_expires_at?: string | null
          file_mime_type?: string | null
          file_name: string
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          modelo_usado?: string | null
          organization_id?: string | null
          proximos_passos?: Json | null
          raw_response?: string | null
          status?: string | null
          status_motivo?: string | null
          tipo_documento?: string | null
          updated_at?: string
          user_id: string
          validade?: string | null
        }
        Update: {
          alertas?: Json | null
          checklist_item?: string | null
          confianca?: string | null
          created_at?: string
          dados_extraidos?: Json | null
          expires_at?: string | null
          ficha_visita_id?: string | null
          file_expires_at?: string | null
          file_mime_type?: string | null
          file_name?: string
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          modelo_usado?: string | null
          organization_id?: string | null
          proximos_passos?: Json | null
          raw_response?: string | null
          status?: string | null
          status_motivo?: string | null
          tipo_documento?: string | null
          updated_at?: string
          user_id?: string
          validade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_analyses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      edificacoes_geo: {
        Row: {
          altura_max: number | null
          andares_estimados: number | null
          area_footprint: number | null
          cod_lote: string | null
          cota_base: number | null
          cota_topo: number | null
          geom: unknown
          id: string
          importado_em: string | null
          lat: number | null
          lng: number | null
          objectid_origem: number | null
          tipo_edificacao: string | null
        }
        Insert: {
          altura_max?: number | null
          andares_estimados?: number | null
          area_footprint?: number | null
          cod_lote?: string | null
          cota_base?: number | null
          cota_topo?: number | null
          geom?: unknown
          id?: string
          importado_em?: string | null
          lat?: number | null
          lng?: number | null
          objectid_origem?: number | null
          tipo_edificacao?: string | null
        }
        Update: {
          altura_max?: number | null
          andares_estimados?: number | null
          area_footprint?: number | null
          cod_lote?: string | null
          cota_base?: number | null
          cota_topo?: number | null
          geom?: unknown
          id?: string
          importado_em?: string | null
          lat?: number | null
          lng?: number | null
          objectid_origem?: number | null
          tipo_edificacao?: string | null
        }
        Relationships: []
      }
      etl_log: {
        Row: {
          bairro: string | null
          detalhes: Json | null
          erro_mensagem: string | null
          finalizado_em: string | null
          fonte: string
          id: string
          iniciado_em: string | null
          registros_atualizados: number | null
          registros_com_erro: number | null
          registros_importados: number | null
          status: string
        }
        Insert: {
          bairro?: string | null
          detalhes?: Json | null
          erro_mensagem?: string | null
          finalizado_em?: string | null
          fonte: string
          id?: string
          iniciado_em?: string | null
          registros_atualizados?: number | null
          registros_com_erro?: number | null
          registros_importados?: number | null
          status: string
        }
        Update: {
          bairro?: string | null
          detalhes?: Json | null
          erro_mensagem?: string | null
          finalizado_em?: string | null
          fonte?: string
          id?: string
          iniciado_em?: string | null
          registros_atualizados?: number | null
          registros_com_erro?: number | null
          registros_importados?: number | null
          status?: string
        }
        Relationships: []
      }
      feedback_corretor_config_fields: {
        Row: {
          created_at: string
          display_order: number
          field_id: string
          field_type: string
          id: string
          is_active: boolean
          is_required: boolean
          label: string
          options: Json | null
          organization_id: string | null
          section_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          field_id: string
          field_type?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          label: string
          options?: Json | null
          organization_id?: string | null
          section_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          field_id?: string
          field_type?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          label?: string
          options?: Json | null
          organization_id?: string | null
          section_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_corretor_config_fields_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_corretor_config_sections: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          organization_id: string | null
          section_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          organization_id?: string | null
          section_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          organization_id?: string | null
          section_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_corretor_config_sections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feedbacks_corretor: {
        Row: {
          corretor_id: string
          created_at: string
          ficha_visita_id: string
          id: string
          notas_gerais: string | null
          organization_id: string | null
          proximos_passos: string | null
          respostas: Json
        }
        Insert: {
          corretor_id: string
          created_at?: string
          ficha_visita_id: string
          id?: string
          notas_gerais?: string | null
          organization_id?: string | null
          proximos_passos?: string | null
          respostas?: Json
        }
        Update: {
          corretor_id?: string
          created_at?: string
          ficha_visita_id?: string
          id?: string
          notas_gerais?: string | null
          organization_id?: string | null
          proximos_passos?: string | null
          respostas?: Json
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_corretor_ficha_visita_id_fkey"
            columns: ["ficha_visita_id"]
            isOneToOne: false
            referencedRelation: "fichas_visita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_corretor_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feedbacks_visita: {
        Row: {
          atende_necessidades: boolean | null
          avaliacao_geral: number | null
          campos_customizados: Json | null
          compraria_imovel: boolean | null
          conexao_imovel: number | null
          created_at: string | null
          efeito_uau: string[] | null
          efeito_uau_detalhe: string | null
          ficha_visita_id: string
          forma_pagamento: string | null
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
          sinal_entrada: number | null
          sugestoes_melhoria: string | null
          valor_financiado: number | null
          valor_ofertaria: number | null
        }
        Insert: {
          atende_necessidades?: boolean | null
          avaliacao_geral?: number | null
          campos_customizados?: Json | null
          compraria_imovel?: boolean | null
          conexao_imovel?: number | null
          created_at?: string | null
          efeito_uau?: string[] | null
          efeito_uau_detalhe?: string | null
          ficha_visita_id: string
          forma_pagamento?: string | null
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
          sinal_entrada?: number | null
          sugestoes_melhoria?: string | null
          valor_financiado?: number | null
          valor_ofertaria?: number | null
        }
        Update: {
          atende_necessidades?: boolean | null
          avaliacao_geral?: number | null
          campos_customizados?: Json | null
          compraria_imovel?: boolean | null
          conexao_imovel?: number | null
          created_at?: string | null
          efeito_uau?: string[] | null
          efeito_uau_detalhe?: string | null
          ficha_visita_id?: string
          forma_pagamento?: string | null
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
          sinal_entrada?: number | null
          sugestoes_melhoria?: string | null
          valor_financiado?: number | null
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
          aceita_ofertas_similares: boolean | null
          acompanhantes: Json | null
          agendamento_id: string | null
          assinatura_corretor: string | null
          assinatura_visitante: string | null
          campos_customizados: Json | null
          codigo: string
          codigo_imovel: string | null
          condominio_edificio: string | null
          corretor_id: string | null
          cpf_visitante: string
          created_at: string | null
          data_visita: string
          email_visitante: string | null
          endereco_imovel: string
          endereco_visitante: string | null
          id: string
          nome_corretor: string
          nome_proprietario: string
          nome_visitante: string
          notas: string | null
          organization_id: string | null
          rg_visitante: string | null
          status: Database["public"]["Enums"]["status_visita"]
          telefone_visitante: string
          unidade_imovel: string | null
          updated_at: string | null
          valor_imovel: number | null
        }
        Insert: {
          aceita_ofertas_similares?: boolean | null
          acompanhantes?: Json | null
          agendamento_id?: string | null
          assinatura_corretor?: string | null
          assinatura_visitante?: string | null
          campos_customizados?: Json | null
          codigo: string
          codigo_imovel?: string | null
          condominio_edificio?: string | null
          corretor_id?: string | null
          cpf_visitante: string
          created_at?: string | null
          data_visita?: string
          email_visitante?: string | null
          endereco_imovel: string
          endereco_visitante?: string | null
          id?: string
          nome_corretor: string
          nome_proprietario: string
          nome_visitante: string
          notas?: string | null
          organization_id?: string | null
          rg_visitante?: string | null
          status?: Database["public"]["Enums"]["status_visita"]
          telefone_visitante: string
          unidade_imovel?: string | null
          updated_at?: string | null
          valor_imovel?: number | null
        }
        Update: {
          aceita_ofertas_similares?: boolean | null
          acompanhantes?: Json | null
          agendamento_id?: string | null
          assinatura_corretor?: string | null
          assinatura_visitante?: string | null
          campos_customizados?: Json | null
          codigo?: string
          codigo_imovel?: string | null
          condominio_edificio?: string | null
          corretor_id?: string | null
          cpf_visitante?: string
          created_at?: string | null
          data_visita?: string
          email_visitante?: string | null
          endereco_imovel?: string
          endereco_visitante?: string | null
          id?: string
          nome_corretor?: string
          nome_proprietario?: string
          nome_visitante?: string
          notas?: string | null
          organization_id?: string | null
          rg_visitante?: string | null
          status?: Database["public"]["Enums"]["status_visita"]
          telefone_visitante?: string
          unidade_imovel?: string | null
          updated_at?: string | null
          valor_imovel?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fichas_visita_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos_visita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fichas_visita_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      form_config_fields: {
        Row: {
          created_at: string | null
          display_order: number
          field_id: string
          field_type: string
          help_text: string | null
          id: string
          is_active: boolean | null
          is_locked: boolean | null
          is_required: boolean | null
          label: string
          modelos: string[] | null
          options: Json | null
          organization_id: string | null
          placeholder: string | null
          section_id: string
          tipo_formulario: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number
          field_id: string
          field_type: string
          help_text?: string | null
          id?: string
          is_active?: boolean | null
          is_locked?: boolean | null
          is_required?: boolean | null
          label: string
          modelos?: string[] | null
          options?: Json | null
          organization_id?: string | null
          placeholder?: string | null
          section_id: string
          tipo_formulario: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number
          field_id?: string
          field_type?: string
          help_text?: string | null
          id?: string
          is_active?: boolean | null
          is_locked?: boolean | null
          is_required?: boolean | null
          label?: string
          modelos?: string[] | null
          options?: Json | null
          organization_id?: string | null
          placeholder?: string | null
          section_id?: string
          tipo_formulario?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_config_fields_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      form_config_sections: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean | null
          organization_id: string | null
          section_id: string
          tipo_formulario: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          section_id: string
          tipo_formulario: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          section_id?: string
          tipo_formulario?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_config_sections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      iptu_2025_logradouro: {
        Row: {
          area_media_unidade: number | null
          area_plane: string | null
          areaconst_res: number | null
          cb_imovel: string | null
          cl: string | null
          cod_rp: string | null
          codra: string | null
          exercicio: number | null
          id: string
          importado_em: string | null
          nome: string | null
          nome_completo: string | null
          objectid: number | null
          regiao_adm: string | null
          rp: string | null
          tipologia: string | null
          tot_imoveis: number | null
          tributacao: string | null
        }
        Insert: {
          area_media_unidade?: number | null
          area_plane?: string | null
          areaconst_res?: number | null
          cb_imovel?: string | null
          cl?: string | null
          cod_rp?: string | null
          codra?: string | null
          exercicio?: number | null
          id?: string
          importado_em?: string | null
          nome?: string | null
          nome_completo?: string | null
          objectid?: number | null
          regiao_adm?: string | null
          rp?: string | null
          tipologia?: string | null
          tot_imoveis?: number | null
          tributacao?: string | null
        }
        Update: {
          area_media_unidade?: number | null
          area_plane?: string | null
          areaconst_res?: number | null
          cb_imovel?: string | null
          cl?: string | null
          cod_rp?: string | null
          codra?: string | null
          exercicio?: number | null
          id?: string
          importado_em?: string | null
          nome?: string | null
          nome_completo?: string | null
          objectid?: number | null
          regiao_adm?: string | null
          rp?: string | null
          tipologia?: string | null
          tot_imoveis?: number | null
          tributacao?: string | null
        }
        Relationships: []
      }
      iptu_imoveis: {
        Row: {
          area_construida: number | null
          area_terreno: number | null
          bairro: string | null
          cod_logradouro: string | null
          complemento: string | null
          fonte: string | null
          geocodificado_via: string | null
          geom: unknown
          id: string
          importado_em: string | null
          inscricao_municipal: string | null
          lat: number | null
          lng: number | null
          logradouro: string | null
          numero: string | null
          tipologia: string | null
          valor_venal: number | null
        }
        Insert: {
          area_construida?: number | null
          area_terreno?: number | null
          bairro?: string | null
          cod_logradouro?: string | null
          complemento?: string | null
          fonte?: string | null
          geocodificado_via?: string | null
          geom?: unknown
          id?: string
          importado_em?: string | null
          inscricao_municipal?: string | null
          lat?: number | null
          lng?: number | null
          logradouro?: string | null
          numero?: string | null
          tipologia?: string | null
          valor_venal?: number | null
        }
        Update: {
          area_construida?: number | null
          area_terreno?: number | null
          bairro?: string | null
          cod_logradouro?: string | null
          complemento?: string | null
          fonte?: string | null
          geocodificado_via?: string | null
          geom?: unknown
          id?: string
          importado_em?: string | null
          inscricao_municipal?: string | null
          lat?: number | null
          lng?: number | null
          logradouro?: string | null
          numero?: string | null
          tipologia?: string | null
          valor_venal?: number | null
        }
        Relationships: []
      }
      iptu_logradouro_resumo: {
        Row: {
          area_media_unidade: number | null
          areaconst_res_oficial: number | null
          atualizado_em: string | null
          bairro: string
          cod_logradouro: string | null
          desconto_venal_percentual: number | null
          geom: unknown
          id: string
          logradouro: string
          logradouro_norm: string | null
          nome_completo_oficial: string | null
          preco_real_medio_itbi: number | null
          tipologia: string | null
          tot_imoveis_oficial: number | null
          total_area_construida: number | null
          total_imoveis: number | null
          total_transacoes_itbi: number | null
          valor_venal_medio: number | null
          valor_venal_total: number | null
        }
        Insert: {
          area_media_unidade?: number | null
          areaconst_res_oficial?: number | null
          atualizado_em?: string | null
          bairro: string
          cod_logradouro?: string | null
          desconto_venal_percentual?: number | null
          geom?: unknown
          id?: string
          logradouro: string
          logradouro_norm?: string | null
          nome_completo_oficial?: string | null
          preco_real_medio_itbi?: number | null
          tipologia?: string | null
          tot_imoveis_oficial?: number | null
          total_area_construida?: number | null
          total_imoveis?: number | null
          total_transacoes_itbi?: number | null
          valor_venal_medio?: number | null
          valor_venal_total?: number | null
        }
        Update: {
          area_media_unidade?: number | null
          areaconst_res_oficial?: number | null
          atualizado_em?: string | null
          bairro?: string
          cod_logradouro?: string | null
          desconto_venal_percentual?: number | null
          geom?: unknown
          id?: string
          logradouro?: string
          logradouro_norm?: string | null
          nome_completo_oficial?: string | null
          preco_real_medio_itbi?: number | null
          tipologia?: string | null
          tot_imoveis_oficial?: number | null
          total_area_construida?: number | null
          total_imoveis?: number | null
          total_transacoes_itbi?: number | null
          valor_venal_medio?: number | null
          valor_venal_total?: number | null
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
          geocodificado_via: string | null
          geom: unknown
          id: string
          lat: number | null
          lng: number | null
          logradouro: string
          logradouro_norm: string | null
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
          geocodificado_via?: string | null
          geom?: unknown
          id?: string
          lat?: number | null
          lng?: number | null
          logradouro: string
          logradouro_norm?: string | null
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
          geocodificado_via?: string | null
          geom?: unknown
          id?: string
          lat?: number | null
          lng?: number | null
          logradouro?: string
          logradouro_norm?: string | null
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
      itbi_transactions_backup_pre_dedupe: {
        Row: {
          area_m2: number | null
          bairro: string | null
          complemento: string | null
          created_at: string | null
          data_transacao: string | null
          geocodificado_via: string | null
          geom: unknown
          id: string | null
          lat: number | null
          lng: number | null
          logradouro: string | null
          logradouro_norm: string | null
          microbairro: string | null
          numero: string | null
          percentual_transferido: number | null
          tipologia: string | null
          total_transacoes: number | null
          updated_at: string | null
          uso: Database["public"]["Enums"]["uso_imovel"] | null
          valor_m2: number | null
          valor_transacao: number | null
        }
        Insert: {
          area_m2?: number | null
          bairro?: string | null
          complemento?: string | null
          created_at?: string | null
          data_transacao?: string | null
          geocodificado_via?: string | null
          geom?: unknown
          id?: string | null
          lat?: number | null
          lng?: number | null
          logradouro?: string | null
          logradouro_norm?: string | null
          microbairro?: string | null
          numero?: string | null
          percentual_transferido?: number | null
          tipologia?: string | null
          total_transacoes?: number | null
          updated_at?: string | null
          uso?: Database["public"]["Enums"]["uso_imovel"] | null
          valor_m2?: number | null
          valor_transacao?: number | null
        }
        Update: {
          area_m2?: number | null
          bairro?: string | null
          complemento?: string | null
          created_at?: string | null
          data_transacao?: string | null
          geocodificado_via?: string | null
          geom?: unknown
          id?: string | null
          lat?: number | null
          lng?: number | null
          logradouro?: string | null
          logradouro_norm?: string | null
          microbairro?: string | null
          numero?: string | null
          percentual_transferido?: number | null
          tipologia?: string | null
          total_transacoes?: number | null
          updated_at?: string | null
          uso?: Database["public"]["Enums"]["uso_imovel"] | null
          valor_m2?: number | null
          valor_transacao?: number | null
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
          estagio_pipeline: string | null
          evaluation_count: number | null
          id: string
          interesse: string | null
          nome: string
          notas: string | null
          objetivo: string | null
          organization_id: string | null
          origem: string | null
          prazo_compra: string | null
          preferencia_contato: string | null
          quartos: number | null
          responsavel_id: string | null
          responsavel_nome: string | null
          score_qualificacao: number | null
          suites: number | null
          tags: Json | null
          telefone: string
          ultimo_contato: string | null
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
          estagio_pipeline?: string | null
          evaluation_count?: number | null
          id?: string
          interesse?: string | null
          nome: string
          notas?: string | null
          objetivo?: string | null
          organization_id?: string | null
          origem?: string | null
          prazo_compra?: string | null
          preferencia_contato?: string | null
          quartos?: number | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          score_qualificacao?: number | null
          suites?: number | null
          tags?: Json | null
          telefone: string
          ultimo_contato?: string | null
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
          estagio_pipeline?: string | null
          evaluation_count?: number | null
          id?: string
          interesse?: string | null
          nome?: string
          notas?: string | null
          objetivo?: string | null
          organization_id?: string | null
          origem?: string | null
          prazo_compra?: string | null
          preferencia_contato?: string | null
          quartos?: number | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          score_qualificacao?: number | null
          suites?: number | null
          tags?: Json | null
          telefone?: string
          ultimo_contato?: string | null
          updated_at?: string
          urgencia?: string | null
          vagas?: number | null
          valor_interesse?: number | null
          valor_pedido_vendedor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      lotes_pal: {
        Row: {
          area_lote: number | null
          bairro: string | null
          geom: unknown
          id: string
          importado_em: string | null
          logradouro: string | null
          num_contribuinte: string | null
          numero: string | null
          objectid_origem: number | null
          paa: string | null
          situacao: string | null
          tipo_parcelamento: string | null
        }
        Insert: {
          area_lote?: number | null
          bairro?: string | null
          geom?: unknown
          id?: string
          importado_em?: string | null
          logradouro?: string | null
          num_contribuinte?: string | null
          numero?: string | null
          objectid_origem?: number | null
          paa?: string | null
          situacao?: string | null
          tipo_parcelamento?: string | null
        }
        Update: {
          area_lote?: number | null
          bairro?: string | null
          geom?: unknown
          id?: string
          importado_em?: string | null
          logradouro?: string | null
          num_contribuinte?: string | null
          numero?: string | null
          objectid_origem?: number | null
          paa?: string | null
          situacao?: string | null
          tipo_parcelamento?: string | null
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
      notas_lead: {
        Row: {
          autor_id: string | null
          autor_nome: string | null
          conteudo: string
          created_at: string | null
          id: string
          lead_id: string
          privada: boolean | null
          updated_at: string | null
        }
        Insert: {
          autor_id?: string | null
          autor_nome?: string | null
          conteudo: string
          created_at?: string | null
          id?: string
          lead_id: string
          privada?: boolean | null
          updated_at?: string | null
        }
        Update: {
          autor_id?: string | null
          autor_nome?: string | null
          conteudo?: string
          created_at?: string | null
          id?: string
          lead_id?: string
          privada?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_lead_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string
          id: string
          lembrete_horas_antes: number
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp_cancelamento?: boolean
          whatsapp_confirmacao?: boolean
          whatsapp_lembrete?: boolean
          whatsapp_reagendamento?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"] | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"] | null
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          cnpj: string | null
          created_at: string
          creci: string | null
          id: string
          logo_url: string | null
          max_users: number | null
          max_valuations_month: number | null
          name: string
          person_type: string | null
          phone: string | null
          plan: string | null
          plan_status: string | null
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          created_at?: string
          creci?: string | null
          id?: string
          logo_url?: string | null
          max_users?: number | null
          max_valuations_month?: number | null
          name: string
          person_type?: string | null
          phone?: string | null
          plan?: string | null
          plan_status?: string | null
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          created_at?: string
          creci?: string | null
          id?: string
          logo_url?: string | null
          max_users?: number | null
          max_valuations_month?: number | null
          name?: string
          person_type?: string | null
          phone?: string | null
          plan?: string | null
          plan_status?: string | null
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      parecer_nucleo_rate_log: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip_hash: string | null
          status: number
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          ip_hash?: string | null
          status: number
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          ip_hash?: string | null
          status?: number
          user_id?: string
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
            foreignKeyName: "pricing_strategies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas_compra: {
        Row: {
          aceite_vendedor_assinatura: string | null
          aceite_vendedor_cpf: string | null
          aceite_vendedor_data: string | null
          aceite_vendedor_nome: string | null
          assinatura_proponente: string | null
          cidade_uf: string | null
          cnh_url: string | null
          codigo: string
          cpf_cnpj: string
          created_at: string | null
          data_hora: string | null
          email: string | null
          endereco_resumido: string
          ficha_visita_id: string | null
          financiamento: string | null
          forma_aceite: string | null
          id: string
          matricula: string | null
          modelo: string
          moeda: string | null
          nome_completo: string
          numero_proposta: string | null
          organization_id: string | null
          outras_condicoes: string | null
          parcelas: string | null
          sinal_entrada: string | null
          status: string | null
          telefone: string
          unidade: string | null
          updated_at: string | null
          validade_proposta: string | null
          valor_ofertado: number | null
        }
        Insert: {
          aceite_vendedor_assinatura?: string | null
          aceite_vendedor_cpf?: string | null
          aceite_vendedor_data?: string | null
          aceite_vendedor_nome?: string | null
          assinatura_proponente?: string | null
          cidade_uf?: string | null
          cnh_url?: string | null
          codigo: string
          cpf_cnpj: string
          created_at?: string | null
          data_hora?: string | null
          email?: string | null
          endereco_resumido: string
          ficha_visita_id?: string | null
          financiamento?: string | null
          forma_aceite?: string | null
          id?: string
          matricula?: string | null
          modelo?: string
          moeda?: string | null
          nome_completo: string
          numero_proposta?: string | null
          organization_id?: string | null
          outras_condicoes?: string | null
          parcelas?: string | null
          sinal_entrada?: string | null
          status?: string | null
          telefone: string
          unidade?: string | null
          updated_at?: string | null
          validade_proposta?: string | null
          valor_ofertado?: number | null
        }
        Update: {
          aceite_vendedor_assinatura?: string | null
          aceite_vendedor_cpf?: string | null
          aceite_vendedor_data?: string | null
          aceite_vendedor_nome?: string | null
          assinatura_proponente?: string | null
          cidade_uf?: string | null
          cnh_url?: string | null
          codigo?: string
          cpf_cnpj?: string
          created_at?: string | null
          data_hora?: string | null
          email?: string | null
          endereco_resumido?: string
          ficha_visita_id?: string | null
          financiamento?: string | null
          forma_aceite?: string | null
          id?: string
          matricula?: string | null
          modelo?: string
          moeda?: string | null
          nome_completo?: string
          numero_proposta?: string | null
          organization_id?: string | null
          outras_condicoes?: string | null
          parcelas?: string | null
          sinal_entrada?: string | null
          status?: string | null
          telefone?: string
          unidade?: string | null
          updated_at?: string | null
          validade_proposta?: string | null
          valor_ofertado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "propostas_compra_ficha_visita_id_fkey"
            columns: ["ficha_visita_id"]
            isOneToOne: false
            referencedRelation: "fichas_visita"
            referencedColumns: ["id"]
          },
        ]
      }
      proprietarios_multiplos: {
        Row: {
          bairros_atuacao: string[] | null
          id: string
          identificado_em: string | null
          inscricoes_municipais: string[] | null
          nome_contribuinte: string | null
          quantidade_imoveis: number | null
          valor_venal_total: number | null
        }
        Insert: {
          bairros_atuacao?: string[] | null
          id?: string
          identificado_em?: string | null
          inscricoes_municipais?: string[] | null
          nome_contribuinte?: string | null
          quantidade_imoveis?: number | null
          valor_venal_total?: number | null
        }
        Update: {
          bairros_atuacao?: string[] | null
          id?: string
          identificado_em?: string | null
          inscricoes_municipais?: string[] | null
          nome_contribuinte?: string | null
          quantidade_imoveis?: number | null
          valor_venal_total?: number | null
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
          source?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sofia_knowledge_base_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      tarefas: {
        Row: {
          created_at: string | null
          data_conclusao: string | null
          data_vencimento: string | null
          descricao: string | null
          id: string
          lead_id: string | null
          organization_id: string | null
          prioridade: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          status: string | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_conclusao?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          lead_id?: string | null
          organization_id?: string | null
          prioridade?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          status?: string | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_conclusao?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          lead_id?: string | null
          organization_id?: string | null
          prioridade?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          status?: string | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      torres_condominios: {
        Row: {
          altura: number | null
          andares: number | null
          area_footprint: number | null
          condominio_id: string | null
          criado_em: string | null
          edificacao_id: string | null
          geom: unknown
          id: string
          lat: number | null
          lng: number | null
          nome_torre: string | null
          numero_torre: number | null
          unidades_estimadas: number | null
        }
        Insert: {
          altura?: number | null
          andares?: number | null
          area_footprint?: number | null
          condominio_id?: string | null
          criado_em?: string | null
          edificacao_id?: string | null
          geom?: unknown
          id?: string
          lat?: number | null
          lng?: number | null
          nome_torre?: string | null
          numero_torre?: number | null
          unidades_estimadas?: number | null
        }
        Update: {
          altura?: number | null
          andares?: number | null
          area_footprint?: number | null
          condominio_id?: string | null
          criado_em?: string | null
          edificacao_id?: string | null
          geom?: unknown
          id?: string
          lat?: number | null
          lng?: number | null
          nome_torre?: string | null
          numero_torre?: number | null
          unidades_estimadas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "torres_condominios_condominio_id_fkey"
            columns: ["condominio_id"]
            isOneToOne: false
            referencedRelation: "condominios_mapeamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "torres_condominios_edificacao_id_fkey"
            columns: ["edificacao_id"]
            isOneToOne: false
            referencedRelation: "edificacoes_geo"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          action_details: Json | null
          action_type: string
          created_at: string
          id: string
          organization_id: string | null
          page_path: string | null
          user_id: string
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          created_at?: string
          id?: string
          organization_id?: string | null
          page_path?: string | null
          user_id: string
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          created_at?: string
          id?: string
          organization_id?: string | null
          page_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
          updated_at?: string | null
          weight_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "valuation_characteristics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
          severity?: string
          status_code?: string
          status_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "valuation_documentation_factors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          cep: string | null
          cidade: string | null
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
          organization_id: string | null
          pdf_generated: boolean | null
          property_area_m2: number
          property_type: string | null
          proporcao_terreno: number | null
          proprietario: string | null
          proprietario_cpf: string | null
          proprietario_email: string | null
          proprietario_nome: string | null
          proprietario_rg: string | null
          proprietario_rg_orgao: string | null
          public_pdf_url: string | null
          quartos: number | null
          recommendation_action: string | null
          recommendation_details: Json | null
          recommendation_title: string | null
          spread_percentage: number
          suites: number | null
          telefone: string | null
          tipo_avaliacao: string | null
          total_adjustment: number
          trend_direction: string | null
          trend_percentage: number | null
          updated_at: string | null
          user_id: string | null
          vagas: number | null
          valor_condominio: number | null
          valor_iptu: number | null
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
          cep?: string | null
          cidade?: string | null
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
          organization_id?: string | null
          pdf_generated?: boolean | null
          property_area_m2: number
          property_type?: string | null
          proporcao_terreno?: number | null
          proprietario?: string | null
          proprietario_cpf?: string | null
          proprietario_email?: string | null
          proprietario_nome?: string | null
          proprietario_rg?: string | null
          proprietario_rg_orgao?: string | null
          public_pdf_url?: string | null
          quartos?: number | null
          recommendation_action?: string | null
          recommendation_details?: Json | null
          recommendation_title?: string | null
          spread_percentage: number
          suites?: number | null
          telefone?: string | null
          tipo_avaliacao?: string | null
          total_adjustment: number
          trend_direction?: string | null
          trend_percentage?: number | null
          updated_at?: string | null
          user_id?: string | null
          vagas?: number | null
          valor_condominio?: number | null
          valor_iptu?: number | null
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
          cep?: string | null
          cidade?: string | null
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
          organization_id?: string | null
          pdf_generated?: boolean | null
          property_area_m2?: number
          property_type?: string | null
          proporcao_terreno?: number | null
          proprietario?: string | null
          proprietario_cpf?: string | null
          proprietario_email?: string | null
          proprietario_nome?: string | null
          proprietario_rg?: string | null
          proprietario_rg_orgao?: string | null
          public_pdf_url?: string | null
          quartos?: number | null
          recommendation_action?: string | null
          recommendation_details?: Json | null
          recommendation_title?: string | null
          spread_percentage?: number
          suites?: number | null
          telefone?: string | null
          tipo_avaliacao?: string | null
          total_adjustment?: number
          trend_direction?: string | null
          trend_percentage?: number | null
          updated_at?: string | null
          user_id?: string | null
          vagas?: number | null
          valor_condominio?: number | null
          valor_iptu?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "valuations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      visita_confirmacao_eventos: {
        Row: {
          agendamento_id: string
          created_at: string
          id: string
          ip: string | null
          metadata: Json | null
          tipo: string
          user_agent: string | null
        }
        Insert: {
          agendamento_id: string
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json | null
          tipo: string
          user_agent?: string | null
        }
        Update: {
          agendamento_id?: string
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json | null
          tipo?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visita_confirmacao_eventos_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos_visita"
            referencedColumns: ["id"]
          },
        ]
      }
      vistoria_checklist_categories: {
        Row: {
          applies_to: string
          category_id: string
          created_at: string | null
          display_order: number
          id: string
          is_active: boolean | null
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
          title?: string
          updated_at?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "vistoria_checklist_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
          {
            foreignKeyName: "vistoria_checklist_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
            foreignKeyName: "vistorias_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vistorias_valuation_id_fkey"
            columns: ["valuation_id"]
            isOneToOne: false
            referencedRelation: "valuations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_message_logs: {
        Row: {
          created_at: string
          dados_contexto: Json | null
          erro_mensagem: string | null
          id: string
          mensagem_texto: string | null
          message_id_externo: string | null
          organization_id: string | null
          resposta_api: Json | null
          status_envio: string
          telefone_destino: string
          tipo_mensagem: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          dados_contexto?: Json | null
          erro_mensagem?: string | null
          id?: string
          mensagem_texto?: string | null
          message_id_externo?: string | null
          organization_id?: string | null
          resposta_api?: Json | null
          status_envio?: string
          telefone_destino: string
          tipo_mensagem: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          dados_contexto?: Json | null
          erro_mensagem?: string | null
          id?: string
          mensagem_texto?: string | null
          message_id_externo?: string | null
          organization_id?: string | null
          resposta_api?: Json | null
          status_envio?: string
          telefone_destino?: string
          tipo_mensagem?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
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
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      atualizar_resumo_logradouros: { Args: never; Returns: Json }
      calcular_area_edificacoes_pendentes: { Args: never; Returns: number }
      calcular_centroids_edificacoes_pendentes: { Args: never; Returns: number }
      calculate_footprint_areas: { Args: never; Returns: number }
      calculate_lote_areas: { Args: never; Returns: number }
      check_lead_exists: {
        Args: { lead_email: string }
        Returns: {
          current_count: number
          exists_flag: boolean
        }[]
      }
      check_org_limits: {
        Args: { _org_id: string; _resource_type: string }
        Returns: {
          allowed: boolean
          current_count: number
          max_allowed: number
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
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      enriquecer_condominios_com_itbi:
        | { Args: { p_limite?: number }; Returns: Json }
        | { Args: { p_limite?: number; p_offset?: number }; Returns: Json }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      generate_visit_code: { Args: never; Returns: string }
      geocodificacao_status: { Args: { p_bairro?: string }; Returns: Json }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_condo_itbi_history: {
        Args: { p_lat: number; p_lng: number; p_raio?: number }
        Returns: {
          agrupamento: string
          periodo: string
          preco_medio_m2: number
          transacoes: number
        }[]
      }
      get_condominios_bbox: {
        Args: {
          p_east: number
          p_limit?: number
          p_north: number
          p_south: number
          p_west: number
        }
        Returns: {
          area_lote: number
          area_total_construida: number
          confianca_identificacao: number
          fonte_identificacao: string
          id: string
          latitude: number
          logradouro_padrao: string
          longitude: number
          nome_condominio: string
          numero_torres: number
          padrao_construtivo: string
          preco_medio_m2: number
          total_transacoes_itbi: number
          ultima_transacao_itbi: string
          unidades_estimadas: number
          valor_venal_estimado: number
        }[]
      }
      get_corretores_list: {
        Args: never
        Returns: {
          creci: string
          email: string
          full_name: string
          id: string
          phone: string
        }[]
      }
      get_coverage_stats: {
        Args: never
        Returns: {
          condominios_com_itbi: number
          condominios_com_logradouro: number
          condominios_total: number
          edificacoes_com_area: number
          edificacoes_total: number
          iptu_logradouros: number
          lotes_total: number
        }[]
      }
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
      get_ficha_publica: {
        Args: { p_codigo: string }
        Returns: {
          codigo: string
          codigo_imovel: string
          condominio_edificio: string
          data_visita: string
          endereco_imovel: string
          nome_corretor: string
          nome_proprietario: string
          nome_visitante: string
          observacoes: string
          status: Database["public"]["Enums"]["status_visita"]
          tem_assinatura_corretor: boolean
          tem_assinatura_visitante: boolean
          unidade_imovel: string
          valor_imovel: number
        }[]
      }
      get_logradouros_sem_geo: {
        Args: { p_limite?: number }
        Returns: {
          logradouro: string
          logradouro_norm: string
        }[]
      }
      get_lotes_pal_bbox: {
        Args: {
          p_east: number
          p_limit?: number
          p_north: number
          p_south: number
          p_west: number
        }
        Returns: {
          area_lote: number
          geom_geojson: Json
          id: string
          logradouro: string
        }[]
      }
      get_plan_max_users: { Args: { _plan: string }; Returns: number }
      get_territorial_kpis: {
        Args: never
        Returns: {
          com_historico_precos: number
          preco_medio_m2_barra: number
          total_condominios: number
          unidades_mapeadas: number
        }[]
      }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      get_vault_secret: { Args: { secret_name: string }; Returns: string }
      gettransactionid: { Args: never; Returns: unknown }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      identificar_condominios_pal: { Args: never; Returns: Json }
      increment_lead_evaluation: {
        Args: { lead_email: string }
        Returns: undefined
      }
      limpar_torres_algoritmo: { Args: never; Returns: undefined }
      longtransactionsenabled: { Args: never; Returns: boolean }
      lookup_invite_by_token: {
        Args: { p_token: string }
        Returns: {
          accepted_at: string
          email: string
          expires_at: string
          id: string
          organization_name: string
          role: string
        }[]
      }
      normalizar_logradouro: { Args: { texto: string }; Returns: string }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      processar_iptu_2025: { Args: never; Returns: Json }
      recalcular_unidades_estimadas: { Args: never; Returns: Json }
      search_bairros_fuzzy: {
        Args: { result_limit?: number; search_term: string }
        Returns: {
          bairro: string
          similarity_score: number
          total_transacoes: number
        }[]
      }
      seed_proposta_compra_for_org: {
        Args: { _org_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      update_iptu_geom: {
        Args: { p_id: string; p_lat: number; p_lng: number }
        Returns: undefined
      }
      update_itbi_geom: {
        Args: { p_id: string; p_lat: number; p_lng: number }
        Returns: undefined
      }
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
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      upsert_edificacao_geo:
        | {
            Args: {
              p_altura_max?: number
              p_andares?: number
              p_area?: number
              p_cod_lote?: string
              p_cota_base?: number
              p_cota_topo?: number
              p_geojson?: string
              p_lat?: number
              p_lng?: number
              p_objectid: number
              p_tipo_edificacao?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_altura_max: number
              p_andares: number
              p_area: number
              p_geojson: string
              p_lat: number
              p_lng: number
              p_objectid: number
            }
            Returns: undefined
          }
      upsert_iptu_imovel: {
        Args: {
          p_area_construida: number
          p_area_terreno: number
          p_bairro: string
          p_cod_logradouro: string
          p_complemento: string
          p_fonte?: string
          p_inscricao: string
          p_lat: number
          p_lng: number
          p_logradouro: string
          p_numero: string
          p_tipologia: string
          p_valor_venal: number
        }
        Returns: undefined
      }
      upsert_iptu_logradouro_resumo: {
        Args: {
          p_bairro: string
          p_cod_logradouro?: string
          p_logradouro: string
          p_tipologia: string
          p_total_area_construida: number
          p_total_imoveis: number
        }
        Returns: undefined
      }
      upsert_lote_pal:
        | {
            Args: {
              p_area_lote: number
              p_bairro: string
              p_geojson: string
              p_logradouro: string
              p_num_contribuinte: string
              p_numero: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_area_lote?: number
              p_bairro?: string
              p_geojson?: string
              p_logradouro?: string
              p_num_contribuinte?: string
              p_numero?: string
              p_objectid_origem: number
              p_paa?: string
              p_situacao?: string
              p_tipo_parcelamento?: string
            }
            Returns: undefined
          }
    }
    Enums: {
      app_role: "admin" | "corretor" | "gerente" | "superadmin"
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
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      app_role: ["admin", "corretor", "gerente", "superadmin"],
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
