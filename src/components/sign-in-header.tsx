"use client";

import { useTranslation } from "@/hooks/use-translation";

export function SignInHeader() {
  const { t } = useTranslation();
  
  return (
    <div className="text-center">
      <h1 className="text-2xl font-medium text-text-primary" style={{ letterSpacing: "-0.704px" }}>
        S3 Manager
      </h1>
      <p className="text-text-tertiary text-sm mt-1.5">{t("auth.subtitle")}</p>
    </div>
  );
}
