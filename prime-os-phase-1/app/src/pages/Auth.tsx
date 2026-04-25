import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LockKeyhole } from 'lucide-react';
import { seedDemoData } from '@/lib/demo-data-seeder';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const { user, signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/overview" replace />;
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setFormError(null);
    setStatusText('Checking account...');

    try {
      const authRes = await signIn(email.trim(), password);

      if (authRes.error) {
        throw new Error(authRes.error.message);
      }

      const currentUserId = authRes.session?.account?.id;
      if (!currentUserId) throw new Error('No valid session created.');

      setStatusText('Loading workspace data...');
      const seedRes = await seedDemoData(currentUserId);

      if (seedRes.success) {
        toast({
          title: 'Welcome to PrimeOS',
          description: 'Workspace loaded successfully.',
        });
        navigate('/overview', { replace: true });
      } else {
        throw new Error('Failed to load workspace data. Please try again.');
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      const message = error.message || 'Unable to sign in. Please check your email and password.';
      setFormError(message);
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: message,
      });
    } finally {
      setIsLoading(false);
      setStatusText('');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-[520px]">
        <CardHeader className="pb-8 pt-10 text-center">
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-xl border border-primary/15 bg-primary/10">
            <LockKeyhole className="size-8 text-primary" />
          </div>
          <CardTitle className="font-display text-4xl font-semibold text-foreground">
            Sign in
          </CardTitle>
          <CardDescription className="mt-3 text-[15px] text-muted-foreground">
            Enter your PrimeOS workspace account.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-10">
          <form className="flex flex-col gap-5" onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label htmlFor="primeos-email">Email</Label>
              <Input
                id="primeos-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                placeholder="seller@company.com"
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primeos-password">Password</Label>
              <Input
                id="primeos-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Enter password"
                required
                className="h-11"
              />
            </div>

            {formError ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {formError}
              </div>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="mt-2 w-full text-[15px]"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-3 size-5 animate-spin" />
                  {statusText || 'Signing in...'}
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
