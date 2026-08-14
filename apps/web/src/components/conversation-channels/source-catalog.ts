import type { Platform } from '@/lib/conversation-channels-api';

export const standaloneSources: Array<{ platform: Platform; name: string; group: string; scopes: string[] }> = [
  { platform: 'FACEBOOK_MESSENGER', name: 'Facebook Messenger', group: 'Social', scopes: ['DMS', 'COMMENTS'] },
  { platform: 'ZALO_OA', name: 'Zalo OA', group: 'Social', scopes: ['MESSAGES'] },
  { platform: 'INSTAGRAM_DIRECT', name: 'Instagram Direct', group: 'Social', scopes: ['DMS', 'COMMENTS', 'STORY_MENTIONS'] },
  { platform: 'WHATSAPP_BUSINESS', name: 'WhatsApp Business', group: 'Social', scopes: ['MESSAGES'] },
  { platform: 'WEB_LIVECHAT', name: 'Web LiveChat', group: 'Web', scopes: ['MESSAGES', 'VISITOR_CONTEXT'] },
];
