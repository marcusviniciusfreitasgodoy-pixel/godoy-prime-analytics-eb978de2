import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, X, FileImage, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CNHUploadProps {
  onUpload: (file: File) => Promise<void>;
  isUploading?: boolean;
  uploadedUrl?: string | null;
}

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED = ["image/jpeg", "image/png", "application/pdf"];

export function CNHUpload({ onUpload, isUploading = false, uploadedUrl }: CNHUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Formato inválido. Envie JPG, PNG ou PDF.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Arquivo muito grande. Máximo: 5MB.");
      return;
    }

    setFileName(file.name);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    await onUpload(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const clear = () => {
    setPreview(null);
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const isUploaded = !!uploadedUrl || !!fileName;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileImage className="h-5 w-5" />
          Upload da CNH
        </CardTitle>
        <CardDescription>
          Envie uma foto da sua CNH (frente e verso). Aceita JPG, PNG ou PDF (máx. 5MB).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          onChange={handleChange}
          className="hidden"
        />

        {isUploaded ? (
          <div className="space-y-2">
            {preview && (
              <img src={preview} alt="CNH Preview" className="max-h-40 rounded-lg border mx-auto" />
            )}
            <div className="flex items-center justify-between bg-muted rounded-lg p-3">
              <span className="text-sm truncate">{fileName || "CNH enviada"}</span>
              <Button type="button" variant="ghost" size="sm" onClick={clear}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full h-24 border-dashed flex flex-col gap-2"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <Upload className="h-6 w-6" />
                <span className="text-sm">Clique para enviar a CNH</span>
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
