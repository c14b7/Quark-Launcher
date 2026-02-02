'use client';

import { Launcher } from '@/components/launcher';
import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { LoadingScreen } from '@/components/loading-screen';
import { AuthProvider, useAuth } from '@/lib/auth-context';

function AppContent() {
  const { isAuthenticated, isOnboardingComplete, isLoading } = useAuth();

  // Show loading screen while checking auth state
  if (isLoading) {
    return <LoadingScreen minDuration={0} />;
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
