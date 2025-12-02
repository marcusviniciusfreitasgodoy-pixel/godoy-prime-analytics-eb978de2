import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, XCircle, Circle } from "lucide-react";

type ItemStatus = 'ok' | 'atencao' | 'critico' | 'nao-verificado';

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
    id: 'estrutura',
    title: 'Estrutura',
    items: [
      { id: 'fundacao', label: 'Fundação e pilares', status: 'nao-verificado' },
      { id: 'vigas', label: 'Vigas e lajes', status: 'nao-verificado' },
      { id: 'rachaduras', label: 'Fissuras e rachaduras', status: 'nao-verificado' },
      { id: 'umidade', label: 'Infiltrações e umidade', status: 'nao-verificado' },
    ],
  },
  {
    id: 'eletrica',
    title: 'Instalações Elétricas',
    items: [
      { id: 'quadro', label: 'Quadro de distribuição', status: 'nao-verificado' },
      { id: 'tomadas', label: 'Tomadas e interruptores', status: 'nao-verificado' },
      { id: 'fiacao', label: 'Fiação aparente', status: 'nao-verificado' },
      { id: 'disjuntores', label: 'Disjuntores e proteção', status: 'nao-verificado' },
    ],
  },
  {
    id: 'hidraulica',
    title: 'Instalações Hidráulicas',
    items: [
      { id: 'encanamento', label: 'Tubulações e encanamento', status: 'nao-verificado' },
      { id: 'vazamentos', label: 'Vazamentos visíveis', status: 'nao-verificado' },
      { id: 'caixa-dagua', label: 'Caixa d\'água', status: 'nao-verificado' },
      { id: 'esgoto', label: 'Sistema de esgoto', status: 'nao-verificado' },
    ],
  },
  {
    id: 'acabamentos',
    title: 'Acabamentos',
    items: [
      { id: 'pintura', label: 'Pintura geral', status: 'nao-verificado' },
      { id: 'pisos', label: 'Pisos e revestimentos', status: 'nao-verificado' },
      { id: 'portas', label: 'Portas e janelas', status: 'nao-verificado' },
      { id: 'tetos', label: 'Forros e tetos', status: 'nao-verificado' },
    ],
  },
  {
    id: 'areas-externas',
    title: 'Áreas Externas',
    items: [
      { id: 'fachada', label: 'Fachada do prédio', status: 'nao-verificado' },
      { id: 'varanda', label: 'Varanda/Sacada', status: 'nao-verificado' },
      { id: 'jardim', label: 'Jardim/Área verde', status: 'nao-verificado' },
      { id: 'garagem', label: 'Vaga de garagem', status: 'nao-verificado' },
    ],
  },
];

const statusConfig = {
  'ok': { icon: CheckCircle2, color: 'text-green-600', label: 'OK' },
  'atencao': { icon: AlertTriangle, color: 'text-yellow-600', label: 'Atenção' },
  'critico': { icon: XCircle, color: 'text-red-600', label: 'Crítico' },
  'nao-verificado': { icon: Circle, color: 'text-muted-foreground', label: 'Não Verificado' },
};

export default function VistoriaDigital() {
  const [checklist, setChecklist] = useState<ChecklistCategory[]>(initialChecklist);

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

  const resetChecklist = () => {
    setChecklist(initialChecklist);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Vistoria Digital</h2>
        <p className="text-muted-foreground mt-1">Checklist completo para avaliação de imóveis</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Progresso da Vistoria</CardTitle>
            <Button variant="outline" onClick={resetChecklist} size="sm">
              Resetar Checklist
            </Button>
          </div>
          <div className="mt-4">
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
                <AccordionTrigger className="text-lg font-semibold">
                  {category.title}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    {category.items.map((item) => {
                      const StatusIcon = statusConfig[item.status].icon;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-3">
                            <StatusIcon className={`h-5 w-5 ${statusConfig[item.status].color}`} />
                            <span className="font-medium">{item.label}</span>
                          </div>
                          <div className="flex gap-2">
                            {(Object.keys(statusConfig) as ItemStatus[]).map((status) => {
                              const config = statusConfig[status];
                              const Icon = config.icon;
                              return (
                                <Button
                                  key={status}
                                  variant={item.status === status ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => updateItemStatus(category.id, item.id, status)}
                                  className="gap-1"
                                >
                                  <Icon className="h-4 w-4" />
                                </Button>
                              );
                            })}
                          </div>
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
