'use client';

import { useState } from 'react';
import { 
  User, 
  Link as LinkIcon, 
  Unlink, 
  CheckCircle, 
  ExternalLink,
  Gamepad2,
  Trophy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/lib/settings-context';

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
    id: 'steam',
    name: 'Steam',
    icon: '🎮',
    color: 'from-blue-600 to-blue-800',
    connected: false
  },
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
  const { steamUser, isLoggedIn } = useSettings();
  const [accounts, setAccounts] = useState<AccountConnection[]>(() => 
    availableAccounts.map(acc => ({
      ...acc,
      connected: acc.id === 'steam' && isLoggedIn,
      username: acc.id === 'steam' && steamUser ? steamUser.personaName : undefined,
      gamesCount: acc.id === 'steam' && isLoggedIn ? 47 : undefined,
      achievementsCount: acc.id === 'steam' && isLoggedIn ? 312 : undefined
    }))
  );

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
              Połączone konta
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Zarządzaj połączeniami z platformami gamingowymi
            </p>
          </div>
          <Badge variant="secondary" className="bg-white/10 text-zinc-300">
            {connectedAccounts.length} połączonych
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-8">
          {/* Connected Accounts */}
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

          {/* Available to Connect */}
          {availableToConnect.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Dostępne do połączenia
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
    <div className={`
      p-4 rounded-xl border transition-all
      ${account.connected 
        ? 'bg-zinc-900/50 border-green-500/30' 
        : 'bg-zinc-900/30 border-white/5 hover:border-white/10'
      }
    `}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${account.color} flex items-center justify-center text-2xl`}>
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
          className="w-full bg-white/10 hover:bg-white/20 text-white rounded-lg"
          onClick={onConnect}
        >
          <LinkIcon className="h-4 w-4 mr-2" />
          Połącz konto
        </Button>
      )}
    </div>
  );
}
