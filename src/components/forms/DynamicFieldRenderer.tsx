import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { FormConfigField } from "@/hooks/useFormConfig";

interface DynamicFieldRendererProps {
  field: FormConfigField;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}

type RawOption = string | { label?: string; value?: string };

const normalizeOptions = (raw: any): { label: string; value: string }[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o: RawOption) => {
      if (typeof o === "string" || typeof o === "number") {
        const s = String(o);
        return { label: s, value: s };
      }
      if (o && typeof o === "object") {
        const label = String((o as any).label ?? (o as any).value ?? "");
        const value = String((o as any).value ?? (o as any).label ?? "");
        return { label, value };
      }
      return { label: "", value: "" };
    })
    .filter((o) => o.value !== "");
};

export function DynamicFieldRenderer({ field, value, onChange, disabled }: DynamicFieldRendererProps) {
  const labelEl = (
    <div className="flex items-center gap-2">
      <Label className="text-sm">
        {field.label}
        {field.is_required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {field.is_locked && <Badge variant="secondary" className="text-[10px]">Sistema</Badge>}
    </div>
  );

  const helpText = field.help_text ? (
    <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>
  ) : null;

  switch (field.field_type) {
    case "rating":
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            {labelEl}
            <Badge variant="outline" className="text-xs">{value || 0}/5</Badge>
          </div>
          <Slider min={1} max={5} step={1} value={[value || 3]} onValueChange={([v]) => onChange(v)} disabled={disabled} className="w-full" />
          {helpText}
        </div>
      );

    case "select": {
      const options = normalizeOptions(field.options);
      return (
        <div className="space-y-1.5">
          {labelEl}
          <Select value={value || ""} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger><SelectValue placeholder={field.placeholder || "Selecione..."} /></SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {helpText}
        </div>
      );
    }

    case "radio": {
      const options = normalizeOptions(field.options);
      return (
        <div className="space-y-1.5">
          {labelEl}
          <RadioGroup value={value || ""} onValueChange={onChange} disabled={disabled} className="flex flex-col space-y-1">
            {options.map((opt) => (
              <div key={opt.value} className="flex items-center space-x-2">
                <RadioGroupItem value={opt.value} id={`${field.field_id}-${opt.value}`} />
                <label htmlFor={`${field.field_id}-${opt.value}`} className="text-sm cursor-pointer">{opt.label}</label>
              </div>
            ))}
          </RadioGroup>
          {helpText}
        </div>
      );
    }

    case "checkbox":
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Checkbox checked={!!value} onCheckedChange={onChange} disabled={disabled} />
            <Label className="text-sm">{field.label}</Label>
            {field.is_locked && <Badge variant="secondary" className="text-[10px]">Sistema</Badge>}
          </div>
          {helpText}
        </div>
      );

    case "textarea":
      return (
        <div className="space-y-1.5">
          {labelEl}
          <Textarea value={value || ""} onChange={(e) => onChange(e.target.value)} rows={3} placeholder={field.placeholder || ""} disabled={disabled} />
          {helpText}
        </div>
      );

    case "number":
      return (
        <div className="space-y-1.5">
          {labelEl}
          <Input type="number" value={value || ""} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")} placeholder={field.placeholder || ""} disabled={disabled} />
          {helpText}
        </div>
      );

    case "date":
      return (
        <div className="space-y-1.5">
          {labelEl}
          <Input type="datetime-local" value={value || ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
          {helpText}
        </div>
      );

    case "email":
      return (
        <div className="space-y-1.5">
          {labelEl}
          <Input type="email" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder || "email@exemplo.com"} disabled={disabled} />
          {helpText}
        </div>
      );

    case "telefone":
      return (
        <div className="space-y-1.5">
          {labelEl}
          <Input type="tel" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder || "(00) 00000-0000"} disabled={disabled} />
          {helpText}
        </div>
      );

    default: // text
      return (
        <div className="space-y-1.5">
          {labelEl}
          <Input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder || ""} disabled={disabled} />
          {helpText}
        </div>
      );
  }
}
