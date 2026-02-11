import { Helmet } from 'react-helmet-async';
import { PipelineKanban } from '@/components/crm/PipelineKanban';

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
        <PipelineKanban />
      </div>
    </>
  );
}
