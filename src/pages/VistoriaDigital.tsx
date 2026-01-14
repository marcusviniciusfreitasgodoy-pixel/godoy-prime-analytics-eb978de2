import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate, useLocation } from "react-router-dom";
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
import { FileText, Loader2, Building2, Camera, Image, X, Calculator, TrendingUp, Home, Building, RotateCcw, Star, AlertCircle, ChevronLeft, ChevronRight, Search, MapPin, HelpCircle, Mail, Pencil } from "lucide-react";
import { PageTour } from "@/components/PageTour";
import { useFirstVisitTour } from "@/hooks/useFirstVisitTour";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/utils/exportUtils";
import { generateVistoriaPDF, generateVistoriaPDFDoc } from "@/utils/vistoriaPdfExport";
import { SendPdfEmailDialog } from "@/components/SendPdfEmailDialog";
import { VistoriaAvaliacaoComparativo, calculateAdjustedValues, calculateVistoriaAdjustment } from "@/components/vistoria/VistoriaAvaliacaoComparativo";
import { PricingStrategyPreview } from "@/components/vistoria/PricingStrategyPreview";
import { supabase } from "@/integrations/supabase/client";
import { normalizeStreetSearchTerm } from "@/lib/utils";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { useAuth } from "@/hooks/useAuth";
import { useVistoriaChecklistFull, CategoryWithItems } from "@/hooks/useVistoriaChecklist";

// Street suggestion type
interface StreetSuggestion {
  logradouro: string;
  count: number;
  med_m2: number;
}

// Types - Dados COMPLETOS da avaliação para relatório integrado
interface HistoricalYearData {
  ano: number;
  transacoes: number;
  valorMinM2: number;
  valorMedioM2: number;
  valorMaxM2: number;
}

interface HistoricalAnalysisData {
  yearlyData: HistoricalYearData[];
  liquidityScore: number;
  liquidityLevel: 'alta' | 'media' | 'baixa';
  transactionGrowth: number;
  transactionTrend: 'crescente' | 'decrescente' | 'estavel';
  priceGrowth: number;
  priceTrend: 'alta' | 'baixa' | 'estavel';
  diagnostico: string;
  alertas: string[];
}

interface AvaliacaoData {
  valorProvavel: number;
  valorPessimista: number;
  valorOtimista: number;
  confidenceLevel: string;
  confidenceScore?: number;
  dataAvaliacao: string;
  // Dados de mercado ITBI
  itbiMinM2?: number;
  itbiMedM2?: number;
  itbiMaxM2?: number;
  transactionCount?: number;
  // Tendência
  trendPercentage?: number;
  trendDirection?: string;
  // Métricas de ajuste
  totalAdjustment?: number;
  spreadPercentage?: number;
  // Recomendação
  recommendationTitle?: string;
  recommendationMessage?: string;
  // Fontes dos anúncios
  anuncioFontes?: string[];
  // Dados históricos
  historicalAnalysis?: HistoricalAnalysisData;
}

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

type TipoVistoria = 'casa' | 'apartamento' | null;
type ItemScore = 1 | 2 | 3 | 4 | 5 | 'na' | null;

interface ChecklistItem {
  id: string;
  label: string;
  tooltip?: string;
  score: ItemScore;
}

