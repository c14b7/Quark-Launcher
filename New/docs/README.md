# Dokumentacja Quark Launcher

| Dokument | Opis |
|----------|------|
| [ZMIANY-2026-06-23.md](./ZMIANY-2026-06-23.md) | Pełna dokumentacja zmian z 23.06.2026 — API, avatary, Steam, UI, Electron |

## Szybkie linki w repo

| Temat | Plik |
|-------|------|
| Konfiguracja Steam (legacy) | `web/act-l/STEAM-SETUP.md` |
| Frontend README | `web/act-l/README.md` |
| Historia bugfixów | `web/act-l/BUGFIXES.md` |

## Najczęstsze operacje

### Upload avatara (kod)

```typescript
import { uploadAvatar } from '@/lib/avatar-service';
import { useAuth } from '@/lib/auth-context';

const { applyProfile } = useAuth();
const result = await uploadAvatar(file);
if (result.success && result.profile) applyProfile(result.profile);
```

### Wyświetlenie avatara

```typescript
import { getAvatarUrl } from '@/lib/avatar-service';
<img src={getAvatarUrl(user.avatarFileId)} alt="" />
```

### Logowanie Steam (Electron)

```typescript
import { loginWithSteam } from '@/lib/steam-openid';
import { useAuth } from '@/lib/auth-context';

const { linkSteam } = useAuth();
const login = await loginWithSteam();
if (login.success && login.steamId) await linkSteam(login.steamId);
```

### Deploy funkcji Appwrite

```bash
cd functions && npm run build:compile
# następnie wgraj dist/ do Appwrite
```

> **InputFile:** używaj `./lib/input-file` zamiast `node-appwrite/file` — patrz [ZMIANY-2026-06-23.md](./ZMIANY-2026-06-23.md#16-aktualizacja-sesji--kontynuacja).

### Subskrypcja premium (scaffolding)

```typescript
import { useAuth } from '@/lib/auth-context';
import { hasPremiumFeature } from '@/lib/subscription';

const { subscription } = useAuth();
hasPremiumFeature(subscription, 'unlimitedCategories');
```

### Dev settings

Widoczne tylko gdy wersja zawiera `-dev` lub `NODE_ENV=development`. DevTools: `window.electronAPI.openDevTools()`.
