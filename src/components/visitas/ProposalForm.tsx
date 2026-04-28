import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { CNHUpload } from "./CNHUpload";
import { PublicSignatureCanvas } from "./PublicSignatureCanvas";
import { ProposalModelSelector } from "./ProposalModelSelector";
import { DynamicFieldRenderer } from "@/components/forms/DynamicFieldRenderer";
import { useFormConfig, type FormConfigField } from "@/hooks/useFormConfig";
import { usePropostas } from "@/hooks/usePropostas";
import { PropostaPreFill } from "@/types/proposta";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface ProposalFormProps {
  preFill?: PropostaPreFill;
  onSuccess?: () => void;
  standalone?: boolean;
}

// Campos cujo valor é monetário e devem usar CurrencyInput
const CURRENCY_FIELDS = new Set(["valor_ofertado", "sinal_entrada", "financiamento"]);

// Mapeamento dos field_id da configuração -> coluna na tabela propostas_compra
const PERSIST_KEYS = new Set([
  "nome_completo",
  "cpf_cnpj",
  "telefone",
  "email",
  "endereco_resumido",
  "unidade",
  "matricula",
  "valor_ofertado",
  "sinal_entrada",
  "parcelas",
  "financiamento",
  "outras_condicoes",
  "cidade_uf",
  "numero_proposta",
  "validade_proposta",
  "forma_aceite",
]);

function parseCurrency(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).replace(/\D/g, "");
  if (!s) return null;
  return parseFloat(s);
}

