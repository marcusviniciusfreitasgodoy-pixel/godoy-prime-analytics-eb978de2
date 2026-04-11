import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eraser, Check, PenTool, Type } from "lucide-react";

interface VisitSignatureProps {
  title: string;
  description?: string;
  onSave: (signatureData: string) => void;
  existingSignature?: string | null;
}

export function VisitSignature({ title, description, onSave, existingSignature }: VisitSignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typedName, setTypedName] = useState("");

  useEffect(() => {
    if (mode !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (existingSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setHasSignature(true);
      };
      img.src = existingSignature;
    }
  }, [existingSignature, mode]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    setHasSignature(true);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const generateTypedSignature = useCallback((): string | null => {
    if (!typedName.trim()) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 400, 200);
    ctx.fillStyle = "#1a1a2e";
    ctx.font = "italic 42px 'Georgia', 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(typedName.trim(), 200, 90, 380);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, 140);
    ctx.lineTo(370, 140);
    ctx.stroke();
    return canvas.toDataURL("image/png");
  }, [typedName]);

  const saveSignature = () => {
    if (mode === "type") {
      const data = generateTypedSignature();
      if (data) onSave(data);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;
    onSave(canvas.toDataURL("image/png"));
  };

  const canSave = mode === "draw" ? hasSignature : typedName.trim().length >= 3;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={mode} onValueChange={(v) => { setMode(v as "draw" | "type"); setHasSignature(false); }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="draw" className="gap-2"><PenTool className="h-4 w-4" />Desenhar</TabsTrigger>
            <TabsTrigger value="type" className="gap-2"><Type className="h-4 w-4" />Digitar</TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="mt-3">
            <div className="border rounded-lg overflow-hidden bg-white">
              <canvas
                ref={canvasRef}
                width={400}
                height={200}
                className="w-full touch-none cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            <div className="flex gap-2 mt-3">
              <Button type="button" variant="outline" onClick={clearCanvas} className="flex-1">
                <Eraser className="h-4 w-4 mr-2" />Limpar
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="type" className="mt-3 space-y-3">
            <Input
              placeholder="Digite seu nome completo"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              maxLength={80}
            />
            <div className="border rounded-lg bg-white h-[120px] flex items-center justify-center">
              {typedName.trim() ? (
                <p className="text-3xl italic text-[#1a1a2e]" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                  {typedName.trim()}
                </p>
              ) : (
                <p className="text-muted-foreground/50 text-sm">Pré-visualização da assinatura</p>
              )}
            </div>
            {typedName.trim().length > 0 && typedName.trim().length < 3 && (
              <p className="text-xs text-destructive">Mínimo de 3 caracteres</p>
            )}
          </TabsContent>
        </Tabs>

        <Button type="button" onClick={saveSignature} disabled={!canSave} className="w-full">
          <Check className="h-4 w-4 mr-2" />Salvar Assinatura
        </Button>
      </CardContent>
    </Card>
  );
}
