import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileText, HelpCircle, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { formatDate } from "@/utils/exportUtils";

interface DocumentItem {
  id: string;
  label: string;
  checked: boolean;
  tooltip?: string;
  conditionalOn?: string; // Show only if this item id is checked
  inputField?: 'text'; // If set, shows an input field
  inputValue?: string;
  inputPlaceholder?: string;
}

interface DocumentCategory {
  id: string;
  title: string;
  items: DocumentItem[];
}

const initialChecklist: DocumentCategory[] = [
  {
    id: 'vendedor-cadastro',
    title: 'Vendedor - Dados de Cadastro',
    items: [
      { id: 'v-nome', label: 'Nome completo', checked: false },
      { id: 'v-cpf', label: 'CPF (Ex: 109.313.837-81)', checked: false },
      { id: 'v-rg', label: 'RG (com órgão emissor e data de expedição)', checked: false },
      { id: 'v-email', label: 'E-mail', checked: false },
      { id: 'v-uniao-estavel', label: 'União Estável', checked: false, tooltip: 'Marcar se vendedor está em união estável' },
      { id: 'v-estado-civil', label: 'Estado civil e regime matrimonial', checked: false },
      { id: 'v-profissao', label: 'Profissão', checked: false },
      { id: 'v-empresario', label: 'Empresário', checked: false, tooltip: 'Marcar se o vendedor é empresário (PJ)' },
      { id: 'v-cnpj', label: 'CNPJ da Empresa', checked: false, conditionalOn: 'v-empresario', inputField: 'text', inputValue: '', inputPlaceholder: 'Ex: 00.000.000/0001-00' },
      { id: 'v-conjuge', label: 'Qualificação do cônjuge (se aplicável)', checked: false },
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
      { id: 'i-justica-federal', label: 'Certidão Negativa da Justiça Federal', checked: false },
      { id: 'i-receita-federal', label: 'Certidão da Receita Federal', checked: false },
      { id: 'i-cndt', label: 'Certidão Negativa de Débitos Trabalhistas (CNDT)', checked: false },
    ],
  },
  {
    id: 'comprador-cadastro',
    title: 'Comprador - Dados de Cadastro',
    items: [
      { id: 'c-nome', label: 'Nome completo', checked: false },
      { id: 'c-nacionalidade', label: 'Nacionalidade', checked: false },
      { id: 'c-rg', label: 'RG (com órgão emissor e data)', checked: false },
      { id: 'c-cpf', label: 'CPF', checked: false },
      { id: 'c-uniao-estavel', label: 'União Estável', checked: false, tooltip: 'Marcar se comprador está em união estável' },
      { id: 'c-estado-civil', label: 'Estado civil e regime de casamento', checked: false },
      { id: 'c-profissao', label: 'Profissão', checked: false },
      { id: 'c-empresario', label: 'Empresário', checked: false, tooltip: 'Marcar se o comprador é empresário (PJ)' },
      { id: 'c-cnpj', label: 'CNPJ da Empresa', checked: false, conditionalOn: 'c-empresario', inputField: 'text', inputValue: '', inputPlaceholder: 'Ex: 00.000.000/0001-00' },
      { id: 'c-endereco', label: 'Endereço completo', checked: false },
      { id: 'c-email', label: 'E-mail', checked: false },
    ],
  },
  {
    id: 'comprador-docs',
    title: 'Comprador - Documentos Pessoais',
    items: [
      { id: 'c-rg-cpf-copias', label: 'RG e CPF (Originais e cópias)', checked: false },
      { id: 'c-certidao-casamento', label: 'Certidão de Casamento', checked: false, tooltip: 'Obrigatória se casado, separado ou divorciado' },
      { id: 'c-comprovante', label: 'Comprovante de Residência atualizado', checked: false },
    ],
  },
];

