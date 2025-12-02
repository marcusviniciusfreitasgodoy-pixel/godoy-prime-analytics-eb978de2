import { createClient } from '@supabase/supabase-js';

export type Database = {
  public: {
    Tables: {
      condominios_mapeamento: {
        Row: {
          id: string;
          nome_condominio: string | null;
          logradouro_padrao: string | null;
          numero_inicio: number | null;
          numero_fim: number | null;
          microbairo: string | null;
          padrao_construtivo: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome_condominio?: string | null;
          logradouro_padrao?: string | null;
          numero_inicio?: number | null;
          numero_fim?: number | null;
          microbairo?: string | null;
          padrao_construtivo?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nome_condominio?: string | null;
          logradouro_padrao?: string | null;
          numero_inicio?: number | null;
          numero_fim?: number | null;
          microbairo?: string | null;
          padrao_construtivo?: string | null;
          created_at?: string;
        };
      };
    };
  };
};

const supabaseUrl = 'https://wlnwspjobfdjftyffqne.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbndzcGpvYmZkamZ0eWZmcW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNjcyMDAsImV4cCI6MjA3OTg0MzIwMH0.GKv8C3Y8ZKl0nYhPXYylKw-Ldl5mNacDtwvh6ntvQtY';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
