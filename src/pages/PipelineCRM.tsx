import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PipelineKanban } from '@/components/crm/PipelineKanban';
import { PipelineMetricsDashboard } from '@/components/crm/PipelineMetricsDashboard';
import { BarChart3, Columns3 } from 'lucide-react';

export default function PipelineCRM() {
  return (
    <>
      <Helmet>
        <title>Pipeline CRM | Godoy</title>
      </Helmet>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Pipeline CRM</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie seus leads em um pipeline visual estilo Kanban
          </p>
        </div>
        <Tabs defaultValue="kanban">
          <TabsList>
            <TabsTrigger value="kanban" className="gap-1.5">
              <Columns3 className="h-4 w-4" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="metricas" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              Métricas
            </TabsTrigger>
          </TabsList>
          <TabsContent value="kanban">
            <PipelineKanban />
          </TabsContent>
          <TabsContent value="metricas">
            <PipelineMetricsDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