interface ChecklistCategory {
  id: string;
  title: string;
  weight: number; // Peso para cálculo do score final
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

// Score configuration
const scoreConfig = {
  5: { label: 'Excelente', color: 'bg-emerald-600 hover:bg-emerald-700 text-white', textColor: 'text-emerald-600', description: 'Novo/impecável' },
  4: { label: 'Bom', color: 'bg-green-500 hover:bg-green-600 text-white', textColor: 'text-green-500', description: 'Acima do esperado' },
  3: { label: 'Adequado', color: 'bg-yellow-500 hover:bg-yellow-600 text-white', textColor: 'text-yellow-600', description: 'Normal para idade/uso' },
  2: { label: 'Atenção', color: 'bg-orange-500 hover:bg-orange-600 text-white', textColor: 'text-orange-500', description: 'Problema identificado' },
  1: { label: 'Crítico', color: 'bg-red-600 hover:bg-red-700 text-white', textColor: 'text-red-600', description: 'Precisa reparo urgente' },
  'na': { label: 'N/A', color: 'bg-slate-400 hover:bg-slate-500 text-white', textColor: 'text-slate-500', description: 'Não se aplica' },
};

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

// ========== CHECKLIST CASA (20 categorias, ~55 itens) ==========
const checklistCasa: ChecklistCategory[] = [
  {
    id: 'fundacoes',
    title: '1. Fundações e Estrutura',
    weight: 12,
    items: [
      { id: 'trincas', label: 'Trincas ou fissuras grandes (>3mm) em paredes, pisos e tetos', score: null },
      { id: 'desaprumo', label: 'Desaprumo ou inclinações visíveis nas paredes', tooltip: 'Observe se as paredes parecem tortas ou inclinadas', score: null },
      { id: 'umidade-base', label: 'Sinais de umidade ascendente nas bases das paredes', score: null },
      { id: 'portas-janelas', label: 'Portas e janelas fecham corretamente', score: null },
    ],
  },
  {
    id: 'cobertura',
    title: '2. Cobertura e Telhado',
    weight: 10,
    items: [
      { id: 'manchas-teto', label: 'Manchas de umidade ou mofo no teto', score: null },
      { id: 'calhas', label: 'Calhas e rufos: danos ou entupimento', score: null },
      { id: 'telhas', label: 'Estado geral das telhas (quebradas, deslocadas)', score: null },
      { id: 'estrutura-telhado', label: 'Estrutura do telhado visível em bom estado', score: null },
    ],
  },
  {
    id: 'eletrica',
    title: '3. Instalações Elétricas',
    weight: 8,
    items: [
      { id: 'quadro', label: 'Quadro de disjuntores: identificado, organizado e moderno', score: null },
      { id: 'tomadas', label: 'Teste de tomadas e interruptores (funcionamento e fixação)', score: null },
      { id: 'fios-expostos', label: 'Fios expostos ou emendas visíveis', tooltip: 'Risco de segurança se houver fios aparentes', score: null },
      { id: 'carga', label: 'Carga suporta equipamentos modernos (Ar condicionado, etc.)', score: null },
    ],
  },
  {
    id: 'hidraulica',
    title: '4. Instalações Hidráulicas',
    weight: 8,
    items: [
      { id: 'pressao', label: 'Pressão da água em torneiras e chuveiros', score: null },
      { id: 'vazamentos-vaso', label: 'Vazamentos na base dos vasos sanitários', score: null },
      { id: 'manchas-vazamento', label: 'Manchas de vazamento sob pias e em paredes de áreas molhadas', score: null },
      { id: 'tubulacoes', label: 'Tubulações com corrosão visível', tooltip: 'Indica idade avançada do sistema', score: null },
    ],
  },
  {
    id: 'acabamentos',
    title: '5. Acabamentos Internos',
    weight: 7,
    items: [
      { id: 'piso', label: 'Qualidade do piso (riscos, peças soltas, manchas)', score: null },
      { id: 'pintura', label: 'Pintura de paredes e tetos (bolhas, descascados)', score: null },
      { id: 'mofo', label: 'Mofo ou manchas de umidade em ambientes', tooltip: 'Impacta saúde e negociação', score: null },
      { id: 'rodapes', label: 'Estado de rodapés, guarnições e forros de gesso', score: null },
    ],
  },
  {
    id: 'esquadrias',
    title: '6. Esquadrias (Portas e Janelas)',
    weight: 6,
    items: [
      { id: 'vedacao', label: 'Vedação e funcionamento das ferragens', score: null },
      { id: 'infiltracao', label: 'Sinais de infiltração ao redor dos caixilhos', score: null },
      { id: 'vidros', label: 'Estado dos vidros (riscos, trincas)', score: null },
    ],
  },
  {
    id: 'ventilacao',
    title: '7. Ventilação e Iluminação',
    weight: 5,
    items: [
      { id: 'luz-natural', label: 'Iluminação natural suficiente nos ambientes', score: null },
      { id: 'ventilacao-cruzada', label: 'Ventilação cruzada adequada', score: null },
      { id: 'exaustao', label: 'Sistemas de exaustão (coifas, depuradores) funcionando', score: null },
    ],
  },
  {
    id: 'area-externa',
    title: '8. Área Externa e Fachada',
    weight: 7,
    items: [
      { id: 'fachada', label: 'Revestimento da fachada (trincas, descolamento)', score: null },
      { id: 'muros', label: 'Estado de muros, portões e grades (ferrugem)', score: null },
      { id: 'drenagem', label: 'Drenagem do terreno (poças após chuva)', tooltip: 'Problema de terreno pode ser caro para resolver', score: null },
      { id: 'iluminacao-noturna', label: 'Iluminação noturna externa', tooltip: 'Impacta segurança', score: null },
    ],
  },
  {
    id: 'climatizacao',
    title: '9. Climatização',
    weight: 4,
    items: [
      { id: 'possui-climatizacao', label: 'Imóvel possui sistema de climatização', tooltip: 'Se não possuir, marque N/A nos demais', score: null },
      { id: 'ar-funcionamento', label: 'Funcionamento dos equipamentos de ar condicionado', score: null },
      { id: 'filtros', label: 'Manutenção e limpeza dos filtros', score: null },
    ],
  },
  {
    id: 'seguranca',
    title: '10. Segurança',
    weight: 5,
    items: [
      { id: 'alarmes', label: 'Alarmes, câmeras e cercas elétricas (estado visual)', score: null },
      { id: 'portas-seguras', label: 'Robustez de portas, fechaduras e portões', score: null },
      { id: 'incendio', label: 'Equipamentos de combate a incêndio (validade extintores)', score: null },
    ],
  },
  {
    id: 'garagem',
    title: '11. Garagem',
    weight: 4,
    items: [
      { id: 'piso-garagem', label: 'Estado do piso e infiltrações no teto', score: null },
      { id: 'portao', label: 'Portão automático (funcionamento)', score: null },
      { id: 'manobra', label: 'Espaço de manobra e tamanho das vagas', score: null },
    ],
  },
  {
    id: 'lazer',
    title: '12. Lazer Privativo',
    weight: 5,
    items: [
      { id: 'piscina', label: 'Revestimento da piscina e casa de máquinas', score: null },
      { id: 'churrasqueira', label: 'Estrutura da churrasqueira, coifas e bancadas', score: null },
      { id: 'gourmet', label: 'Iluminação e pontos de água/esgoto na área gourmet', score: null },
    ],
  },
  {
    id: 'paisagismo',
    title: '13. Paisagismo e Jardins',
    weight: 4,
    items: [
      { id: 'plantas', label: 'Saúde geral das plantas e do gramado', score: null },
      { id: 'irrigacao', label: 'Sistema de irrigação (automático?)', score: null },
      { id: 'iluminacao-jardim', label: 'Iluminação externa e caminhos de jardim', score: null },
    ],
  },
  {
    id: 'marcenaria',
    title: '14. Marcenaria e Planejados',
    weight: 5,
    items: [
      { id: 'ferragens', label: 'Ferragens e corrediças de portas e gavetas', score: null },
      { id: 'cupim', label: 'Estufamento, descolamento ou sinais de cupim', score: null },
      { id: 'conservacao-armarios', label: 'Qualidade geral e estado de conservação', score: null },
    ],
  },
  {
    id: 'loucas',
    title: '15. Louças e Metais',
    weight: 4,
    items: [
      { id: 'loucas', label: 'Trincas ou manchas em pias, cubas e vasos', score: null },
      { id: 'torneiras', label: 'Funcionamento de torneiras e registros', score: null },
      { id: 'metais', label: 'Ferrugem ou descascados nos metais', score: null },
    ],
  },
  {
    id: 'tecnologia',
    title: '16. Tecnologia e Automação',
    weight: 3,
    items: [
      { id: 'possui-automacao', label: 'Imóvel possui sistema de automação', tooltip: 'Se não possuir, marque N/A nos demais', score: null },
      { id: 'automacao', label: 'Sistemas de automação (luz, som, persianas)', score: null },
      { id: 'wifi', label: 'Sinal de Wi-Fi e pontos de rede', score: null },
    ],
  },
  {
    id: 'acessibilidade',
    title: '17. Acessibilidade',
    weight: 2,
    items: [
      { id: 'rampas', label: 'Rampas e portas largas', score: null },
      { id: 'circulacao', label: 'Circulação adequada nos corredores e banheiros', score: null },
    ],
  },
  {
    id: 'vizinhanca',
    title: '18. Vizinhança e Entorno',
    weight: 5,
    items: [
      { id: 'vizinhos', label: 'Perfil das construções vizinhas e ruído', score: null },
      { id: 'comercio', label: 'Proximidade de comércios e serviços', score: null },
      { id: 'transporte', label: 'Transporte público próximo', tooltip: 'Valoriza o imóvel', score: null },
      { id: 'seguranca-rua', label: 'Sensação de segurança na rua', tooltip: 'Impacta decisão de compra', score: null },
    ],
  },
  {
    id: 'documentacao',
    title: '19. Documentação',
    weight: 4,
    items: [
      { id: 'matricula', label: 'Matrícula do Imóvel atualizada', score: null },
      { id: 'area-prefeitura', label: 'Área construída corresponde à realidade', score: null },
      { id: 'certidoes', label: 'Certidões Negativas (IPTU, Condomínio em dia)', score: null },
    ],
  },
  {
    id: 'sensacao',
    title: '20. Sensação Geral',
    weight: 3,
    items: [
      { id: 'layout', label: 'Layout atende às necessidades', score: null },
      { id: 'bem-estar', label: 'Sensação de bem-estar e segurança no espaço', score: null },
      { id: 'rotina', label: 'Imagina a rotina diária acontecendo ali', score: null },
    ],
  },
];

// ========== CHECKLIST APARTAMENTO (18 categorias, ~50 itens) ==========
const checklistApartamento: ChecklistCategory[] = [
  {
    id: 'fundacoes',
    title: '1. Estrutura e Conservação',
    weight: 10,
    items: [
      { id: 'trincas', label: 'Trincas ou fissuras grandes (>3mm) em paredes, pisos e tetos', score: null },
      { id: 'desaprumo', label: 'Desaprumo ou inclinações visíveis nas paredes', tooltip: 'Observe se as paredes parecem tortas ou inclinadas', score: null },
      { id: 'umidade-base', label: 'Sinais de umidade em paredes e teto', score: null },
      { id: 'portas-janelas', label: 'Portas e janelas fecham corretamente', score: null },
    ],
  },
  {
    id: 'eletrica',
    title: '2. Instalações Elétricas',
    weight: 8,
    items: [
      { id: 'quadro', label: 'Quadro de disjuntores: identificado, organizado e moderno', score: null },
      { id: 'tomadas', label: 'Teste de tomadas e interruptores', score: null },
      { id: 'fios-expostos', label: 'Fios expostos ou emendas visíveis', tooltip: 'Risco de segurança', score: null },
      { id: 'carga', label: 'Carga suporta equipamentos modernos (Ar condicionado, etc.)', score: null },
    ],
  },
  {
    id: 'hidraulica',
    title: '3. Instalações Hidráulicas',
    weight: 8,
    items: [
      { id: 'pressao', label: 'Pressão da água em torneiras e chuveiros', score: null },
      { id: 'vazamentos-vaso', label: 'Vazamentos na base dos vasos sanitários', score: null },
      { id: 'manchas-vazamento', label: 'Manchas de vazamento sob pias e em paredes', score: null },
      { id: 'tubulacoes', label: 'Tubulações com corrosão visível', tooltip: 'Indica idade avançada do sistema', score: null },
    ],
  },
  {
    id: 'acabamentos',
    title: '4. Acabamentos Internos',
    weight: 10,
    items: [
      { id: 'piso', label: 'Qualidade do piso (riscos, peças soltas, manchas)', score: null },
      { id: 'pintura', label: 'Pintura de paredes e tetos (bolhas, descascados)', score: null },
      { id: 'mofo', label: 'Mofo ou manchas de umidade em ambientes', tooltip: 'Impacta saúde e negociação', score: null },
      { id: 'rodapes', label: 'Estado de rodapés, guarnições e forros de gesso', score: null },
    ],
  },
  {
    id: 'esquadrias',
    title: '5. Esquadrias (Portas e Janelas)',
    weight: 7,
    items: [
      { id: 'vedacao', label: 'Vedação e funcionamento das ferragens', score: null },
      { id: 'infiltracao', label: 'Sinais de infiltração ao redor dos caixilhos', score: null },
      { id: 'vidros', label: 'Estado dos vidros (riscos, trincas)', score: null },
      { id: 'esquadrias-novas', label: 'Esquadrias de alumínio/PVC modernas', tooltip: 'Valoriza o imóvel', score: null },
    ],
  },
  {
    id: 'varanda',
    title: '6. Varanda/Sacada',
    weight: 7,
    items: [
      { id: 'estado-varanda', label: 'Estado da varanda/sacada (piso, paredes, teto)', tooltip: 'Diferencial de venda importante', score: null },
      { id: 'vistas', label: 'Vistas e privacidade', tooltip: 'Valoriza ou desvaloriza o imóvel', score: null },
      { id: 'fechamento', label: 'Fechamento de vidro (se houver)', score: null },
      { id: 'varanda-ampla', label: 'Varanda ampla e utilizável', tooltip: 'Varanda grande é diferencial', score: null },
    ],
  },
  {
    id: 'posicao',
    title: '7. Posição e Orientação',
    weight: 6,
    items: [
      { id: 'andar-alto', label: 'Andar alto (acima do 6º)', tooltip: 'Andares altos geralmente são mais valorizados', score: null },
      { id: 'sol-manha', label: 'Sol da manhã (face leste)', tooltip: 'Mais valorizado que sol da tarde', score: null },
      { id: 'frente-fundos', label: 'Posição frente vs fundos', tooltip: 'Frente geralmente mais valorizado', score: null },
    ],
  },
  {
    id: 'ventilacao',
    title: '8. Ventilação e Iluminação',
    weight: 5,
    items: [
      { id: 'luz-natural', label: 'Iluminação natural suficiente nos ambientes', score: null },
      { id: 'ventilacao-cruzada', label: 'Ventilação cruzada adequada', score: null },
      { id: 'exaustao', label: 'Sistemas de exaustão (coifas, depuradores)', score: null },
    ],
  },
  {
    id: 'climatizacao',
    title: '9. Climatização',
    weight: 4,
    items: [
      { id: 'possui-climatizacao', label: 'Imóvel possui sistema de climatização', score: null },
      { id: 'ar-funcionamento', label: 'Funcionamento dos equipamentos de ar condicionado', score: null },
      { id: 'infraestrutura', label: 'Infraestrutura para instalação de splits', score: null },
    ],
  },
  {
    id: 'seguranca',
    title: '10. Segurança do Apartamento',
    weight: 4,
    items: [
      { id: 'porta-blindada', label: 'Porta blindada ou reforçada', score: null },
      { id: 'fechaduras', label: 'Qualidade das fechaduras', score: null },
      { id: 'olho-magico', label: 'Olho mágico ou câmera na porta', score: null },
    ],
  },
  {
    id: 'garagem',
    title: '11. Garagem',
    weight: 5,
    items: [
      { id: 'localizacao-vaga', label: 'Localização das vagas (cobertas, perto do elevador)', score: null },
      { id: 'tamanho-vaga', label: 'Tamanho das vagas (comporta SUV/utilitário)', score: null },
      { id: 'acesso', label: 'Facilidade de acesso e manobra', score: null },
    ],
  },
  {
    id: 'marcenaria',
    title: '12. Marcenaria e Planejados',
    weight: 5,
    items: [
      { id: 'ferragens', label: 'Ferragens e corrediças de portas e gavetas', score: null },
      { id: 'cupim', label: 'Estufamento, descolamento ou sinais de cupim', score: null },
      { id: 'conservacao-armarios', label: 'Qualidade geral e estado de conservação', score: null },
      { id: 'closet', label: 'Closet na suíte master', tooltip: 'Diferencial valorizado', score: null },
    ],
  },
  {
    id: 'loucas',
    title: '13. Louças e Metais',
    weight: 4,
    items: [
      { id: 'loucas', label: 'Trincas ou manchas em pias, cubas e vasos', score: null },
      { id: 'torneiras', label: 'Funcionamento de torneiras e registros', score: null },
      { id: 'metais', label: 'Ferrugem ou descascados nos metais', score: null },
    ],
  },
  {
    id: 'tecnologia',
    title: '14. Tecnologia',
    weight: 3,
    items: [
      { id: 'interfone', label: 'Interfone/videofone funcional', tooltip: 'Importante para segurança', score: null },
      { id: 'automacao', label: 'Sistemas de automação (se houver)', score: null },
      { id: 'wifi', label: 'Sinal de Wi-Fi e pontos de rede', score: null },
    ],
  },
  {
    id: 'acessibilidade',
    title: '15. Acessibilidade e Elevadores',
    weight: 5,
    items: [
      { id: 'quantidade-elevadores', label: 'Quantidade de elevadores adequada ao prédio', tooltip: 'Prédio alto com poucos elevadores = problema de espera', score: null },
      { id: 'separacao-elevadores', label: 'Separação entre elevador social e de serviço/carga', tooltip: 'Condomínios premium geralmente têm separação', score: null },
      { id: 'circulacao', label: 'Circulação adequada nos corredores', score: null },
    ],
  },
  {
    id: 'areas-comuns',
    title: '16. Áreas Comuns do Condomínio',
    weight: 5,
    items: [
      { id: 'portaria', label: 'Portaria e recepção (organização, segurança)', score: null },
      { id: 'piscina-cond', label: 'Piscina do condomínio (estado e manutenção)', score: null },
      { id: 'academia-salao', label: 'Academia/Salão de festas em bom estado', tooltip: 'Diferencial do condomínio', score: null },
      { id: 'manutencao-geral', label: 'Manutenção geral das áreas comuns', score: null },
    ],
  },
  {
    id: 'vizinhanca',
    title: '17. Vizinhança e Entorno',
    weight: 4,
    items: [
      { id: 'vizinhos', label: 'Perfil do prédio e vizinhança', score: null },
      { id: 'comercio', label: 'Proximidade de comércios e serviços', score: null },
      { id: 'transporte', label: 'Transporte público próximo', tooltip: 'Valoriza o imóvel', score: null },
      { id: 'seguranca-rua', label: 'Sensação de segurança na região', tooltip: 'Impacta decisão de compra', score: null },
    ],
  },
  {
    id: 'documentacao',
    title: '18. Documentação',
    weight: 4,
    items: [
      { id: 'matricula', label: 'Matrícula do Imóvel atualizada', score: null },
      { id: 'area-prefeitura', label: 'Área construída corresponde à realidade', score: null },
      { id: 'certidoes', label: 'Certidões Negativas (IPTU, Condomínio em dia)', score: null },
    ],
  },
  {
    id: 'sensacao',
    title: '19. Sensação Geral',
    weight: 3,
    items: [
      { id: 'layout', label: 'Layout atende às necessidades', score: null },
      { id: 'bem-estar', label: 'Sensação de bem-estar no espaço', score: null },
      { id: 'rotina', label: 'Imagina a rotina diária acontecendo ali', score: null },
    ],
  },
];

const STORAGE_KEY = 'godoy_vistoria_data_v2';

interface SavedVistoriaData {
  propertyData: PropertyData;
  checklist: ChecklistCategory[];
  photos: PhotoItem[];
  tipoVistoria: TipoVistoria;
  savedAt: string;
}

export default function VistoriaDigital() {
  const [tipoVistoria, setTipoVistoria] = useState<TipoVistoria>(null);
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistCategory[]>([]);
  const [propertyData, setPropertyData] = useState<PropertyData>(initialPropertyData);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [selectedPhotoItem, setSelectedPhotoItem] = useState<{ categoryId: string; itemId: string; label: string } | null>(null);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);
  const [fromAvaliacao, setFromAvaliacao] = useState(false);
  const [avaliacaoData, setAvaliacaoData] = useState<AvaliacaoData | null>(null);
  const [pricingStrategyState, setPricingStrategyState] = useState<any>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingVistoriaId, setEditingVistoriaId] = useState<string | null>(null);
  const { shouldRunTour, startTour, endTour } = useFirstVisitTour('vistoria');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { trackVistoria, trackExport } = useActivityTracking();
  const { user } = useAuth();
  
  // Fetch checklist data from database
  const { data: dbChecklistCasa, isLoading: loadingCasa } = useVistoriaChecklistFull('casa');
  const { data: dbChecklistApartamento, isLoading: loadingApartamento } = useVistoriaChecklistFull('apartamento');
  
  // Convert database format to component format
  const convertToChecklist = useCallback((dbData: CategoryWithItems[] | undefined, fallback: ChecklistCategory[]): ChecklistCategory[] => {
    if (!dbData || dbData.length === 0) return JSON.parse(JSON.stringify(fallback));
    
    return dbData.map(cat => ({
      id: cat.category_id,
      title: cat.title,
      weight: Number(cat.weight),
      items: cat.items.map(item => ({
        id: item.item_id,
        label: item.label,
        tooltip: item.tooltip || undefined,
        score: null as ItemScore,
      })),
    }));
  }, []);
  
  // Memoized checklists from DB with fallback
  const checklistCasaFromDB = useMemo(() => 
    convertToChecklist(dbChecklistCasa, checklistCasa), 
    [dbChecklistCasa, convertToChecklist]
  );
  
  const checklistApartamentoFromDB = useMemo(() => 
    convertToChecklist(dbChecklistApartamento, checklistApartamento), 
    [dbChecklistApartamento, convertToChecklist]
  );
  
  // Street autocomplete state
  const [streetSearchTerm, setStreetSearchTerm] = useState("");
  const [streetSuggestions, setStreetSuggestions] = useState<StreetSuggestion[]>([]);
  const [showStreetSuggestions, setShowStreetSuggestions] = useState(false);
  const [loadingStreets, setLoadingStreets] = useState(false);
  
  // Mobile category navigation
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  
  const goToNextCategory = useCallback(() => {
    setCurrentCategoryIndex(prev => 
      prev < checklist.length - 1 ? prev + 1 : prev
    );
  }, [checklist.length]);
  
  const goToPrevCategory = useCallback(() => {
    setCurrentCategoryIndex(prev => prev > 0 ? prev - 1 : prev);
  }, []);
  
  const { handlers: swipeHandlers } = useSwipeGesture({
    onSwipeLeft: goToNextCategory,
    onSwipeRight: goToPrevCategory,
    minSwipeDistance: 50,
  });
  
  // Fetch street suggestions from ITBI data
  useEffect(() => {
    const fetchStreetSuggestions = async () => {
      if (streetSearchTerm.length < 2) {
        setStreetSuggestions([]);
        return;
      }

      setLoadingStreets(true);
      try {
        // Normalize search term (remove acentos, prefixos e aplica correções)
        const normalizedTerm = normalizeStreetSearchTerm(streetSearchTerm);

        const bairro = propertyData.bairro?.toUpperCase() || "BARRA DA TIJUCA";
        const OUTLIER_MAX_M2 = 40000;

        const { data, error } = await supabase
          .from("itbi_transactions")
          .select("logradouro, valor_m2")
          .eq("bairro", bairro)
          .eq("uso", "Residencial")
          .gte("percentual_transferido", 90)
          .not("valor_m2", "is", null)
          .lte("valor_m2", OUTLIER_MAX_M2)
          .ilike("logradouro", `%${normalizedTerm}%`)
          .limit(500);

        if (error) throw error;

        // Group by logradouro and calculate stats
        const grouped = data.reduce((acc, item) => {
          const key = item.logradouro;
          if (!acc[key]) {
            acc[key] = { values: [], count: 0 };
          }
          acc[key].values.push(Number(item.valor_m2));
          acc[key].count++;
          return acc;
        }, {} as Record<string, { values: number[]; count: number }>);

        // Calculate median for each street
        const results: StreetSuggestion[] = Object.entries(grouped)
          .filter(([_, data]) => data.count >= 2) // Min 2 transactions
          .map(([logradouro, data]) => {
            const sorted = data.values.sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            const med_m2 = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
            return {
              logradouro,
              count: data.count,
              med_m2,
            };
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);

        setStreetSuggestions(results);
      } catch (error) {
        console.error("Erro ao buscar sugestões:", error);
      } finally {
        setLoadingStreets(false);
      }
    };

    const debounce = setTimeout(fetchStreetSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [streetSearchTerm, propertyData.bairro]);
  
  const handleSelectStreet = (suggestion: StreetSuggestion) => {
    updatePropertyData('logradouro', suggestion.logradouro);
    setStreetSearchTerm(suggestion.logradouro);
    setShowStreetSuggestions(false);
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Check for data from Avaliação Imobiliária or Edit Mode
  useEffect(() => {
    const locationState = location.state as { 
      fromAvaliacao?: boolean;
      editMode?: boolean;
      vistoriaId?: string;
      vistoriaData?: {
        propertyData: PropertyData;
        tipoVistoria: 'casa' | 'apartamento';
        checklist: ChecklistCategory[];
        valorAvaliacao: number | null;
        valuationId: string | null;
        avaliacaoData?: AvaliacaoData | null;
        pricingStrategy?: any;
      };
      propertyData?: {
        logradouro?: string;
        numero?: string;
        complemento?: string;
        bairro?: string;
        nomeCondominio?: string;
        tipoImovel?: string;
        areaM2?: string;
        quartos?: string;
        suites?: string;
        banheiros?: string;
        vagas?: string;
        proprietario?: string;
        telefone?: string;
        observacoes?: string;
        avaliacaoData?: AvaliacaoData;
        pricingStrategy?: any;
      };
    } | null;
    
    // Handle edit mode
    if (locationState?.editMode && locationState?.vistoriaData) {
      setEditMode(true);
      setEditingVistoriaId(locationState.vistoriaId || null);
      const data = locationState.vistoriaData;
      
      setPropertyData(data.propertyData);
      setTipoVistoria(data.tipoVistoria);
      
      // Load checklist data if available, otherwise use default
      if (data.checklist && Array.isArray(data.checklist)) {
        setChecklist(data.checklist);
      } else {
        setChecklist(JSON.parse(JSON.stringify(
          data.tipoVistoria === 'casa' ? checklistCasaFromDB : checklistApartamentoFromDB
        )));
      }
      
      // Set avaliacao data - prioriza dados completos, fallback para básico
      if (data.avaliacaoData) {
        setAvaliacaoData(data.avaliacaoData);
      } else if (data.valorAvaliacao) {
        setAvaliacaoData({
          valorProvavel: data.valorAvaliacao,
          valorPessimista: data.valorAvaliacao * 0.9,
          valorOtimista: data.valorAvaliacao * 1.1,
          confidenceLevel: 'MÉDIA',
          dataAvaliacao: new Date().toISOString(),
        });
      }
      
      // Set pricing strategy from edit data
      if (data.pricingStrategy) {
        setPricingStrategyState(data.pricingStrategy);
      }
      
      setHasLoadedFromStorage(true);
      window.history.replaceState({}, document.title);
      
      toast({
        title: "Editando vistoria",
        description: "Os dados da vistoria foram carregados para edição.",
      });
      return;
    }
    
    // Handle data from Avaliação Imobiliária
    if (locationState?.fromAvaliacao && locationState?.propertyData) {
      setFromAvaliacao(true);
      const data = locationState.propertyData;
      
      if (data.avaliacaoData) {
        setAvaliacaoData(data.avaliacaoData);
      }
      
      // Set pricing strategy from avaliação data
      if (data.pricingStrategy) {
        setPricingStrategyState(data.pricingStrategy);
      }
      
      setPropertyData(prev => ({
        ...prev,
        logradouro: data.logradouro || prev.logradouro,
        numero: data.numero || prev.numero,
        complemento: data.complemento || prev.complemento,
        bairro: data.bairro || prev.bairro,
        nomeCondominio: data.nomeCondominio || prev.nomeCondominio,
        tipoImovel: data.tipoImovel || prev.tipoImovel,
        areaM2: data.areaM2 || prev.areaM2,
        quartos: data.quartos || prev.quartos,
        suites: data.suites || prev.suites,
        banheiros: data.banheiros || prev.banheiros,
        vagas: data.vagas || prev.vagas,
        proprietario: data.proprietario || prev.proprietario,
        telefone: data.telefone || prev.telefone,
        observacoes: data.observacoes || prev.observacoes,
      }));
      
      // Auto-select tipo based on tipoImovel from Avaliação
      const tipo = data.tipoImovel?.toLowerCase();
      if (tipo === 'casa' || tipo === 'terreno') {
        setTipoVistoria('casa');
        setChecklist(JSON.parse(JSON.stringify(checklistCasaFromDB)));
      } else if (tipo === 'apartamento' || tipo === 'cobertura') {
        setTipoVistoria('apartamento');
        setChecklist(JSON.parse(JSON.stringify(checklistApartamentoFromDB)));
      } else {
        setShowTypeDialog(true);
      }
      
      window.history.replaceState({}, document.title);
      
      toast({
        title: "Dados importados da Avaliação",
        description: "Os dados do imóvel foram pré-preenchidos automaticamente.",
      });
    }
  }, [location.state, toast]);

  // Load from localStorage on mount - ONLY if NOT coming from Avaliação or Edit Mode
  useEffect(() => {
    // Check directly from location.state to avoid race condition
    const locationState = location.state as { fromAvaliacao?: boolean; editMode?: boolean } | null;
    
    // If coming from Avaliação or Edit Mode, don't load from localStorage
    if (locationState?.fromAvaliacao || fromAvaliacao || locationState?.editMode || editMode) {
      setHasLoadedFromStorage(true);
      return;
    }
    
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data: SavedVistoriaData = JSON.parse(saved);
        setPropertyData(data.propertyData);
        setChecklist(data.checklist);
        setPhotos(data.photos || []);
        setTipoVistoria(data.tipoVistoria);
        setHasLoadedFromStorage(true);
        
        if (data.tipoVistoria && data.propertyData.logradouro) {
          toast({
            title: "Vistoria recuperada",
            description: `Dados salvos em ${new Date(data.savedAt).toLocaleString("pt-BR")}`,
          });
        }
      } else {
        setShowTypeDialog(true);
        setHasLoadedFromStorage(true);
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      setShowTypeDialog(true);
      setHasLoadedFromStorage(true);
    }
  }, [location.state, fromAvaliacao, toast]);

  // Save to localStorage when data changes
  useEffect(() => {
    if (!hasLoadedFromStorage || !tipoVistoria) return;
    
    const dataToSave: SavedVistoriaData = {
      propertyData,
      checklist,
      photos,
      tipoVistoria,
      savedAt: new Date().toISOString(),
    };
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [propertyData, checklist, photos, tipoVistoria, hasLoadedFromStorage]);

  const handleSelectTipoVistoria = (tipo: 'casa' | 'apartamento') => {
    setTipoVistoria(tipo);
    setChecklist(JSON.parse(JSON.stringify(tipo === 'casa' ? checklistCasaFromDB : checklistApartamentoFromDB)));
    setShowTypeDialog(false);
    
    // Update tipoImovel based on selection
    if (!propertyData.tipoImovel) {
      setPropertyData(prev => ({ ...prev, tipoImovel: tipo }));
    }
  };

  const updatePropertyData = (field: keyof PropertyData, value: string) => {
    setPropertyData(prev => ({ ...prev, [field]: value }));
  };

  const updateItemScore = (categoryId: string, itemId: string, newScore: ItemScore) => {
    setChecklist(prev =>
      prev.map(category =>
        category.id === categoryId
          ? {
              ...category,
              items: category.items.map(item =>
                item.id === itemId ? { ...item, score: newScore } : item
              ),
            }
          : category
      )
    );
  };

  const getProgress = () => {
    const totalItems = checklist.reduce((sum, cat) => sum + cat.items.length, 0);
    const verifiedItems = checklist.reduce(
      (sum, cat) => sum + cat.items.filter(item => item.score !== null).length,
      0
    );
    return totalItems > 0 ? Math.round((verifiedItems / totalItems) * 100) : 0;
  };

  const getCriticalCount = () => {
    return checklist.reduce(
      (sum, cat) => sum + cat.items.filter(item => item.score === 1 || item.score === 2).length,
      0
    );
  };

  // Calculate final score (0-100)
  const calculateFinalScore = (): number => {
    let totalWeight = 0;
    let weightedScore = 0;
    
    for (const category of checklist) {
      const scoredItems = category.items.filter(item => item.score !== null && item.score !== 'na');
      if (scoredItems.length === 0) continue;
      
      const categoryAvg = scoredItems.reduce((sum, item) => sum + (item.score as number), 0) / scoredItems.length;
      const normalizedScore = ((categoryAvg - 1) / 4) * 100; // Convert 1-5 to 0-100
      
      weightedScore += normalizedScore * category.weight;
      totalWeight += category.weight;
    }
    
    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
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

  const resetChecklist = () => {
    setShowResetDialog(false);
    setChecklist(JSON.parse(JSON.stringify(tipoVistoria === 'casa' ? checklistCasaFromDB : checklistApartamentoFromDB)));
    setPropertyData(initialPropertyData);
    setPhotos([]);
    setTipoVistoria(null);
    setFromAvaliacao(false);
    setAvaliacaoData(null);
    setEditMode(false);
    setEditingVistoriaId(null);
    localStorage.removeItem(STORAGE_KEY);
    setShowTypeDialog(true);
    toast({
      title: "Vistoria reiniciada",
      description: "Todos os dados foram limpos.",
    });
  };

  const generateReport = async () => {
    setIsGeneratingPDF(true);
    
    try {
      const finalScore = calculateFinalScore();
      const progress = getProgress();
      const criticalCount = getCriticalCount();
      
      // Calculate adjusted values if coming from valuation
      let valorAvaliacao: number | null = null;
      let valorAjustado: number | null = null;
      let ajustePercentual: number | null = null;
      
      if (avaliacaoData) {
        const adjustment = calculateVistoriaAdjustment(finalScore);
        valorAvaliacao = avaliacaoData.valorProvavel;
        valorAjustado = Math.round(avaliacaoData.valorProvavel * (1 + adjustment.adjustment));
        ajustePercentual = adjustment.adjustment * 100;
      }
      
      // Save or update vistoria in database
      if (user?.id) {
        const vistoriaData = {
          user_id: user.id,
          logradouro: propertyData.logradouro,
          numero: propertyData.numero || null,
          complemento: propertyData.complemento || null,
          bairro: propertyData.bairro || 'BARRA DA TIJUCA',
          nome_condominio: propertyData.nomeCondominio || null,
          tipo_imovel: propertyData.tipoImovel || null,
          tipo_vistoria: tipoVistoria,
          area_m2: propertyData.areaM2 ? parseFloat(propertyData.areaM2) : null,
          quartos: propertyData.quartos ? parseInt(propertyData.quartos) : null,
          suites: propertyData.suites ? parseInt(propertyData.suites) : null,
          banheiros: propertyData.banheiros ? parseInt(propertyData.banheiros) : null,
          vagas: propertyData.vagas ? parseInt(propertyData.vagas) : null,
          proprietario: propertyData.proprietario || null,
          telefone: propertyData.telefone || null,
          vistoriador: propertyData.vistoriador || null,
          data_vistoria: propertyData.dataVistoria || new Date().toISOString().split('T')[0],
          observacoes: propertyData.observacoes || null,
          final_score: finalScore,
          progress: progress,
          critical_count: criticalCount,
          checklist_data: JSON.parse(JSON.stringify(checklist)),
          valor_avaliacao: valorAvaliacao,
          valor_ajustado: valorAjustado,
          ajuste_percentual: ajustePercentual,
          pdf_generated: true,
          updated_at: new Date().toISOString(),
        };
        
        let saveError;
        
        if (editMode && editingVistoriaId) {
          // Update existing vistoria
          const { error } = await supabase
            .from('vistorias')
            .update(vistoriaData)
            .eq('id', editingVistoriaId);
          saveError = error;
        } else {
          // Insert new vistoria
          const { error } = await supabase
            .from('vistorias')
            .insert([vistoriaData]);
          saveError = error;
        }
        
        if (saveError) {
          console.error('Error saving vistoria:', saveError);
          // Continue with PDF generation even if save fails
        } else {
          console.log(editMode ? 'Vistoria updated successfully' : 'Vistoria saved successfully');
        }
      }
      
      // Generate PDF - use pricingStrategy from state (loaded from location on mount)
      await generateVistoriaPDF({
        propertyData,
        checklist,
        photos,
        tipoVistoria,
        finalScore,
        progress,
        criticalCount,
        avaliacaoData,
        pricingStrategy: pricingStrategyState,
      });
      
      // Track vistoria completion
      trackVistoria(propertyData.logradouro || 'unknown');
      trackExport('vistoria_pdf');
      
      toast({
        title: editMode ? "Vistoria atualizada" : "PDF gerado com sucesso",
        description: editMode
          ? "As alterações foram salvas e o relatório foi baixado."
          : avaliacaoData 
            ? "Vistoria salva e relatório baixado com valores ajustados."
            : "A vistoria foi salva e o relatório foi baixado.",
      });
      
      // Reset edit mode after successful save
      if (editMode) {
        setEditMode(false);
        setEditingVistoriaId(null);
      }
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

  const handleGeneratePdfForEmail = async () => {
    return await generateVistoriaPDFDoc({
      propertyData,
      checklist,
      photos,
      tipoVistoria,
      finalScore: calculateFinalScore(),
      progress: getProgress(),
      criticalCount: getCriticalCount(),
      avaliacaoData,
      pricingStrategy: pricingStrategyState,
    });
  };

  const handleNavigateToAvaliacao = () => {
    const vistoriaToAvaliacaoData = {
      logradouro: propertyData.logradouro,
      numero: propertyData.numero,
      complemento: propertyData.complemento,
      bairro: propertyData.bairro,
      nomeCondominio: propertyData.nomeCondominio,
      tipoImovel: propertyData.tipoImovel,
      area_m2: propertyData.areaM2 ? parseFloat(propertyData.areaM2) : undefined,
      quartos: propertyData.quartos ? parseInt(propertyData.quartos) : undefined,
      suites: propertyData.suites ? parseInt(propertyData.suites) : undefined,
      banheiros: propertyData.banheiros ? parseInt(propertyData.banheiros) : undefined,
      vagas: propertyData.vagas ? parseInt(propertyData.vagas) : undefined,
      proprietario: propertyData.proprietario,
      telefone: propertyData.telefone,
      checklistSummary: {
        criticalCount: getCriticalCount(),
        progress: getProgress(),
        finalScore: calculateFinalScore(),
        tipoVistoria,
      }
    };
    navigate('/avaliacao-imobiliaria', {
      state: {
        fromVistoria: true,
        vistoriaData: vistoriaToAvaliacaoData
      }
    });
  };

  // Show type selection dialog if no type selected
  if (!tipoVistoria && hasLoadedFromStorage) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Nova Vistoria Digital</CardTitle>
            <p className="text-muted-foreground text-sm mt-2">
              Selecione o tipo de imóvel para iniciar
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-32 flex-col gap-3 hover:border-primary hover:bg-primary/5"
                onClick={() => handleSelectTipoVistoria('casa')}
              >
                <Home className="h-10 w-10 text-primary" />
                <span className="font-semibold">Casa</span>
                <span className="text-xs text-muted-foreground">20 categorias</span>
              </Button>
              <Button
                variant="outline"
                className="h-32 flex-col gap-3 hover:border-primary hover:bg-primary/5"
                onClick={() => handleSelectTipoVistoria('apartamento')}
              >
                <Building className="h-10 w-10 text-primary" />
                <span className="font-semibold">Apartamento</span>
                <span className="text-xs text-muted-foreground">18 categorias</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const finalScore = calculateFinalScore();
  const scoreColor = finalScore >= 80 ? 'text-emerald-600' : finalScore >= 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      <PageTour page="vistoria" run={shouldRunTour} onFinish={endTour} />
      
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Vistoria Digital</h2>
            {tipoVistoria && (
              <Badge variant="outline" className="text-xs" data-tour="vistoria-tipo">
                {tipoVistoria === 'casa' ? <Home className="h-3 w-3 mr-1" /> : <Building className="h-3 w-3 mr-1" />}
                {tipoVistoria === 'casa' ? 'Casa' : 'Apartamento'}
              </Badge>
            )}
            {fromAvaliacao && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                <Calculator className="h-3 w-3 mr-1" />
                Via Avaliação
              </Badge>
            )}
            {editMode && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700">
                <Pencil className="h-3 w-3 mr-1" />
                Editando
              </Badge>
            )}
          </div>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Checklist de inspeção com scoring 1-5</p>
        </div>
        <Button variant="outline" size="sm" onClick={startTour}>
          <HelpCircle className="h-4 w-4 mr-2" />
          Tour
        </Button>
      </div>

      {/* Card de valores da avaliação para referência */}
      {fromAvaliacao && avaliacaoData && (
        <Card className="bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 border-emerald-200 dark:border-emerald-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Valores de Referência da Avaliação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-background/80 rounded">
                <p className="text-xs text-muted-foreground">Pessimista</p>
                <p className="font-semibold text-red-600 text-sm">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(avaliacaoData.valorPessimista)}
                </p>
              </div>
              <div className="p-2 bg-primary/10 rounded border border-primary/30">
                <p className="text-xs text-muted-foreground">Provável</p>
                <p className="font-bold text-primary">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(avaliacaoData.valorProvavel)}
                </p>
              </div>
              <div className="p-2 bg-background/80 rounded">
                <p className="text-xs text-muted-foreground">Otimista</p>
                <p className="font-semibold text-emerald-600 text-sm">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(avaliacaoData.valorOtimista)}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              💡 Use estes valores como referência durante a inspeção
            </p>
          </CardContent>
        </Card>
      )}

      {/* Comparativo Avaliação vs Vistoria */}
      {fromAvaliacao && avaliacaoData && getProgress() >= 50 && (
        <VistoriaAvaliacaoComparativo
          avaliacaoData={avaliacaoData}
          vistoriaScore={finalScore}
          progress={getProgress()}
        />
      )}

      {/* Preview da Estratégia de Precificação */}
      {pricingStrategyState && (
        <PricingStrategyPreview pricingStrategy={pricingStrategyState} />
      )}

      <div className="space-y-6">
        {/* Progress Card */}
        <Card data-tour="vistoria-score">
          <CardHeader className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-4">
                <CardTitle className="text-lg sm:text-xl">Progresso</CardTitle>
                {getProgress() === 100 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`${scoreColor} border-current`}>
                      <Star className="h-3 w-3 mr-1" />
                      Score: {finalScore}/100
                    </Badge>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {getCriticalCount() > 0 && (
                  <Badge variant="destructive" className="text-xs sm:text-sm">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {getCriticalCount()} Crítico{getCriticalCount() > 1 ? 's' : ''}
                  </Badge>
                )}
                {photos.length > 0 && (
                  <Badge variant="secondary" className="text-xs sm:text-sm">
                    <Image className="h-3 w-3 mr-1" />
                    {photos.length} Foto{photos.length > 1 ? 's' : ''}
                  </Badge>
                )}
                <Button variant="outline" onClick={() => setShowResetDialog(true)} size="sm" className="text-xs sm:text-sm gap-1">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reiniciar
                </Button>
                <Button onClick={generateReport} size="sm" className="gap-1.5 text-xs sm:text-sm" disabled={isGeneratingPDF || getProgress() < 50} data-tour="vistoria-pdf">
                  {isGeneratingPDF ? (
                    <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                  Relatório
                </Button>
                <Button 
                  onClick={() => setShowEmailDialog(true)} 
                  size="sm" 
                  variant="outline"
                  className="gap-1.5 text-xs sm:text-sm"
                  disabled={getProgress() < 50}
                >
                  <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Email
                </Button>
                <Button 
                  onClick={handleNavigateToAvaliacao}
                  size="sm" 
                  variant="secondary"
                  className="gap-1.5 text-xs sm:text-sm"
                  data-tour="vistoria-avaliacao"
                >
                  <Calculator className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Avaliação
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
        <Card data-tour="vistoria-dados">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Identificação do Imóvel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2 lg:col-span-2">
                <Label htmlFor="logradouro" className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  Logradouro *
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="logradouro"
                    value={streetSearchTerm || propertyData.logradouro}
                    onChange={(e) => {
                      setStreetSearchTerm(e.target.value);
                      updatePropertyData('logradouro', e.target.value);
                      setShowStreetSuggestions(true);
                    }}
                    onFocus={() => setShowStreetSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowStreetSuggestions(false), 200)}
                    placeholder="Digite o nome da rua..."
                    className="pl-10"
                  />
                  
                  {/* Street suggestions dropdown */}
                  {showStreetSuggestions && streetSuggestions.length > 0 && (
                    <Card className="absolute z-50 w-full mt-1 shadow-lg max-h-[50vh] overflow-y-auto">
                      <CardContent className="p-0">
                        {streetSuggestions.map((suggestion) => (
                          <button
                            key={suggestion.logradouro}
                            onClick={() => handleSelectStreet(suggestion)}
                            className="w-full px-3 py-2.5 text-left hover:bg-muted/50 border-b last:border-0 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="font-medium text-sm truncate">{suggestion.logradouro}</span>
                              </div>
                              <Badge variant="secondary" className="text-[10px] shrink-0">
                                {suggestion.count} trans.
                              </Badge>
                            </div>
                            <div className="mt-1 text-[10px] text-muted-foreground ml-6">
                              Mediana: {formatCurrency(suggestion.med_m2)}/m²
                            </div>
                          </button>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                  
                  {loadingStreets && streetSearchTerm.length >= 2 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Sugestões baseadas em dados oficiais
                </p>
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

        {/* Checklist */}
        <Card data-tour="vistoria-checklist">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg sm:text-xl">Checklist de Inspeção</CardTitle>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-medium ${scoreConfig[n as 1|2|3|4|5].color.split(' ')[0]}`}>
                    {n}
                  </span>
                ))}
              </div>
            </div>
            {/* Mobile category navigation indicator */}
            {isMobile && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToPrevCategory}
                  disabled={currentCategoryIndex === 0}
                  className="h-8 px-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex flex-col items-center flex-1 mx-2">
                  <span className="text-xs text-muted-foreground">
                    {currentCategoryIndex + 1} / {checklist.length}
                  </span>
                  <div className="flex gap-1 mt-1">
                    {checklist.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentCategoryIndex(idx)}
                        className={`h-1.5 rounded-full transition-all ${
                          idx === currentCategoryIndex 
                            ? 'w-4 bg-primary' 
                            : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToNextCategory}
                  disabled={currentCategoryIndex === checklist.length - 1}
                  className="h-8 px-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {/* Mobile: Swipe carousel view */}
            {isMobile ? (
              <div 
                {...swipeHandlers}
                className="touch-pan-y"
              >
                {checklist[currentCategoryIndex] && (() => {
                  const category = checklist[currentCategoryIndex];
                  const scoredItems = category.items.filter(i => i.score !== null);
                  const categoryProgress = Math.round((scoredItems.length / category.items.length) * 100);
                  
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-base">{category.title}</h3>
                        {categoryProgress > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {categoryProgress}%
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-3">
                        {category.items.map((item) => {
                          const itemPhotos = getPhotosForItem(category.id, item.id);
                          return (
                            <div key={item.id} className="space-y-2">
                              <div className="flex flex-col gap-3 p-3 rounded-lg border bg-card">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  {item.score !== null && item.score !== 'na' ? (
                                    <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${scoreConfig[item.score].color.split(' ')[0]} text-white flex-shrink-0`}>
                                      {item.score}
                                    </span>
                                  ) : item.score === 'na' ? (
                                    <span className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-medium bg-slate-400 text-white flex-shrink-0">
                                      N/A
                                    </span>
                                  ) : (
                                    <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-medium bg-muted text-muted-foreground flex-shrink-0">
                                      ?
                                    </span>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <span className="font-medium text-sm leading-tight block">{item.label}</span>
                                    {item.tooltip && (
                                      <span className="text-xs text-muted-foreground">{item.tooltip}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1 ml-9">
                                  {([1, 2, 3, 4, 5] as const).map((score) => {
                                    const config = scoreConfig[score];
                                    return (
                                      <Button
                                        key={score}
                                        variant={item.score === score ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => updateItemScore(category.id, item.id, score)}
                                        className={`h-8 w-8 p-0 text-xs font-bold ${item.score === score ? config.color : ''}`}
                                      >
                                        {score}
                                      </Button>
                                    );
                                  })}
                                  <Button
                                    variant={item.score === 'na' ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => updateItemScore(category.id, item.id, 'na')}
                                    className={`h-8 w-8 p-0 text-[10px] font-medium ${item.score === 'na' ? scoreConfig['na'].color : ''}`}
                                  >
                                    N/A
                                  </Button>
                                  <Button
                                    variant={itemPhotos.length > 0 ? "secondary" : "outline"}
                                    size="sm"
                                    onClick={() => handlePhotoCapture(category.id, item.id, item.label)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Camera className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              {itemPhotos.length > 0 && (
                                <div className="flex gap-2 flex-wrap ml-9 pl-3">
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
                                        className="absolute -top-2 -right-2 h-5 w-5"
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
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        ← Deslize para navegar entre categorias →
                      </p>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* Desktop: Accordion view */
              <Accordion type="multiple" className="w-full">
                {checklist.map((category) => {
                  const scoredItems = category.items.filter(i => i.score !== null);
                  const categoryProgress = Math.round((scoredItems.length / category.items.length) * 100);
                  
                  return (
                    <AccordionItem key={category.id} value={category.id}>
                      <AccordionTrigger className="text-sm sm:text-base font-semibold text-left justify-start hover:no-underline">
                        <div className="flex items-center gap-3 flex-1">
                          <span>{category.title}</span>
                          {categoryProgress > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {categoryProgress}%
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {category.items.map((item) => {
                            const itemPhotos = getPhotosForItem(category.id, item.id);
                            return (
                              <div key={item.id} className="space-y-2">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border bg-card">
                                  <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                                    {item.score !== null && item.score !== 'na' ? (
                                      <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${scoreConfig[item.score].color.split(' ')[0]} text-white flex-shrink-0`}>
                                        {item.score}
                                      </span>
                                    ) : item.score === 'na' ? (
                                      <span className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-medium bg-slate-400 text-white flex-shrink-0">
                                        N/A
                                      </span>
                                    ) : (
                                      <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-medium bg-muted text-muted-foreground flex-shrink-0">
                                        ?
                                      </span>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <span className="font-medium text-sm sm:text-base leading-tight block">{item.label}</span>
                                      {item.tooltip && (
                                        <span className="text-xs text-muted-foreground">{item.tooltip}</span>
                                      )}
                                    </div>
                                  </div>
                                  <TooltipProvider delayDuration={300}>
                                    <div className="flex flex-wrap gap-1 flex-shrink-0 ml-9 sm:ml-0">
                                      {([1, 2, 3, 4, 5] as const).map((score) => {
                                        const config = scoreConfig[score];
                                        return (
                                          <Tooltip key={score}>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant={item.score === score ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => updateItemScore(category.id, item.id, score)}
                                                className={`h-7 w-7 sm:h-8 sm:w-8 p-0 text-xs font-bold ${item.score === score ? config.color : ''}`}
                                              >
                                                {score}
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-center">
                                              <p className="font-medium">{config.label}</p>
                                              <p className="text-xs text-muted-foreground">{config.description}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        );
                                      })}
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant={item.score === 'na' ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => updateItemScore(category.id, item.id, 'na')}
                                            className={`h-7 w-7 sm:h-8 sm:w-8 p-0 text-[9px] sm:text-[10px] font-medium ${item.score === 'na' ? scoreConfig['na'].color : ''}`}
                                          >
                                            N/A
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                          <p className="font-medium">Não se Aplica</p>
                                          <p className="text-xs text-muted-foreground">Este item não se aplica ao imóvel</p>
                                        </TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant={itemPhotos.length > 0 ? "secondary" : "outline"}
                                            size="sm"
                                            onClick={() => handlePhotoCapture(category.id, item.id, item.label)}
                                            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                                          >
                                            <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                          <p className="font-medium">Adicionar Foto</p>
                                          {itemPhotos.length > 0 && (
                                            <p className="text-xs text-muted-foreground">{itemPhotos.length} foto(s)</p>
                                          )}
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </TooltipProvider>
                                </div>
                                {itemPhotos.length > 0 && (
                                  <div className="flex gap-2 flex-wrap ml-9 pl-3">
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
                  );
                })}
              </Accordion>
            )}
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
      </div>

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

      {/* Reset confirmation dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reiniciar Vistoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá apagar todos os dados, fotos e avaliações da vistoria atual. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={resetChecklist} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Reiniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Type selection dialog (for manual trigger if needed) */}
      <Dialog open={showTypeDialog} onOpenChange={setShowTypeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selecione o Tipo de Imóvel</DialogTitle>
            <DialogDescription>
              Escolha o tipo para carregar o checklist apropriado
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <Button
              variant="outline"
              className="h-32 flex-col gap-3 hover:border-primary hover:bg-primary/5"
              onClick={() => handleSelectTipoVistoria('casa')}
            >
              <Home className="h-10 w-10 text-primary" />
              <span className="font-semibold">Casa</span>
              <span className="text-xs text-muted-foreground">20 categorias</span>
            </Button>
            <Button
              variant="outline"
              className="h-32 flex-col gap-3 hover:border-primary hover:bg-primary/5"
              onClick={() => handleSelectTipoVistoria('apartamento')}
            >
              <Building className="h-10 w-10 text-primary" />
              <span className="font-semibold">Apartamento</span>
              <span className="text-xs text-muted-foreground">18 categorias</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <SendPdfEmailDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        generatePdf={handleGeneratePdfForEmail}
        documentType="vistoria"
        defaultSubject={`Relatório de Vistoria - ${propertyData.logradouro || 'Imóvel'}`}
        pdfFilename={`vistoria_${propertyData.logradouro?.replace(/\s+/g, '_').substring(0, 20) || 'imovel'}_${new Date().toISOString().split('T')[0]}.pdf`}
        defaultEmail=""
        defaultName={propertyData.proprietario || ""}
      />
    </div>
  );
}
