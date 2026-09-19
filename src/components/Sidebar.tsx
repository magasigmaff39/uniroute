import React, { useEffect, useRef } from 'react';
import { X, PanelLeftClose, PanelLeftOpen, type LucideIcon } from 'lucide-react';

interface SidebarProps {
  id: string;
  open: boolean;
  /** Desktop mode: sits under the header beside the content, no backdrop, no focus trap. */
  docked: boolean;
  onClose: () => void;
  label: string;
  closeLabel: string;
  /** Brand row shown on top of the overlay drawer (the header is covered by it). */
  brand?: React.ReactNode;
  /** Pinned above the menu (e.g. the «Пройти тест» call to action). */
  lead?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Left navigation panel: a docked column on desktop, a sliding drawer with a backdrop elsewhere. */
export const Sidebar: React.FC<SidebarProps> = ({ id, open, docked, onClose, label, closeLabel, brand, lead, footer, children }) => {
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  const overlay = !docked;

  // Overlay drawer: lock page scroll, close on Escape, keep Tab inside the panel, hand focus back on close.
  useEffect(() => {
    if (!open || !overlay) return;
    const panel = panelRef.current;
    const opener = document.activeElement as HTMLElement | null;
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = 'hidden';

    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const raf = requestAnimationFrame(() => {
      const target = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0];
      target?.focus({ preventScroll: true });
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      root.style.overflow = prevOverflow;
      // Only reclaim focus if it would otherwise be lost inside the now hidden panel.
      if (panel?.contains(document.activeElement)) opener?.focus({ preventScroll: true });
    };
  }, [open, overlay]);

  return (
    <>
      {overlay && (
        <div
          aria-hidden
          onClick={onClose}
          className={`fixed inset-0 z-[55] bg-slate-950/40 backdrop-blur-[2px] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        />
      )}

      <aside
        id={id}
        ref={panelRef}
        aria-label={label}
        role={overlay ? 'dialog' : undefined}
        aria-modal={overlay && open ? true : undefined}
        inert={!open}
        className={`ar-sidebar fixed left-0 flex flex-col transition-[translate,visibility,box-shadow] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          overlay
            ? 'inset-y-0 z-[60] w-[min(18.5rem,calc(100vw-3rem))] border-r border-[var(--line)] shadow-[var(--shadow-overlay)]'
            : 'top-16 bottom-0 z-30 w-[16.5rem] border-r border-[var(--line)]'
        } ${open ? 'translate-x-0 visible' : '-translate-x-full invisible shadow-none'}`}
      >
        {overlay && (
          <div className="h-16 shrink-0 flex items-center justify-between gap-3 pl-4 pr-3 border-b border-[var(--line)]">
            {brand}
            <button type="button" onClick={onClose} aria-label={closeLabel} data-autofocus className="ar-btn ar-btn-icon">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {lead && <div className="shrink-0 px-3 pt-3">{lead}</div>}

        <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-5 ar-sidebar-scroll">{children}</nav>

        {footer && <div className="shrink-0 border-t border-[var(--line)] p-3">{footer}</div>}
      </aside>
    </>
  );
};

/** A titled group of menu items; without a title it is separated from the group above by a line. */
export const SidebarSection: React.FC<{ title?: string; aside?: React.ReactNode; children: React.ReactNode }> = ({ title, aside, children }) => (
  <section className={title ? undefined : 'pt-4 border-t border-[var(--line)]'}>
    {title && (
      <div className="flex items-center justify-between gap-2 px-3 mb-1.5">
        <h2 className="font-sans text-xs font-medium tracking-normal text-slate-400 dark:text-zinc-500">{title}</h2>
        {aside}
      </div>
    )}
    <ul className="space-y-0.5">{children}</ul>
  </section>
);

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  onClick?: (e: React.MouseEvent) => void;
  href?: string;
  active?: boolean;
  disabled?: boolean;
  /** Replaces the icon (step number, check mark, lock). */
  badge?: React.ReactNode;
  trailing?: React.ReactNode;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, onClick, href, active, disabled, badge, trailing }) => {
  const base = 'group relative w-full flex items-center gap-3 h-10 px-3 rounded-lg text-sm text-left transition-colors duration-150';
  const state = disabled
    ? 'text-slate-400 dark:text-zinc-600 cursor-not-allowed'
    : active
      ? 'bg-blue-50 text-blue-700 font-semibold dark:bg-blue-500/15 dark:text-blue-200'
      : 'font-medium text-slate-600 hover:text-slate-950 hover:bg-slate-100 active:bg-slate-200/70 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800/70';
  const icon = active ? 'text-blue-600 dark:text-blue-300' : 'text-slate-400 group-hover:text-slate-600 dark:text-zinc-500 dark:group-hover:text-zinc-300';

  const content = (
    <>
      {active && <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-blue-600 dark:bg-blue-400" />}
      <span className={`w-5 h-5 shrink-0 flex items-center justify-center text-xs font-semibold tabular-nums transition-colors ${icon}`}>
        {badge ?? <Icon className="w-[18px] h-[18px]" />}
      </span>
      <span className="flex-1 min-w-0 truncate">{label}</span>
      {trailing}
    </>
  );

  return (
    <li>
      {href ? (
        <a href={href} onClick={onClick} className={`${base} ${state}`}>
          {content}
        </a>
      ) : (
        <button type="button" onClick={onClick} disabled={disabled} aria-current={active ? 'page' : undefined} className={`${base} ${state}`}>
          {content}
        </button>
      )}
    </li>
  );
};

/** Hamburger that morphs into a cross while the drawer is open; a docked panel gets a collapse/expand icon. */
export const MenuToggle: React.FC<{ open: boolean; onClick: () => void; controls: string; label: string; docked?: boolean; className?: string }> = ({ open, onClick, controls, label, docked, className = '' }) => (
  <button type="button" onClick={onClick} aria-expanded={open} aria-controls={controls} aria-label={label} title={label} className={`ar-btn ar-btn-icon text-slate-600 dark:text-zinc-300 ${className}`}>
    {docked ? (
      open ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />
    ) : (
      <span className="burger" data-open={open} aria-hidden>
        <span />
        <span />
        <span />
      </span>
    )}
  </button>
);
