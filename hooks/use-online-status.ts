"use client";

import { useState, useEffect, useRef } from "react";

interface UseOnlineStatusReturn {
  isOnline: boolean;
  wasOffline: boolean; // True if we just transitioned from offline to online
}

/**
 * Custom hook to detect online/offline status
 * Uses browser's native navigator.onLine API and event listeners
 * Lightweight and non-blocking - no polling or performance impact
 */
export function useOnlineStatus(): UseOnlineStatusReturn {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    // Safe check for SSR
    if (typeof window === "undefined") {
      return true; // Default to online on server
    }
    return navigator.onLine;
  });

  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const previousStatusRef = useRef<boolean>(isOnline);

  useEffect(() => {
    // Skip if not in browser environment
    if (typeof window === "undefined") {
      return;
    }

    const handleOnline = () => {
      const wasOfflineBefore = !previousStatusRef.current;
      setIsOnline(true);
      setWasOffline(wasOfflineBefore);
      
      // Reset wasOffline after a short delay
      if (wasOfflineBefore) {
        setTimeout(() => setWasOffline(false), 100);
      }
      
      previousStatusRef.current = true;
    };

    const handleOffline = () => {
      setIsOnline(false);
      previousStatusRef.current = false;
    };

    // Set initial state
    previousStatusRef.current = navigator.onLine;
    setIsOnline(navigator.onLine);

    // Add event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline, wasOffline };
}

