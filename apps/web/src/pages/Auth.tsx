import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { seedDemoData } from '@/lib/demo-data-seeder';
import { LanguageToggle } from '@/components/common/LanguageToggle';
import { useI18n } from '@/lib/i18n/I18nContext';
import { getAuthDictionary } from '@/lib/i18n/shell-dictionaries';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const { user, signIn } = useAuth();
  const { locale } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const authCopy = getAuthDictionary(locale);

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/overview" replace />;
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setFormError(null);
    setStatusText(authCopy.checkingAccount);

    try {
      const authRes = await signIn(email.trim(), password);

      if (authRes.error) {
        throw new Error(authRes.error.message);
      }

      const currentUserId = authRes.session?.account?.id;
      if (!currentUserId) throw new Error(authCopy.noValidSession);

      setStatusText(authCopy.loadingWorkspace);
      const seedRes = await seedDemoData(currentUserId);

      if (seedRes.success) {
        toast({
          title: authCopy.welcomeTitle,
          description: authCopy.workspaceLoaded,
        });
        navigate('/overview', { replace: true });
      } else {
        throw new Error(authCopy.loadWorkspaceFailed);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      const rawMessage = error.message || authCopy.unableToSignIn;
      const message = rawMessage === 'Failed to fetch' || rawMessage === 'NetworkError when attempting to fetch resource.'
        ? authCopy.backendUnavailable
        : rawMessage;
      setFormError(message);
      toast({
        variant: 'destructive',
        title: authCopy.loginFailed,
        description: message,
      });
    } finally {
      setIsLoading(false);
      setStatusText('');
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[hsl(var(--surface-stage))] px-4 py-6 sm:px-6 lg:px-10">
      <Card className="grid w-full max-w-5xl overflow-hidden border border-border bg-card shadow-[0_24px_80px_hsl(var(--foreground)/0.08)] lg:grid-cols-[0.92fr_1.08fr]">
        <section className="hidden border-r border-border bg-muted/35 p-8 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-white p-1 shadow-sm">
                <img src="/primeos-mark.png" alt="Prime OS" className="h-full w-full object-contain" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  {authCopy.eyebrow}
                </p>
                <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground">
                  {authCopy.brandTitle}
                </h1>
              </div>
            </div>
            <p className="mt-8 max-w-[22rem] text-[15px] leading-7 text-muted-foreground">
              {authCopy.brandDescription}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
              <span className="text-muted-foreground">{authCopy.workspaceLabel}</span>
              <span className="font-medium text-foreground">{authCopy.workspaceValue}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
              <span className="text-muted-foreground">{authCopy.securityLabel}</span>
              <span className="inline-flex items-center gap-2 font-medium text-foreground">
                <ShieldCheck className="size-4 text-primary" />
                {authCopy.securityValue}
              </span>
            </div>
          </div>
        </section>

        <section className="px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10" aria-labelledby="primeos-auth-title">
          <div className="mb-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 lg:hidden">
              <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-white p-1 shadow-sm">
                <img src="/primeos-mark.png" alt="Prime OS" className="h-full w-full object-contain" />
              </span>
              <span className="font-display text-lg font-semibold text-foreground">{authCopy.brandTitle}</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
                {authCopy.languageSwitcherLabel}
              </span>
              <LanguageToggle compact />
            </div>
          </div>

          <div className="mx-auto max-w-md">
            <div className="mb-6 grid gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground lg:hidden">
              <div className="flex items-center justify-between gap-3">
                <span>{authCopy.workspaceLabel}</span>
                <span className="font-semibold text-foreground">{authCopy.workspaceValue}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
                <span>{authCopy.securityLabel}</span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                  <ShieldCheck className="size-3.5 text-primary" />
                  {authCopy.securityValue}
                </span>
              </div>
            </div>
            <CardHeader className="px-0 pb-8 pt-0 text-left">
              <div className="mb-6 flex size-12 items-center justify-center rounded-lg border border-primary/15 bg-primary/10">
                <LockKeyhole className="size-6 text-primary" />
              </div>
              <CardTitle id="primeos-auth-title" className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                {authCopy.title}
              </CardTitle>
              <CardDescription className="mt-3 text-[15px] leading-6 text-muted-foreground">
                {authCopy.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <form className="flex flex-col gap-5" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <Label htmlFor="primeos-email">{authCopy.email}</Label>
                  <Input
                    id="primeos-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="username"
                    placeholder="seller@company.com"
                    required
                    className="h-12 text-[15px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primeos-password">{authCopy.password}</Label>
                  <Input
                    id="primeos-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    placeholder={authCopy.passwordPlaceholder}
                    required
                    className="h-12 text-[15px]"
                  />
                </div>

                {formError ? (
                  <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {formError}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  size="lg"
                  className="mt-2 h-12 w-full text-[15px]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-3 size-5 animate-spin" />
                      {statusText || authCopy.signingIn}
                    </>
                  ) : (
                    authCopy.submit
                  )}
                </Button>
              </form>
            </CardContent>
          </div>
        </section>
      </Card>
    </div>
  );
}
