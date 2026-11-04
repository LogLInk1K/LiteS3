"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Server, Check, Loader2, Plus, Trash2, Star, Settings, X, AlertCircle, Pencil, ArrowLeft, AlertTriangle } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { useBuckets } from "@/hooks/use-files";
import { useQueryClient } from "@tanstack/react-query";
import { mapConnectionError } from "@/lib/utils";

interface Bucket {
  id: string;
  name: string;
  bucketName: string;
  endpoint: string;
  isDefault: boolean;
  publicUrl?: string | null;
}

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

interface BucketSelectorProps {
  currentBucketId?: string;
  onBucketChange?: (bucketId: string) => void;
}

export function BucketSelector({ currentBucketId, onBucketChange }: BucketSelectorProps) {
  const { t } = useTranslation();
  const { data: bucketsData, isLoading: loading } = useBuckets();
  const queryClient = useQueryClient();
  const buckets: Bucket[] = bucketsData?.buckets || [];
  const [isOpen, setIsOpen] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<BucketFormData>(initialFormData);
  const [formLoading, setFormLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const invalidateBuckets = async () => {
    await queryClient.invalidateQueries({ queryKey: ["buckets"] });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentBucket = buckets.find((b) => b.id === currentBucketId) || 
    buckets.find((b) => b.isDefault) || 
    buckets[0];

  const handleSelect = (bucketId: string) => {
    setIsOpen(false);
    onBucketChange?.(bucketId);
  };

  const handleSetDefault = async (id: string) => {
    try {
      const response = await fetch(`/api/buckets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-default" }),
      });
      const data = await response.json();
      if (data.success) {
        await invalidateBuckets();
      }
    } catch (err) {
      console.error("Failed to set default bucket:", err);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    if (!id) return;
    try {
      const response = await fetch(`/api/buckets/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (data.success) {
        if (id === currentBucketId) {
          const remaining = buckets.filter(b => b.id !== id);
          onBucketChange?.(remaining[0]?.id || "");
        }
        await invalidateBuckets();
      }
    } catch (err) {
      console.error("Failed to delete bucket:", err);
    }
  };

  const handleEdit = async (bucket: Bucket) => {
    try {
      const response = await fetch(`/api/buckets/${bucket.id}`);
      const data = await response.json();
      if (data.bucket) {
        setEditingId(bucket.id);
        setFormData({
          name: data.bucket.name || "",
          endpoint: data.bucket.endpoint || "",
          region: data.bucket.region || "auto",
          accessKeyId: "",
          secretAccessKey: "",
          bucketName: data.bucket.bucketName || "",
          publicUrl: data.bucket.publicUrl || "",
          isPublic: !!data.bucket.publicUrl,
        });
        setTestResult(null);
        setShowManager(false);
        setShowForm(true);
      }
    } catch (err) {
      console.error("Failed to fetch bucket details:", err);
    }
  };

  const testConnection = async () => {
    setFormLoading(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/buckets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          config: formData,
          bucketId: editingId || undefined,
        }),
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
      let response;
      if (editingId) {
        response = await fetch(`/api/buckets/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch("/api/buckets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create", config: payload }),
        });
      }

      const data = await response.json();

      if (data.success) {
        await invalidateBuckets();
        setShowForm(false);
        setEditingId(null);
        setFormData(initialFormData);
        setTestResult(null);
      } else {
        setTestResult({
          success: false,
          message: mapConnectionError(data.error, t),
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : t("buckets.saveFailed"),
      });
    } finally {
      setFormLoading(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(initialFormData);
    setTestResult(null);
  };

  const backToManager = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(initialFormData);
    setTestResult(null);
    setShowManager(true);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-hover-bg">
        <Loader2 className="w-4 h-4 animate-spin text-text-tertiary" />
      </div>
    );
  }

  if (buckets.length === 0) {
    return (
      <>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-hover-bg text-text-tertiary hover:bg-surface-elevated transition-colors text-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {t("buckets.addBucket")}
        </button>

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
                      placeholder="••••••••"
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
                        placeholder="https://files.example.com"
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
      </>
    );
  }

  return (
    <>
      <div ref={dropdownRef} className="relative min-w-0 max-w-full">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 h-9 min-w-0 max-w-full rounded-lg bg-hover-bg hover:bg-surface-elevated transition-colors text-sm"
        >
          <Server className="w-4 h-4 shrink-0 text-brand-indigo" />
          <span className="text-text-primary truncate max-sm:hidden">{currentBucket?.name || "Select Bucket"}</span>
          <ChevronDown className={`w-4 h-4 shrink-0 text-text-tertiary transition-transform ${isOpen ? "rotate-0" : "rotate-90"}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-surface-elevated rounded-lg border border-border-subtle shadow-lg z-50">
            <div className="p-1">
              {buckets.map((bucket) => (
                <button
                  key={bucket.id}
                  onClick={() => handleSelect(bucket.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-hover-bg rounded-md transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Server className="w-4 h-4 shrink-0 text-text-tertiary" />
                    <span className="text-text-secondary truncate min-w-0">{bucket.name}</span>
                    {bucket.publicUrl && (
                      <span className="px-1 py-0.5 rounded bg-brand-indigo/10 text-brand-indigo text-[10px] font-medium shrink-0">
                        {t("files.publicBadge")}
                      </span>
                    )}
                  </div>
                  {bucket.id === currentBucket?.id && (
                    <Check className="w-4 h-4 shrink-0 text-brand-indigo" />
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-border-subtle p-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowManager(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-tertiary hover:bg-hover-bg hover:text-text-secondary rounded-md transition-colors"
              >
                <Settings className="w-4 h-4" />
                {t("buckets.manageBuckets")}
              </button>
            </div>
          </div>
        )}
      </div>

      {showManager && createPortal(
        <div className="fixed inset-0 bg-overlay-primary backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowManager(false)}>
          <div className="w-full max-w-lg bg-bg-panel rounded-xl border border-border-subtle overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
              <h2 className="text-lg font-medium text-text-primary">{t("buckets.manageBuckets")}</h2>
              <button
                onClick={() => setShowManager(false)}
                className="p-1.5 rounded-lg hover:bg-hover-bg transition-colors"
              >
                <X className="w-5 h-5 text-text-tertiary" />
              </button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-auto">
              {buckets.length === 0 ? (
                <div className="text-center py-8">
                  <Server className="w-10 h-10 text-text-quaternary mx-auto mb-3" />
                  <p className="text-text-tertiary text-sm">{t("buckets.noBucketsConfigured")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {buckets.map((bucket) => (
                    <div
                      key={bucket.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-hover-bg hover:bg-surface-elevated transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Server className="w-5 h-5 text-brand-indigo shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-text-primary text-sm font-medium truncate">{bucket.name}</span>
                            {bucket.isDefault && (
                              <span className="px-1.5 py-0.5 rounded bg-brand-indigo text-white text-xs font-medium shrink-0">
                                {t("buckets.default")}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-tertiary truncate">{bucket.bucketName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleEdit(bucket)}
                          className="p-1.5 rounded hover:bg-hover-bg transition-colors"
                          title={t("buckets.edit")}
                        >
                          <Pencil className="w-4 h-4 text-text-tertiary hover:text-brand-indigo" />
                        </button>
                        {!bucket.isDefault && (
                          <button
                            onClick={() => handleSetDefault(bucket.id)}
                            className="p-1.5 rounded hover:bg-hover-bg transition-colors"
                            title={t("buckets.setAsDefault")}
                          >
                            <Star className="w-4 h-4 text-text-tertiary hover:text-brand-indigo" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(bucket.id)}
                          className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                          title={t("buckets.delete")}
                        >
                          <Trash2 className="w-4 h-4 text-text-tertiary hover:text-destructive" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-border-subtle">
              <button
                onClick={() => {
                  setShowManager(false);
                  setShowForm(true);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-indigo text-white font-medium hover:bg-accent-violet transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t("buckets.addBucket")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showForm && createPortal(
        <div className="fixed inset-0 bg-overlay-primary backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={closeForm}>
          <div className="w-full max-w-lg bg-bg-panel rounded-xl border border-border-subtle overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
              <div className="flex items-center gap-3">
                <button
                  onClick={backToManager}
                  className="p-1.5 rounded-lg hover:bg-hover-bg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-text-tertiary" />
                </button>
                <h2 className="text-lg font-medium text-text-primary">
                  {editingId ? t("buckets.editBucket") : t("buckets.addStorageBucket")}
                </h2>
              </div>
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
                    placeholder={editingId ? t("buckets.leaveEmptyToKeep") : "••••••••"}
                    required={!editingId}
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
                    placeholder={editingId ? t("buckets.leaveEmptyToKeep") : "••••••••"}
                    required={!editingId}
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
                      placeholder="https://files.example.com"
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

      {deleteConfirmId && createPortal(
        <div className="fixed inset-0 bg-overlay-primary backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setDeleteConfirmId(null)}>
          <div className="w-full max-w-sm bg-bg-panel rounded-xl border border-border-subtle p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <h2 className="text-base font-medium text-text-primary">{t("buckets.deleteBucket")}</h2>
            </div>
            <p className="text-sm text-text-tertiary mb-6">{t("buckets.deleteConfirm")}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-hover-bg text-text-secondary font-medium hover:bg-surface-elevated transition-colors"
              >
                {t("files.cancel")}
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 rounded-lg bg-destructive text-white font-medium hover:bg-destructive/90 transition-colors"
              >
                {t("buckets.delete")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
