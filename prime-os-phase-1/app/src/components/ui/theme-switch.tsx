"use client";

import type { HTMLAttributes } from "react";
import { MoonIcon, SunIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme-provider";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/I18nContext";

const ThemeSwitch = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useI18n();
  const [checked, setChecked] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => setChecked(resolvedTheme === "dark"), [resolvedTheme]);

  const handleCheckedChange = useCallback(
    (isChecked: boolean) => {
      setChecked(isChecked);
      setTheme(isChecked ? "dark" : "light");
    },
    [setTheme],
  );

  if (!mounted) return null;

  return (
    <div
      className={cn(
        "relative mx-auto flex items-center justify-center",
        "h-8 w-[4.35rem]",
        className,
      )}
      {...props}
    >
      <Switch
        checked={checked}
        onCheckedChange={handleCheckedChange}
        aria-label={checked ? t("sidebar.darkMode") : t("sidebar.lightMode")}
        className={cn(
          "peer absolute inset-0 h-full w-full rounded-full border border-border/70 !bg-muted/55 shadow-inner transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "[&>span]:z-10 [&>span]:h-6 [&>span]:w-6 [&>span]:rounded-full [&>span]:bg-background [&>span]:shadow-md [&>span]:ring-1 [&>span]:ring-border/60",
          "data-[state=unchecked]:[&>span]:translate-x-[3px]",
          "data-[state=checked]:[&>span]:translate-x-[41px]",
        )}
      />

      <span
        className={cn(
          "pointer-events-none absolute inset-y-0 left-2 z-0",
          "flex items-center justify-center",
        )}
      >
        <SunIcon
          size={14}
          className={cn(
            "transition-all duration-200 ease-out",
            checked ? "text-muted-foreground/65" : "text-foreground scale-105",
          )}
        />
      </span>

      <span
        className={cn(
          "pointer-events-none absolute inset-y-0 right-2 z-0",
          "flex items-center justify-center",
        )}
      >
        <MoonIcon
          size={14}
          className={cn(
            "transition-all duration-200 ease-out",
            checked ? "text-foreground scale-105" : "text-muted-foreground/65",
          )}
        />
      </span>
    </div>
  );
};

export default ThemeSwitch;
