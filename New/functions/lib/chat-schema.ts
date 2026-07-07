/** Chat collection attribute shapes and shared types */

export const MESSAGE_TYPES = [
  'text',
  'game_share',
  'achievement_share',
  'store_deal',
  'party_invite',
  'system',
  'lfg',
] as const;

export type MessageType = (typeof MESSAGE_TYPES)[number];

export const CONVERSATION_TYPES = ['dm', 'group'] as const;
export type ConversationType = (typeof CONVERSATION_TYPES)[number];

export const MEMBER_ROLES = ['owner', 'admin', 'member'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

/** Appwrite string attribute limits (collection total size budget) */
export const CHAT_BODY_MAX = 2048;
export const CHAT_ATTACHMENTS_MAX = 2048;

export function buildDmKey(userA: string, userB: string): string {
  const [a, b] = userA < userB ? [userA, userB] : [userB, userA];
  return `${a}:${b}`;
}

export function memberReadPermissions(memberIds: string[]) {
  // Used server-side when creating documents with per-user read access for Realtime
  return memberIds;
}
