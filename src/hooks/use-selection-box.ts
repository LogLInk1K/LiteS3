"use client";

import { useCallback, useRef, useState, useEffect } from "react";

interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface ItemRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface UseSelectionBoxOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  itemSelectors: string;
  onSelectionChange: (selectedKeys: Set<string>) => void;
  enabled?: boolean;
}

const EDGE_SIZE = 48;
const MAX_SCROLL_SPEED = 18;

export function useSelectionBox({
  containerRef,
  itemSelectors,
  onSelectionChange,
  enabled = true,
}: UseSelectionBoxOptions) {
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const isSelecting = useRef(false);
  // Drag coordinates live in the scroll container's content space (viewport
  // position plus scroll offset), because the box is absolutely positioned
  // inside that same scrolling element and must move along with the cards.
  const startPoint = useRef({ x: 0, y: 0 });
  const itemRects = useRef<Map<string, ItemRect>>(new Map());
  const pointer = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const rafRef = useRef<number | null>(null);
  // Captured before the box exists. An absolutely positioned box extending
  // past the content grows scrollHeight, which would feed back into auto-scroll.
  const contentBounds = useRef({ width: 0, height: 0 });

  const updateDrag = useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!isSelecting.current || !container) return;

      const rect = container.getBoundingClientRect();
      const rawX = clientX - rect.left + container.scrollLeft;
      const rawY = clientY - rect.top + container.scrollTop;
      const x = Math.min(Math.max(rawX, 0), contentBounds.current.width);
      const y = Math.min(Math.max(rawY, 0), contentBounds.current.height);

      if (Math.abs(x - startPoint.current.x) > 3 || Math.abs(y - startPoint.current.y) > 3) {
        hasMoved.current = true;
      }

      setSelectionBox({
        startX: startPoint.current.x,
        startY: startPoint.current.y,
        endX: x,
        endY: y,
      });

      const box = {
        left: Math.min(startPoint.current.x, x),
        right: Math.max(startPoint.current.x, x),
        top: Math.min(startPoint.current.y, y),
        bottom: Math.max(startPoint.current.y, y),
      };

      const newSelected = new Set<string>();
      itemRects.current.forEach((item, key) => {
        const overlaps = !(
          box.right < item.left ||
          box.left > item.right ||
          box.bottom < item.top ||
          box.top > item.bottom
        );
        if (overlaps) newSelected.add(key);
      });
      onSelectionChange(newSelected);
    },
    [containerRef, onSelectionChange],
  );

  const autoScroll = useCallback(() => {
    const container = containerRef.current;
    if (!isSelecting.current || !container) {
      rafRef.current = null;
      return;
    }

    const rect = container.getBoundingClientRect();
    const { x, y } = pointer.current;
    let delta = 0;
    if (y < rect.top + EDGE_SIZE) {
      delta = -MAX_SCROLL_SPEED * Math.min(1, (rect.top + EDGE_SIZE - y) / EDGE_SIZE);
    } else if (y > rect.bottom - EDGE_SIZE) {
      delta = MAX_SCROLL_SPEED * Math.min(1, (y - (rect.bottom - EDGE_SIZE)) / EDGE_SIZE);
    }

    if (delta !== 0) {
      const before = container.scrollTop;
      const maxScrollTop = Math.max(0, contentBounds.current.height - container.clientHeight);
      container.scrollTop = Math.min(Math.max(before + delta, 0), maxScrollTop);
      if (container.scrollTop !== before) {
        // Content-space pointer position changed even though the mouse did not.
        updateDrag(x, y);
      }
    }

    rafRef.current = requestAnimationFrame(autoScroll);
  }, [containerRef, updateDrag]);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!enabled || !containerRef.current) return;

      const target = e.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest("input") ||
        target.closest("a") ||
        target.closest("[data-key]")
      ) {
        return;
      }

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      contentBounds.current = {
        width: container.scrollWidth,
        height: container.scrollHeight,
      };
      const x = Math.min(Math.max(e.clientX - rect.left + container.scrollLeft, 0), contentBounds.current.width);
      const y = Math.min(Math.max(e.clientY - rect.top + container.scrollTop, 0), contentBounds.current.height);

      isSelecting.current = true;
      hasMoved.current = false;
      startPoint.current = { x, y };
      pointer.current = { x: e.clientX, y: e.clientY };
      itemRects.current.clear();

      // Store item bounds in content space; these stay valid while scrolling.
      container.querySelectorAll(itemSelectors).forEach((item) => {
        const key = (item as HTMLElement).dataset.key;
        if (!key) return;
        const r = item.getBoundingClientRect();
        itemRects.current.set(key, {
          left: r.left - rect.left + container.scrollLeft,
          right: r.right - rect.left + container.scrollLeft,
          top: r.top - rect.top + container.scrollTop,
          bottom: r.bottom - rect.top + container.scrollTop,
        });
      });

      setSelectionBox({ startX: x, startY: y, endX: x, endY: y });

      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(autoScroll);
      }
    },
    [enabled, containerRef, itemSelectors, autoScroll],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isSelecting.current) return;
      pointer.current = { x: e.clientX, y: e.clientY };
      updateDrag(e.clientX, e.clientY);
    },
    [updateDrag],
  );

  const handleMouseUp = useCallback(() => {
    if (isSelecting.current && !hasMoved.current) {
      onSelectionChange(new Set<string>());
    }
    isSelecting.current = false;
    hasMoved.current = false;
    setSelectionBox(null);
    itemRects.current.clear();
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, [onSelectionChange]);

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [enabled, handleMouseDown, handleMouseMove, handleMouseUp, containerRef]);

  return {
    selectionBox,
    isSelecting: isSelecting.current,
  };
}
