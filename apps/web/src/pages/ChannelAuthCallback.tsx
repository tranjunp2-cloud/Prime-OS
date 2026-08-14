import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export function ChannelAuthCallback() {
  const [params] = useSearchParams();
  const platform = params.get('platform');
  const authCode = params.get('auth_code');
  useEffect(() => {
    if (platform && authCode && window.opener) window.opener.postMessage({ type: 'PRIME_CHANNEL_AUTH_SUCCESS', platform, auth_code: authCode }, window.location.origin);
    const timer = window.setTimeout(() => window.close(), 900);
    return () => window.clearTimeout(timer);
  }, [platform, authCode]);
  return <main className="grid min-h-screen place-items-center bg-background p-6"><div className="w-full max-w-sm rounded-2xl border bg-card p-8 text-center shadow-xl"><span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="size-7" /></span><h1 className="mt-5 text-xl font-semibold">Authorization complete</h1><p className="mt-2 text-sm text-muted-foreground">Your store authorization was returned securely to Prime OS. This window will close automatically.</p></div></main>;
}
