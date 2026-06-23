'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white">{t('editProfile')}</DialogTitle>
        </DialogHeader>
        <ProfileEditor />
      </DialogContent>
    </Dialog>
  );
}
