import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { FotoParecer } from "@/lib/parecer/types";
import { Upload, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  parecerId?: string;
  fotos: FotoParecer[];
  onChange: (fotos: FotoParecer[]) => void;
}

export function PhotoUploader({ parecerId, fotos, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { organization } = useOrganization();
  const [uploading, setUploading] = useState(false);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    if (!organization?.id) {
      toast({ title: "Salve o parecer antes de anexar fotos", variant: "destructive" });
      return;
    }
    setUploading(true);
    const newFotos: FotoParecer[] = [...fotos];
    for (const file of Array.from(files)) {
      const path = `${organization.id}/${parecerId || "rascunho"}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("pareceres-fotos").upload(path, file, { upsert: false });
      if (error) {
        toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
        continue;
      }
      const { data: signed } = await supabase.storage.from("pareceres-fotos").createSignedUrl(path, 60 * 60 * 24 * 7);
      if (signed?.signedUrl) {
        newFotos.push({ url: signed.signedUrl, legenda: "" });
      }
    }
    onChange(newFotos);
    setUploading(false);
  };

  const removeAt = (i: number) => {
    onChange(fotos.filter((_, idx) => idx !== i));
  };

  const updateLegend = (i: number, legenda: string) => {
    onChange(fotos.map((f, idx) => (idx === i ? { ...f, legenda } : f)));
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => upload(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        <Upload className="h-4 w-4 mr-2" />
        {uploading ? "Enviando..." : "Adicionar fotos"}
      </Button>
      {fotos.map((f, i) => (
        <div key={i} className="flex gap-2 items-start border p-2 rounded">
          <img src={f.url} alt="" className="w-20 h-20 object-cover rounded" />
          <Input
            placeholder="Legenda"
            value={f.legenda}
            onChange={(e) => updateLegend(i, e.target.value)}
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => removeAt(i)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
