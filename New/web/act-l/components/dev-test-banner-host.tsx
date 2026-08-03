'use client';

import { useEffect, useState } from 'react';
import { X, Sparkles, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { DevTestAction } from '@/lib/dev-debug-bus';
import { pushDevLog } from '@/lib/dev-debug-bus';

/**
 * Listens for quark-dev-test (incl. BroadcastChannel from Dev Inspector window)
 * and renders throwaway banner previews in the main launcher.
 */
export function DevTestBannerHost() {
  const [updateOpen, setUpdateOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [toast, setToast] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    const onTest = async (e: Event) => {
      const detail = (e as CustomEvent<{ action: DevTestAction; payload?: unknown }>).detail;
      if (!detail?.action) return;

      switch (detail.action) {
        case 'update-banner':
          setUpdateOpen(true);
          break;
        case 'dialog-banner':
          setDialogOpen(true);
          break;
        case 'side-banner':
          setSideOpen(true);
          break;
        case 'overlay-toast': {
          const title = 'Dev toast';
          const body = 'Test powiadomienia overlay';
          setToast({ title, body });
          if (window.electronAPI?.showOverlayNotification) {
            await window.electronAPI.showOverlayNotification({
              title,
              body,
              type: 'dev-test',
            });
          }
          setTimeout(() => setToast(null), 5000);
          break;
        }
        case 'os-notification': {
          if (typeof Notification !== 'undefined') {
            try {
              if (Notification.permission === 'granted') {
                new Notification('Quark Dev', { body: 'Test powiadomienia systemowego' });
              } else if (Notification.permission !== 'denied') {
                const perm = await Notification.requestPermission();
                if (perm === 'granted') {
                  new Notification('Quark Dev', { body: 'Test powiadomienia systemowego' });
                }
              }
            } catch (err) {
              pushDevLog('error', 'os-notification', { error: String(err) });
            }
          }
          break;
        }
        case 'custom-event':
          window.dispatchEvent(
            new CustomEvent('quark-navigate', { detail: 'home' })
          );
          break;
        default:
          break;
      }
    };

    window.addEventListener('quark-dev-test', onTest);
    return () => window.removeEventListener('quark-dev-test', onTest);
  }, []);

  return (
    <>
      {updateOpen && (
        <div className="fixed top-0 inset-x-0 z-[200] border-b border-violet-500/30 bg-violet-500/15 px-4 py-3 shadow-lg">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm text-white">
              <Sparkles className="h-4 w-4 text-violet-300" />
              <span>
                <strong>Dev · Update banner</strong> — podgląd paska aktualizacji (test)
              </span>
            </div>
            <Button size="sm" variant="ghost" className="text-zinc-300" onClick={() => setUpdateOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Dev · Dialog banner</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              To jest testowy dialog_banner. W produkcji treść pochodzi z Appwrite.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDialogOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {sideOpen && (
        <div className="fixed bottom-4 right-4 z-[200] w-72 rounded-xl border border-orange-500/30 bg-zinc-900/95 p-4 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-orange-200">
              <Megaphone className="h-4 w-4" />
              Dev · Side banner
            </div>
            <button type="button" className="text-zinc-500 hover:text-white" onClick={() => setSideOpen(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-zinc-400">
            Podgląd karty bocznej (side_banner). Markdown / CTA w produkcji z Appwrite.
          </p>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 left-4 z-[200] max-w-sm rounded-xl border border-emerald-500/30 bg-zinc-900/95 px-4 py-3 shadow-2xl">
          <p className="text-sm font-medium text-emerald-200">{toast.title}</p>
          <p className="text-xs text-zinc-400 mt-1">{toast.body}</p>
        </div>
      )}
    </>
  );
}
