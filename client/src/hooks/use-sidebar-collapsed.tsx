import { useState, useEffect } from "react";

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";
const SIDEBAR_COLLAPSED_EVENT = "sidebar-collapsed-change";

/**
 * Custom hook to sync sidebar collapsed state across components
 *
 * Uses localStorage for persistence and custom events for cross-component sync.
 *
 * @returns [isCollapsed, setIsCollapsed] tuple
 */
/**
 * Safely parse JSON from localStorage with fallback
 */
function safeJsonParse(value: string | null, fallback: boolean): boolean {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    console.warn('Failed to parse sidebar state from localStorage, using default');
    return fallback;
  }
}

export function useSidebarCollapsed(): [boolean, (value: boolean) => void] {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return safeJsonParse(stored, false);
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      setIsCollapsed(safeJsonParse(stored, false));
    };

    // Listen for custom event when collapsed state changes
    window.addEventListener(SIDEBAR_COLLAPSED_EVENT, handleStorageChange);

    return () => {
      window.removeEventListener(SIDEBAR_COLLAPSED_EVENT, handleStorageChange);
    };
  }, []);

  const setCollapsed = (value: boolean) => {
    setIsCollapsed(value);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save sidebar state to localStorage:', error);
    }
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event(SIDEBAR_COLLAPSED_EVENT));
  };

  return [isCollapsed, setCollapsed];
}
