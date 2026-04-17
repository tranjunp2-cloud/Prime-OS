import { useState } from 'react';
import { Database, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { seedDemoData } from '@/lib/demo-data-seeder';
import { clearLegacyRemoteDemoFulfillment } from '@/lib/demo-remote-cleanup';
import { toast } from 'sonner';

interface SeedFullDemoButtonProps {
  onSeeded?: () => void;
}

export function SeedFullDemoButton({ onSeeded }: SeedFullDemoButtonProps) {
  const { user } = useAuth();
  const [isSeeding, setIsSeeding] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleSeed = async () => {
    if (!user) {
      toast.error('You must be logged in to refresh demo data');
      return;
    }

    setIsSeeding(true);

    try {
      await seedDemoData(user.id);
      await clearLegacyRemoteDemoFulfillment({
        id: user.id,
        email: user.email,
      });

      setCompleted(true);
      toast.success('Canonical demo data refreshed from Product Master');
      onSeeded?.();
    } catch (error) {
      console.error('Error refreshing canonical demo data:', error);
      toast.error('Failed to refresh canonical demo data');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleSeed} disabled={isSeeding}>
      {isSeeding ? (
        <>
          <Loader2 className="size-4 mr-2 animate-spin" />
          Refreshing demo data...
        </>
      ) : completed ? (
        <>
          <CheckCircle2 className="size-4 mr-2 text-emerald-500" />
          Canonical Demo Ready
        </>
      ) : (
        <>
          <Database className="size-4 mr-2" />
          Refresh Canonical Demo
        </>
      )}
    </Button>
  );
}
