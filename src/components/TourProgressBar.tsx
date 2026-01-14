import { ChevronRight, X, Map, Calculator, ClipboardCheck, CalendarCheck, Search, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTourNavigation } from "@/hooks/useTourNavigation";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const pageIcons: Record<string, React.ElementType> = {
  '/': Home,
  '/microbairros': Map,
  '/pesquisas-mercado': Search,
  '/avaliacao-imobiliaria': Calculator,
  '/vistoria-digital': ClipboardCheck,
  '/visitas': CalendarCheck,
};

export function TourProgressBar() {
  const {
    isActive,
    currentPage,
    currentPageIndex,
    totalPages,
    hasMorePages,
    progress,
    isOnTourPage,
    goToNextPage,
    endTour,
    skipToPage,
    allPages,
  } = useTourNavigation();

  if (!isActive) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-background border-t border-border shadow-lg safe-area-pb">
      {/* Progress bar */}
      <Progress value={progress} className="h-1 rounded-none" />
      
      <div className="p-3 sm:p-4">
        {/* Page indicators */}
        <div className="flex items-center justify-center gap-1.5 mb-3">
          {allPages.map((page, index) => {
            const Icon = pageIcons[page.path] || Home;
            const isCurrent = index === currentPageIndex;
            const isCompleted = index < currentPageIndex;
            
            return (
              <button
                key={page.path}
                onClick={() => skipToPage(index)}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full transition-all",
                  isCurrent && "bg-primary text-primary-foreground scale-110",
                  isCompleted && "bg-primary/20 text-primary",
                  !isCurrent && !isCompleted && "bg-muted text-muted-foreground"
                )}
                title={page.name}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>

        {/* Current page info and actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {currentPage?.name || 'Tour'}
            </p>
            <p className="text-xs text-muted-foreground">
              Página {currentPageIndex + 1} de {totalPages}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={endTour}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Sair
            </Button>
            
            {hasMorePages ? (
              <Button
                size="sm"
                onClick={goToNextPage}
                className="bg-primary hover:bg-primary/90"
              >
                Próxima
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={endTour}
                className="bg-green-600 hover:bg-green-700"
              >
                Concluir Tour
              </Button>
            )}
          </div>
        </div>

        {/* Hint when not on tour page */}
        {!isOnTourPage && (
          <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-md">
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Você saiu da página do tour. Clique em "Próxima" para continuar ou navegue manualmente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
