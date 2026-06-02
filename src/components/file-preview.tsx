"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useFileStore, FileItem } from "@/store/file-store";
import { isImageFile, isVideoFile, isAudioFile, isCodeFile, isMarkdownFile, isTextFile, getFileExtension } from "@/lib/utils";
import { Loader2, X, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import js from "react-syntax-highlighter/dist/esm/languages/hljs/javascript";
import ts from "react-syntax-highlighter/dist/esm/languages/hljs/typescript";
import jsx from "react-syntax-highlighter/dist/esm/languages/hljs/javascript";
import tsx from "react-syntax-highlighter/dist/esm/languages/hljs/typescript";
import py from "react-syntax-highlighter/dist/esm/languages/hljs/python";
import rb from "react-syntax-highlighter/dist/esm/languages/hljs/ruby";
import go from "react-syntax-highlighter/dist/esm/languages/hljs/go";
import rs from "react-syntax-highlighter/dist/esm/languages/hljs/rust";
import java from "react-syntax-highlighter/dist/esm/languages/hljs/java";
import c from "react-syntax-highlighter/dist/esm/languages/hljs/c-like";
import cpp from "react-syntax-highlighter/dist/esm/languages/hljs/cpp";
import cs from "react-syntax-highlighter/dist/esm/languages/hljs/csharp";
import php from "react-syntax-highlighter/dist/esm/languages/hljs/php";
import swift from "react-syntax-highlighter/dist/esm/languages/hljs/swift";
import kt from "react-syntax-highlighter/dist/esm/languages/hljs/kotlin";
import scala from "react-syntax-highlighter/dist/esm/languages/hljs/scala";
import sh from "react-syntax-highlighter/dist/esm/languages/hljs/bash";
import sql from "react-syntax-highlighter/dist/esm/languages/hljs/sql";
import html from "react-syntax-highlighter/dist/esm/languages/hljs/xml";
import css from "react-syntax-highlighter/dist/esm/languages/hljs/css";
import scss from "react-syntax-highlighter/dist/esm/languages/hljs/scss";
import jsonLang from "react-syntax-highlighter/dist/esm/languages/hljs/json";
import yaml from "react-syntax-highlighter/dist/esm/languages/hljs/yaml";
import toml from "react-syntax-highlighter/dist/esm/languages/hljs/ini";
import xml from "react-syntax-highlighter/dist/esm/languages/hljs/xml";
import md from "react-syntax-highlighter/dist/esm/languages/hljs/markdown";
import dockerfile from "react-syntax-highlighter/dist/esm/languages/hljs/dockerfile";
import diff from "react-syntax-highlighter/dist/esm/languages/hljs/diff";
import plaintext from "react-syntax-highlighter/dist/esm/languages/hljs/plaintext";
import { useTranslation } from "@/hooks/use-translation";

SyntaxHighlighter.registerLanguage("js", js);
SyntaxHighlighter.registerLanguage("javascript", js);
SyntaxHighlighter.registerLanguage("ts", ts);
SyntaxHighlighter.registerLanguage("typescript", ts);
SyntaxHighlighter.registerLanguage("jsx", jsx);
SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("py", py);
SyntaxHighlighter.registerLanguage("python", py);
SyntaxHighlighter.registerLanguage("rb", rb);
SyntaxHighlighter.registerLanguage("ruby", rb);
SyntaxHighlighter.registerLanguage("go", go);
SyntaxHighlighter.registerLanguage("rust", rs);
SyntaxHighlighter.registerLanguage("java", java);
SyntaxHighlighter.registerLanguage("c", c);
SyntaxHighlighter.registerLanguage("cpp", cpp);
SyntaxHighlighter.registerLanguage("h", c);
SyntaxHighlighter.registerLanguage("hpp", cpp);
SyntaxHighlighter.registerLanguage("cs", cs);
SyntaxHighlighter.registerLanguage("csharp", cs);
SyntaxHighlighter.registerLanguage("php", php);
SyntaxHighlighter.registerLanguage("swift", swift);
SyntaxHighlighter.registerLanguage("kt", kt);
SyntaxHighlighter.registerLanguage("kotlin", kt);
SyntaxHighlighter.registerLanguage("scala", scala);
SyntaxHighlighter.registerLanguage("sh", sh);
SyntaxHighlighter.registerLanguage("bash", sh);
SyntaxHighlighter.registerLanguage("sql", sql);
SyntaxHighlighter.registerLanguage("html", html);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("scss", scss);
SyntaxHighlighter.registerLanguage("less", css);
SyntaxHighlighter.registerLanguage("json", jsonLang);
SyntaxHighlighter.registerLanguage("yaml", yaml);
SyntaxHighlighter.registerLanguage("yml", yaml);
SyntaxHighlighter.registerLanguage("toml", toml);
SyntaxHighlighter.registerLanguage("ini", toml);
SyntaxHighlighter.registerLanguage("xml", xml);
SyntaxHighlighter.registerLanguage("md", md);
SyntaxHighlighter.registerLanguage("markdown", md);
SyntaxHighlighter.registerLanguage("dockerfile", dockerfile);
SyntaxHighlighter.registerLanguage("diff", diff);
SyntaxHighlighter.registerLanguage("plaintext", plaintext);
SyntaxHighlighter.registerLanguage("text", plaintext);

const EXT_TO_LANG: Record<string, string> = {
  js: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  c: "c",
  cpp: "cpp",
  h: "c",
  hpp: "cpp",
  cs: "csharp",
  php: "php",
  swift: "swift",
  kt: "kotlin",
  scala: "scala",
  sh: "bash",
  bash: "bash",
  sql: "sql",
  html: "html",
  css: "css",
  scss: "scss",
  less: "css",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  xml: "xml",
  md: "markdown",
  mdx: "markdown",
  dockerfile: "dockerfile",
  env: "bash",
  gitignore: "bash",
  makefile: "bash",
  csv: "plaintext",
  tsv: "plaintext",
  log: "plaintext",
  txt: "plaintext",
  cfg: "ini",
  conf: "ini",
};

async function getPresignedUrl(key: string, bucketId?: string | null): Promise<string | null> {
  const params = new URLSearchParams({ key });
  if (bucketId) params.set("bucketId", bucketId);
  const res = await fetch(`/api/files/link?${params.toString()}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.url || null;
}

async function getFileContent(key: string, bucketId?: string | null): Promise<string> {
  const params = new URLSearchParams({ key });
  if (bucketId) params.set("bucketId", bucketId);
  const res = await fetch(`/api/files/content?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch file content");
  return res.text();
}

export function FilePreview() {
  const { previewItem, setPreviewItem, currentBucketId } = useFileStore();
  const { t } = useTranslation();
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFile = previewItem?.type === "file";
  const fileItem = isFile ? (previewItem as FileItem) : null;
  const isImage = fileItem ? isImageFile(fileItem.name) : false;
  const isVideo = fileItem ? isVideoFile(fileItem.name) : false;

  useEffect(() => {
    if (!fileItem) return;

    const shouldFetchContent = isCodeFile(fileItem.name) || isMarkdownFile(fileItem.name) || isTextFile(fileItem.name);

    if (!shouldFetchContent) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    getFileContent(fileItem.key, currentBucketId)
      .then((text) => {
        if (cancelled) return;
        setContent(text);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load content");
        setLoading(false);
      });

    return () => {
      cancelled = true;
      setContent(null);
      setError(null);
    };
  }, [fileItem?.key, currentBucketId]);

  const handleClose = useCallback(() => {
    setPreviewItem(null);
  }, [setPreviewItem]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    
    if (previewItem) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [previewItem, handleClose]);

  if (!previewItem || !isFile || !fileItem) return null;

  const ext = getFileExtension(fileItem.name);

  if (isImage) {
    return (
      <ImageLightbox 
        fileKey={fileItem.key} 
        fileName={fileItem.name}
        bucketId={currentBucketId} 
        onClose={handleClose}
        onBackdropClick={handleBackdropClick}
      />
    );
  }

  if (isVideo) {
    return (
      <VideoLightbox 
        fileKey={fileItem.key} 
        fileName={fileItem.name}
        bucketId={currentBucketId} 
        onClose={handleClose}
        onBackdropClick={handleBackdropClick}
      />
    );
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-10 inline-flex items-center justify-center h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
        title={t("files.close")}
      >
        <X className="h-5 w-5" />
      </button>
      
      <div className="w-[900px] h-[650px] max-w-[95vw] max-h-[90vh] flex flex-col bg-bg-panel rounded-xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-text-primary font-medium truncate">
              {fileItem.name}
            </span>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : isAudioFile(fileItem.name) ? (
            <MediaPreview fileKey={fileItem.key} type="audio" bucketId={currentBucketId} />
          ) : isMarkdownFile(fileItem.name) && content ? (
            <div className="p-6 prose prose-sm dark:prose-invert prose-headings:text-text-primary prose-p:text-text-secondary prose-a:text-brand-indigo prose-strong:text-text-primary prose-code:text-text-primary prose-code:bg-surface-elevated prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-surface-elevated prose-pre:border prose-pre:border-border-subtle max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          ) : isCodeFile(fileItem.name) && content ? (
            <div className="p-4">
              <SyntaxHighlighter
                language={EXT_TO_LANG[ext] || ext || "plaintext"}
                style={atomOneDark}
                customStyle={{ 
                  borderRadius: "0.5rem", 
                  fontSize: "0.8125rem",
                  background: "var(--color-surface-elevated)",
                  padding: "1rem",
                  color: "var(--color-text-secondary)",
                }}
                lineNumberStyle={{ color: "var(--color-text-quaternary)", minWidth: "2.5em" }}
                showLineNumbers
              >
                {content}
              </SyntaxHighlighter>
            </div>
          ) : isTextFile(fileItem.name) && content ? (
            <div className="p-4">
              <pre className="p-4 rounded-lg bg-surface-elevated text-sm leading-relaxed whitespace-pre-wrap break-all font-mono text-text-secondary overflow-auto max-h-full">
                {content}
              </pre>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
              {t("files.previewNotSupported")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ImageLightbox({ 
  fileKey, 
  fileName,
  bucketId, 
  onClose,
  onBackdropClick
}: { 
  fileKey: string; 
  fileName: string;
  bucketId?: string | null; 
  onClose: () => void;
  onBackdropClick: (e: React.MouseEvent) => void;
}) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const positionRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const initialPinchDistanceRef = useRef<number>(0);
  const initialScaleRef = useRef<number>(1);

  useEffect(() => {
    setLoaded(false);
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    positionRef.current = { x: 0, y: 0 };
    getPresignedUrl(fileKey, bucketId).then((result) => {
      if (result) setUrl(result);
    });
  }, [fileKey, bucketId]);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.5, 5));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.5, 0.5));
  const handleRotate = () => setRotation(r => (r + 90) % 360);
  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    positionRef.current = { x: 0, y: 0 };
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setScale(s => Math.min(Math.max(s + delta, 0.5), 5));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      e.preventDefault();
      e.stopPropagation();
      isDraggingRef.current = true;
      setIsDragging(true);
      dragStartRef.current = { 
        x: e.clientX - positionRef.current.x, 
        y: e.clientY - positionRef.current.y 
      };
    }
  };

  const getPinchDistance = (touches: React.TouchList): number => {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      
      if (scale > 1) {
        isDraggingRef.current = true;
        setIsDragging(true);
        dragStartRef.current = { 
          x: touch.clientX - positionRef.current.x, 
          y: touch.clientY - positionRef.current.y 
        };
      }
    } else if (e.touches.length === 2) {
      e.preventDefault();
      isDraggingRef.current = false;
      setIsDragging(false);
      initialPinchDistanceRef.current = getPinchDistance(e.touches);
      initialScaleRef.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDraggingRef.current && scale > 1) {
      const touch = e.touches[0];
      const newX = touch.clientX - dragStartRef.current.x;
      const newY = touch.clientY - dragStartRef.current.y;
      
      positionRef.current = { x: newX, y: newY };
      
      if (imageRef.current) {
        imageRef.current.style.transform = `translate(${newX}px, ${newY}px) scale(${scale}) rotate(${rotation}deg)`;
      }
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const currentDistance = getPinchDistance(e.touches);
      const scaleDelta = currentDistance / initialPinchDistanceRef.current;
      const newScale = Math.min(Math.max(initialScaleRef.current * scaleDelta, 0.5), 5);
      setScale(newScale);
    }
  };

  const handleTouchEnd = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
      setPosition(positionRef.current);
    }
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      
      positionRef.current = { x: newX, y: newY };
      
      if (imageRef.current) {
        imageRef.current.style.transform = `translate(${newX}px, ${newY}px) scale(${scale}) rotate(${rotation}deg)`;
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
        setPosition(positionRef.current);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [scale, rotation]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center select-none touch-none"
      style={{ backgroundColor: 'rgba(8,9,10,0.92)' }}
      onClick={onBackdropClick}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 inline-flex items-center justify-center h-9 w-9 rounded-full transition-colors"
        style={{ 
          color: '#f7f8f8',
          backgroundColor: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
        title={`${t("files.close")} (Esc)`}
      >
        <X className="h-4 w-4" />
      </button>

      <div 
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg whitespace-nowrap"
        style={{ 
          backgroundColor: 'rgba(25,26,27,0.9)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: 'rgba(0,0,0,0) 0px 8px 2px, rgba(0,0,0,0.01) 0px 5px 2px, rgba(0,0,0,0.04) 0px 3px 2px, rgba(0,0,0,0.07) 0px 1px 1px, rgba(0,0,0,0.08) 0px 0px 1px'
        }}
      >
        <button
          onClick={handleZoomOut}
          className="inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors"
          style={{ color: '#f7f8f8' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title={t("files.zoomOut")}
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="text-sm min-w-10 sm:min-w-12 text-center" style={{ color: '#d0d6e0' }}>{Math.round(scale * 100)}%</span>
        <button
          onClick={handleZoomIn}
          className="inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors"
          style={{ color: '#f7f8f8' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title={t("files.zoomIn")}
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <div className="w-px h-4 mx-0.5 sm:mx-1" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <button
          onClick={handleRotate}
          className="inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors"
          style={{ color: '#f7f8f8' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title={t("files.rotate")}
        >
          <RotateCw className="h-4 w-4" />
        </button>
        <button
          onClick={handleReset}
          className="px-2 h-7 rounded-md text-sm transition-colors"
          style={{ color: '#d0d6e0' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title={t("files.reset")}
        >
          {t("files.reset")}
        </button>
      </div>

      <div 
        className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-lg"
        style={{ 
          backgroundColor: 'rgba(25,26,27,0.9)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <span className="text-sm truncate max-w-[200px] sm:max-w-[300px]" style={{ color: '#d0d6e0' }}>{fileName}</span>
      </div>

      {!loaded && (
        <Loader2 className="absolute h-8 w-8 animate-spin" style={{ color: 'rgba(255,255,255,0.3)' }} />
      )}
      
      {url && (
        <img
          ref={imageRef}
          src={url}
          alt={fileName}
          className="max-w-full max-h-full object-contain"
          style={{ 
            opacity: loaded ? 1 : 0,
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
            transition: isDragging ? 'none' : 'transform 0.2s ease, opacity 0.3s ease'
          }}
          onLoad={() => setLoaded(true)}
          onClick={(e) => e.stopPropagation()}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          draggable={false}
        />
      )}
    </div>
  );
}

function VideoLightbox({ 
  fileKey, 
  fileName,
  bucketId, 
  onClose,
  onBackdropClick
}: { 
  fileKey: string; 
  fileName: string;
  bucketId?: string | null; 
  onClose: () => void;
  onBackdropClick: (e: React.MouseEvent) => void;
}) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    getPresignedUrl(fileKey, bucketId).then((result) => {
      if (result) setUrl(result);
    });
  }, [fileKey, bucketId]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center select-none touch-none"
      style={{ backgroundColor: 'rgba(8,9,10,0.92)' }}
      onClick={onBackdropClick}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 inline-flex items-center justify-center h-9 w-9 rounded-full transition-colors"
        style={{ 
          color: '#f7f8f8',
          backgroundColor: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
        title={`${t("files.close")} (Esc)`}
      >
        <X className="h-4 w-4" />
      </button>

      <div 
        className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-lg"
        style={{ 
          backgroundColor: 'rgba(25,26,27,0.9)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <span className="text-sm truncate max-w-[200px] sm:max-w-[300px]" style={{ color: '#d0d6e0' }}>{fileName}</span>
      </div>

      {!loaded && (
        <Loader2 className="absolute h-8 w-8 animate-spin" style={{ color: 'rgba(255,255,255,0.3)' }} />
      )}
      
      {url && (
        <video
          src={url}
          controls
          className="max-w-[95vw] max-h-[90vh] rounded-lg"
          style={{ 
            opacity: loaded ? 1 : 0,
            backgroundColor: '#0f1011'
          }}
          onLoadedData={() => setLoaded(true)}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}

function MediaPreview({ fileKey, type, bucketId }: { fileKey: string; type: "audio"; bucketId?: string | null }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    getPresignedUrl(fileKey, bucketId).then((result) => {
      if (result) setUrl(result);
    }).catch(() => {});
  }, [fileKey, bucketId]);

  if (!url) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full p-6 bg-surface-base">
      <audio src={url} controls className="w-full max-w-lg" />
    </div>
  );
}
