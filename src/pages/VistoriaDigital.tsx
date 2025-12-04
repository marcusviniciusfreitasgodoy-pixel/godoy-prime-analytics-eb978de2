import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, Circle, FileText, Loader2, MinusCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { formatDate } from "@/utils/exportUtils";

type ItemStatus = 'ok' | 'atencao' | 'critico' | 'nao-verificado' | 'nao-aplica';

interface ChecklistItem {
  id: string;
  label: string;
  status: ItemStatus;
}

interface ChecklistCategory {
  id: string;
  title: string;
  items: ChecklistItem[];
}

const initialChecklist: ChecklistCategory[] = [
  {
    id: 'fundacoes',
    title: '1. Fundações e Estrutura',
    items: [
      { id: 'trincas', label: 'Trincas ou fissuras grandes (>3mm) em paredes, pisos e tetos', status: 'nao-verificado' },
      { id: 'umidade-base', label: 'Sinais de umidade ascendente nas bases das paredes', status: 'nao-verificado' },
      { id: 'portas-janelas', label: 'Portas e janelas fecham corretamente', status: 'nao-verificado' },
    ],
  },
  {
    id: 'cobertura',
    title: '2. Cobertura e Telhado',
    items: [
      { id: 'manchas-teto', label: 'Manchas de umidade ou mofo no teto do último andar', status: 'nao-verificado' },
      { id: 'calhas', label: 'Calhas e rufos: danos ou entupimento', status: 'nao-verificado' },
      { id: 'telhas', label: 'Estado geral das telhas', status: 'nao-verificado' },
      { id: 'acesso-cobertura', label: 'Acesso à cobertura (em apartamentos marcar N/A)', status: 'nao-verificado' },
    ],
  },
  {
    id: 'eletrica',
    title: '3. Instalações Elétricas',
    items: [
      { id: 'quadro', label: 'Quadro de disjuntores: identificado, organizado e moderno', status: 'nao-verificado' },
      { id: 'tomadas', label: 'Teste de tomadas e interruptores (funcionamento e fixação)', status: 'nao-verificado' },
      { id: 'carga', label: 'Carga suporta equipamentos modernos (Ar condicionado, etc.)', status: 'nao-verificado' },
    ],
  },
  {
    id: 'hidraulica',
    title: '4. Instalações Hidráulicas',
    items: [
      { id: 'pressao', label: 'Pressão da água em torneiras e chuveiros', status: 'nao-verificado' },
      { id: 'vazamentos-vaso', label: 'Vazamentos na base dos vasos sanitários ao acionar descarga', status: 'nao-verificado' },
      { id: 'manchas-vazamento', label: 'Manchas de vazamento sob pias e em paredes de áreas molhadas', status: 'nao-verificado' },
    ],
  },
  {
    id: 'acabamentos',
    title: '5. Acabamentos Internos',
    items: [
      { id: 'piso', label: 'Qualidade do piso (riscos, peças soltas, manchas)', status: 'nao-verificado' },
      { id: 'pintura', label: 'Pintura de paredes e tetos (bolhas, descascados, sujeira)', status: 'nao-verificado' },
      { id: 'rodapes', label: 'Estado de rodapés, guarnições e forros de gesso', status: 'nao-verificado' },
    ],
  },
  {
    id: 'esquadrias',
    title: '6. Esquadrias (Portas e Janelas)',
    items: [
      { id: 'vedacao', label: 'Vedação e funcionamento das ferragens ao abrir/fechar', status: 'nao-verificado' },
      { id: 'infiltracao', label: 'Sinais de infiltração ao redor dos caixilhos', status: 'nao-verificado' },
      { id: 'vidros', label: 'Estado dos vidros (riscos, trincas)', status: 'nao-verificado' },
    ],
  },
  {
    id: 'ventilacao',
    title: '7. Ventilação e Iluminação',
    items: [
      { id: 'luz-natural', label: 'Iluminação natural suficiente nos ambientes', status: 'nao-verificado' },
      { id: 'ventilacao-cruzada', label: 'Ventilação cruzada adequada (banheiros e cozinha sem mofo)', status: 'nao-verificado' },
      { id: 'exaustao', label: 'Sistemas de exaustão (coifas, depuradores) funcionando', status: 'nao-verificado' },
    ],
  },
  {
    id: 'area-externa',
    title: '8. Área Externa e Fachada',
    items: [
      { id: 'fachada', label: 'Revestimento da fachada (trincas, descolamento de pastilhas)', status: 'nao-verificado' },
      { id: 'muros', label: 'Estado de muros, portões e grades (ferrugem)', status: 'nao-verificado' },
      { id: 'calcadas', label: 'Condição de calçadas e acessos (pedras soltas)', status: 'nao-verificado' },
    ],
  },
  {
    id: 'climatizacao',
    title: '9. Climatização (Aquecimento/Ar)',
    items: [
      { id: 'possui-climatizacao', label: 'Imóvel possui sistema de climatização (se não, marcar N/A nos demais)', status: 'nao-verificado' },
      { id: 'ar-funcionamento', label: 'Funcionamento dos equipamentos de ar condicionado', status: 'nao-verificado' },
      { id: 'filtros', label: 'Manutenção e limpeza dos filtros', status: 'nao-verificado' },
      { id: 'ruidos', label: 'Ruídos anormais durante a operação', status: 'nao-verificado' },
    ],
  },
  {
    id: 'seguranca',
    title: '10. Segurança',
    items: [
      { id: 'alarmes', label: 'Alarmes, câmeras e cercas elétricas (estado visual)', status: 'nao-verificado' },
      { id: 'portas-seguras', label: 'Robustez de portas, fechaduras e portões', status: 'nao-verificado' },
      { id: 'incendio', label: 'Equipamentos de combate a incêndio (validade extintores)', status: 'nao-verificado' },
    ],
  },
  {
    id: 'garagem',
    title: '11. Garagem',
    items: [
      { id: 'piso-garagem', label: 'Estado do piso e infiltrações no teto', status: 'nao-verificado' },
      { id: 'portao', label: 'Portão automático (tempo de abertura/fechamento)', status: 'nao-verificado' },
      { id: 'manobra', label: 'Espaço de manobra e tamanho das vagas', status: 'nao-verificado' },
    ],
  },
  {
    id: 'lazer',
    title: '12. Áreas de Lazer (Privativas)',
    items: [
      { id: 'piscina', label: 'Revestimento da piscina e casa de máquinas', status: 'nao-verificado' },
      { id: 'churrasqueira', label: 'Estrutura da churrasqueira, coifas e bancadas', status: 'nao-verificado' },
      { id: 'gourmet', label: 'Iluminação e pontos de água/esgoto na área gourmet', status: 'nao-verificado' },
    ],
  },
  {
    id: 'paisagismo',
    title: '13. Paisagismo e Jardins',
    items: [
      { id: 'plantas', label: 'Saúde geral das plantas e do gramado', status: 'nao-verificado' },
      { id: 'irrigacao', label: 'Sistema de irrigação (automático?)', status: 'nao-verificado' },
      { id: 'iluminacao-jardim', label: 'Iluminação externa e caminhos de jardim', status: 'nao-verificado' },
    ],
  },
  {
    id: 'marcenaria',
    title: '14. Marcenaria e Planejados',
    items: [
      { id: 'ferragens', label: 'Ferragens e corrediças de portas e gavetas', status: 'nao-verificado' },
      { id: 'cupim', label: 'Estufamento, descolamento ou sinais de cupim', status: 'nao-verificado' },
      { id: 'conservacao-armarios', label: 'Qualidade geral e estado de conservação dos armários', status: 'nao-verificado' },
    ],
  },
  {
    id: 'loucas',
    title: '15. Louças e Metais',
    items: [
      { id: 'loucas', label: 'Trincas ou manchas em pias, cubas e vasos', status: 'nao-verificado' },
      { id: 'torneiras', label: 'Funcionamento de torneiras e registros (pingando?)', status: 'nao-verificado' },
      { id: 'metais', label: 'Ferrugem ou descascados nos metais', status: 'nao-verificado' },
    ],
  },
  {
    id: 'isolamento',
    title: '16. Isolamento Acústico/Térmico',
    items: [
      { id: 'possui-isolamento', label: 'Imóvel possui sistema de isolamento (se não, marcar N/A nos demais)', status: 'nao-verificado' },
      { id: 'ruido', label: 'Nível de ruído da rua com janelas fechadas', status: 'nao-verificado' },
      { id: 'materiais', label: 'Materiais usados (vidro duplo, lã de rocha, etc.)', status: 'nao-verificado' },
      { id: 'termico', label: 'Conforto térmico interno vs externo', status: 'nao-verificado' },
    ],
  },
  {
    id: 'tecnologia',
    title: '17. Tecnologia e Automação',
    items: [
      { id: 'possui-automacao', label: 'Imóvel possui sistema de automação (se não, marcar N/A nos demais)', status: 'nao-verificado' },
      { id: 'automacao', label: 'Sistemas de automação (luz, som, persianas) respondendo', status: 'nao-verificado' },
      { id: 'wifi', label: 'Sinal de Wi-Fi e pontos de rede nos quartos', status: 'nao-verificado' },
      { id: 'central', label: 'Central de controle e documentação técnica disponível', status: 'nao-verificado' },
    ],
  },
  {
    id: 'acessibilidade',
    title: '18. Acessibilidade',
    items: [
      { id: 'rampas', label: 'Rampas, portas largas ou elevadores', status: 'nao-verificado' },
      { id: 'circulacao', label: 'Circulação nos corredores e banheiros (cadeirante?)', status: 'nao-verificado' },
    ],
  },
  {
    id: 'vizinhanca',
    title: '19. Vizinhança e Entorno',
    items: [
      { id: 'vizinhos', label: 'Perfil das construções vizinhas e ruído (obras?)', status: 'nao-verificado' },
      { id: 'comercio', label: 'Proximidade de comércios e serviços', status: 'nao-verificado' },
      { id: 'seguranca-rua', label: 'Sensação de segurança e fluxo de veículos na rua', status: 'nao-verificado' },
    ],
  },
  {
    id: 'documentacao',
    title: '20. Documentação (Análise Prévia)',
    items: [
      { id: 'matricula', label: 'Matrícula do Imóvel atualizada', status: 'nao-verificado' },
      { id: 'area-prefeitura', label: 'Área construída na prefeitura corresponde à realidade', status: 'nao-verificado' },
      { id: 'certidoes', label: 'Certidões Negativas (IPTU, Condomínio em dia?)', status: 'nao-verificado' },
    ],
  },
  {
    id: 'sensacao',
    title: '21. Sensação Geral (Feeling)',
    items: [
      { id: 'layout', label: 'Layout atende às necessidades da família', status: 'nao-verificado' },
      { id: 'bem-estar', label: 'Sensação de bem-estar e segurança no espaço', status: 'nao-verificado' },
      { id: 'rotina', label: 'Imagina a rotina diária acontecendo ali', status: 'nao-verificado' },
    ],
  },
];

