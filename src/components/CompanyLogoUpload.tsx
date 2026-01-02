import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { Upload, Trash2, Image, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function CompanyLogoUpload() {
  const { settings, isLoading, uploadLogo, removeLogo } = useCompanySettings();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Tipo de arquivo inválido',
        description: 'Por favor, selecione uma imagem (PNG, JPG, etc.)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo permitido é 2MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    await uploadLogo(file);
    setIsUploading(false);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    await removeLogo();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {settings.custom_logo_url ? (
        <div className="space-y-3 sm:space-y-4">
          <div className="border rounded-lg p-3 sm:p-4 bg-muted/50">
            <p className="text-xs sm:text-sm text-muted-foreground mb-2">Logo atual:</p>
            <img
              src={settings.custom_logo_url}
              alt="Logo da empresa"
              className="max-h-12 sm:max-h-16 object-contain"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="h-9 sm:h-10 text-sm flex-1 sm:flex-none"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Substituir
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRemove}
              className="h-9 sm:h-10 text-sm flex-1 sm:flex-none"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remover
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed rounded-lg p-4 sm:p-6 text-center">
          <Image className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 sm:mb-3 text-muted-foreground" />
          <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
            Nenhuma logo personalizada configurada
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-3">
            PNG com fundo transparente, máx. 2MB
          </p>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="h-9 sm:h-10 text-sm"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Fazer Upload
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
