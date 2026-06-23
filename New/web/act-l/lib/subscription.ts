/**
 * Subscription scaffolding for future premium accounts.
 * Tier data may come from profile columns (API) or preferences JSON during rollout.
 */

export type SubscriptionTier = 'free' | 'premium' | 'premium_plus';
export type SubscriptionStatus = 'active' | 'canceled' | 'expired' | 'trialing';
export type SubscriptionProvider = 'stripe' | 'manual' | null;

export interface UserSubscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  expiresAt: string | null;
  provider: SubscriptionProvider;
}

export const DEFAULT_SUBSCRIPTION: UserSubscription = {
  tier: 'free',
  status: 'active',
  expiresAt: null,
  provider: null,
};

/** Feature gates — extend as premium perks are implemented */
export const PREMIUM_FEATURES = {
  customCardThemes: ['premium', 'premium_plus'] as SubscriptionTier[],
  advancedStats: ['premium', 'premium_plus'] as SubscriptionTier[],
  prioritySupport: ['premium_plus'] as SubscriptionTier[],
  unlimitedCategories: ['premium', 'premium_plus'] as SubscriptionTier[],
} as const;

export type PremiumFeature = keyof typeof PREMIUM_FEATURES;

export interface SubscriptionProfileFields {
  subscriptionTier?: string | null;
  subscriptionStatus?: string | null;
  subscriptionExpiresAt?: string | null;
  subscriptionProvider?: string | null;
  preferences?: string | null;
}

function isTier(value: unknown): value is SubscriptionTier {
  return value === 'free' || value === 'premium' || value === 'premium_plus';
}

function isStatus(value: unknown): value is SubscriptionStatus {
  return value === 'active' || value === 'canceled' || value === 'expired' || value === 'trialing';
}

function parsePreferencesSubscription(preferences?: string | null): Partial<UserSubscription> | null {
  if (!preferences) return null;
  try {
    const parsed = JSON.parse(preferences) as { subscription?: Partial<UserSubscription> };
    if (!parsed.subscription || typeof parsed.subscription !== 'object') return null;
    return parsed.subscription;
  } catch {
    return null;
  }
}

export function parseSubscription(profile?: SubscriptionProfileFields | null): UserSubscription {
  if (!profile) return { ...DEFAULT_SUBSCRIPTION };

  const fromPrefs = parsePreferencesSubscription(profile.preferences);
  const tier = isTier(profile.subscriptionTier)
    ? profile.subscriptionTier
    : isTier(fromPrefs?.tier)
      ? fromPrefs.tier
      : 'free';

  const status = isStatus(profile.subscriptionStatus)
    ? profile.subscriptionStatus
    : isStatus(fromPrefs?.status)
      ? fromPrefs.status
      : 'active';

  const expiresAt =
    profile.subscriptionExpiresAt ??
    (typeof fromPrefs?.expiresAt === 'string' ? fromPrefs.expiresAt : null);

  const provider =
    profile.subscriptionProvider === 'stripe' || profile.subscriptionProvider === 'manual'
      ? profile.subscriptionProvider
      : fromPrefs?.provider === 'stripe' || fromPrefs?.provider === 'manual'
        ? fromPrefs.provider
        : null;

  return { tier, status, expiresAt, provider };
}

export function isSubscriptionActive(sub: UserSubscription): boolean {
  if (sub.status === 'canceled' || sub.status === 'expired') return false;
  if (!sub.expiresAt) return sub.tier !== 'free';
  return new Date(sub.expiresAt).getTime() > Date.now();
}

export function hasPremiumFeature(sub: UserSubscription, feature: PremiumFeature): boolean {
  if (!isSubscriptionActive(sub)) return false;
  return PREMIUM_FEATURES[feature].includes(sub.tier);
}

export function isPremiumUser(sub: UserSubscription): boolean {
  return isSubscriptionActive(sub) && sub.tier !== 'free';
}
