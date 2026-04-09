"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Edit,
  Check,
  AlertCircle,
  Loader2,
  Server,
  Star,
  MoreVertical,
  ArrowLeft,
} from "lucide-react";

interface Bucket {
  id: string;
  name: string;
  endpoint: string;
  region: string;
  bucketName: string;
  publicUrl: string | null;
  isDefault: boolean;
}

interface BucketFormData {
  name: string;
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

const initialFormData: BucketFormData = {
  name: "",
  endpoint: "",
  region: "auto",
  accessKeyId: "",
  secretAccessKey: "",
  bucketName: "",
  publicUrl: "",
};

export default function BucketsPage() {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<BucketFormData>(initialFormData);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const fetchBuckets = async () => {
    try {
      const response = await fetch("/api/buckets");
      const data = await response.json();
      setBuckets(data.buckets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load buckets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuckets();
  }, []);

  const testConnection = async () => {
    setFormLoading(true);
    setTestResult(null);
    setError(null);

    try {
      const response = await fetch("/api/buckets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", config: formData }),
      });

      const data = await response.json();
      setTestResult({
        success: data.success,
        message: data.success ? "Connection successful!" : data.error || "Connection failed",
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Test failed",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/buckets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", config: formData }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchBuckets();
        setShowForm(false);
        setFormData(initialFormData);
        setTestResult(null);
      } else {
        setError(data.error || "Failed to create bucket");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create bucket");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this bucket configuration?")) return;

    try {
      const response = await fetch(`/api/buckets/${id}`, { method: "DELETE" });
      const data = await response.json();

      if (data.success) {
        await fetchBuckets();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete bucket");
    }
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
        await fetchBuckets();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set default bucket");
    }
    setOpenMenu(null);
  };

  return (
    <div className="min-h-screen bg-bg-marketing p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 rounded-lg hover:bg-hover-bg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-text-tertiary" />
            </Link>
            <div>
              <h1 className="text-2xl font-medium text-text-primary tracking-tight">Storage Buckets</h1>
              <p className="text-text-tertiary mt-1">Manage your S3-compatible storage configurations</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setFormData(initialFormData);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-indigo text-white font-medium hover:bg-accent-violet transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Bucket
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-brand-indigo" />
          </div>
        ) : buckets.length === 0 ? (
          <div className="text-center py-12 bg-bg-panel rounded-xl border border-border-standard">
            <Server className="w-12 h-12 text-text-quaternary mx-auto mb-4" />
            <p className="text-text-tertiary">No storage buckets configured yet</p>
            <p className="text-text-quaternary text-sm mt-1">Click "Add Bucket" to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {buckets.map((bucket) => (
              <div
                key={bucket.id}
                className="bg-bg-panel rounded-xl border border-border-standard p-4 hover:border-border-tertiary transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-hover-bg flex items-center justify-center">
                      <Server className="w-5 h-5 text-brand-indigo" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-text-primary font-medium">{bucket.name}</span>
                        {bucket.isDefault && (
                          <span className="px-2 py-0.5 rounded-full bg-brand-indigo text-white text-xs font-medium">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-tertiary">
                        {bucket.bucketName} • {bucket.endpoint.replace(/^https?:\/\//, "")}
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setOpenMenu(openMenu === bucket.id ? null : bucket.id)}
                      className="p-2 rounded-lg hover:bg-hover-bg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-text-tertiary" />
                    </button>

                    {openMenu === bucket.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-surface-elevated rounded-lg border border-border-standard shadow-lg z-10">
                        {!bucket.isDefault && (
                          <button
                            onClick={() => handleSetDefault(bucket.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-hover-bg transition-colors"
                          >
                            <Star className="w-4 h-4" />
                            Set as Default
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(bucket.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div className="fixed inset- bg-overlay-primary flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-lg bg-bg-panel rounded-xl border border-border-standard p-6">
              <h2 className="text-xl font-medium text-text-primary mb-6">Add Storage Bucket</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="My S3 Storage"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-hover-bg border border-border-standard text-text-primary placeholder-text-quaternary focus:outline-none focus:border-brand-indigo"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Endpoint
                    </label>
                    <input
                      type="text"
                      value={formData.endpoint}
                      onChange={(e) => setFormData((prev) => ({ ...prev, endpoint: e.target.value }))}
                      placeholder="https://s3.amazonaws.com"
                      required
                      className="w-full px-3 py-2 rounded-lg bg-hover-bg border border-border-standard text-text-primary placeholder-text-quaternary focus:outline-none focus:border-brand-indigo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Region
                    </label>
                    <input
                      type="text"
                      value={formData.region}
                      onChange={(e) => setFormData((prev) => ({ ...prev, region: e.target.value }))}
                      placeholder="auto"
                      className="w-full px-3 py-2 rounded-lg bg-hover-bg border border-border-standard text-text-primary placeholder-text-quaternary focus:outline-none focus:border-brand-indigo"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Bucket Name
                  </label>
                  <input
                    type="text"
                    value={formData.bucketName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, bucketName: e.target.value }))}
                    placeholder="my-bucket"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-hover-bg border border-border-standard text-text-primary placeholder-text-quaternary focus:outline-none focus:border-brand-indigo"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Access Key ID
                    </label>
                    <input
                      type="text"
                      value={formData.accessKeyId}
                      onChange={(e) => setFormData((prev) => ({ ...prev, accessKeyId: e.target.value }))}
                      placeholder="AKIA..."
                      required
                      className="w-full px-3 py-2 rounded-lg bg-hover-bg border border-border-standard text-text-primary placeholder-text-quaternary focus:outline-none focus:border-brand-indigo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Secret Access Key
                    </label>
                    <input
                      type="password"
                      value={formData.secretAccessKey}
                      onChange={(e) => setFormData((prev) => ({ ...prev, secretAccessKey: e.target.value }))}
                      placeholder="••••••••"
                      required
                      className="w-full px-3 py-2 rounded-lg bg-hover-bg border border-border-standard text-text-primary placeholder-text-quaternary focus:outline-none focus:border-brand-indigo"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Public URL (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.publicUrl}
                    onChange={(e) => setFormData((prev) => ({ ...prev, publicUrl: e.target.value }))}
                    placeholder="https://cdn.example.com"
                    className="w-full px-3 py-2 rounded-lg bg-hover-bg border border-border-standard text-text-primary placeholder-text-quaternary focus:outline-none focus:border-brand-indigo"
                  />
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
                      <Check className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span className="text-sm">{testResult.message}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={testConnection}
                    disabled={formLoading}
                    className="flex-1 px-4 py-2 rounded-lg bg-hover-bg text-text-secondary font-medium hover:bg-surface-elevated transition-colors disabled:opacity-50"
                  >
                    {formLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Testing...
                      </span>
                    ) : (
                      "Test Connection"
                    )}
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading || !testResult?.success}
                    className="flex-1 px-4 py-2 rounded-lg bg-brand-indigo text-white font-medium hover:bg-accent-violet transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Bucket
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData(initialFormData);
                    setTestResult(null);
                  }}
                  className="w-full px-4 py-2 rounded-lg text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  Cancel
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
