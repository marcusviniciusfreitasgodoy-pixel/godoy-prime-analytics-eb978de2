import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ValuationState } from "@/types/valuation";
import { CombinedPrices } from "@/utils/valuationCalculations";
import { useAuth } from "@/hooks/useAuth";

interface UseDraftValuationOptions {
  state: ValuationState;
  combined: CombinedPrices | null;
  enabled: boolean;
  debounceMs?: number;
}

interface DraftValuationResult {
  draftId: string | null;
  isCreating: boolean;
  error: string | null;
}

/**
 * Hook para criar e gerenciar rascunhos de avaliações (novas avaliações).
 * Cria um rascunho assim que dados mínimos são preenchidos.
 */
export function useDraftValuation({
  state,
  combined,
  enabled,
  debounceMs = 800,
}: UseDraftValuationOptions): DraftValuationResult {
  const { user } = useAuth();
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasCreatedRef = useRef(false);
  const lastStateRef = useRef<string>("");

  // Verifica se há dados mínimos para criar rascunho
  const hasMinimumData = useCallback(() => {
    return (
      state.logradouro.trim().length >= 3 ||
      state.bairro.trim().length >= 3 ||
      state.tipoImovel !== "" ||
      state.area_m2 > 0
    );
  }, [state.logradouro, state.bairro, state.tipoImovel, state.area_m2]);

  // Cria o rascunho inicial
  const createDraft = useCallback(async () => {
    if (!user?.id || !enabled || hasCreatedRef.current || !hasMinimumData()) return;

    setIsCreating(true);
    setError(null);

    try {
      const payload = {
        user_id: user.id,
        logradouro: state.logradouro || "Rascunho",
        bairro: state.bairro || "BARRA DA TIJUCA",
        property_area_m2: state.area_m2 || 0,
        property_type: state.tipoImovel || null,
        numero: state.numero || null,
        complemento: state.complemento || null,
        nome_condominio: state.nomeCondominio || null,
        quartos: state.quartos ?? null,
        suites: state.suites ?? null,
        banheiros: state.banheiros ?? null,
        vagas: state.vagas ?? null,
        andar: state.andar || null,
        proprietario: state.proprietario || null,
        telefone: state.telefone || null,
        observacoes_imovel: state.observacoesImovel || null,
        // Valores padrão obrigatórios
        itbi_min_m2: state.itbiData?.min_m2 || 0,
        itbi_med_m2: state.itbiData?.med_m2 || 0,
        itbi_max_m2: state.itbiData?.max_m2 || 0,
        itbi_transaction_count: state.itbiData?.transaction_count || 0,
        anuncio_min_m2: state.anuncioData?.min_m2 || null,
        anuncio_med_m2: state.anuncioData?.med_m2 || null,
        anuncio_max_m2: state.anuncioData?.max_m2 || null,
        anuncio_fontes: state.anuncioData?.fontes
          ? JSON.parse(JSON.stringify(state.anuncioData.fontes))
          : null,
        combined_min_m2: combined?.min_m2 || 0,
        combined_med_m2: combined?.med_m2 || 0,
        combined_max_m2: combined?.max_m2 || 0,
        documentation_status: state.docStatus || "ok",
        documentation_factor: state.docFactor ?? 1,
        documentation_notes: state.docNotes || null,
        bonus_terreno: state.bonus_terreno ?? null,
        area_terreno_m2: state.area_terreno_m2 ?? null,
        proporcao_terreno: state.proporcao_terreno ?? null,
        base_price_selected: state.baseSelected || "med",
        // Valores finais zerados (serão calculados depois)
        final_value_min: 0,
        final_value_med: 0,
        final_value_max: 0,
        total_adjustment: 0,
        spread_percentage: 0,
        confidence_score: 0,
        confidence_level: "baixo",
      };

      const { data, error: insertError } = await supabase
        .from("valuations")
        .insert(payload)
        .select("id")
        .single();

      if (insertError) throw insertError;

      hasCreatedRef.current = true;
      setDraftId(data.id);
    } catch (err) {
      console.error("Error creating draft valuation:", err);
      setError(err instanceof Error ? err.message : "Erro ao criar rascunho");
    } finally {
      setIsCreating(false);
    }
  }, [user?.id, enabled, state, combined, hasMinimumData]);

  // Atualiza o rascunho existente
  const updateDraft = useCallback(async () => {
    if (!draftId || !user?.id || !enabled) return;

    const stateHash = JSON.stringify({
      logradouro: state.logradouro,
      numero: state.numero,
      bairro: state.bairro,
      area_m2: state.area_m2,
      tipoImovel: state.tipoImovel,
      complemento: state.complemento,
      nomeCondominio: state.nomeCondominio,
      quartos: state.quartos,
      suites: state.suites,
      banheiros: state.banheiros,
      vagas: state.vagas,
      andar: state.andar,
      proprietario: state.proprietario,
      telefone: state.telefone,
      observacoesImovel: state.observacoesImovel,
      docStatus: state.docStatus,
      docFactor: state.docFactor,
      docNotes: state.docNotes,
      baseSelected: state.baseSelected,
      area_terreno_m2: state.area_terreno_m2,
      bonus_terreno: state.bonus_terreno,
      itbiData: state.itbiData,
      anuncioData: state.anuncioData,
      responses: state.responses,
    });

    // Evita salvar se nada mudou
    if (stateHash === lastStateRef.current) return;

    try {
      const payload = {
        logradouro: state.logradouro || "Rascunho",
        numero: state.numero || null,
        bairro: state.bairro,
        property_area_m2: state.area_m2,
        property_type: state.tipoImovel || null,
        complemento: state.complemento || null,
        nome_condominio: state.nomeCondominio || null,
        quartos: state.quartos ?? null,
        suites: state.suites ?? null,
        banheiros: state.banheiros ?? null,
        vagas: state.vagas ?? null,
        andar: state.andar || null,
        proprietario: state.proprietario || null,
        telefone: state.telefone || null,
        observacoes_imovel: state.observacoesImovel || null,
        itbi_min_m2: state.itbiData?.min_m2 || 0,
        itbi_med_m2: state.itbiData?.med_m2 || 0,
        itbi_max_m2: state.itbiData?.max_m2 || 0,
        itbi_transaction_count: state.itbiData?.transaction_count || 0,
        anuncio_min_m2: state.anuncioData?.min_m2 || null,
        anuncio_med_m2: state.anuncioData?.med_m2 || null,
        anuncio_max_m2: state.anuncioData?.max_m2 || null,
        anuncio_fontes: state.anuncioData?.fontes
          ? JSON.parse(JSON.stringify(state.anuncioData.fontes))
          : null,
        combined_min_m2: combined?.min_m2 || state.itbiData?.min_m2 || 0,
        combined_med_m2: combined?.med_m2 || state.itbiData?.med_m2 || 0,
        combined_max_m2: combined?.max_m2 || state.itbiData?.max_m2 || 0,
        documentation_status: state.docStatus || "ok",
        documentation_factor: state.docFactor ?? 1,
        documentation_notes: state.docNotes || null,
        bonus_terreno: state.bonus_terreno ?? null,
        area_terreno_m2: state.area_terreno_m2 ?? null,
        proporcao_terreno: state.proporcao_terreno ?? null,
        base_price_selected: state.baseSelected || "med",
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("valuations")
        .update(payload)
        .eq("id", draftId);

      if (updateError) throw updateError;

      // Salva as respostas (se houver)
      if (state.responses && state.responses.length > 0) {
        await supabase
          .from("valuation_responses")
          .delete()
          .eq("valuation_id", draftId);

        const responsesData = state.responses.map((r) => ({
          valuation_id: draftId,
          characteristic_id: r.char_id,
          response_value: r.response,
          weight_applied: r.weight_applied,
        }));

        await supabase.from("valuation_responses").insert(responsesData);
      }

      lastStateRef.current = stateHash;
    } catch (err) {
      console.error("Error updating draft valuation:", err);
      setError(err instanceof Error ? err.message : "Erro ao atualizar rascunho");
    }
  }, [draftId, user?.id, state, combined, enabled]);

  // Mesma proteção do auto-save: os callbacks dependem do objeto `state` e mudam a
  // cada render; sem o ref, o efeito reiniciaria o debounce indefinidamente.
  const createRef = useRef(createDraft);
  createRef.current = createDraft;
  const updateRef = useRef(updateDraft);
  updateRef.current = updateDraft;
  const minimumRef = useRef(hasMinimumData);
  minimumRef.current = hasMinimumData;

  // Debounce effect para criar ou atualizar
  useEffect(() => {
    if (!enabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (!hasCreatedRef.current && minimumRef.current()) {
        createRef.current();
      } else if (draftId) {
        updateRef.current();
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    state.logradouro,
    state.numero,
    state.area_m2,
    state.tipoImovel,
    state.complemento,
    state.nomeCondominio,
    state.quartos,
    state.suites,
    state.banheiros,
    state.vagas,
    state.andar,
    state.proprietario,
    state.telefone,
    state.observacoesImovel,
    state.docStatus,
    state.docFactor,
    state.docNotes,
    state.baseSelected,
    state.area_terreno_m2,
    state.bonus_terreno,
    state.itbiData,
    state.anuncioData,
    state.responses,
    enabled,
    debounceMs,
    draftId,
  ]);

  return { draftId, isCreating, error };
}
