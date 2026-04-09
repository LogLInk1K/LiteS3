"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Server, Check, Loader2 } from "lucide-react";

interface Bucket {
  id: string;
  name: string;
  bucketName: string;
  isDefault: boolean;
}

interface BucketSelectorProps {
  currentBucketId?: string;
  onBucketChange?: (bucketId: string) => void;
}

export function BucketSelector({ currentBucketId, onBucketChange }: BucketSelectorProps) {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBuckets();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchBuckets = async () => {
    try {
      const response = await fetch("/api/buckets");
      const data = await response.json();
      setBuckets(data.buckets || []);
    } catch (err) {
      console.error("Failed to fetch buckets:", err);
    } finally {
      setLoading(false);
    }
  };

  const currentBucket = buckets.find((b) => b.id === currentBucketId) || 
    buckets.find((b) => b.isDefault) || 
    buckets[0];

  const handleSelect = (bucketId: string) => {
    setIsOpen(false);
    onBucketChange?.(bucketId);
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
      <a
        href="/buckets"
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-hover-bg text-text-tertiary hover:bg-surface-elevated transition-colors text-sm"
      >
        <Server className="w-4 h-4" />
        Add Bucket
      </a>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-hover-bg hover:bg-surface-elevated transition-colors text-sm"
      >
        <Server className="w-4 h-4 text-brand-indigo" />
        <span className="text-text-primary">{currentBucket?.name || "Select Bucket"}</span>
        <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-surface-elevated rounded-lg border border-border-standard shadow-lg z-50">
          <div className="py-1">
            {buckets.map((bucket) => (
              <button
                key={bucket.id}
                onClick={() => handleSelect(bucket.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-hover-bg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-text-tertiary" />
                  <span className="text-text-secondary">{bucket.name}</span>
                </div>
                {bucket.id === currentBucket?.id && (
                  <Check className="w-4 h-4 text-brand-indigo" />
                )}
              </button>
            ))}
          </div>
          <div className="border-t border-border-standard">
            <a
              href="/buckets"
              className="block px-3 py-2 text-sm text-text-tertiary hover:bg-hover-bg hover:text-text-secondary transition-colors"
            >
              Manage Buckets
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
