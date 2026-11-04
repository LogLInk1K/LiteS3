"use client";

import { AlertCircle } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { ThemeMenu } from "@/components/theme-menu";

export function NeedsSetup() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-bg-marketing flex items-center justify-center p-4">
      {/* Offsets mirror the navbar (py-3 / px-4) so the cluster sits where it does when signed in. */}
      <div className="fixed top-3 right-4 z-50">
        <ThemeMenu />
      </div>
      <div className="w-full max-w-sm">
        <div className="bg-surface-elevated rounded-xl border border-border-subtle p-6 shadow-elevated text-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-amber-500" />
          </div>
          <h2 className="text-lg font-medium text-text-primary mb-2">
            {t("auth.needsSetupTitle")}
          </h2>
          <p className="text-sm text-text-tertiary mb-6">
            {t("auth.needsSetupDesc")}
          </p>
          <a
            href="/setup"
            className="block w-full px-4 py-2 rounded-lg bg-brand-indigo text-white font-medium hover:bg-accent-violet transition-colors"
          >
            {t("auth.goToSetup")}
          </a>
        </div>
      </div>
    </div>
  );
}
