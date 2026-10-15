// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { crmStorageKey, guestLevel, historyCsv, initialCrmState, readCrmState, replyToConversation, saveCrmState, validateLevels } from './model';

beforeEach(() => localStorage.clear());
describe('CRM conversation state', () => {
  it('isolates messages, drafts and history between conversations', () => {
    const state = initialCrmState();
    state.conversations[0].draft = 'Hello';
    state.conversations[1].draft = 'A different draft';
    const next = replyToConversation(state, 'c1', 'Hello');
    expect(next.conversations[0].messages.at(-1)?.text).toBe('Hello');
    expect(next.conversations[0].draft).toBe('');
    expect(next.conversations[1]).toEqual(state.conversations[1]);
    expect(next.history[0]).toMatchObject({ conversationId: 'c1', guestId: 'guest-anh', action: 'Reply simulated' });
    expect(state.history).toEqual([]);
  });
  it('blocks restricted text and replies to resolved conversations without changing state', () => {
    const state = initialCrmState(); state.keywords = ['guaranteed'];
    expect(() => replyToConversation(state, 'c1', 'GUARANTEED delivery')).toThrow('restricted keyword');
    state.conversations[0].status = 'resolved';
    expect(() => replyToConversation(state, 'c1', 'Hello')).toThrow('Reopen');
    expect(state.history).toHaveLength(0);
  });
  it('persists per-account state separately from empty demo mode', () => {
    saveCrmState('workspace-a', false, replyToConversation(initialCrmState(), 'c1', 'Saved reply'));
    expect(readCrmState('workspace-a', false).history).toHaveLength(1);
    expect(readCrmState('workspace-b', false).history).toHaveLength(0);
    expect(readCrmState('workspace-a', true).guests).toHaveLength(0);
  });
  it('keeps corrupt data intact instead of replacing it with sample data', () => {
    const key = crmStorageKey('a', false); localStorage.setItem(key, '{invalid');
    expect(() => readCrmState('a', false)).toThrow();
    expect(localStorage.getItem(key)).toBe('{invalid');
  });
  it('calculates guest levels from incoming chat and comment counts, not agent replies', () => {
    const state = initialCrmState(); state.levels = [{ name: 'New', chats: 0, comments: 0 }, { name: 'Engaged', chats: 2, comments: 0 }];
    expect(guestLevel(replyToConversation(state, 'c1', 'Hello'), 'guest-anh')).toBe('New');
    state.conversations[0].messages.push({ ...state.conversations[0].messages[0], id: 'another' });
    expect(guestLevel(state, 'guest-anh')).toBe('Engaged');
    expect(() => validateLevels([{ name: 'New', chats: 2, comments: 0 }, { name: 'High', chats: 1, comments: 1 }])).toThrow('Thresholds');
  });
  it('escapes CSV quotes and formula-like customer content', () => {
    const state = replyToConversation(initialCrmState(), 'c1', '=HYPERLINK("bad")');
    expect(historyCsv(state)).toContain('"\'=HYPERLINK(""bad"")"');
  });
});
