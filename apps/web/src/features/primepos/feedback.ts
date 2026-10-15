import { toast } from 'sonner';

export function attempt(fn: () => void, success?: string) { try { fn(); if (success) toast.success(success); return true; } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save. Please try again.'); return false; } }
