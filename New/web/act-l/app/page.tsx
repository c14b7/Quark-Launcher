'use client';

import { Launcher } from '@/components/launcher';
import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { isAuthenticated, isOnboardingComplete, isLoading } = useAuth();

  // Show loading while checking auth state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          <p className="text-zinc-400">Ładowanie...</p>
        </div>
      </div>
    );
  }

  // Show onboarding only if not authenticated
  // If authenticated but onboarding not marked complete, complete it automatically
  if (!isAuthenticated) {
    return <OnboardingScreen />;
  }

  // Show main launcher
  return <Launcher />;
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
