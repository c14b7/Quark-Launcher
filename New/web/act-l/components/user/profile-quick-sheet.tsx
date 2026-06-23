'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ProfileEditor } from '@/components/user/profile-editor';
import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';

interface ProfileQuickSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileQuickSheet({ open, onOpenChange }: ProfileQuickSheetProps) {
  const t = useTranslations('profile');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-zinc-950/95 backdrop-blur-xl border-white/10 rounded-2xl p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20">
              <Sparkles className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <DialogTitle className="text-white text-lg">{t('editProfile')}</DialogTitle>
              <DialogDescription className="text-zinc-500 text-sm">{t('editProfileDesc')}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="p-6 pt-4">
          <ProfileEditor />
        </div>
      </DialogContent>
    </Dialog>
  );
}