const statusConfig = {
  'ok': { icon: CheckCircle2, color: 'text-green-600', label: 'Conforme', pdfColor: [34, 197, 94] as [number, number, number], tooltip: 'Item em conformidade, sem problemas identificados' },
  'atencao': { icon: AlertTriangle, color: 'text-yellow-600', label: 'Atenção', pdfColor: [234, 179, 8] as [number, number, number], tooltip: 'Requer atenção ou pequenos reparos' },
  'critico': { icon: XCircle, color: 'text-red-600', label: 'Crítico', pdfColor: [239, 68, 68] as [number, number, number], tooltip: 'Problema grave que impacta a avaliação' },
  'nao-verificado': { icon: Circle, color: 'text-muted-foreground', label: 'Não Verificado', pdfColor: [156, 163, 175] as [number, number, number], tooltip: 'Ainda não foi verificado' },
  'nao-aplica': { icon: MinusCircle, color: 'text-blue-500', label: 'N/A', pdfColor: [59, 130, 246] as [number, number, number], tooltip: 'Não se aplica a este imóvel (não impacta a avaliação)' },
};

export default function VistoriaDigital() {
  const [checklist, setChecklist] = useState<ChecklistCategory[]>(initialChecklist);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { toast } = useToast();

  const updateItemStatus = (categoryId: string, itemId: string, newStatus: ItemStatus) => {
    setChecklist(prev =>
      prev.map(category =>
        category.id === categoryId
          ? {
              ...category,
              items: category.items.map(item =>
                item.id === itemId ? { ...item, status: newStatus } : item
              ),
            }
          : category
      )
    );
  };

  const getProgress = () => {
    const totalItems = checklist.reduce((sum, cat) => sum + cat.items.length, 0);
    const verifiedItems = checklist.reduce(
      (sum, cat) => sum + cat.items.filter(item => item.status !== 'nao-verificado').length,
      0
    );
    return Math.round((verifiedItems / totalItems) * 100);
  };

  const getCriticalCount = () => {
    return checklist.reduce(
      (sum, cat) => sum + cat.items.filter(item => item.status === 'critico').length,
      0
    );
  };

  const getAttentionCount = () => {
    return checklist.reduce(
      (sum, cat) => sum + cat.items.filter(item => item.status === 'atencao').length,
      0
    );
  };

  const resetChecklist = () => {
    setChecklist(initialChecklist);
    toast({
      title: "Checklist resetado",
      description: "Todos os itens foram marcados como não verificados.",
    });
  };

  const generateReport = async () => {
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
      doc.text('Relatório de Vistoria Digital', 20, 35);
      
      yPos = 55;
      
      // Date and summary
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Data: ${formatDate(new Date())}`, 20, yPos);
      yPos += 10;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo da Vistoria', 20, yPos);
      yPos += 8;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Progresso: ${getProgress()}%`, 20, yPos);
      yPos += 6;
      
      const criticalCount = getCriticalCount();
      const attentionCount = getAttentionCount();
      
      if (criticalCount > 0) {
        doc.setTextColor(239, 68, 68);
        doc.text(`Itens Críticos: ${criticalCount}`, 20, yPos);
        yPos += 6;
      }
      
      if (attentionCount > 0) {
        doc.setTextColor(234, 179, 8);
        doc.text(`Itens com Atenção: ${attentionCount}`, 20, yPos);
        yPos += 6;
      }
      
      doc.setTextColor(0, 0, 0);
      yPos += 10;
      
      // Categories
      for (const category of checklist) {
        const verifiedInCategory = category.items.filter(i => i.status !== 'nao-verificado');
        if (verifiedInCategory.length === 0) continue;
        
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
          if (item.status === 'nao-verificado') continue;
          
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          
          const config = statusConfig[item.status];
          doc.setTextColor(...config.pdfColor);
          doc.text(`[${config.label.toUpperCase()}]`, 20, yPos);
          
          doc.setTextColor(0, 0, 0);
          doc.text(item.label, 55, yPos);
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
      
      doc.save(`vistoria_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "PDF gerado com sucesso",
        description: "O relatório de vistoria foi baixado.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o relatório.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Vistoria Digital</h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">Checklist completo para avaliação de imóveis</p>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg sm:text-xl">Progresso da Vistoria</CardTitle>
            <div className="flex flex-wrap gap-2">
              {getCriticalCount() > 0 && (
                <Badge variant="destructive" className="text-xs sm:text-sm">
                  {getCriticalCount()} Crítico{getCriticalCount() > 1 ? 's' : ''}
                </Badge>
              )}
              <Button variant="outline" onClick={resetChecklist} size="sm" className="text-xs sm:text-sm">
                Resetar
              </Button>
              <Button onClick={generateReport} size="sm" className="gap-1.5 text-xs sm:text-sm" disabled={isGeneratingPDF}>
                {isGeneratingPDF ? (
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                ) : (
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
                <span className="hidden xs:inline">Gerar</span> Relatório
              </Button>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-semibold text-primary">{getProgress()}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-300"
                style={{ width: `${getProgress()}%` }}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Accordion type="multiple" className="w-full">
            {checklist.map((category) => (
              <AccordionItem key={category.id} value={category.id}>
                <AccordionTrigger className="text-sm sm:text-lg font-semibold text-left justify-start">
                  {category.title}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {category.items.map((item) => {
                      const StatusIcon = statusConfig[item.status].icon;
                      return (
                        <div
                          key={item.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                            <StatusIcon className={`h-5 w-5 flex-shrink-0 mt-0.5 sm:mt-0 ${statusConfig[item.status].color}`} />
                            <span className="font-medium text-sm sm:text-base leading-tight">{item.label}</span>
                          </div>
                          <TooltipProvider delayDuration={300}>
                            <div className="flex gap-1.5 sm:gap-2 flex-shrink-0 ml-8 sm:ml-0">
                              {(Object.keys(statusConfig) as ItemStatus[]).map((status) => {
                                const config = statusConfig[status];
                                const Icon = config.icon;
                                return (
                                  <Tooltip key={status}>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant={item.status === status ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => updateItemStatus(category.id, item.id, status)}
                                        className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 p-0 sm:gap-1"
                                      >
                                        <Icon className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-[200px] text-center">
                                      <p className="font-medium">{config.label}</p>
                                      <p className="text-xs text-muted-foreground">{config.tooltip}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </div>
                          </TooltipProvider>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
