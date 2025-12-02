import { PropertyTable } from "@/components/PropertyTable";
import { PropertyFilters } from "@/components/PropertyFilters";

export default function Properties() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Properties</h2>
        <p className="text-muted-foreground mt-1">Gestão completa de propriedades</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <PropertyFilters />
        </div>
        <div className="lg:col-span-3">
          <PropertyTable />
        </div>
      </div>
    </div>
  );
}
