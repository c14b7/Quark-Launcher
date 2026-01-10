'use client';

import { useState } from 'react';
import { 
  User, 
  Link as LinkIcon, 
  Unlink, 
  CheckCircle, 
  ExternalLink,
  Gamepad2,
  Trophy,
  LogOut,
  Settings,
  Shield,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { SteamIntegrationPanel } from '@/components/steam-integration-panel';
import { cn } from '@/lib/utils';

interface AccountConnection {
  id: string;
  name: string;
  icon: string;
  color: string;
  connected: boolean;
  username?: string;
  gamesCount?: number;
  achievementsCount?: number;
}

const availableAccounts: AccountConnection[] = [
  {
    id: 'xbox',
    name: 'Xbox / Microsoft',
    icon: '🎯',
    color: 'from-green-600 to-green-800',
    connected: false
  },
  {
    id: 'epic',
    name: 'Epic Games',
    icon: '🏪',
    color: 'from-zinc-600 to-zinc-800',
    connected: false
  },
  {
    id: 'gog',
    name: 'GOG Galaxy',
    icon: '🌌',
    color: 'from-purple-600 to-purple-800',
    connected: false
  },
  {
    id: 'ubisoft',
    name: 'Ubisoft Connect',
    icon: '🔷',
    color: 'from-blue-400 to-blue-600',
    connected: false
  },
  {
    id: 'ea',
    name: 'EA App',
    icon: '⚡',
    color: 'from-orange-500 to-red-600',
    connected: false
  }
];

export function AccountsView() {
  const { user, profile, logout, isLoading } = useAuth();
  const { steamUser, isLoggedIn } = useSettings();
  
  const [accounts, setAccounts] = useState<AccountConnection[]>(() => 
    availableAccounts.map(acc => ({
      ...acc,
      connected: false
    }))
  );
  const [activeTab, setActiveTab] = useState<'profile' | 'integrations'>('profile');

  const handleConnect = (id: string) => {
    // In production, this would redirect to OAuth
    setAccounts(prev => prev.map(acc => {
      if (acc.id === id) {
        return {
          ...acc,
          connected: true,
          username: `${acc.name}User`,
          gamesCount: Math.floor(Math.random() * 50) + 10,
          achievementsCount: Math.floor(Math.random() * 200) + 50
        };
      }
      return acc;
    }));
  };

  const handleDisconnect = (id: string) => {
    setAccounts(prev => prev.map(acc => {
      if (acc.id === id) {
        return {
          ...acc,
          connected: false,
          username: undefined,
          gamesCount: undefined,
          achievementsCount: undefined
        };
      }
      return acc;
    }));
  };

  const handleLogout = async () => {
    await logout();
  };

  const connectedAccounts = accounts.filter(a => a.connected);
  const availableToConnect = accounts.filter(a => !a.connected);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              Konto i integracje
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Zarządzaj swoim kontem i połączeniami z platformami
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-6">
          <Button
            variant={activeTab === 'profile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('profile')}
            className={cn(
              "rounded-lg",
              activeTab === 'profile' && "bg-gradient-to-r from-purple-600 to-blue-600"
            )}
          >
            <User className="w-4 h-4 mr-2" />
            Profil
          </Button>
          <Button
            variant={activeTab === 'integrations' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('integrations')}
            className={cn(
              "rounded-lg",
              activeTab === 'integrations' && "bg-gradient-to-r from-purple-600 to-blue-600"
            )}
          >
            <LinkIcon className="w-4 h-4 mr-2" />
            Integracje
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6 max-w-2xl">
              {/* User Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-zinc-900/80 to-zinc-800/50 border border-zinc-700/50">
                <div className="flex items-start gap-4">
                  <Avatar className="w-20 h-20 border-2 border-purple-500/30">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white text-2xl">
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-white">{user?.name || 'Użytkownik'}</h2>
                    <div className="flex items-center gap-2 mt-1 text-zinc-400">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm">{user?.email}</span>
                    </div>
                    {user?.emailVerification && (
                      <Badge variant="secondary" className="mt-2 bg-green-500/10 text-green-400 border-green-500/20">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Email zweryfikowany
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-zinc-400 hover:text-white"
                  >
                    <Settings className="w-5 h-5" />
                  </Button>
                </div>

                <Separator className="my-6 bg-zinc-700/50" />

                {/* Account Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-xl bg-zinc-800/50">
                    <p className="text-2xl font-bold text-white">
                      {user?.$createdAt ? new Date(user.$createdAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">Data dołączenia</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-zinc-800/50">
                    <p className="text-2xl font-bold text-white">
                      {profile?.steamLinked ? '1' : '0'}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">Integracji</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-zinc-800/50">
                    <p className="text-2xl font-bold text-white">0</p>
                    <p className="text-xs text-zinc-500 mt-1">Gier zsync.</p>
                  </div>
                </div>
              </div>

              {/* Security Section */}
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-700/30">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-400" />
                  Bezpieczeństwo
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30">
                    <div>
                      <p className="text-sm font-medium text-white">Zmień hasło</p>
                      <p className="text-xs text-zinc-500">Zaktualizuj hasło do konta</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300">
                      Zmień
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30">
                    <div>
                      <p className="text-sm font-medium text-white">Weryfikacja dwuetapowa</p>
                      <p className="text-xs text-zinc-500">Dodatkowe zabezpieczenie konta</p>
                    </div>
                    <Badge variant="secondary" className="bg-zinc-700 text-zinc-400">
                      Wkrótce
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Logout */}
              <Button
                variant="ghost"
                onClick={handleLogout}
                disabled={isLoading}
                className="w-full h-12 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Wyloguj się
              </Button>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="space-y-8">
              {/* Steam Integration */}
              <section className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-700/30">
                <SteamIntegrationPanel />
              </section>

              {/* Other Platforms */}
              <section>
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Inne platformy
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableToConnect.map(account => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      onConnect={() => handleConnect(account.id)}
                    />
                  ))}
                </div>
              </section>

              {/* Connected Other Accounts */}
              {connectedAccounts.length > 0 && (
                <section>
                  <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    Połączone
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {connectedAccounts.map(account => (
                      <AccountCard
                        key={account.id}
                        account={account}
                        onDisconnect={() => handleDisconnect(account.id)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface AccountCardProps {
  account: AccountConnection;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

function AccountCard({ account, onConnect, onDisconnect }: AccountCardProps) {
  return (
    <div className={cn(
      "p-4 rounded-xl border transition-all",
      account.connected 
        ? 'bg-zinc-900/50 border-green-500/30' 
        : 'bg-zinc-900/30 border-white/5 hover:border-white/10'
    )}>
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-2xl", account.color)}>
          {account.icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white">{account.name}</h3>
          {account.connected && account.username && (
            <p className="text-sm text-zinc-400">{account.username}</p>
          )}
        </div>
        {account.connected && (
          <CheckCircle className="h-5 w-5 text-green-400" />
        )}
      </div>

      {account.connected && (
        <div className="flex items-center gap-4 mb-4 text-sm text-zinc-400">
          {account.gamesCount !== undefined && (
            <div className="flex items-center gap-1">
              <Gamepad2 className="h-4 w-4" />
              <span>{account.gamesCount} gier</span>
            </div>
          )}
          {account.achievementsCount !== undefined && (
            <div className="flex items-center gap-1">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span>{account.achievementsCount} osiągnięć</span>
            </div>
          )}
        </div>
      )}

      {account.connected ? (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-white/10 text-zinc-400 hover:text-white rounded-lg"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Profil
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"
            onClick={onDisconnect}
          >
            <Unlink className="h-4 w-4 mr-2" />
            Odłącz
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          className={cn("w-full bg-gradient-to-r rounded-lg", account.color)}
          onClick={onConnect}
        >
          <LinkIcon className="h-4 w-4 mr-2" />
          Połącz
        </Button>
      )}
    </div>
  );
}
