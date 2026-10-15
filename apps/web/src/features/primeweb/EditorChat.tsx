import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Check } from 'lucide-react';
import { Action } from './ui';
import type { Block } from './store';
import './editor-chat.css';

type Message = { id: string; role: 'user' | 'assistant'; text: string; time: string; pageId?: string; patch?: Partial<Block>; applied?: boolean; dismissed?: boolean };
const starters = ['Make my headline more welcoming', 'Write a stronger call to action', 'Improve the hero description'];
const timestamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
export function EditorChat({ name, pageId, hasHero, onApply, onBusyChange }: { name: string; pageId: string; hasHero: boolean; onApply: (pageId: string, patch: Partial<Block>) => boolean; onBusyChange: (busy: boolean) => void }) {
  const [messages, setMessages] = useState<Message[]>(() => [{ id: 'hello', role: 'assistant', text: 'Hi! What would you like to edit? I can help with your headline, description or call to action.', time: timestamp() }]);
  const [input, setInput] = useState('');
  const [showStarters, setShowStarters] = useState(true);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { const log = logRef.current; if (log) log.scrollTop = log.scrollHeight; }, [messages, busy]);
  function send() {
    const request = input.trim();
    if (!request || busy) return;
    setShowStarters(false);
    const targetPage = pageId;
    setMessages(current => [...current, { id: crypto.randomUUID(), role: 'user', text: request, time: timestamp() }]);
    setInput(''); setBusy(true); onBusyChange(true);
    timer.current = setTimeout(() => {
      let text: string;
      let patch: Partial<Block> | undefined;
      if (!hasHero) text = 'This page has no hero section yet. Add a Hero from Components, then ask me to help with its content.';
      else if (/button|action|cta/i.test(request)) { patch = { button: 'Explore the collection' }; text = 'Here’s a sample call to action:\n“Explore the collection”'; }
      else if (/description|intro|subtitle/i.test(request)) { patch = { text: `Discover thoughtfully selected favorites at ${name}. Find something you’ll love, every day.` }; text = `Try this sample description:\n“${patch.text}”`; }
      else if (/headline|title|welcom/i.test(request)) { patch = { title: `Welcome to ${name}. Find your everyday favorites.` }; text = `Here’s a sample headline:\n“${patch.title}”`; }
      else text = 'In this demo I can suggest hero headlines, descriptions and button text. Try “Write a stronger call to action” or describe which of those you want to change.';
      setMessages(current => [...current, { id: crypto.randomUUID(), role: 'assistant', text, time: timestamp(), pageId: targetPage, patch }]);
      setBusy(false); onBusyChange(false);
    }, 650);
  }
  return <div className="pw-chat">
    <div className="pw-chat-context"><Sparkles size={14} />AI assistant <span>Demo</span></div>
    <div className="pw-chat-log" ref={logRef} role="log" aria-label="AI conversation" aria-live="polite">
      {messages.map(message => <div key={message.id} className={`pw-chat-message ${message.role}`}><span className="sr-only">{message.role === 'user' ? 'You' : 'AI assistant'}: </span><p>{message.text}</p><time>{message.time}</time>{message.patch && !message.dismissed && <div className="pw-chat-message-actions">{message.applied ? <span><Check size={13} />Applied to draft</span> : <><Action primary onClick={() => { if (onApply(message.pageId!, message.patch!)) setMessages(current => current.map(item => item.id === message.id ? { ...item, applied: true } : item)); }}>Apply to page</Action><Action onClick={() => setMessages(current => current.map(item => item.id === message.id ? { ...item, dismissed: true } : item))}>Dismiss</Action></>}</div>}</div>)}
      {busy && <div className="pw-chat-message assistant" role="status">Preparing a suggestion…</div>}
    </div>
    <div className="pw-chat-bottom">{showStarters && <div className="pw-chat-starters"><span>Try asking</span>{starters.map(question => <button key={question} type="button" disabled={busy} onClick={() => { setInput(question); setShowStarters(false); inputRef.current?.focus(); }}>{question}</button>)}</div>}
      <form onSubmit={event => { event.preventDefault(); send(); }}><label className="sr-only" htmlFor="pw-chat-input">Tell AI what to change</label><textarea id="pw-chat-input" ref={inputRef} rows={2} maxLength={1000} value={input} onChange={event => setInput(event.target.value)} placeholder="Tell AI what to change…" onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); } }} /><button type="submit" aria-label="Send message" disabled={busy || !input.trim()}><Send size={17} /></button></form><small>Enter to send · Shift + Enter for a new line</small>
    </div>
  </div>;
}
