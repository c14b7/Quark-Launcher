"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UpdateInfo } from "@/lib/types";

export default function UpdateBanner() {
  const [updateData, setUpdateData] = useState<UpdateInfo | null>(null);
  const [status, setStatus] = useState<"idle" | "downloading" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !window.electronAPI) return;

    const cleanups: Array<() => void> = [];

    if (window.electronAPI.onUpdateAvailable) {
      cleanups.push(
        window.electronAPI.onUpdateAvailable((info: UpdateInfo) => {
          setUpdateData(info);
          setStatus("idle");
          setErrorMessage(null);
          setIsVisible(true);
        })
      );
    }

    if (window.electronAPI.onUpdateDownloadProgress) {
      cleanups.push(
        window.electronAPI.onUpdateDownloadProgress((info) => {
          setProgress(Math.round(info.percent || 0));
          setStatus("downloading");
        })
      );
    }

    if (window.electronAPI.onUpdateError) {
      cleanups.push(
        window.electronAPI.onUpdateError((info) => {
          setStatus("error");
          setErrorMessage(info.message);
        })
      );
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  const handleUpdateClick = async () => {
    if (!window.electronAPI?.startInstallation) return;

    setStatus("downloading");
    setProgress(0);
    setErrorMessage(null);

    const result = await window.electronAPI.startInstallation();
    if (!result?.success) {
      setStatus("error");
      setErrorMessage(result?.error || "Nie udało się rozpocząć pobierania");
    }
  };

  if (!updateData || !isVisible) return null;

  return (
    <div
      className={cn(
        "w-full border-b px-4 py-3 shadow-sm transition-all duration-300 z-[60] relative",
        "bg-violet-500/10 text-foreground border-violet-500/20 animate-in fade-in slide-in-from-top-2"
      )}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="bg-violet-500/15 text-violet-400 p-2 rounded-lg mt-0.5 shrink-0">
            <Sparkles className="h-4 w-4 animate-pulse" />
          </div>

          <div className="space-y-1 min-w-0">
            <h4 className="font-semibold text-sm text-white flex items-center gap-2 flex-wrap">
              Dostępna aktualizacja Quark Launchera
              <span className="text-xs bg-violet-500/15 text-violet-300 font-mono px-2 py-0.5 rounded-full border border-violet-500/25">
                v{updateData.version}
              </span>
            </h4>

            <p className="text-xs text-zinc-400 line-clamp-2 md:line-clamp-1">
              <span className="font-medium text-zinc-300">Co nowego: </span>
              {updateData.releaseNotes}
            </p>

            {status === "downloading" && (
              <div className="flex items-center gap-2 pt-1">
                <div className="h-1.5 flex-1 max-w-[200px] rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-violet-500 transition-all duration-300"
                    style={{ width: `${Math.max(progress, 8)}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">{progress}%</span>
              </div>
            )}

            {status === "error" && errorMessage && (
              <p className="text-xs text-red-400 pt-1">{errorMessage}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs hover:bg-white/5"
            disabled={status === "downloading"}
            onClick={() => setIsVisible(false)}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Pomiń
          </Button>

          <Button
            size="sm"
            className="h-8 text-xs font-medium bg-violet-600 hover:bg-violet-500"
            disabled={status === "downloading"}
            onClick={handleUpdateClick}
          >
            {status === "downloading" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Pobieranie...
              </>
            ) : status === "error" ? (
              "Spróbuj ponownie"
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
