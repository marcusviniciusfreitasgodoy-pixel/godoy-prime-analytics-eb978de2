import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { FileText, HelpCircle, Save, Loader2, ChevronDown, ChevronLeft, ChevronRight, User, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useIsMobile } from "@/hooks/use-mobile";
import jsPDF from "jspdf";
import { formatDate } from "@/utils/exportUtils";
import { DocumentAnalyzer } from "@/components/DocumentAnalyzer";

interface DocumentItem {
  id: string;
  label: string;
  checked: boolean;
  tooltip?: string;
  conditionalOn?: string; // Shows only when this flag is true
}

interface DocumentCategory {
  id: string;
  title: string;
  items: DocumentItem[];
}

interface VendedorFlags {
  isEmpresario: boolean;
  isUniaoEstavel: boolean;
}

interface CompradorFlags {
  isComunhaoTotal: boolean;
  isUniaoEstavel: boolean;
}

interface AllFlags {
  vendedor: VendedorFlags;
  comprador: CompradorFlags;
}

const getInitialChecklist = (flags: AllFlags): DocumentCategory[] => [
  {
    id: 'vendedor-cadastro',
    title: 'Vendedor - Dados de Cadastro',
    items: [
      { id: 'v-nome', label: 'Nome completo', checked: false },
      { id: 'v-cpf', label: 'CPF (Ex: 109.313.837-81)', checked: false },
      { id: 'v-rg', label: 'RG (com órgão emissor e data de expedição)', checked: false },
      { id: 'v-email', label: 'E-mail', checked: false },
      { id: 'v-estado-civil', label: 'Estado civil e regime matrimonial', checked: false },
      { id: 'v-profissao', label: 'Profissão', checked: false },
      { id: 'v-conjuge', label: 'Qualificação do cônjuge (se aplicável)', checked: false },
      // Conditional items for Empresário
      ...(flags.vendedor.isEmpresario ? [
        { id: 'v-cnpj', label: 'CNPJ da empresa', checked: false, conditionalOn: 'isEmpresario' },
        { id: 'v-contrato-social', label: 'Contrato Social consolidado', checked: false, conditionalOn: 'isEmpresario', tooltip: 'Com todas as alterações' },
        { id: 'v-certidao-simplificada', label: 'Certidão Simplificada da Junta Comercial', checked: false, conditionalOn: 'isEmpresario' },
      ] : []),
      // Conditional items for União Estável
      ...(flags.vendedor.isUniaoEstavel ? [
        { id: 'v-declaracao-uniao', label: 'Escritura de União Estável', checked: false, conditionalOn: 'isUniaoEstavel', tooltip: 'Registrada em cartório' },
        { id: 'v-companheiro-docs', label: 'Documentos do(a) companheiro(a)', checked: false, conditionalOn: 'isUniaoEstavel', tooltip: 'RG, CPF e comprovante de residência' },
      ] : []),
    ],
  },
  {
    id: 'vendedor-docs',
    title: 'Vendedor - Documentos Pessoais',
    items: [
      { id: 'v-rg-cpf-copias', label: 'RG e CPF (Originais e cópias)', checked: false },
      { id: 'v-certidao-casamento', label: 'Certidão de Casamento', checked: false, tooltip: 'Com averbação se houver divórcio' },
      { id: 'v-comprovante', label: 'Comprovante de Residência atualizado', checked: false },
    ],
  },
  {
    id: 'vendedor-bancario',
    title: 'Vendedor - Informações Bancárias',
    items: [
      { id: 'v-pix', label: 'Chave PIX', checked: false },
      { id: 'v-banco', label: 'Banco e Agência', checked: false },
      { id: 'v-conta', label: 'Conta Corrente', checked: false },
      { id: 'v-titular', label: 'Nome e CPF do titular', checked: false, tooltip: 'Deve ser o mesmo nome do Outorgante/Vendedor' },
    ],
  },
  {
    id: 'imovel-docs',
    title: 'Documentos e Certidões do Imóvel',
    items: [
      { id: 'i-onus', label: 'Certidão de Ônus Reais atualizada', checked: false, tooltip: 'Obtida no RGI, mostra o histórico de propriedade e se há hipotecas/penhoras' },
      { id: 'i-quitacao-fiscal', label: 'Certidão Quitação Fiscal e Enfitêutica', checked: false, tooltip: 'Emitida pela Prefeitura (prova que IPTU está pago)' },
      { id: 'i-condominio', label: 'Declaração de Quitação Condominial', checked: false, tooltip: 'Assinada pelo síndico (com firma reconhecida) ou emitida pela administradora' },
      { id: 'i-funesbom', label: 'Certidão da Funesbom', checked: false, tooltip: 'Prova de quitação da Taxa de Incêndio (Bombeiros)' },
      { id: 'i-2distribuidor', label: 'Certidões do 2º Distribuidor', checked: false, tooltip: 'Feitos, Protestos e Títulos (específico do RJ)' },
      { id: 'i-interdicoes', label: 'Certidões do 1º e 2º Interdições e Tutelas', checked: false, tooltip: 'Prova que o vendedor não é incapaz civilmente' },
      { id: 'i-justica-federal', label: 'Certidão Negativa da Justiça Federal', checked: false, tooltip: 'Comprova que o vendedor não possui ações cíveis, criminais ou execuções fiscais na Justiça Federal. Resolve o risco de fraude contra credores e bloqueios judiciais que possam recair sobre o imóvel.' },
      { id: 'i-receita-federal', label: 'Certidão da Receita Federal', checked: false, tooltip: 'Certidão Conjunta de Débitos Federais e Dívida Ativa da União. Comprova a inexistência de débitos com a Receita Federal e a PGFN, evitando que dívidas tributárias do vendedor recaiam sobre o comprador ou o imóvel.' },
      { id: 'i-cndt', label: 'Certidão Negativa de Débitos Trabalhistas (CNDT)', checked: false, tooltip: 'Emitida pelo TST, comprova que o vendedor não possui dívidas trabalhistas reconhecidas judicialmente. Protege o comprador de eventuais penhoras do imóvel para quitar débitos com ex-empregados.' },
    ],
  },
  {
    id: 'comprador-cadastro',
    title: 'Comprador - Dados de Cadastro',
    items: [
      { id: 'c-nome', label: 'Nome completo', checked: false },
      { id: 'c-nacionalidade', label: 'Nacionalidade', checked: false },
      { id: 'c-profissao', label: 'Profissão', checked: false },
      { id: 'c-rg', label: 'RG (com órgão emissor e data)', checked: false },
      { id: 'c-cpf', label: 'CPF', checked: false },
      { id: 'c-estado-civil', label: 'Estado civil e regime de casamento', checked: false },
      { id: 'c-endereco', label: 'Endereço completo', checked: false },
      { id: 'c-email', label: 'E-mail', checked: false },
      // Conditional items for Comunhão Total or União Estável
      ...((flags.comprador.isComunhaoTotal || flags.comprador.isUniaoEstavel) ? [
        { id: 'c-conjuge-nome', label: 'Nome completo do cônjuge/companheiro(a)', checked: false, conditionalOn: 'conjuge' },
        { id: 'c-conjuge-nacionalidade', label: 'Nacionalidade do cônjuge/companheiro(a)', checked: false, conditionalOn: 'conjuge' },
        { id: 'c-conjuge-profissao', label: 'Profissão do cônjuge/companheiro(a)', checked: false, conditionalOn: 'conjuge' },
        { id: 'c-conjuge-rg', label: 'RG do cônjuge/companheiro(a)', checked: false, conditionalOn: 'conjuge' },
        { id: 'c-conjuge-cpf', label: 'CPF do cônjuge/companheiro(a)', checked: false, conditionalOn: 'conjuge' },
      ] : []),
      ...(flags.comprador.isUniaoEstavel ? [
        { id: 'c-declaracao-uniao', label: 'Escritura de União Estável do Comprador', checked: false, conditionalOn: 'isUniaoEstavel', tooltip: 'Registrada em cartório' },
      ] : []),
    ],
  },
  {
    id: 'comprador-docs',
    title: 'Comprador - Documentos Pessoais',
    items: [
      { id: 'c-rg-cpf-copias', label: 'RG e CPF (Originais e cópias)', checked: false },
      { id: 'c-certidao-casamento', label: 'Certidão de Casamento', checked: false, tooltip: 'Obrigatória se casado, separado ou divorciado' },
      { id: 'c-comprovante', label: 'Comprovante de Residência atualizado', checked: false },
      // Conditional items for Comunhão Total or União Estável
      ...((flags.comprador.isComunhaoTotal || flags.comprador.isUniaoEstavel) ? [
        { id: 'c-conjuge-rg-cpf', label: 'RG e CPF do cônjuge/companheiro(a) (cópias)', checked: false, conditionalOn: 'conjuge' },
        { id: 'c-conjuge-comprovante', label: 'Comprovante de Residência do cônjuge/companheiro(a)', checked: false, conditionalOn: 'conjuge' },
      ] : []),
    ],
  },
];

