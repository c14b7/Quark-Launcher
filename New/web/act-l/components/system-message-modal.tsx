'use client';

import type { AnchorHTMLAttributes, HTMLAttributes, ImgHTMLAttributes } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSystemMessages } from '@/lib/system-messages-context';
import { resolveSystemMessageAction, type SystemMessageType } from '@/lib/system-messages-service';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Gift, Megaphone, PartyPopper, ScrollText } from 'lucide-react';

const TYPE_STYLE: Record<
  SystemMessageType,
  { bar: string; badge: string; icon: typeof Megaphone }
> = {
  update: {
    bar: 'from-lime-500/80 to-lime-500/10',
    badge: 'bg-lime-500/20 text-lime-200 border-lime-500/30',
    icon: Megaphone,
  },
  event: {
    bar: 'from-violet-500/80 to-violet-500/10',
    badge: 'bg-violet-500/20 text-violet-200 border-violet-500/30',
    icon: PartyPopper,
  },
  changelog: {
    bar: 'from-sky-500/80 to-sky-500/10',
    badge: 'bg-sky-500/20 text-sky-200 border-sky-500/30',
    icon: ScrollText,
  },
  promo: {
    bar: 'from-fuchsia-500/80 to-fuchsia-500/10',
    badge: 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/30',
    icon: Gift,
  },
  alert: {
    bar: 'from-amber-500/80 to-amber-500/10',
    badge: 'bg-amber-500/20 text-amber-200 border-amber-500/30',
    icon: AlertTriangle,
  },
};

const mdComponents = {
  h1: (props: HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="text-xl font-bold text-white mt-4 mb-2" {...props} />
  ),
  h2: (props: HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="text-lg font-semibold text-white mt-3 mb-1.5" {...props} />
  ),
  h3: (props: HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-base font-semibold text-zinc-100 mt-3 mb-1" {...props} />
  ),
  p: (props: HTMLAttributes<HTMLParagraphElement>) => (
    <p className="leading-relaxed text-zinc-300 mb-2" {...props} />
  ),
  strong: (props: HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-white" {...props} />
  ),
  ul: (props: HTMLAttributes<HTMLUListElement>) => (
    <ul className="list-disc pl-5 space-y-1 text-zinc-300 mb-3" {...props} />
  ),
  ol: (props: HTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal pl-5 space-y-1 text-zinc-300 mb-3" {...props} />
  ),
  a: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a className="text-lime-400 underline underline-offset-2 hover:text-lime-300" {...props} />
  ),
  img: (props: ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt="" {...props} className={cn('max-w-full rounded-xl my-3', props.className)} />
  ),
  code: (props: HTMLAttributes<HTMLElement>) => (
    <code className="rounded bg-black/50 px-1 py-0.5 text-[12px] text-lime-200 font-mono" {...props} />
  ),
  pre: (props: HTMLAttributes<HTMLPreElement>) => (
    <pre className="rounded-xl bg-black/50 border border-white/10 p-3 overflow-x-auto text-[12px] mb-3" {...props} />
  ),
};

export function SystemMessageModal() {
  const t = useTranslations('notifications');
  const { messages, openMessageId, closeMessage } = useSystemMessages();
  const msg = messages.find((m) => m.$id === openMessageId) || null;
  const open = Boolean(msg);
  const style = msg ? TYPE_STYLE[msg.type] || TYPE_STYLE.update : TYPE_STYLE.update;
  const Icon = style.icon;

  const runAction = async (url?: string | null) => {
    if (!url) return;
    closeMessage();
    await resolveSystemMessageAction(url);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeMessage()}>
      <DialogContent className="sm:max-w-3xl max-w-[min(96vw,48rem)] max-h-[90vh] p-0 overflow-hidden bg-zinc-950 border-white/10 gap-0">
        {msg && (
          <>
            <div className={cn('h-1.5 w-full bg-gradient-to-r', style.bar)} />
            {msg.image_url && (
              <div className="w-full max-h-48 overflow-hidden bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={msg.image_url}
                  alt=""
                  className="w-full h-48 object-cover"
                />
              </div>
            )}
            <DialogHeader className="px-6 pt-5 pb-2 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn('gap-1 text-[10px]', style.badge)}>
                  <Icon className="h-3 w-3" />
                  {t(`systemType_${msg.type}`)}
                </Badge>
                {msg.priority === 'high' && (
                  <Badge variant="outline" className="text-[10px] border-orange-500/40 text-orange-200">
                    {t('systemPriorityHigh')}
                  </Badge>
                )}
                <span className="text-[11px] text-zinc-500">
                  {new Date(msg.start_date).toLocaleString()}
                </span>
              </div>
              <DialogTitle className="text-xl text-white pr-8">{msg.title}</DialogTitle>
              <DialogDescription className="sr-only">{msg.summary || msg.title}</DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[min(50vh,420px)] px-6">
              <div className="pb-4 text-sm">
                <ReactMarkdown components={mdComponents}>{msg.body_md}</ReactMarkdown>
              </div>
            </ScrollArea>

            <DialogFooter className="px-6 py-4 border-t border-white/10 flex-col sm:flex-row gap-2">
              <Button variant="ghost" className="text-zinc-400" onClick={closeMessage}>
                {t('systemClose')}
              </Button>
              <div className="flex flex-1 flex-wrap justify-end gap-2">
                {msg.action_text_2 && msg.action_url_2 && (
                  <Button
                    variant="outline"
                    className="border-white/15"
                    onClick={() => void runAction(msg.action_url_2)}
                  >
                    {msg.action_text_2}
                  </Button>
                )}
                {msg.action_text && msg.action_url && (
                  <Button
                    className="bg-[#d4ff00] text-black hover:bg-[#e2ff4d]"
                    onClick={() => void runAction(msg.action_url)}
                  >
                    {msg.action_text}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
