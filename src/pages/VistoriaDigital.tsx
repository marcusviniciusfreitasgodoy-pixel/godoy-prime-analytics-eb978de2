import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, AlertTriangle, XCircle, Circle, FileText, Loader2, MinusCircle, Building2, Camera, Image, X, Calculator } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { formatDate } from "@/utils/exportUtils";

interface PropertyData {
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  nomeCondominio: string;
  tipoImovel: string;
  areaM2: string;
  quartos: string;
  suites: string;
  banheiros: string;
  vagas: string;
  proprietario: string;
  telefone: string;
  vistoriador: string;
  dataVistoria: string;
  observacoes: string;
}

const initialPropertyData: PropertyData = {
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: 'BARRA DA TIJUCA',
  nomeCondominio: '',
  tipoImovel: '',
  areaM2: '',
  quartos: '',
  suites: '',
  banheiros: '',
  vagas: '',
  proprietario: '',
  telefone: '',
  vistoriador: '',
  dataVistoria: new Date().toISOString().split('T')[0],
  observacoes: '',
};

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

interface PhotoItem {
  id: string;
  categoryId: string;
  itemId: string;
  dataUrl: string;
  timestamp: string;
  caption: string;
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

const STORAGE_KEY = 'godoy_vistoria_data';

interface SavedVistoriaData {
  propertyData: PropertyData;
  checklist: ChecklistCategory[];
  photos: PhotoItem[];
  savedAt: string;
}

export default function VistoriaDigital() {
  const [checklist, setChecklist] = useState<ChecklistCategory[]>(initialChecklist);
  const [propertyData, setPropertyData] = useState<PropertyData>(initialPropertyData);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [selectedPhotoItem, setSelectedPhotoItem] = useState<{ categoryId: string; itemId: string; label: string } | null>(null);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data: SavedVistoriaData = JSON.parse(saved);
        setPropertyData(data.propertyData);
        setChecklist(data.checklist);
        setPhotos(data.photos || []);
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
    setHasLoadedFromStorage(true);
  }, []);

  // Show toast after loading from storage (separate effect to avoid toast dependency issues)
  useEffect(() => {
    if (hasLoadedFromStorage) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const data: SavedVistoriaData = JSON.parse(saved);
          if (data.propertyData.logradouro) {
            toast({
              title: "Vistoria recuperada",
              description: `Dados salvos em ${new Date(data.savedAt).toLocaleString("pt-BR")}`,
            });
          }
        } catch {
          // Ignore parse errors for toast
        }
      }
    }
  }, [hasLoadedFromStorage, toast]);

  // Save to localStorage when data changes
  useEffect(() => {
    if (!hasLoadedFromStorage) return;
    
    const dataToSave: SavedVistoriaData = {
      propertyData,
      checklist,
      photos,
      savedAt: new Date().toISOString(),
    };
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [propertyData, checklist, photos, hasLoadedFromStorage]);

  const updatePropertyData = (field: keyof PropertyData, value: string) => {
    setPropertyData(prev => ({ ...prev, [field]: value }));
  };

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

  // Photo functions
  const handlePhotoCapture = (categoryId: string, itemId: string, label: string) => {
    setSelectedPhotoItem({ categoryId, itemId, label });
    setPhotoDialogOpen(true);
  };

  const processFile = (file: File) => {
    if (!selectedPhotoItem) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo é 5MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const newPhoto: PhotoItem = {
        id: `${Date.now()}`,
        categoryId: selectedPhotoItem.categoryId,
        itemId: selectedPhotoItem.itemId,
        dataUrl,
        timestamp: new Date().toISOString(),
        caption: selectedPhotoItem.label,
      };
      setPhotos(prev => [...prev, newPhoto]);
      setPhotoDialogOpen(false);
      setSelectedPhotoItem(null);
      toast({
        title: "Foto adicionada",
        description: "A foto foi anexada ao item de vistoria.",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const removePhoto = (photoId: string) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
    toast({
      title: "Foto removida",
      description: "A foto foi removida da vistoria.",
    });
  };

  const getPhotosForItem = (categoryId: string, itemId: string) => {
    return photos.filter(p => p.categoryId === categoryId && p.itemId === itemId);
  };

  // Integration with Valuation Engine
  const handleGenerateValuation = () => {
    // Pass property data to Valuation Engine via navigation state
    navigate('/', {
      state: {
        fromVistoria: true,
        vistoriaData: {
          logradouro: propertyData.logradouro,
          bairro: propertyData.bairro,
          area_m2: propertyData.areaM2 ? parseFloat(propertyData.areaM2) : 0,
          tipoImovel: propertyData.tipoImovel,
          nomeCondominio: propertyData.nomeCondominio,
          // Map inspection results to suggested characteristics
          checklistSummary: {
            criticalCount: getCriticalCount(),
            attentionCount: getAttentionCount(),
            progress: getProgress(),
            // Extract relevant inspection categories for valuation suggestions
            eletrica: checklist.find(c => c.id === 'eletrica')?.items.every(i => i.status === 'ok' || i.status === 'nao-aplica'),
            hidraulica: checklist.find(c => c.id === 'hidraulica')?.items.every(i => i.status === 'ok' || i.status === 'nao-aplica'),
            acabamentos: checklist.find(c => c.id === 'acabamentos')?.items.every(i => i.status === 'ok' || i.status === 'nao-aplica'),
            climatizacao: checklist.find(c => c.id === 'climatizacao')?.items.some(i => i.status === 'ok'),
            seguranca: checklist.find(c => c.id === 'seguranca')?.items.every(i => i.status === 'ok' || i.status === 'nao-aplica'),
            lazer: checklist.find(c => c.id === 'lazer')?.items.some(i => i.status === 'ok'),
            automacao: checklist.find(c => c.id === 'tecnologia')?.items.some(i => i.status === 'ok'),
          },
        },
      },
    });
    toast({
      title: "Redirecionando para Avaliação",
      description: "Os dados do imóvel serão pré-preenchidos no Valuation Engine.",
    });
  };

  const resetChecklist = () => {
    setChecklist(initialChecklist);
    setPropertyData(initialPropertyData);
    setPhotos([]);
    localStorage.removeItem(STORAGE_KEY);
    toast({
      title: "Checklist resetado",
      description: "Todos os itens, dados e fotos foram limpos.",
    });
  };

  const generateReport = async () => {
    setIsGeneratingPDF(true);
    
    try {
      // Dynamic import for PDF template functions
      const { drawGodoyHeader, drawSectionTitle, applyFootersToAllPages, BRAND_COLORS, getMaxContentY } = await import('@/utils/pdfTemplate');
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginLeft = 20;
      
      // Header padronizado
      let yPos = drawGodoyHeader(doc, 'Relatório de Vistoria Digital');
      
      // Identificação do Imóvel
      yPos = drawSectionTitle(doc, 'Identificação do Imóvel', yPos, marginLeft);
      
      doc.setFontSize(10);
      doc.setTextColor(...BRAND_COLORS.darkGray);
      
      const configuracao = [
        propertyData.quartos ? `${propertyData.quartos} Qts` : null,
        propertyData.suites ? `${propertyData.suites} Stes` : null,
        propertyData.banheiros ? `${propertyData.banheiros} Bnh` : null,
        propertyData.vagas ? `${propertyData.vagas} Vgs` : null,
      ].filter(Boolean).join(' | ');
      
      const propertyInfo = [
        ['Endereço:', `${propertyData.logradouro || 'Não informado'}${propertyData.numero ? ', ' + propertyData.numero : ''}${propertyData.complemento ? ' - ' + propertyData.complemento : ''}`],
        ['Condomínio:', propertyData.nomeCondominio || '-'],
        ['Bairro:', propertyData.bairro || 'Não informado'],
        ['Tipo:', propertyData.tipoImovel || 'Não informado'],
        ['Área:', propertyData.areaM2 ? `${propertyData.areaM2} m²` : 'Não informada'],
        ['Configuração:', configuracao || 'Não informada'],
        ['Proprietário:', propertyData.proprietario || 'Não informado'],
        ['Telefone:', propertyData.telefone || 'Não informado'],
        ['Vistoriador:', propertyData.vistoriador || 'Não informado'],
        ['Data Vistoria:', propertyData.dataVistoria ? new Date(propertyData.dataVistoria).toLocaleDateString('pt-BR') : formatDate(new Date())],
      ];
      
      propertyInfo.forEach(([label, value]) => {
        doc.setFont('helvetica', 'normal');
        doc.text(label, marginLeft + 5, yPos);
        doc.setFont('helvetica', 'bold');
        doc.text(value, marginLeft + 45, yPos);
        yPos += 6;
      });
      
      if (propertyData.observacoes) {
        yPos += 2;
        doc.setFont('helvetica', 'normal');
        doc.text('Observações:', marginLeft + 5, yPos);
        yPos += 5;
        doc.setFontSize(9);
        const splitObs = doc.splitTextToSize(propertyData.observacoes, pageWidth - 50);
        doc.text(splitObs, marginLeft + 5, yPos);
        yPos += splitObs.length * 4;
      }
      
      yPos += 8;
      
      // Resumo da Vistoria
      yPos = drawSectionTitle(doc, 'Resumo da Vistoria', yPos, marginLeft);
      
      doc.setFontSize(10);
      doc.setTextColor(...BRAND_COLORS.darkGray);
      doc.setFont('helvetica', 'normal');
      doc.text(`Progresso: ${getProgress()}%`, marginLeft + 5, yPos);
      yPos += 6;
      
      const criticalCount = getCriticalCount();
      const attentionCount = getAttentionCount();
      
      if (criticalCount > 0) {
        doc.setTextColor(220, 38, 38);
        doc.text(`Itens Críticos: ${criticalCount}`, marginLeft + 5, yPos);
        yPos += 6;
      }
      
      if (attentionCount > 0) {
        doc.setTextColor(202, 138, 4);
        doc.text(`Itens com Atenção: ${attentionCount}`, marginLeft + 5, yPos);
        yPos += 6;
      }
      
      doc.setTextColor(...BRAND_COLORS.darkGray);
      yPos += 8;
      
      // Categories
      for (const category of checklist) {
        const verifiedInCategory = category.items.filter(i => i.status !== 'nao-verificado');
        if (verifiedInCategory.length === 0) continue;
        
        if (yPos > getMaxContentY() - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFillColor(...BRAND_COLORS.lightGray);
        doc.rect(15, yPos - 4, pageWidth - 30, 8, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...BRAND_COLORS.navy);
        doc.text(category.title, marginLeft, yPos);
        yPos += 10;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        
        for (const item of category.items) {
          if (item.status === 'nao-verificado') continue;
          
          if (yPos > getMaxContentY()) {
            doc.addPage();
            yPos = 20;
          }
          
          const config = statusConfig[item.status];
          doc.setTextColor(...config.pdfColor);
          doc.text(`[${config.label.toUpperCase()}]`, marginLeft, yPos);
          
          doc.setTextColor(...BRAND_COLORS.darkGray);
          const splitLabel = doc.splitTextToSize(item.label, pageWidth - 80);
          doc.text(splitLabel, marginLeft + 35, yPos);
          yPos += splitLabel.length * 4 + 2;
          
          // Check for photos attached to this item
          const itemPhotos = photos.filter(p => p.categoryId === category.id && p.itemId === item.id);
          if (itemPhotos.length > 0) {
            doc.setFontSize(8);
            doc.setTextColor(...BRAND_COLORS.gray);
            doc.text(`[${itemPhotos.length} foto(s) anexada(s)]`, marginLeft + 35, yPos);
            yPos += 4;
          }
        }
        
        yPos += 4;
      }
      
      // Photos section (if any)
      if (photos.length > 0) {
        doc.addPage();
        yPos = 20;
        
        yPos = drawSectionTitle(doc, 'Anexo: Registro Fotográfico', yPos, marginLeft);
        
        doc.setFontSize(9);
        doc.setTextColor(...BRAND_COLORS.gray);
        doc.text(`Total de ${photos.length} foto(s) registrada(s) durante a vistoria`, marginLeft, yPos);
        yPos += 10;
        
        // Group photos by category
        const photosByCategory: Record<string, PhotoItem[]> = {};
        photos.forEach(photo => {
          const key = photo.categoryId;
          if (!photosByCategory[key]) {
            photosByCategory[key] = [];
          }
          photosByCategory[key].push(photo);
        });
        
        // Add photos to PDF
        const imgWidth = 80;
        const imgHeight = 60;
        
        for (const [categoryId, categoryPhotos] of Object.entries(photosByCategory)) {
          const category = checklist.find(c => c.id === categoryId);
          if (!category) continue;
          
          if (yPos > 200) {
            doc.addPage();
            yPos = 20;
          }
          
          // Category header
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...BRAND_COLORS.navy);
          doc.text(category.title, marginLeft, yPos);
          yPos += 8;
          
          let xPos = marginLeft;
          
          for (const photo of categoryPhotos) {
            if (xPos + imgWidth > pageWidth - marginLeft) {
              xPos = marginLeft;
              yPos += imgHeight + 15;
            }
            
            if (yPos + imgHeight > getMaxContentY()) {
              doc.addPage();
              yPos = 20;
              xPos = marginLeft;
            }
            
            try {
              // Add photo
              doc.addImage(photo.dataUrl, 'JPEG', xPos, yPos, imgWidth, imgHeight);
              
              // Add caption below photo
              doc.setFontSize(7);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(80, 80, 80);
              const captionLines = doc.splitTextToSize(photo.caption, imgWidth);
              doc.text(captionLines.slice(0, 2), xPos, yPos + imgHeight + 4);
              
              xPos += imgWidth + 10;
            } catch (imgError) {
              console.error('Error adding image to PDF:', imgError);
              // Add placeholder for failed image
              doc.setFillColor(...BRAND_COLORS.lightGray);
              doc.rect(xPos, yPos, imgWidth, imgHeight, 'F');
              doc.setFontSize(8);
              doc.setTextColor(150, 150, 150);
              doc.text('Imagem indisponível', xPos + 15, yPos + 30);
              xPos += imgWidth + 10;
            }
          }
          
          yPos += imgHeight + 20;
        }
      }
      
      // Apply footers to all pages
      applyFootersToAllPages(doc);
      
      const filename = `vistoria_${propertyData.logradouro?.replace(/\s+/g, '_').substring(0, 20) || 'imovel'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      
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
              {photos.length > 0 && (
                <Badge variant="secondary" className="text-xs sm:text-sm">
                  <Image className="h-3 w-3 mr-1" />
                  {photos.length} Foto{photos.length > 1 ? 's' : ''}
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
              <Button 
                onClick={handleGenerateValuation} 
                size="sm" 
                variant="secondary"
                className="gap-1.5 text-xs sm:text-sm"
                disabled={!propertyData.logradouro}
              >
                <Calculator className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Gerar</span> Avaliação
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

      {/* Identificação do Imóvel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Identificação do Imóvel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-2">
              <Label htmlFor="logradouro">Logradouro *</Label>
              <Input
                id="logradouro"
                value={propertyData.logradouro}
                onChange={(e) => updatePropertyData('logradouro', e.target.value)}
                placeholder="Ex: Av. das Américas"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={propertyData.numero}
                  onChange={(e) => updatePropertyData('numero', e.target.value)}
                  placeholder="1000"
                />
              </div>
              <div>
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  value={propertyData.complemento}
                  onChange={(e) => updatePropertyData('complemento', e.target.value)}
                  placeholder="Apto 101"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                value={propertyData.bairro}
                onChange={(e) => updatePropertyData('bairro', e.target.value)}
                placeholder="Barra da Tijuca"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="nomeCondominio">Nome do Condomínio</Label>
              <Input
                id="nomeCondominio"
                value={propertyData.nomeCondominio}
                onChange={(e) => updatePropertyData('nomeCondominio', e.target.value)}
                placeholder="Ex: Riserva Golf"
              />
            </div>
            <div>
              <Label htmlFor="tipoImovel">Tipo do Imóvel</Label>
              <Select value={propertyData.tipoImovel} onValueChange={(v) => updatePropertyData('tipoImovel', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartamento">Apartamento</SelectItem>
                  <SelectItem value="casa">Casa</SelectItem>
                  <SelectItem value="cobertura">Cobertura</SelectItem>
                  <SelectItem value="sala_comercial">Sala Comercial</SelectItem>
                  <SelectItem value="loja">Loja</SelectItem>
                  <SelectItem value="terreno">Terreno</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="areaM2">Área (m²)</Label>
              <Input
                id="areaM2"
                value={propertyData.areaM2}
                onChange={(e) => updatePropertyData('areaM2', e.target.value)}
                placeholder="150"
                type="number"
              />
            </div>
            <div>
              <Label htmlFor="quartos">Quartos</Label>
              <Input
                id="quartos"
                value={propertyData.quartos}
                onChange={(e) => updatePropertyData('quartos', e.target.value)}
                placeholder="3"
                type="number"
              />
            </div>
            <div>
              <Label htmlFor="suites">Suítes</Label>
              <Input
                id="suites"
                value={propertyData.suites}
                onChange={(e) => updatePropertyData('suites', e.target.value)}
                placeholder="1"
                type="number"
              />
            </div>
            <div>
              <Label htmlFor="banheiros">Banheiros</Label>
              <Input
                id="banheiros"
                value={propertyData.banheiros}
                onChange={(e) => updatePropertyData('banheiros', e.target.value)}
                placeholder="2"
                type="number"
              />
            </div>
            <div>
              <Label htmlFor="vagas">Vagas de Garagem</Label>
              <Input
                id="vagas"
                value={propertyData.vagas}
                onChange={(e) => updatePropertyData('vagas', e.target.value)}
                placeholder="2"
                type="number"
              />
            </div>
            <div>
              <Label htmlFor="proprietario">Proprietário / Contato</Label>
              <Input
                id="proprietario"
                value={propertyData.proprietario}
                onChange={(e) => updatePropertyData('proprietario', e.target.value)}
                placeholder="Nome do proprietário"
              />
            </div>
            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={propertyData.telefone}
                onChange={(e) => updatePropertyData('telefone', e.target.value)}
                placeholder="(21) 99999-9999"
              />
            </div>
            <div>
              <Label htmlFor="vistoriador">Vistoriador</Label>
              <Input
                id="vistoriador"
                value={propertyData.vistoriador}
                onChange={(e) => updatePropertyData('vistoriador', e.target.value)}
                placeholder="Nome do corretor"
              />
            </div>
            <div>
              <Label htmlFor="dataVistoria">Data da Vistoria</Label>
              <Input
                id="dataVistoria"
                type="date"
                value={propertyData.dataVistoria}
                onChange={(e) => updatePropertyData('dataVistoria', e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="observacoes">Observações Gerais</Label>
            <Textarea
              id="observacoes"
              value={propertyData.observacoes}
              onChange={(e) => updatePropertyData('observacoes', e.target.value)}
              placeholder="Informações adicionais sobre o imóvel..."
              rows={3}
            />
          </div>
        </CardContent>
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
                      const itemPhotos = getPhotosForItem(category.id, item.id);
                      return (
                        <div key={item.id} className="space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border bg-card">
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
                                {/* Photo button */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant={itemPhotos.length > 0 ? "secondary" : "outline"}
                                      size="sm"
                                      onClick={() => handlePhotoCapture(category.id, item.id, item.label)}
                                      className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 p-0 sm:gap-1"
                                    >
                                      <Camera className="h-4 w-4" />
                                      {itemPhotos.length > 0 && (
                                        <span className="hidden sm:inline text-xs ml-1">{itemPhotos.length}</span>
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p className="font-medium">Adicionar Foto</p>
                                    <p className="text-xs text-muted-foreground">
                                      {itemPhotos.length > 0 ? `${itemPhotos.length} foto(s) anexada(s)` : 'Capture ou anexe fotos'}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TooltipProvider>
                          </div>
                          {/* Display photos for this item */}
                          {itemPhotos.length > 0 && (
                            <div className="flex gap-2 flex-wrap ml-8 pl-3">
                              {itemPhotos.map((photo) => (
                                <div key={photo.id} className="relative group">
                                  <img
                                    src={photo.dataUrl}
                                    alt={photo.caption}
                                    className="w-16 h-16 object-cover rounded-md border cursor-pointer hover:opacity-90"
                                    onClick={() => setViewPhotoUrl(photo.dataUrl)}
                                  />
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute -top-2 -right-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => removePhoto(photo.id)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
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

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Photo capture dialog */}
      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Foto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {selectedPhotoItem?.label}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-24 flex-col gap-2"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-8 w-8" />
                <span>Tirar Foto</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex-col gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Image className="h-8 w-8" />
                <span>Galeria</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Tamanho máximo: 5MB por foto
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo view dialog */}
      <Dialog open={!!viewPhotoUrl} onOpenChange={() => setViewPhotoUrl(null)}>
        <DialogContent className="sm:max-w-3xl p-2">
          {viewPhotoUrl && (
            <img
              src={viewPhotoUrl}
              alt="Foto da vistoria"
              className="w-full h-auto max-h-[80vh] object-contain rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