const initialFlags: AllFlags = {
  vendedor: {
    isEmpresario: false,
    isUniaoEstavel: false,
  },
  comprador: {
    isComunhaoTotal: false,
    isUniaoEstavel: false,
  },
};

export default function Documentacao() {
  const [flags, setFlags] = useState<AllFlags>(initialFlags);
  const [checklist, setChecklist] = useState<DocumentCategory[]>(() => getInitialChecklist(initialFlags));
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Swipe navigation for mobile
  const goToNextSection = () => {
    if (currentSectionIndex < checklist.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
    }
  };

  const goToPrevSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
    }
  };

  const { handlers: swipeHandlers } = useSwipeGesture({
    onSwipeLeft: goToNextSection,
    onSwipeRight: goToPrevSection,
    minSwipeDistance: 50,
  });

  // Update checklist when flags change
  useEffect(() => {
    setChecklist(prev => {
      const newChecklist = getInitialChecklist(flags);
      // Preserve checked state from previous checklist
      return newChecklist.map(category => {
        const prevCategory = prev.find(c => c.id === category.id);
        if (!prevCategory) return category;
        return {
          ...category,
          items: category.items.map(item => {
            const prevItem = prevCategory.items.find(i => i.id === item.id);
            return prevItem ? { ...item, checked: prevItem.checked } : item;
          }),
        };
      });
    });
  }, [flags]);

  // Load saved progress on mount
  useEffect(() => {
    const savedChecklist = localStorage.getItem('documentacao-checklist');
    const savedFlags = localStorage.getItem('documentacao-flags');
    if (savedFlags) {
      try {
        const loadedFlags = JSON.parse(savedFlags);
        setFlags(loadedFlags);
      } catch (e) {
        console.error('Error loading saved flags:', e);
      }
    }
    if (savedChecklist) {
      try {
        setChecklist(JSON.parse(savedChecklist));
      } catch (e) {
        console.error('Error loading saved checklist:', e);
      }
    }
  }, []);

  const toggleItemChecked = (categoryId: string, itemId: string) => {
    setChecklist(prev =>
      prev.map(category =>
        category.id === categoryId
          ? {
              ...category,
              items: category.items.map(item =>
                item.id === itemId ? { ...item, checked: !item.checked } : item
              ),
            }
          : category
      )
    );
  };

  const getProgress = () => {
    const totalItems = checklist.reduce((sum, cat) => sum + cat.items.length, 0);
    const checkedItems = checklist.reduce(
      (sum, cat) => sum + cat.items.filter(item => item.checked).length,
      0
    );
    return Math.round((checkedItems / totalItems) * 100);
  };

  const saveProgress = () => {
    localStorage.setItem('documentacao-checklist', JSON.stringify(checklist));
    localStorage.setItem('documentacao-flags', JSON.stringify(flags));
    toast({
      title: "Progresso salvo",
      description: "O checklist foi salvo localmente.",
    });
  };

  const exportPDF = async (party?: 'vendedor' | 'comprador' | 'completo') => {
    setIsGeneratingPDF(true);
    const exportType = party || 'completo';
    
    try {
      // Dynamic import for PDF template functions
      const { drawGodoyHeader, drawSectionTitle, applyFootersToAllPages, BRAND_COLORS, getMaxContentY } = await import('@/utils/pdfTemplate');
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginLeft = 20;
      
      // Filter categories based on party
      const getFilteredCategories = () => {
        if (exportType === 'vendedor') {
          return checklist.filter(cat => 
            cat.id.startsWith('vendedor') || cat.id === 'imovel-docs'
          );
        } else if (exportType === 'comprador') {
          return checklist.filter(cat => 
            cat.id.startsWith('comprador')
          );
        }
        return checklist;
      };
      
      const filteredCategories = getFilteredCategories();
      
      // Header padronizado
      const subtitle = exportType === 'vendedor' 
        ? 'Checklist do Vendedor' 
        : exportType === 'comprador' 
          ? 'Checklist do Comprador' 
          : 'Checklist de Due Diligence';
      let yPos = drawGodoyHeader(doc, subtitle);
      
      // Resumo
      yPos = drawSectionTitle(doc, 'Resumo da Documentação', yPos, marginLeft);
      
      // Calculate progress for filtered categories
      const filteredTotal = filteredCategories.reduce((sum, cat) => sum + cat.items.length, 0);
      const filteredChecked = filteredCategories.reduce(
        (sum, cat) => sum + cat.items.filter(item => item.checked).length, 0
      );
      const filteredProgress = filteredTotal > 0 ? Math.round((filteredChecked / filteredTotal) * 100) : 0;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...BRAND_COLORS.darkGray);
      doc.text(`Progresso: ${filteredProgress}% dos documentos coletados`, marginLeft, yPos);
      yPos += 12;
      
      // Perfil do Vendedor (only for vendedor or complete)
      if (exportType === 'vendedor' || exportType === 'completo') {
        doc.setFillColor(...BRAND_COLORS.gold);
        doc.rect(15, yPos - 4, pageWidth - 30, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...BRAND_COLORS.navy);
        doc.text('PERFIL DO VENDEDOR', marginLeft, yPos);
        yPos += 10;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...BRAND_COLORS.darkGray);
        doc.text(`• Empresário / Pessoa Jurídica: ${flags.vendedor.isEmpresario ? 'Sim' : 'Não'}`, marginLeft, yPos);
        yPos += 6;
        doc.text(`• União Estável: ${flags.vendedor.isUniaoEstavel ? 'Sim' : 'Não'}`, marginLeft, yPos);
        yPos += 10;
      }
      
      // Perfil do Comprador (only for comprador or complete)
      if (exportType === 'comprador' || exportType === 'completo') {
        doc.setFillColor(...BRAND_COLORS.gold);
        doc.rect(15, yPos - 4, pageWidth - 30, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...BRAND_COLORS.navy);
        doc.text('PERFIL DO COMPRADOR', marginLeft, yPos);
        yPos += 10;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...BRAND_COLORS.darkGray);
        doc.text(`• Comunhão Total de Bens: ${flags.comprador.isComunhaoTotal ? 'Sim' : 'Não'}`, marginLeft, yPos);
        yPos += 6;
        doc.text(`• União Estável: ${flags.comprador.isUniaoEstavel ? 'Sim' : 'Não'}`, marginLeft, yPos);
        yPos += 10;
      }
      
      yPos += 5;
      
      // Categories
      for (const category of filteredCategories) {
        // Check if we need a new page
        if (yPos > getMaxContentY() - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFillColor(...BRAND_COLORS.lightGray);
        doc.rect(15, yPos - 4, pageWidth - 30, 8, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...BRAND_COLORS.navy);
        doc.text(category.title, marginLeft, yPos);
        yPos += 12;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        
        for (const item of category.items) {
          if (yPos > getMaxContentY()) {
            doc.addPage();
            yPos = 20;
          }
          
          const checkbox = item.checked ? '[X]' : '[ ]';
          const isConditional = !!item.conditionalOn;
          
          // Checkbox color: green if checked, gray if not
          doc.setTextColor(item.checked ? 34 : 100, item.checked ? 197 : 100, item.checked ? 94 : 100);
          doc.text(checkbox, marginLeft, yPos);
          
          // Label color: gold accent for conditional items, black for regular
          if (isConditional) {
            doc.setTextColor(180, 140, 30); // Gold/amber for conditional items
          } else {
            doc.setTextColor(...BRAND_COLORS.darkGray);
          }
          
          const prefix = isConditional ? '→ ' : '';
          doc.text(prefix + item.label, marginLeft + 12, yPos);
          yPos += 6;
        }
        
        yPos += 6;
      }
      
      // ========== OBSERVAÇÕES E PRÓXIMOS PASSOS (apenas para comprador) ==========
      if (exportType === 'comprador') {
        // Check if we need a new page
        if (yPos > getMaxContentY() - 80) {
          doc.addPage();
          yPos = 20;
        }
        
        yPos += 5;
        
        // Campo de Observações
        doc.setFillColor(...BRAND_COLORS.lightGray);
        doc.rect(15, yPos - 4, pageWidth - 30, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...BRAND_COLORS.navy);
        doc.text('OBSERVAÇÕES GERAIS', marginLeft, yPos);
        yPos += 12;
        
        // Linhas tracejadas para anotações
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.2);
        for (let i = 0; i < 5; i++) {
          doc.setLineDashPattern([2, 2], 0);
          doc.line(marginLeft, yPos, pageWidth - marginLeft, yPos);
          yPos += 8;
        }
        doc.setLineDashPattern([], 0);
        
        yPos += 8;
        
        // Check if we need a new page for próximos passos
        if (yPos > getMaxContentY() - 70) {
          doc.addPage();
          yPos = 20;
        }
        
        // Próximos Passos
        doc.setFillColor(...BRAND_COLORS.gold);
        doc.rect(15, yPos - 4, pageWidth - 30, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...BRAND_COLORS.navy);
        doc.text('PRÓXIMOS PASSOS', marginLeft, yPos);
        yPos += 12;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...BRAND_COLORS.darkGray);
        
        const proximosPassos = [
          '1. Reunir todos os documentos pendentes indicados acima',
          '2. Agendar assinatura do Contrato de Compra e Venda',
          '3. Solicitar análise de crédito (se financiamento)',
          '4. Agendar vistoria do imóvel',
          '5. Providenciar laudo de avaliação (se financiado)',
          '6. Agendar escritura pública',
          '7. Registrar a escritura no RGI',
        ];
        
        proximosPassos.forEach((passo) => {
          doc.text(passo, marginLeft + 5, yPos);
          yPos += 6;
        });
        
        yPos += 10;
        
        // Texto de encerramento
        doc.setFillColor(240, 253, 244); // Verde claro
        doc.roundedRect(15, yPos - 3, pageWidth - 30, 22, 2, 2, 'F');
        
        doc.setFontSize(8);
        doc.setTextColor(5, 150, 105); // Verde
        const encerramento = 'Este checklist tem caráter orientativo. A Godoy Prime Realty se coloca à disposição para auxiliar em todo o processo de aquisição. Para dúvidas, entre em contato pelo telefone (21) 96407-5124 ou visite nosso site www.godoyprime.com.br';
        const splitEncerramento = doc.splitTextToSize(encerramento, pageWidth - 40);
        doc.text(splitEncerramento, marginLeft, yPos + 5);
        
        yPos += 28;
      }
      
      // Apply footers to all pages
      applyFootersToAllPages(doc);
      
      const filename = exportType === 'vendedor' 
        ? 'checklist_vendedor' 
        : exportType === 'comprador' 
          ? 'checklist_comprador' 
          : 'documentacao_completa';
      doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
      
      const partyLabel = exportType === 'vendedor' 
        ? 'do vendedor' 
        : exportType === 'comprador' 
          ? 'do comprador' 
          : 'completo';
      toast({
        title: "PDF gerado com sucesso",
        description: `O checklist ${partyLabel} foi baixado.`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o documento.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const resetChecklist = () => {
    setFlags(initialFlags);
    setChecklist(getInitialChecklist(initialFlags));
    localStorage.removeItem('documentacao-checklist');
    localStorage.removeItem('documentacao-flags');
    toast({
      title: "Checklist resetado",
      description: "Todos os itens foram desmarcados.",
    });
  };

  const toggleVendedorFlag = (flag: keyof VendedorFlags) => {
    setFlags(prev => ({ ...prev, vendedor: { ...prev.vendedor, [flag]: !prev.vendedor[flag] } }));
  };

  const toggleCompradorFlag = (flag: keyof CompradorFlags) => {
    setFlags(prev => ({ ...prev, comprador: { ...prev.comprador, [flag]: !prev.comprador[flag] } }));
  };

  // Handler for checklist item suggestion from DocumentAnalyzer
  const handleChecklistItemSuggested = (itemId: string) => {
    // Find and mark the item as checked
    setChecklist(prev =>
      prev.map(category => ({
        ...category,
        items: category.items.map(item =>
          item.id === itemId ? { ...item, checked: true } : item
        ),
      }))
    );
    toast({
      title: "Item marcado",
      description: "O documento foi vinculado ao item correspondente no checklist.",
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 -mx-1 sm:mx-0">
      <div className="px-2 sm:px-0">
        <h2 className="text-xl sm:text-3xl font-bold text-foreground">Documentação</h2>
        <p className="text-xs sm:text-base text-muted-foreground mt-1">Checklist para garantir segurança jurídica da transação</p>
      </div>

      {/* Análise Inteligente de Documentos */}
      <DocumentAnalyzer onChecklistItemSuggested={handleChecklistItemSuggested} />

      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
        <CardHeader className="space-y-3 sm:space-y-4 px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
            <CardTitle className="text-base sm:text-xl text-left">Progresso da Documentação</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={resetChecklist} size="sm" className="text-xs sm:text-sm">
                Resetar
              </Button>
              <Button variant="outline" onClick={saveProgress} size="sm" className="gap-1.5 text-xs sm:text-sm">
                <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Salvar
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="gap-1.5 text-xs sm:text-sm" disabled={isGeneratingPDF}>
                    {isGeneratingPDF ? (
                      <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    )}
                    PDF
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportPDF('vendedor')} className="gap-2">
                    <User className="h-4 w-4" />
                    Checklist do Vendedor
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportPDF('comprador')} className="gap-2">
                    <User className="h-4 w-4" />
                    Checklist do Comprador
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportPDF('completo')} className="gap-2">
                    <Users className="h-4 w-4" />
                    Documentação Completa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Documentos Coletados</span>
              <span className="font-semibold text-primary">{getProgress()}%</span>
            </div>
            <Progress value={getProgress()} className="h-3" />
          </div>
        </CardHeader>
      </Card>

      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
        <CardHeader className="px-3 sm:px-6">
          <CardTitle className="text-base sm:text-xl text-left">Perfil do Vendedor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-3 sm:px-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="flag-empresario"
                checked={flags.vendedor.isEmpresario}
                onCheckedChange={() => toggleVendedorFlag('isEmpresario')}
              />
              <label htmlFor="flag-empresario" className="font-medium cursor-pointer text-sm sm:text-base">
                Vendedor é Empresário / Pessoa Jurídica
              </label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Se marcado, serão adicionados campos para CNPJ e documentos empresariais</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="flag-vendedor-uniao-estavel"
                checked={flags.vendedor.isUniaoEstavel}
                onCheckedChange={() => toggleVendedorFlag('isUniaoEstavel')}
              />
              <label htmlFor="flag-vendedor-uniao-estavel" className="font-medium cursor-pointer text-sm sm:text-base">
                Vendedor em União Estável
              </label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Se marcado, serão adicionados campos para documentação do(a) companheiro(a)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
        <CardHeader className="px-3 sm:px-6">
          <CardTitle className="text-base sm:text-xl text-left">Perfil do Comprador</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-3 sm:px-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="flag-comunhao-total"
                checked={flags.comprador.isComunhaoTotal}
                onCheckedChange={() => toggleCompradorFlag('isComunhaoTotal')}
              />
              <label htmlFor="flag-comunhao-total" className="font-medium cursor-pointer text-sm sm:text-base">
                Comunhão Total de Bens
              </label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Se marcado, serão adicionados campos para qualificação do cônjuge</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="flag-comprador-uniao-estavel"
                checked={flags.comprador.isUniaoEstavel}
                onCheckedChange={() => toggleCompradorFlag('isUniaoEstavel')}
              />
              <label htmlFor="flag-comprador-uniao-estavel" className="font-medium cursor-pointer text-sm sm:text-base">
                Comprador em União Estável
              </label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Se marcado, serão adicionados campos para documentação do(a) companheiro(a)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
        <CardContent className="pt-4 sm:pt-6 px-2 sm:px-6">
          <TooltipProvider>
            {/* Mobile: Swipe Navigation Mode */}
            {isMobile ? (
              <div className="space-y-3">
                {/* Navigation Header */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={goToPrevSection}
                    disabled={currentSectionIndex === 0}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex-1 text-center">
                    <p className="text-xs text-muted-foreground">
                      {currentSectionIndex + 1} de {checklist.length}
                    </p>
                    <h3 className="text-sm font-semibold truncate">
                      {checklist[currentSectionIndex]?.title}
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={goToNextSection}
                    disabled={currentSectionIndex === checklist.length - 1}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>

                {/* Section Dots */}
                <div className="flex justify-center gap-1.5">
                  {checklist.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSectionIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        idx === currentSectionIndex 
                          ? 'bg-primary' 
                          : 'bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>

                {/* Swipeable Content */}
                <div 
                  {...swipeHandlers}
                  className="min-h-[200px] touch-pan-y"
                >
                  {checklist[currentSectionIndex] && (
                    <div className="space-y-2 pt-2 animate-fade-in">
                      {checklist[currentSectionIndex].items.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-start gap-2 p-2.5 rounded-lg border bg-card ${
                            item.conditionalOn ? 'border-l-4 border-l-primary/50 bg-primary/5' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <Checkbox
                              id={item.id}
                              checked={item.checked}
                              onCheckedChange={() => toggleItemChecked(checklist[currentSectionIndex].id, item.id)}
                              className="mt-0.5"
                            />
                            <label
                              htmlFor={item.id}
                              className={`font-medium cursor-pointer flex-1 text-sm leading-tight ${
                                item.checked ? 'line-through text-muted-foreground' : ''
                              }`}
                            >
                              {item.label}
                            </label>
                          </div>
                          {item.tooltip && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>{item.tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Swipe Hint */}
                <p className="text-[10px] text-center text-muted-foreground">
                  ← Deslize para navegar →
                </p>
              </div>
            ) : (
              /* Desktop: Accordion Mode */
              <Accordion type="multiple" className="w-full text-left">
                {checklist.map((category) => (
                  <AccordionItem key={category.id} value={category.id}>
                    <AccordionTrigger className="text-base sm:text-lg font-semibold text-left">
                      {category.title}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 sm:space-y-3 pt-2">
                        {category.items.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-start sm:items-center gap-2 p-2.5 sm:p-3 rounded-lg border bg-card ${
                              item.conditionalOn ? 'border-l-4 border-l-primary/50 bg-primary/5' : ''
                            }`}
                          >
                            <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                              <Checkbox
                                id={item.id}
                                checked={item.checked}
                                onCheckedChange={() => toggleItemChecked(category.id, item.id)}
                                className="mt-0.5 sm:mt-0"
                              />
                              <label
                                htmlFor={item.id}
                                className={`font-medium cursor-pointer flex-1 text-sm sm:text-base leading-tight ${
                                  item.checked ? 'line-through text-muted-foreground' : ''
                                }`}
                              >
                                {item.label}
                              </label>
                            </div>
                            {item.tooltip && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>{item.tooltip}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
}
