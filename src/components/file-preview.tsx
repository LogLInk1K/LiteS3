"use client";

import { useEffect, useState } from "react";
import { useFileStore, FileItem } from "@/store/file-store";
import { useFileLink } from "@/hooks/use-files";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { isImageFile, isVideoFile, isAudioFile, isCodeFile, isMarkdownFile, isTextFile, getFileExtension } from "@/lib/utils";
import { Loader2, Download } from "lucide-react";
import { Button } from "./ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

export function FilePreview() {
  const { previewItem, setPreviewItem } = useFileStore();
  const linkMutation = useFileLink();
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isFile = previewItem?.type === "file";
  const fileItem = isFile ? (previewItem as FileItem) : null;

  useEffect(() => {
    if (!fileItem) return;

    const shouldFetchContent = isCodeFile(fileItem.name) || isMarkdownFile(fileItem.name) || isTextFile(fileItem.name);

    if (shouldFetchContent) {
      setLoading(true);
      linkMutation.mutateAsync({ key: fileItem.key }).then((result) => {
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
  }, [fileItem?.key]);

  if (!previewItem || !isFile || !fileItem) return null;

  const ext = getFileExtension(fileItem.name);

  const handleDownload = async () => {
    const result = await linkMutation.mutateAsync({ key: fileItem.key });
    if (result.url) {
      window.open(result.url, "_blank");
    }
  };

  return (
    <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
      <DialogContent className="w-[800px] h-[600px] max-w-[90vw] max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="truncate">{fileItem.name}</span>
            <Button variant="ghost" size="icon" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 mt-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isImageFile(fileItem.name) ? (
            <ImagePreview fileKey={fileItem.key} />
          ) : isVideoFile(fileItem.name) ? (
            <MediaPreview fileKey={fileItem.key} type="video" />
          ) : isAudioFile(fileItem.name) ? (
            <MediaPreview fileKey={fileItem.key} type="audio" />
          ) : isMarkdownFile(fileItem.name) && content ? (
            <div className="h-full overflow-auto prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          ) : (isCodeFile(fileItem.name) || isTextFile(fileItem.name)) && content ? (
            <div className="h-full overflow-auto">
              <SyntaxHighlighter
                language={ext || "text"}
                style={atomOneDark}
                customStyle={{ borderRadius: "0.5rem", fontSize: "0.875rem" }}
                showLineNumbers
              >
                {content}
              </SyntaxHighlighter>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              此文件类型暂不支持预览
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ImagePreview({ fileKey }: { fileKey: string }) {
  const linkMutation = useFileLink();
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    linkMutation.mutateAsync({ key: fileKey }).then((result) => {
      if (result.url) setUrl(result.url);
    });
  }, [fileKey]);

  return (
    <div className="flex items-center justify-center h-full relative">
      {!loaded && (
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      )}
      {url && (
        <img
          src={url}
          alt={fileKey}
          className="max-w-full max-h-full object-contain rounded-lg transition-opacity duration-300"
          style={{ opacity: loaded ? 1 : 0 }}
          onLoad={() => setLoaded(true)}
        />
      )}
    </div>
  );
}

function MediaPreview({ fileKey, type }: { fileKey: string; type: "video" | "audio" }) {
  const linkMutation = useFileLink();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    linkMutation.mutateAsync({ key: fileKey }).then((result) => {
      if (result.url) setUrl(result.url);
    });
  }, [fileKey]);

  if (!url) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (type === "video") {
    return (
      <div className="flex items-center justify-center h-full">
        <video src={url} controls className="max-w-full max-h-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <audio src={url} controls className="w-full max-w-lg" />
    </div>
  );
}
