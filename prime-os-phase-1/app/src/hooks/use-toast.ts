import { toast as sonnerToast } from "sonner";
import * as React from "react";

export interface ToastProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: "default" | "destructive";
  action?: React.ReactNode;
}

export function toast(props: ToastProps) {
  const { title, description, variant, action } = props;

  if (variant === "destructive") {
    return sonnerToast.error(title, {
      description,
      action: action as any,
    });
  }

  return sonnerToast(title, {
    description,
    action: action as any,
  });
}

export function useToast() {
  return {
    toast,
    dismiss: sonnerToast.dismiss,
  };
}
