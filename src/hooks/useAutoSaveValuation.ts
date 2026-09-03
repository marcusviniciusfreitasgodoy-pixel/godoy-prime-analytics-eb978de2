import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ValuationState } from "@/types/valuation";
import { CombinedPrices } from "@/utils/valuationCalculations";
import { useAuth } from "@/hooks/useAuth";

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutoSaveValuationOptions {
  valuationId?: string;
  state: ValuationState;
  combined: CombinedPrices | null;
  enabled: boolean;
  debounceMs?: number;
}

interface AutoSaveResult {
  status: AutoSaveStatus;
  lastSavedAt: Date | null;
  error: string | null;
  forceSave: () => Promise<void>;
}

/**
 * Hook para auto-save de avaliações com debounce.
 * Salva automaticamente quando o state muda (durante edição).
 */
export function useAutoSaveValuation({
  valuationId,
  state,
  combined,
  enabled,
  debounceMs = 800,
}: UseAutoSaveValuationOptions): AutoSaveResult {
  const { user } = useAuth();
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastStateRef = useRef<string>("");

  const saveToDatabase = useCallback(async () => {
    if (!valuationId || !user?.id || !enabled) return;

    // Serializa state para comparar se houve mudança real
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
    if (stateHash === lastStateRef.current) {
      return;
    }

    setStatus("saving");
    setError(null);

    try {
      const payload = {
        logradouro: state.logradouro,
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
        .eq("id", valuationId);

      if (updateError) throw updateError;

      // Salva as respostas (se houver)
      if (state.responses && state.responses.length > 0) {
        // Deleta as antigas
        await supabase
          .from("valuation_responses")
          .delete()
          .eq("valuation_id", valuationId);

        // Insere as novas
        const responsesData = state.responses.map((r) => ({
          valuation_id: valuationId,
          characteristic_id: r.char_id,
          response_value: r.response,
          weight_applied: r.weight_applied,
        }));

        const { error: responsesError } = await supabase
          .from("valuation_responses")
          .insert(responsesData);

        if (responsesError) throw responsesError;
      }

      lastStateRef.current = stateHash;
      setLastSavedAt(new Date());
      setStatus("saved");

      // Volta para "idle" após 2s para não ficar "saved" eternamente
      setTimeout(() => {
        setStatus((prev) => (prev === "saved" ? "idle" : prev));
      }, 2000);
    } catch (err) {
      console.error("Auto-save error:", err);
      setError(err instanceof Error ? err.message : "Erro ao salvar");
      setStatus("error");
    }
  }, [valuationId, user?.id, state, combined, enabled]);

  // O callback muda a cada render (depende de `state`). Guardá-lo em um ref evita
  // que o efeito de debounce seja recriado e o timer reiniciado a cada render —
  // era isso que fazia o indicador "Salvando..." piscar sem parar.
  const saveRef = useRef(saveToDatabase);
  saveRef.current = saveToDatabase;

  // Debounce effect
  useEffect(() => {
    if (!enabled || !valuationId) return;

    // Limpa timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Agenda novo save
    timeoutRef.current = setTimeout(() => {
      saveRef.current();
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
    valuationId,
    debounceMs,
  ]);

  const forceSave = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    await saveToDatabase();
  }, [saveToDatabase]);

  return { status, lastSavedAt, error, forceSave };
}
