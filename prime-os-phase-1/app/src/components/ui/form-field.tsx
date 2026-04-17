import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  helper?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, htmlFor, required, error, helper, children, className }: FormFieldProps) {
  const id = htmlFor ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={id}
        className="text-sm font-medium text-foreground"
      >
        {label}
        {required && <span className="text-destructive ml-0.5" aria-hidden="true">*</span>}
      </label>
      {React.Children.map(children, (child) =>
        child ? React.cloneElement(child as React.ReactElement<React.HTMLAttributes<HTMLElement>>, { id }) : child
      )}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1" role="alert" id={`${id}-error`}>
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </p>
      )}
      {helper && !error && (
        <p className="text-xs text-muted-foreground" id={`${id}-helper`}>{helper}</p>
      )}
    </div>
  );
}