export function ProposalForm({ preFill, onSuccess }: ProposalFormProps) {
  const { createProposta, uploadCNH } = usePropostas();
  const { activeConfig, activeConfigLoading } = useFormConfig("proposta_compra");

  const [modelo, setModelo] = useState<"simplificado" | "completo">("completo");
  const [values, setValues] = useState<Record<string, any>>({});
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [cnhUrl, setCnhUrl] = useState<string | null>(null);
  const [isUploadingCNH, setIsUploadingCNH] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const codigo = useMemo(() => `PROP-${Date.now().toString(36).toUpperCase()}`, []);

  // Pré-preenche valores a partir do preFill e dos campos da configuração
  useEffect(() => {
    if (!activeConfig) return;
    setValues((prev) => {
      const next = { ...prev };
      // pré-preenchimentos vindos da ficha de visita
      if (preFill?.nome_completo && !next.nome_completo) next.nome_completo = preFill.nome_completo;
      if (preFill?.cpf_cnpj && !next.cpf_cnpj) next.cpf_cnpj = preFill.cpf_cnpj;
      if (preFill?.telefone && !next.telefone) next.telefone = preFill.telefone;
      if (preFill?.email && !next.email) next.email = preFill.email;
      if (preFill?.endereco_resumido && !next.endereco_resumido) next.endereco_resumido = preFill.endereco_resumido;
      if (preFill?.valor_ofertado && !next.valor_ofertado) next.valor_ofertado = String(preFill.valor_ofertado);
      // padrão de forma_aceite
      if (next.forma_aceite === undefined) next.forma_aceite = "assinatura_fisica";
      return next;
    });
  }, [activeConfig, preFill]);

  // Filtra campos por modelo + ativo + ordena
  const visibleFieldsBySection = useMemo(() => {
    if (!activeConfig) return [] as Array<{ section: any; fields: FormConfigField[] }>;
    const sections = [...activeConfig.sections].sort((a, b) => a.display_order - b.display_order);
    return sections.map((section) => {
      const fields = activeConfig.fields
        .filter((f) => f.section_id === section.section_id)
        .filter((f) => f.is_active !== false)
        .filter((f) => {
          // Se o campo não tem modelos definidos => aparece em ambos
          if (!Array.isArray(f.modelos) || f.modelos.length === 0) return true;
          return f.modelos.includes(modelo);
        })
        .sort((a, b) => a.display_order - b.display_order);
      return { section, fields };
    }).filter((s) => s.fields.length > 0);
  }, [activeConfig, modelo]);

  const setValue = (key: string, v: any) => {
    setValues((prev) => ({ ...prev, [key]: v }));
  };

  const handleCNHUpload = async (file: File) => {
    setIsUploadingCNH(true);
    try {
      const path = await uploadCNH(file, codigo);
      setCnhUrl(path);
    } catch {
      // toast handled in hook
    } finally {
      setIsUploadingCNH(false);
    }
  };

  const validate = (): string | null => {
    if (!activeConfig) return "Configuração ainda carregando";
    for (const { fields } of visibleFieldsBySection) {
      for (const f of fields) {
        if (!f.is_required) continue;
        const v = values[f.field_id];
        if (v === undefined || v === null || String(v).trim() === "") {
          return `Campo obrigatório: ${f.label}`;
        }
      }
    }
    if (!assinatura) return "Assinatura do proponente é obrigatória";
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    // Monta payload — só campos que mapeiam para colunas da tabela
    const payload: Record<string, any> = {
      codigo,
      modelo,
      ficha_visita_id: preFill?.ficha_visita_id || null,
      organization_id: preFill?.organization_id || null,
      assinatura_proponente: assinatura,
      cnh_url: cnhUrl,
    };

    for (const key of Object.keys(values)) {
      if (!PERSIST_KEYS.has(key)) continue;
      const raw = values[key];
      if (key === "valor_ofertado") {
        payload[key] = parseCurrency(raw);
      } else if (key === "sinal_entrada" || key === "financiamento") {
        // mantém como string (textual) para compatibilidade com schema atual
        payload[key] = raw ? String(raw) : null;
      } else {
        payload[key] = raw === "" || raw === undefined ? null : raw;
      }
    }

    // Defaults seguros
    if (!payload.nome_completo || !payload.cpf_cnpj || !payload.telefone || !payload.endereco_resumido || !payload.valor_ofertado) {
      toast.error("Preencha os campos essenciais (nome, CPF, telefone, endereço e valor)");
      return;
    }
    if (!payload.forma_aceite) payload.forma_aceite = "assinatura_fisica";

    await createProposta.mutateAsync(payload);

    // Notifica corretor (não-bloqueante)
    if (preFill?.ficha_visita_id) {
      supabase.functions.invoke("notify-proposta", {
        body: {
          ficha_visita_id: preFill.ficha_visita_id,
          nome_proponente: payload.nome_completo,
          telefone_proponente: payload.telefone,
          email_proponente: payload.email || undefined,
          endereco_imovel: payload.endereco_resumido,
          valor_ofertado: payload.valor_ofertado,
          codigo_proposta: codigo,
          sinal_entrada: payload.sinal_entrada || undefined,
          parcelas: payload.parcelas || undefined,
          financiamento: payload.financiamento || undefined,
          outras_condicoes: payload.outras_condicoes || undefined,
        },
      }).catch((errN) => console.warn("Notificação proposta (não-bloqueante):", errN));
    }

    setSubmitted(true);
    onSuccess?.();
  };

  if (submitted) {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-4">
          <Send className="h-12 w-12 text-primary mx-auto" />
          <h3 className="text-xl font-bold">Proposta Enviada!</h3>
          <p className="text-muted-foreground">
            Sua proposta foi registrada com sucesso. O corretor entrará em contato em breve.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (activeConfigLoading || !activeConfig) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando formulário...
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 overflow-hidden">
      {/* Seletor de modelo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Modelo da Proposta</CardTitle>
          <CardDescription>Escolha o modelo. A configuração de campos é definida em "Configurar Formulários".</CardDescription>
        </CardHeader>
        <CardContent>
          <ProposalModelSelector selected={modelo} onSelect={setModelo} />
        </CardContent>
      </Card>

      {/* Renderização dinâmica das seções/campos */}
      {visibleFieldsBySection.map(({ section, fields }) => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle className="text-lg">{section.title}</CardTitle>
            {section.description && <CardDescription>{section.description}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field) => {
              const isCurrency = CURRENCY_FIELDS.has(field.field_id);
              if (isCurrency) {
                return (
                  <div key={field.id} className="space-y-1.5">
                    <label className="text-sm font-medium">
                      {field.label}
                      {field.is_required && <span className="text-destructive ml-1">*</span>}
                    </label>
                    <CurrencyInput
                      value={values[field.field_id] || ""}
                      onChange={(v) => setValue(field.field_id, v)}
                      placeholder={field.placeholder || "R$ 0"}
                    />
                    {field.help_text && (
                      <p className="text-xs text-muted-foreground">{field.help_text}</p>
                    )}
                  </div>
                );
              }
              return (
                <DynamicFieldRenderer
                  key={field.id}
                  field={field}
                  value={values[field.field_id]}
                  onChange={(v) => setValue(field.field_id, v)}
                />
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* Cláusula fixa */}
      <Card className="border-border bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex gap-2 items-start">
            <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-foreground space-y-2">
              <p className="font-semibold">Cláusula de Documento Posterior</p>
              <p>
                Este documento serve exclusivamente para validação de valor e condições de pagamento.
                Os demais termos, informações e condições completas — incluindo, sem limitar, obrigações das partes,
                documentação, prazos, posse, responsabilidades, garantias, penalidades e formalização —
                constarão do Instrumento de Promessa/Compromisso de Compra e Venda (ou Compra e Venda) a ser
                apresentado após o aceite.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CNH e Assinatura */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CNHUpload onUpload={handleCNHUpload} isUploading={isUploadingCNH} uploadedUrl={cnhUrl} />
        <PublicSignatureCanvas
          title="Assinatura do Proponente"
          description="Desenhe sua assinatura para confirmar a proposta"
          onSave={(sig) => setAssinatura(sig)}
        />
      </div>

      {!assinatura && (
        <p className="text-sm text-muted-foreground text-center">
          ⚠️ Confirme sua assinatura acima antes de enviar.
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={createProposta.isPending || !assinatura}
      >
        {createProposta.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Enviar Proposta
      </Button>
    </form>
  );
}
