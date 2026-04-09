"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useFileStore, FileItem } from "@/store/file-store";
import { useFileLink } from "@/hooks/use-files";
import { isImageFile, isVideoFile, isAudioFile, isCodeFile, isMarkdownFile, isTextFile, getFileExtension } from "@/lib/utils";
import { Loader2, X, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

export function FilePreview() {
  const { previewItem, setPreviewItem, currentBucketId } = useFileStore();
  const linkMutation = useFileLink();
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isFile = previewItem?.type === "file";
  const fileItem = isFile ? (previewItem as FileItem) : null;
  const isImage = fileItem ? isImageFile(fileItem.name) : false;

  useEffect(() => {
    if (!fileItem) return;

    const shouldFetchContent = isCodeFile(fileItem.name) || isMarkdownFile(fileItem.name) || isTextFile(fileItem.name);

    if (shouldFetchContent) {
      setLoading(true);
      linkMutation.mutateAsync({ key: fileItem.key, bucketId: currentBucketId }).then((result) => {
        if (result.url) {
          fetch(result.url)
            .then((res) => res.text())
            .then((text) => {
              setContent(text);
              setLoading(false);
            })
            .catch(() => setLoading(false));
        }
      });
    }

    return () => {
      setContent(null);
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

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-10 inline-flex items-center justify-center h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
        title="关闭"
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
          ) : isVideoFile(fileItem.name) ? (
            <MediaPreview fileKey={fileItem.key} type="video" bucketId={currentBucketId} />
          ) : isAudioFile(fileItem.name) ? (
            <MediaPreview fileKey={fileItem.key} type="audio" bucketId={currentBucketId} />
          ) : isMarkdownFile(fileItem.name) && content ? (
            <div className="p-6 prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          ) : (isCodeFile(fileItem.name) || isTextFile(fileItem.name)) && content ? (
            <div className="p-4">
              <SyntaxHighlighter
                language={ext || "text"}
                style={atomOneDark}
                customStyle={{ 
                  borderRadius: "0.5rem", 
                  fontSize: "0.8125rem",
                  background: "var(--color-surface-base)",
                  padding: "1rem"
                }}
                showLineNumbers
              >
                {content}
              </SyntaxHighlighter>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
              此文件类型暂不支持预览
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
  const linkMutation = useFileLink();
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
  const lastTapRef = useRef<number>(0);
  const initialPinchDistanceRef = useRef<number>(0);
  const initialScaleRef = useRef<number>(1);

  useEffect(() => {
    setLoaded(false);
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    positionRef.current = { x: 0, y: 0 };
    linkMutation.mutateAsync({ key: fileKey, bucketId }).then((result) => {
      if (result.url) setUrl(result.url);
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

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      positionRef.current = { x: 0, y: 0 };
    } else {
      setScale(2);
    }
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
      
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        e.preventDefault();
        if (scale > 1) {
          setScale(1);
          setPosition({ x: 0, y: 0 });
          positionRef.current = { x: 0, y: 0 };
        } else {
          setScale(2);
        }
      }
      lastTapRef.current = now;
      
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
        title="关闭 (Esc)"
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
          title="缩小"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="text-sm min-w-[2.5rem] sm:min-w-[3rem] text-center" style={{ color: '#d0d6e0' }}>{Math.round(scale * 100)}%</span>
        <button
          onClick={handleZoomIn}
          className="inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors"
          style={{ color: '#f7f8f8' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title="放大"
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
          title="旋转"
        >
          <RotateCw className="h-4 w-4" />
        </button>
        <button
          onClick={handleReset}
          className="px-2 h-7 rounded-md text-sm transition-colors"
          style={{ color: '#d0d6e0' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title="重置"
        >
          重置
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
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
            transition: isDragging ? 'none' : 'transform 0.2s ease, opacity 0.3s ease'
          }}
          onLoad={() => setLoaded(true)}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={handleDoubleClick}
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

function MediaPreview({ fileKey, type, bucketId }: { fileKey: string; type: "video" | "audio"; bucketId?: string | null }) {
  const linkMutation = useFileLink();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    linkMutation.mutateAsync({ key: fileKey, bucketId }).then((result) => {
      if (result.url) setUrl(result.url);
    });
  }, [fileKey, bucketId]);

  if (!url) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  if (type === "video") {
    return (
      <div className="flex items-center justify-center h-full p-6 bg-surface-base">
        <video src={url} controls className="max-w-full max-h-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full p-6 bg-surface-base">
      <audio src={url} controls className="w-full max-w-lg" />
    </div>
  );
}
