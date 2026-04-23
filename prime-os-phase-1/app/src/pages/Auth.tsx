import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Rocket } from 'lucide-react';
import { seedDemoData } from '@/lib/demo-data-seeder';

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const { user, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLaunchDemo = async () => {
    setIsLoading(true);
    setStatusText('Authenticating...');
    const demoEmail = 'demo@primeos.local';
    const demoPassword = 'demo-password-123';

    try {
      // 1. Try to sign in or sign up the demo user
      let authRes = await signIn(demoEmail, demoPassword);

      if (authRes.error && authRes.error.message.includes('Invalid login credentials')) {
        authRes = await signUp(demoEmail, demoPassword);
        if (authRes.error) {
          throw new Error('Could not create demo user account: ' + authRes.error.message);
        }
        // Sign in immediately after successful signup
        authRes = await signIn(demoEmail, demoPassword);
        if (authRes.error) {
          throw new Error('Account created but failed to sign in: ' + authRes.error.message);
        }
      }

      // Check if we actually got a user session inside the provider now
      // Since context updating takes a cycle, we get the session directly from supabase just to grab the ID for seeding
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();

      const currentUserId = session?.user?.id;
      if (!currentUserId) throw new Error('No valid session created.');

      // 2. Clear existing demo data? This app uses random uuid generation so seeding just appends.
      // But we always seed on first launch here to fulfill the requirement "fill hết trang còn trống"
      setStatusText('Preparing demo data... (This may take a few seconds)');
      const seedRes = await seedDemoData(currentUserId);

      if (seedRes.success) {
        toast({
          title: 'Welcome to PrimeOS',
          description: 'Demo mode initialized successfully!',
        });
        navigate('/dashboard');
      } else {
        throw new Error('Failed to seed demo data. Please try again.');
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Launch failed',
        description: error.message || 'An unexpected error occurred.',
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
        <CardHeader className="text-center pb-8 pt-10">
          <div className="mx-auto bg-primary/20 size-16 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(79,70,229,0.3)]">
            <Rocket className="size-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-white">
            PrimeOS Demo
          </CardTitle>
          <CardDescription className="text-slate-400 mt-2 text-base">
            One-click interactive sandbox equipped with comprehensive warehouse, inventory, and order data.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-10 px-8">
          <Button
            onClick={handleLaunchDemo}
            className="w-full h-14 text-lg font-medium shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(79,70,229,0.6)] transition-all"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-3 size-5 animate-spin" />
                {statusText || 'Launching...'}
              </>
            ) : (
              'Launch Full Demo'
            )}
          </Button>

          <div className="flex mt-8 text-center text-xs text-slate-500 flex-col gap-1">
            <p>Automatically logs into an isolated test environment.</p>
            <p>Database is instantly seeded with realistic test data.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
