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
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Cool background decorations for modern vibe */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full mix-blend-screen animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/100/20 blur-[120px] rounded-full mix-blend-screen animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />

      <Card className="w-full max-w-md relative z-10 border-slate-800 bg-slate-900/50 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center pb-6 pt-10">
          <div className="mx-auto bg-primary/20 size-16 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(79,70,229,0.3)]">
            <LockKeyhole className="size-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-white">
            Sign in
          </CardTitle>
          <CardDescription className="text-slate-400 mt-2 text-base">
            Enter your PrimeOS workspace account.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-10 px-8">
          <form className="flex flex-col gap-5" onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label htmlFor="primeos-email" className="text-slate-200">Email</Label>
              <Input
                id="primeos-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                placeholder="seller@company.com"
                required
                className="h-12 border-slate-700 bg-slate-950/70 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primeos-password" className="text-slate-200">Password</Label>
              <Input
                id="primeos-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Enter password"
                required
                className="h-12 border-slate-700 bg-slate-950/70 text-white placeholder:text-slate-500"
              />
            </div>

            {formError ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {formError}
              </div>
            ) : null}

            <Button
              type="submit"
              className="mt-2 h-14 w-full text-lg font-medium shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all hover:shadow-[0_0_30px_rgba(79,70,229,0.6)]"
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
