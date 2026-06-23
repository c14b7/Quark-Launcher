'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProfileEditor } from '@/components/user/profile-editor';
import { useTranslations } from 'next-intl';

interface ProfileQuickSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileQuickSheet({ open, onOpenChange }: ProfileQuickSheetProps) {
  const t = useTranslations('profile');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="sm:max-w-3xl lg:max-w-4xl max-h-[min(92vh,820px)] p-0 gap-0 overflow-hidden bg-background border-border shadow-lg"
      >
        <DialogHeader className="px-6 py-4 border-b border-border space-y-1 text-left">
          <DialogTitle className="text-base font-semibold tracking-tight">{t('editProfile')}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">{t('editProfileDesc')}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(min(92vh,820px)-4.25rem)]">
          <div className="px-6 py-5">
            <ProfileEditor />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