export default function Documentacao() {
  const [checklist, setChecklist] = useState<DocumentCategory[]>(initialChecklist);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { toast } = useToast();

  // Load saved progress on mount
  useEffect(() => {
    const saved = localStorage.getItem('documentacao-checklist');
    if (saved) {
      try {
        setChecklist(JSON.parse(saved));
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

  const updateItemInput = (categoryId: string, itemId: string, value: string) => {
    setChecklist(prev =>
      prev.map(category =>
        category.id === categoryId
          ? {
              ...category,
              items: category.items.map(item =>
                item.id === itemId ? { ...item, inputValue: value } : item
              ),
            }
          : category
      )
    );
  };

  const isItemVisible = (item: DocumentItem, categoryItems: DocumentItem[]) => {
    if (!item.conditionalOn) return true;
    const parentItem = categoryItems.find(i => i.id === item.conditionalOn);
    return parentItem?.checked ?? false;
  };

  const getProgress = () => {
    const visibleItems = checklist.reduce((sum, cat) => {
      const visible = cat.items.filter(item => isItemVisible(item, cat.items));
      return sum + visible.length;
    }, 0);
    const checkedItems = checklist.reduce((sum, cat) => {
      const visible = cat.items.filter(item => isItemVisible(item, cat.items) && item.checked);
      return sum + visible.length;
    }, 0);
    return Math.round((checkedItems / visibleItems) * 100);
  };

  const saveProgress = () => {
    localStorage.setItem('documentacao-checklist', JSON.stringify(checklist));
    toast({
      title: "Progresso salvo",
      description: "O checklist foi salvo localmente.",
    });
  };

  const exportPDF = async () => {
    setIsGeneratingPDF(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;
      
      // Header
      doc.setFillColor(12, 35, 64); // Navy
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('GODOY PRIME', 20, 25);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Checklist de Due Diligence', 20, 35);
      
      yPos = 55;
      
      // Date and summary
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Data: ${formatDate(new Date())}`, 20, yPos);
      yPos += 10;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo da Documentação', 20, yPos);
      yPos += 8;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Progresso: ${getProgress()}% dos documentos coletados`, 20, yPos);
      yPos += 15;
      
      // Categories
      for (const category of checklist) {
        // Check if we need a new page
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFillColor(240, 240, 240);
        doc.rect(15, yPos - 4, pageWidth - 30, 8, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(category.title, 20, yPos);
        yPos += 12;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        
        for (const item of category.items) {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          
          const checkbox = item.checked ? '[X]' : '[ ]';
          doc.setTextColor(item.checked ? 34 : 100, item.checked ? 197 : 100, item.checked ? 94 : 100);
          doc.text(checkbox, 20, yPos);
          
          doc.setTextColor(0, 0, 0);
          doc.text(item.label, 32, yPos);
          yPos += 6;
        }
        
        yPos += 6;
      }
      
      // Footer
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Godoy Prime Analytics - Página ${i} de ${pageCount}`,
          pageWidth / 2,
          290,
          { align: 'center' }
        );
      }
      
      doc.save(`documentacao_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "PDF gerado com sucesso",
        description: "O checklist de documentação foi baixado.",
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
    setChecklist(initialChecklist);
    localStorage.removeItem('documentacao-checklist');
    toast({
      title: "Checklist resetado",
      description: "Todos os itens foram desmarcados.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Documentação</h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">Checklist para garantir segurança jurídica da transação</p>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg sm:text-xl">Progresso da Documentação</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={resetChecklist} size="sm" className="text-xs sm:text-sm">
                Resetar
              </Button>
              <Button variant="outline" onClick={saveProgress} size="sm" className="gap-1.5 text-xs sm:text-sm">
                <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Salvar
              </Button>
              <Button onClick={exportPDF} size="sm" className="gap-1.5 text-xs sm:text-sm" disabled={isGeneratingPDF}>
                {isGeneratingPDF ? (
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                ) : (
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
                PDF
              </Button>
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

      <Card>
        <CardContent className="pt-6">
          <TooltipProvider>
            <Accordion type="multiple" className="w-full">
              {checklist.map((category) => (
                <AccordionItem key={category.id} value={category.id}>
                  <AccordionTrigger className="text-lg font-semibold">
                    {category.title}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 sm:space-y-3 pt-2">
                      {category.items.map((item) => {
                        if (!isItemVisible(item, category.items)) return null;
                        
                        return (
                          <div
                            key={item.id}
                            className={`p-2.5 sm:p-3 rounded-lg border bg-card space-y-2 ${item.conditionalOn ? 'ml-6 border-l-2 border-l-primary/30' : ''}`}
                          >
                            <div className="flex items-start sm:items-center justify-between gap-2">
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
                            {item.inputField && item.checked && (
                              <Input
                                placeholder={item.inputPlaceholder}
                                value={item.inputValue || ''}
                                onChange={(e) => updateItemInput(category.id, item.id, e.target.value)}
                                className="ml-7 max-w-xs text-sm"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
}
