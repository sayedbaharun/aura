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
export function useSidebarCollapsed(): [boolean, (value: boolean) => void] {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return stored ? JSON.parse(stored) : false;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      setIsCollapsed(stored ? JSON.parse(stored) : false);
    };

    // Listen for custom event when collapsed state changes
    window.addEventListener(SIDEBAR_COLLAPSED_EVENT, handleStorageChange);

    return () => {
      window.removeEventListener(SIDEBAR_COLLAPSED_EVENT, handleStorageChange);
    };
  }, []);

  const setCollapsed = (value: boolean) => {
    setIsCollapsed(value);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(value));
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event(SIDEBAR_COLLAPSED_EVENT));
  };

  return [isCollapsed, setCollapsed];
}
