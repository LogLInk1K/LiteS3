"use client";

import { useState } from "react";
import { useBuckets } from "@/hooks/use-files";
import { useQueryClient } from "@tanstack/react-query";
import { FileTable } from "./file-table";
import { DropZone } from "./drop-zone";
import { FilePreview } from "./file-preview";
import { ContextMenu } from "./context-menu";
import { Server, Plus, Loader2, Check, AlertCircle, X } from "lucide-react";
import { Button } from "./ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { createPortal } from "react-dom";
import { mapConnectionError } from "@/lib/utils";

interface BucketFormData {
  name: string;
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
  isPublic: boolean;
}

const initialFormData: BucketFormData = {
  name: "",
  endpoint: "",
  region: "auto",
  accessKeyId: "",
  secretAccessKey: "",
  bucketName: "",
  publicUrl: "",
  isPublic: false,
};

export function FileManager() {
  const { data, isLoading, error } = useBuckets();
  const buckets = data?.buckets || [];
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<BucketFormData>(initialFormData);
  const [formLoading, setFormLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const testConnection = async () => {
    setFormLoading(true);
    setTestResult(null);
    try {
      const response = await fetch("/api/buckets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", config: formData }),
      });
      const data = await response.json();
      setTestResult({
        success: data.success,
        message: data.success ? t("buckets.connectionSuccess") : mapConnectionError(data.error, t),
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : t("buckets.testFailed"),
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.isPublic && !formData.publicUrl.trim()) {
      setTestResult({ success: false, message: t("buckets.publicUrlRequired") });
      return;
    }
    setFormLoading(true);
    try {
      const payload = {
        ...formData,
        publicUrl: formData.isPublic ? formData.publicUrl.trim() : "",
      };
      const response = await fetch("/api/buckets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", config: payload }),
      });
      const data = await response.json();
      if (data.success) {
        setShowForm(false);
        setFormData(initialFormData);
        setTestResult(null);
        queryClient.invalidateQueries({ queryKey: ["buckets"] });
      } else {
        setTestResult({ success: false, message: mapConnectionError(data.error, t) });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : t("buckets.createFailed"),
      });
    } finally {
      setFormLoading(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setFormData(initialFormData);
    setTestResult(null);
  };

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
            <Button
              onClick={() => setShowForm(true)}
              className="bg-brand-indigo hover:bg-accent-hover text-white px-6 py-2.5 rounded-lg font-medium cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("buckets.addBucket")}
            </Button>
          </div>
        </div>

        {showForm && createPortal(
          <div className="fixed inset-0 bg-overlay-primary backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={closeForm}>
            <div className="w-full max-w-lg bg-bg-panel rounded-xl border border-border-subtle overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
                <h2 className="text-lg font-medium text-text-primary">
                  {t("buckets.addStorageBucket")}
                </h2>
                <button
                  onClick={closeForm}
                  className="p-1.5 rounded-lg hover:bg-hover-bg transition-colors"
                >
                  <X className="w-5 h-5 text-text-tertiary" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-auto">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    {t("buckets.displayName")}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="My S3 Storage"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-hover-bg border border-border-subtle text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-brand-indigo text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      {t("buckets.endpoint")}
                    </label>
                    <input
                      type="text"
                      value={formData.endpoint}
                      onChange={(e) => setFormData((prev) => ({ ...prev, endpoint: e.target.value }))}
                      placeholder="https://s3.amazonaws.com"
                      required
                      className="w-full px-3 py-2 rounded-lg bg-hover-bg border border-border-subtle text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-brand-indigo text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      {t("buckets.region")}
                    </label>
                    <input
                      type="text"
                      value={formData.region}
                      onChange={(e) => setFormData((prev) => ({ ...prev, region: e.target.value }))}
                      placeholder="auto"
                      className="w-full px-3 py-2 rounded-lg bg-hover-bg border border-border-subtle text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-brand-indigo text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    {t("buckets.bucketName")}
                  </label>
                  <input
                    type="text"
                    value={formData.bucketName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, bucketName: e.target.value }))}
                    placeholder="my-bucket"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-hover-bg border border-border-subtle text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-brand-indigo text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      {t("buckets.accessKeyId")}
                    </label>
                    <input
                      type="text"
                      value={formData.accessKeyId}
                      onChange={(e) => setFormData((prev) => ({ ...prev, accessKeyId: e.target.value }))}
                      placeholder="AKIA..."
                      required
                      className="w-full px-3 py-2 rounded-lg bg-hover-bg border border-border-subtle text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-brand-indigo text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      {t("buckets.secretAccessKey")}
                    </label>
                    <input
                      type="password"
                      value={formData.secretAccessKey}
                      onChange={(e) => setFormData((prev) => ({ ...prev, secretAccessKey: e.target.value }))}
                      placeholder="••••••••"
                      required
                      className="w-full px-3 py-2 rounded-lg bg-hover-bg border border-border-subtle text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-brand-indigo text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                    <input
                      type="checkbox"
                      checked={formData.isPublic}
                      onChange={(e) => setFormData((prev) => ({ ...prev, isPublic: e.target.checked }))}
                      className="h-4 w-4"
                    />
                    {t("buckets.publicMode")}
                  </label>
                  {formData.isPublic && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={formData.publicUrl}
                        onChange={(e) => setFormData((prev) => ({ ...prev, publicUrl: e.target.value }))}
                        placeholder="https://pub-xxx.r2.dev"
                        required
                        className="w-full px-3 py-2 rounded-lg bg-hover-bg border border-border-subtle text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-brand-indigo text-sm"
                      />
                      <p className="mt-1.5 text-xs text-text-tertiary">
                        {t("buckets.publicUrlHint")}
                      </p>
                    </div>
                  )}
                </div>

                {testResult && (
                  <div
                    className={`p-3 rounded-lg flex items-center gap-2 ${
                      testResult.success
                        ? "bg-success-green/10 border border-success-green/20 text-success-green"
                        : "bg-destructive/10 border border-destructive/20 text-destructive"
                    }`}
                  >
                    {testResult.success ? (
                      <Check className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span className="text-sm">{testResult.message}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={testConnection}
                    disabled={formLoading}
                    className="flex-1 px-4 py-2 rounded-lg bg-hover-bg text-text-secondary font-medium hover:bg-surface-elevated transition-colors disabled:opacity-50 text-sm"
                  >
                    {formLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t("buckets.testing")}
                      </span>
                    ) : (
                      t("setup.testConnection")
                    )}
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading || !testResult?.success}
                    className="flex-1 px-4 py-2 rounded-lg bg-brand-indigo text-white font-medium hover:bg-accent-violet transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {t("buckets.saveBucket")}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
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
