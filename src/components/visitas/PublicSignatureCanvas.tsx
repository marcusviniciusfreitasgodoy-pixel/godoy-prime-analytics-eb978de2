import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eraser, Check, Loader2, PenTool, Type } from "lucide-react";

interface PublicSignatureCanvasProps {
  title: string;
  description?: string;
  onSave: (signatureData: string) => void;
  isSaving?: boolean;
}

export function PublicSignatureCanvas({ 
  title, 
  description, 
  onSave, 
  isSaving = false 
}: PublicSignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typedName, setTypedName] = useState("");

  useEffect(() => {
    if (mode !== "draw") return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const updateCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = 200 * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = "200px";
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, rect.width, 200);
        ctx.strokeStyle = "#1a1a2e";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, [mode]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
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
    const container = containerRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas || !container) return;
    const rect = container.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, 200);
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
    // Draw a line underneath
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
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = 400;
    tempCanvas.height = 200;
    const tempCtx = tempCanvas.getContext("2d");
    if (tempCtx) {
      tempCtx.fillStyle = "#ffffff";
      tempCtx.fillRect(0, 0, 400, 200);
      tempCtx.drawImage(canvas, 0, 0, 400, 200);
      onSave(tempCanvas.toDataURL("image/png"));
    }
  };

  const canSave = mode === "draw" ? hasSignature : typedName.trim().length >= 3;

  return (
    <Card className="overflow-hidden">
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
            <div ref={containerRef} className="border-2 border-dashed border-muted-foreground/30 rounded-lg overflow-hidden bg-white relative">
              <canvas
                ref={canvasRef}
                className="w-full touch-none cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-muted-foreground/50 text-sm">Desenhe sua assinatura aqui</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button type="button" variant="outline" onClick={clearCanvas} className="flex-1 min-w-[100px]" disabled={isSaving}>
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
            <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg bg-white h-[120px] flex items-center justify-center">
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

        <Button
          type="button"
          onClick={saveSignature}
          disabled={!canSave || isSaving}
          className="w-full"
        >
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
          {isSaving ? "Salvando..." : "Confirmar Assinatura"}
        </Button>
      </CardContent>
    </Card>
  );
}
