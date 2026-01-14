import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageSquare, Star, ThumbsUp, ThumbsDown, MapPin, Calendar } from "lucide-react";

interface FeedbackWithFicha {
  id: string;
  ficha_visita_id: string;
  avaliacao_geral: number | null;
  nivel_interesse: string | null;
  percepcao_valor: string | null;
  o_que_mais_gostou: string | null;
  o_que_menos_gostou: string | null;
  sugestoes_melhoria: string | null;
  gostaria_fazer_proposta: boolean | null;
  created_at: string | null;
  ficha?: {
    codigo: string;
    nome_visitante: string;
    endereco_imovel: string;
    data_visita: string;
  };
}

export function FeedbacksList() {
  const { data: feedbacks, isLoading } = useQuery({
    queryKey: ["feedbacks-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedbacks_visita" as any)
        .select(`
          *,
          ficha:fichas_visita!ficha_visita_id(codigo, nome_visitante, endereco_imovel, data_visita)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as unknown as FeedbackWithFicha[];
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  if (!feedbacks || feedbacks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum feedback recebido ainda</p>
        <p className="text-sm mt-2">Os feedbacks aparecerão aqui após os visitantes responderem</p>
      </div>
    );
  }

  const getNivelInteresseColor = (nivel: string | null) => {
    switch (nivel) {
      case 'muito_alto': return 'bg-emerald-500';
      case 'alto': return 'bg-green-500';
      case 'medio': return 'bg-yellow-500';
      case 'baixo': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  const getNivelInteresseLabel = (nivel: string | null) => {
    switch (nivel) {
      case 'muito_alto': return 'Muito Alto';
      case 'alto': return 'Alto';
      case 'medio': return 'Médio';
      case 'baixo': return 'Baixo';
      default: return 'N/A';
    }
  };

  const getPercepcaoValorLabel = (percepcao: string | null) => {
    switch (percepcao) {
      case 'abaixo': return 'Abaixo do mercado';
      case 'justo': return 'Justo';
      case 'acima': return 'Acima do mercado';
      default: return 'N/A';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {feedbacks.map((feedback) => (
        <Card key={feedback.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  {feedback.ficha?.nome_visitante || 'Visitante'}
                </CardTitle>
                {feedback.ficha && (
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    {feedback.ficha.codigo}
                  </p>
                )}
              </div>
              {feedback.avaliacao_geral && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {feedback.avaliacao_geral}/5
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {feedback.ficha && (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate text-xs">{feedback.ficha.endereco_imovel}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-xs">
                    {format(new Date(feedback.ficha.data_visita), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              </>
            )}

            <div className="flex flex-wrap gap-2">
              {feedback.nivel_interesse && (
                <Badge variant="secondary" className="text-xs">
                  <span className={`w-2 h-2 rounded-full mr-1.5 ${getNivelInteresseColor(feedback.nivel_interesse)}`} />
                  Interesse: {getNivelInteresseLabel(feedback.nivel_interesse)}
                </Badge>
              )}
              {feedback.percepcao_valor && (
                <Badge variant="outline" className="text-xs">
                  Valor: {getPercepcaoValorLabel(feedback.percepcao_valor)}
                </Badge>
              )}
              {feedback.gostaria_fazer_proposta !== null && (
                <Badge 
                  variant={feedback.gostaria_fazer_proposta ? "default" : "secondary"} 
                  className="text-xs"
                >
                  {feedback.gostaria_fazer_proposta ? (
                    <><ThumbsUp className="h-3 w-3 mr-1" /> Quer fazer proposta</>
                  ) : (
                    <><ThumbsDown className="h-3 w-3 mr-1" /> Sem proposta</>
                  )}
                </Badge>
              )}
            </div>

            {feedback.o_que_mais_gostou && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded text-xs">
                <p className="font-medium text-emerald-700 dark:text-emerald-400 mb-1">👍 O que mais gostou:</p>
                <p className="text-muted-foreground line-clamp-2">{feedback.o_que_mais_gostou}</p>
              </div>
            )}

            {feedback.o_que_menos_gostou && (
              <div className="bg-red-50 dark:bg-red-950/30 p-2 rounded text-xs">
                <p className="font-medium text-red-700 dark:text-red-400 mb-1">👎 O que menos gostou:</p>
                <p className="text-muted-foreground line-clamp-2">{feedback.o_que_menos_gostou}</p>
              </div>
            )}

            {feedback.created_at && (
              <p className="text-[10px] text-muted-foreground text-right">
                Enviado em {format(new Date(feedback.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}