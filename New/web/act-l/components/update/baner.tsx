
"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UpdateInfo {
  version: string;
  releaseNotes: string;
}

export default function UpdateBanner() {
  const [updateData, setUpdateData] = useState<UpdateInfo | null>(null);
  const [status, setStatus] = useState<"idle" | "downloading">("idle");
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined" && window.electronAPI.onUpdateAvailable) {
      const unsubscribe = window.electronAPI.onUpdateAvailable((info: UpdateInfo) => {
        setUpdateData(info);
      });

      return () => unsubscribe();
    }
  }, []);

  const handleUpdateClick = async () => {
    setStatus("downloading");
    if (window.electronAPI.startInstallation) {
      await window.electronAPI.startInstallation();
    }
  };

  // Jeśli nie ma aktualizacji lub użytkownik kliknął zamknięcie, nie pokazuj nic
  if (!updateData || !isVisible) return null;

  return (
    <div 
      className={cn(
        "w-full border-b px-4 py-3 shadow-sm transition-all duration-300",
        // Używamy zmiennych shadcn: bg-muted do tła, border-border do obramowania
        "bg-muted/50 text-muted-foreground border-border animate-in fade-in slide-in-from-top-2"
      )}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Lewa strona: Nagłówek i logi zmian */}
        <div className="flex items-start gap-3 flex-1">
          {/* Ikonka w kolorze primary dla akcentu */}
          <div className="bg-primary/10 text-primary p-2 rounded-lg mt-0.5 shrink-0">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          </div>
          
          <div className="space-y-0.5">
            <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
              Dostępna aktualizacja Quark Launchera 
              <span className="text-xs bg-primary/10 text-primary font-mono px-2 py-0.5 rounded-full border border-primary/20">
                v{updateData.version}
              </span>
            </h4>
            
            {/* Sekcja "What's new" na bazie zmiennych tekstowych shadcn */}
            <p className="text-xs text-muted-foreground/90 line-clamp-2 md:line-clamp-1">
              <span className="font-medium text-foreground">Co nowego: </span>
              {updateData.releaseNotes}
            </p>
          </div>
        </div>

        {/* Prawa strona: Przyciski akcji zgodne z shadcn/ui */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          {/* Przycisk zamknięcia/pominięcia */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs hover:bg-muted"
            disabled={status === "downloading"}
            onClick={() => setIsVisible(false)}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Pomiń
          </Button>

          {/* Główny przycisk aktualizacji */}
          <Button
            size="sm"
            className="h-8 text-xs font-medium shadow-sm transition-all"
            disabled={status === "downloading"}
            onClick={handleUpdateClick}
          >
            {status === "downloading" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Pobieranie...
              </>
            ) : (
              <>
                Aktualizuj teraz
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </>
            )}
          </Button>
        </div>

      </div>
    </div>
  );
}