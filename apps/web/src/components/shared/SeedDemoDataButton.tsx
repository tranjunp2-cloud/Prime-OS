import { useState } from 'react';
import { Database, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { seedDemoData } from '@/lib/demo-data-seeder';

interface SeedDemoDataButtonProps {
  onSeeded?: () => void;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  label?: string;
}

export function SeedDemoDataButton({ 
  onSeeded, 
  variant = 'outline',
  size = 'sm',
  label = 'Add Demo Data'
}: SeedDemoDataButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const handleSeedData = async () => {
    if (!user) {
      toast.error('Please log in first');
      return;
    }

    setLoading(true);
    try {
      const result = await seedDemoData(user.id);

      if (result.success) {
        const { counts } = result;
        const parts: string[] = [];
        
        if (counts.products > 0) parts.push(`${counts.products} products`);
        if (counts.skus > 0) parts.push(`${counts.skus} SKUs`);
        if (counts.listings > 0) parts.push(`${counts.listings} listings`);
        if (counts.warehouses > 0) parts.push(`${counts.warehouses} warehouses`);
        if (counts.inventoryPositions > 0) parts.push(`${counts.inventoryPositions} inventory positions`);
        if (counts.movements > 0) parts.push(`${counts.movements} movements`);
        if (counts.adjustments > 0) parts.push(`${counts.adjustments} adjustments`);

        if (parts.length > 0) {
          toast.success(`Added ${parts.join(', ')}`);
        } else {
          toast.info('Demo data already exists');
        }

        if (result.errors.length > 0) {
          console.warn('Demo data seeding warnings:', result.errors);
        }

        setSeeded(true);
        onSeeded?.();
      } else {
        toast.error('Failed to seed demo data');
        console.error('Seeding errors:', result.errors);
      }
    } catch (error) {
      console.error('Error seeding demo data:', error);
      toast.error('Failed to seed demo data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={handleSeedData}
      disabled={loading || seeded}
    >
      {loading ? (
        <Loader2 className="size-4 mr-2 animate-spin" />
      ) : seeded ? (
        <Check className="size-4 mr-2 text-success" />
      ) : (
        <Database className="size-4 mr-2" />
      )}
      {seeded ? 'Data Seeded' : label}
    </Button>
  );
}
