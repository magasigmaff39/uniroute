import { useCallback, useEffect, useState } from 'react';

const DESKTOP_QUERY = '(min-width: 1024px)';
const STORAGE_KEY = 'admitroute_sidebar';

function matchesDesktop(): boolean {
  try {
    return window.matchMedia(DESKTOP_QUERY).matches;
  } catch {
    return false;
  }
}

function readDockedPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'closed';
  } catch {
    return true;
  }
}

export interface SidebarState {
  /** Whether the panel is currently shown. */
  open: boolean;
  /** Desktop mode: the panel sits beside the content instead of covering it. */
  docked: boolean;
  toggle: () => void;
  /** Closes the overlay drawer; a docked panel stays where the user put it. */
  dismiss: () => void;
}

/**
 * Navigation panel state. On wide screens a `dockable` panel docks beside the content and remembers
 * whether the user collapsed it; on narrow screens (and for guests) it is an overlay that starts closed.
 */
export function useSidebar(dockable: boolean): SidebarState {
  const [isDesktop, setIsDesktop] = useState(matchesDesktop);
  const [dockedOpen, setDockedOpen] = useState(readDockedPreference);
  const [overlayOpen, setOverlayOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => {
      setIsDesktop(mq.matches);
      setOverlayOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, dockedOpen ? 'open' : 'closed');
    } catch {
      /* ignore */
    }
  }, [dockedOpen]);

  const docked = dockable && isDesktop;

  const toggle = useCallback(() => {
    if (docked) setDockedOpen((v) => !v);
    else setOverlayOpen((v) => !v);
  }, [docked]);

  const dismiss = useCallback(() => setOverlayOpen(false), []);

  return { open: docked ? dockedOpen : overlayOpen, docked, toggle, dismiss };
}
