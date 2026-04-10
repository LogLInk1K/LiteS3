"use client";

import { useBuckets } from "@/hooks/use-files";
import { FileTable } from "./file-table";
import { DropZone } from "./drop-zone";
import { FilePreview } from "./file-preview";
import { ContextMenu } from "./context-menu";
import { Server, Plus, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/button";
import { useTranslation } from "@/hooks/use-translation";

export function FileManager() {
  const { data, isLoading, error } = useBuckets();
  const buckets = data?.buckets || [];
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-bg-marketing">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-indigo" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-screen bg-bg-marketing">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-text-primary text-lg">{t("common.failedToLoad")}</p>
            <p className="text-text-quaternary text-sm mt-1">{(error as Error).message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (buckets.length === 0) {
    return (
      <div className="flex flex-col h-screen bg-bg-marketing">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <div className="w-16 h-16 rounded-2xl bg-hover-bg border border-border-subtle flex items-center justify-center mx-auto mb-6">
              <Server className="h-8 w-8 text-brand-indigo" />
            </div>
            <h2 className="text-2xl font-medium text-text-primary mb-3" style={{ letterSpacing: "-0.704px" }}>
              {t("buckets.noBuckets")}
            </h2>
            <p className="text-text-tertiary mb-8 leading-relaxed">
              {t("buckets.addFirst")}
            </p>
            <Link href="/buckets">
              <Button className="bg-brand-indigo hover:bg-accent-hover text-white px-6 py-2.5 rounded-lg font-medium">
                <Plus className="h-4 w-4 mr-2" />
                {t("buckets.addBucket")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-bg-marketing overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <FileTable />
      </div>
      <DropZone />
      <FilePreview />
      <ContextMenu />
    </div>
  );
}
