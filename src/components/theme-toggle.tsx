"use client";

import { Moon, Sun } from "@phosphor-icons/react";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={() => {
        setTheme(isDark ? "light" : "dark");
      }}
      aria-label="Toggle theme"
      title="Toggle theme"
      className="rounded-full"
    >
      <Sun weight="duotone" data-icon="inline-start" className="hidden dark:block" />
      <Moon weight="duotone" data-icon="inline-start" className="block dark:hidden" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
