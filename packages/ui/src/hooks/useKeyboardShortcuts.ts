"use client";

import { useEffect } from "react";

export interface KeyboardShortcutHandlers {
  onOpenCommandPalette?: () => void;
  onFocusSearch?: () => void;
  onClosePanel?: () => void;
  onSwitchToTransaction?: () => void;
  onSwitchToAccount?: () => void;
  onOpenHistory?: () => void;
  onOpenAddressBook?: () => void;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputElement = (target: Element) => {
        const tagName = target.tagName.toLowerCase();
        const isInput =
          tagName === "input" ||
          tagName === "textarea" ||
          target.hasAttribute("contenteditable");
        const isContentEditable =
          target.getAttribute("contenteditable") === "true";
        return isInput || isContentEditable;
      };

      const target = e.target as Element;
      const isFocusedInInput = isInputElement(target);

      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (
        (modKey && e.key.toLowerCase() === "k") ||
        (modKey && e.key === "K")
      ) {
        if (!isFocusedInInput) {
          e.preventDefault();
          handlers.onOpenCommandPalette?.();
        }
      } else if (e.key === "/" && !isFocusedInInput) {
        e.preventDefault();
        handlers.onFocusSearch?.();
      } else if (e.key === "Escape" && !isFocusedInInput) {
        e.preventDefault();
        handlers.onClosePanel?.();
      } else if (
        (modKey && e.key === "1") ||
        (modKey && e.key === "!")
      ) {
        if (!isFocusedInInput) {
          e.preventDefault();
          handlers.onSwitchToTransaction?.();
        }
      } else if (
        (modKey && e.key === "2") ||
        (modKey && e.key === "@")
      ) {
        if (!isFocusedInInput) {
          e.preventDefault();
          handlers.onSwitchToAccount?.();
        }
      } else if (
        (modKey && e.key.toLowerCase() === "h") ||
        (modKey && e.key === "H")
      ) {
        if (!isFocusedInInput) {
          e.preventDefault();
          handlers.onOpenHistory?.();
        }
      } else if (
        (modKey && e.key.toLowerCase() === "b") ||
        (modKey && e.key === "B")
      ) {
        if (!isFocusedInInput) {
          e.preventDefault();
          handlers.onOpenAddressBook?.();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handlers]);
}
