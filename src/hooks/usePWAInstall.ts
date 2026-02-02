"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    setIsMounted(true);

    // Check if already installed (PWA standalone mode)
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Handler for beforeinstallprompt event
    const handler = (e: Event) => {
      // Prevent the native browser install prompt from showing
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;

    // Show the install dialog
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    // Clear after user makes a choice
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    dismissedRef.current = true;
    setDeferredPrompt(null);
  }, []);

  return {
    canInstall:
      isMounted && !!deferredPrompt && !isInstalled && !dismissedRef.current,
    install,
    dismiss,
    isInstalled: isInstalled && isMounted,
  };
}
