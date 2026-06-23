'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Mail, Lock, User, ArrowRight, ArrowLeft, Sparkles, Gamepad2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

type OnboardingStep = 'welcome' | 'auth' | 'steam-setup' | 'complete';
type AuthMode = 'login' | 'register';

export function OnboardingScreen() {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  
  const { login, register, completeOnboarding } = useAuth();

  const handleAuth = async () => {
    setError(null);
    
    if (!email || !password) {
      setError('Wypełnij wszystkie pola');
      return;
    }

    // Walidacja hasła dla obu trybów
    if (password.length < 8) {
      setError('Hasło musi mieć minimum 8 znaków');
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setError('Hasło musi zawierać literę i cyfrę');
      return;
    }

    if (authMode === 'register') {
      if (!name) {
        setError('Podaj swoje imię');
        return;
      }
      if (password !== confirmPassword) {
        setError('Hasła nie są identyczne');
        return;
      }
    }

    setIsLoading(true);
    
    try {
      const result = authMode === 'login' 
        ? await login(email, password)
        : await register(email, password, name);
      
      if (result.success) {
        setStep('steam-setup');
      } else {
        setError(result.error || 'Wystąpił błąd');
      }
    } catch (err) {
      setError('Wystąpił nieoczekiwany błąd');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    completeOnboarding();
  };

  const skipSteamSetup = () => {
    setStep('complete');
  };

  return (
    <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-zinc-950 to-blue-900/20" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-lg px-6">
        <AnimatePresence mode="wait">
          {/* Welcome Step */}
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-8"
            >
              {/* Logo */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex justify-center"
              >
                <div className="relative">
                    <div className="w-48 h-48  rounded-2xl flex items-center justify-center  ">
                    <svg width="1462" height="360" viewBox="0 0 1462 360" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M166 322.5C239 322.5 283.5 268.5 283.5 180C283.5 91.5 239 37.5 166 37.5C93 37.5 48.5 91.5 48.5 180C48.5 268.5 93 322.5 166 322.5ZM166 360C66.5 360 2.08616e-07 288 2.08616e-07 180C2.08616e-07 72 66.5 -1.90735e-05 166 -1.90735e-05C265.5 -1.90735e-05 332 72 332 180C332 240 309.5 289.5 271 322.5C287 321 304.5 320 327 320H351V355H322C216.5 355 198 360 166 360ZM513.348 360C456.848 360 420.348 331 420.348 265V95H465.348V255C465.348 307 488.848 323.5 521.848 323.5C558.848 323.5 591.348 305 591.348 245.5V95H636.348V355H593.848V316.5C575.848 348 543.848 360 513.348 360ZM812.27 360C763.27 360 730.77 331 730.77 287.5C730.77 235 778.77 206 892.77 193V177.5C892.77 142.5 870.77 125 835.77 125C799.27 125 775.77 144.5 774.77 172.5H730.77C732.27 125 773.77 90 834.77 90C899.27 90 935.27 124 935.27 185.5V355H894.77V318.5C878.27 345 848.77 360 812.27 360ZM774.77 285.5C774.77 310.5 792.77 325 823.77 325C866.27 325 892.77 296.5 892.77 249.5V224.5C810.77 233.5 774.77 252 774.77 285.5ZM1038.78 355V95H1081.28V139.5C1089.78 107 1113.28 92.5 1144.28 92.5H1169.28V130H1141.78C1101.28 130 1083.78 156 1083.78 214V355H1038.78ZM1244.93 355V4.99998H1289.93V227.5L1406.93 95H1461.43L1363.43 202L1461.43 355H1408.43L1332.93 235.5L1289.93 282.5V355H1244.93Z" fill="white"/>
</svg>

            </div>
                    
          
                </div>
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-4"
              >
   {/*              <h1 className="text-4xl font-bold text-white" id="font-logo">
                  Quk <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">sdsdsdd</span>
                </h1> */}
                <p className="text-zinc-400 text-lg">
                  Launcher do gierek...
                </p>
              </motion.div>

              {/* Features */}
{/*               <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-3 gap-4 py-6"
              >
                {[
                  { icon: Gamepad2, label: 'Wszystkie gry' },
                  { icon: User, label: 'Konta' },
                  { icon: Sparkles, label: 'Osiągnięcia' },
                ].map((feature, i) => (
                  <div key={i} className="text-center space-y-2">
                    <div className="w-12 h-12 mx-auto bg-zinc-800/50 rounded-xl flex items-center justify-center border border-zinc-700/50">
                      <feature.icon className="w-6 h-6 text-purple-400" />
                    </div>
                    <span className="text-sm text-zinc-500">{feature.label}</span>
                  </div>
                ))}
              </motion.div> */}

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <Button
                  onClick={() => setStep('auth')}
                  className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-lg font-medium group"
                >
                  Rozpocznij
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* Auth Step */}
          {step === 'auth' && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Back button */}
              <button
                onClick={() => setStep('welcome')}
                className="flex items-center text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Wróć
              </button>

              {/* Header */}
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white">
                  {authMode === 'login' ? 'Zaloguj się' : 'Stwórz konto'}
                </h2>
                <p className="text-zinc-400">
                  {authMode === 'login' 
                    ? 'Witaj ponownie!'
                    : 'Dołącz teraz!'}
                </p>
              </div>

              {/* Auth Toggle */}
              <div className="flex rounded-xl bg-zinc-800/50 p-1">
                <button
                  onClick={() => setAuthMode('login')}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all",
                    authMode === 'login'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                      : 'text-zinc-400 hover:text-white'
                  )}
                >
                  Logowanie
                </button>
                <button
                  onClick={() => setAuthMode('register')}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all",
                    authMode === 'register'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                      : 'text-zinc-400 hover:text-white'
                  )}
                >
                  Rejestracja
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                {authMode === 'register' && (
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <Input
                      type="text"
                      placeholder="Twoje imię"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-11 h-12 bg-zinc-800/50 border-zinc-700 focus:border-purple-500"
                    />
                  </div>
                )}

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 h-12 bg-zinc-800/50 border-zinc-700 focus:border-purple-500"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <Input
                    type="password"
                    placeholder="Hasło"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 h-12 bg-zinc-800/50 border-zinc-700 focus:border-purple-500"
                  />
                </div>

                {authMode === 'register' && (
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <Input
                      type="password"
                      placeholder="Potwierdź hasło"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-11 h-12 bg-zinc-800/50 border-zinc-700 focus:border-purple-500"
                    />
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Submit */}
                <Button
                  onClick={handleAuth}
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 font-medium"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    authMode === 'login' ? 'Zaloguj się' : 'Stwórz konto'
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Steam Setup Step */}
          {step === 'steam-setup' && (
            <motion.div
              key="steam-setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Steam Icon */}
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-xl">
                  <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.64 5.93c2.97.03 5.36 2.44 5.36 5.42 0 2.99-2.43 5.42-5.42 5.42-.52 0-1.02-.07-1.5-.21l-3.1 1.26a.5.5 0 0 1-.67-.64l1.09-2.89a5.39 5.39 0 0 1-1.22-3.44c0-2.98 2.42-5.4 5.38-5.42h.08zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                  </svg>
                </div>
              </div>

              {/* Header */}
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white">
                  Połącz konto Steam
                </h2>
                <p className="text-zinc-400">
                  Synchronizuj znajomych, osiągnięcia i statystyki z Steam.
                  Możesz to zrobić później w ustawieniach.
                </p>
              </div>

              {/* Features list */}
              <div className="space-y-3 py-4">
                {[
                  'Automatyczne wykrywanie zainstalowanych gier',
                  'Synchronizacja osiągnięć i statystyk',
                  'Lista znajomych i ich aktywność',
                  'Czas gry i historia aktywności',
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 text-zinc-300">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <Button
                  onClick={() => setStep('complete')}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 font-medium"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.64 5.93c2.97.03 5.36 2.44 5.36 5.42 0 2.99-2.43 5.42-5.42 5.42-.52 0-1.02-.07-1.5-.21l-3.1 1.26a.5.5 0 0 1-.67-.64l1.09-2.89a5.39 5.39 0 0 1-1.22-3.44c0-2.98 2.42-5.4 5.38-5.42h.08zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                  </svg>
                  Połącz Steam
                </Button>
                
                <Button
                  onClick={skipSteamSetup}
                  variant="ghost"
                  className="w-full h-12 text-zinc-400 hover:text-white"
                >
                  Pomiń na razie
                </Button>
              </div>
            </motion.div>
          )}

          {/* Complete Step */}
          {step === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-8"
            >
              {/* Success animation */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="flex justify-center"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/25">
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </div>
              </motion.div>

              {/* Message */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-4"
              >
                <h2 className="text-3xl font-bold text-white">
                  Wszystko gotowe!
                </h2>
                <p className="text-zinc-400 text-lg">
                  Twoje konto zostało skonfigurowane. 
                  Czas odkryć wszystkie możliwości Quark Launcher!
                </p>
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Button
                  onClick={handleComplete}
                  className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-lg font-medium group"
                >
                  Rozpocznij przygodę
                  <Sparkles className="ml-2 w-5 h-5" />
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
