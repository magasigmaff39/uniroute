import React from 'react';
import { ExternalLink } from 'lucide-react';

/**
 * Small, dependency-free Markdown renderer for AI answers: headings, paragraphs, bullet and numbered
 * lists, bold/italic/inline code, links [Title](url), bare URLs and simple pipe tables.
 * Everything is rendered as React nodes — no innerHTML, so model output can never inject markup.
 */

const INLINE_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(\*\*[^*]+\*\*)|(`[^`]+`)|(?<![\w*])(\*[^*\n]+\*)(?![\w*])|(https?:\/\/[^\s<>)]+)/g;

export function renderInline(text: string, keyPrefix = ''): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(INLINE_RE.source, 'g');
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyPrefix}${m.index}`;
    if (m[1] && m[2]) {
      out.push(
        <a key={key} href={m[2]} target="_blank" rel="noreferrer" className="text-blue-700 dark:text-blue-300 font-semibold underline underline-offset-2 decoration-blue-300 dark:decoration-blue-500/50 hover:text-blue-800 dark:hover:text-blue-200 inline-flex items-center gap-0.5 break-words">
          {m[1]}
          <ExternalLink className="w-2.5 h-2.5 inline shrink-0" />
        </a>,
      );
    } else if (m[3]) {
      out.push(<strong key={key} className="font-semibold text-slate-900 dark:text-white">{m[3].slice(2, -2)}</strong>);
    } else if (m[4]) {
      out.push(<code key={key} className="px-1 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-[0.92em] font-mono text-slate-800 dark:text-zinc-200">{m[4].slice(1, -1)}</code>);
    } else if (m[5]) {
      out.push(<em key={key}>{m[5].slice(1, -1)}</em>);
    } else if (m[6]) {
      const url = m[6].replace(/[.,;:]+$/, '');
      out.push(
        <a key={key} href={url} target="_blank" rel="noreferrer" className="text-blue-700 dark:text-blue-300 underline underline-offset-2 hover:text-blue-800 dark:hover:text-blue-200 break-all">
          {url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
        </a>,
      );
      if (url.length !== m[6].length) out.push(m[6].slice(url.length));
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block =
  | { type: 'p'; text: string }
  | { type: 'h'; level: number; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'table'; header: string[]; rows: string[][] }
  | { type: 'quote'; text: string }
  | { type: 'hr' };

function parseBlocks(md: string): Block[] {
  const lines = md.replace(/\r/g, '').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (h) {
      blocks.push({ type: 'h', level: h[1].length, text: h[2] });
      i++;
      continue;
    }
    if (trimmed.startsWith('|') && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1].trim())) {
      const header = splitRow(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(splitRow(lines[i].trim()));
        i++;
      }
      blocks.push({ type: 'table', header, rows });
      continue;
    }
    if (/^([-*•])\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*•])\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*•])\s+/, ''));
        i++;
        // continuation lines (indented) belong to the previous item
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) {
          items[items.length - 1] += ' ' + lines[i].trim();
          i++;
        }
      }
      blocks.push({ type: 'ul', items });
      continue;
    }
    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ''));
        i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) {
          items[items.length - 1] += ' ' + lines[i].trim();
          i++;
        }
      }
      blocks.push({ type: 'ol', items });
      continue;
    }
    if (trimmed.startsWith('>')) {
      const parts: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        parts.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'quote', text: parts.join(' ') });
      continue;
    }
    // paragraph: merge consecutive plain lines
    const parts: string[] = [trimmed];
    i++;
    while (i < lines.length) {
      const t = lines[i].trim();
      if (!t || /^(#{1,4})\s/.test(t) || /^([-*•]|\d+[.)])\s+/.test(t) || t.startsWith('|') || t.startsWith('>') || /^(-{3,}|\*{3,})$/.test(t)) break;
      parts.push(t);
      i++;
    }
    blocks.push({ type: 'p', text: parts.join(' ') });
  }
  return blocks;
}

function splitRow(row: string): string[] {
  return row.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

interface MarkdownProps {
  text: string;
  className?: string;
  /** compact = chat bubble sizing */
  compact?: boolean;
}

export const Markdown: React.FC<MarkdownProps> = ({ text, className = '', compact = false }) => {
  if (!text) return null;
  const blocks = parseBlocks(text);
  const gap = compact ? 'space-y-1.5' : 'space-y-2.5';
  return (
    <div className={`${gap} ${className}`}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'h': {
            const cls = b.level <= 2 ? (compact ? 'text-[13px]' : 'text-base') : compact ? 'text-xs' : 'text-sm';
            return (
              <div key={i} className={`font-semibold text-slate-900 dark:text-white ${cls} ${i > 0 ? 'pt-1' : ''}`}>
                {renderInline(b.text, `h${i}-`)}
              </div>
            );
          }
          case 'ul':
            return (
              <ul key={i} className="list-disc pl-4 space-y-1 text-slate-700 dark:text-zinc-300 marker:text-slate-400 dark:marker:text-zinc-500">
                {b.items.map((it, j) => (
                  <li key={j}>{renderInline(it, `u${i}-${j}-`)}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={i} className="list-decimal pl-4 space-y-1 text-slate-700 dark:text-zinc-300 marker:text-slate-500 dark:marker:text-zinc-400 marker:font-semibold">
                {b.items.map((it, j) => (
                  <li key={j}>{renderInline(it, `o${i}-${j}-`)}</li>
                ))}
              </ol>
            );
          case 'table':
            return (
              <div key={i} className="overflow-x-auto rounded-xl border border-[var(--line)]">
                <table className="min-w-full text-left border-collapse text-xs">
                  <thead>
                    <tr>
                      {b.header.map((h, j) => (
                        <th key={j} className="px-2.5 py-2 border-b border-[var(--line)] font-semibold text-slate-700 dark:text-zinc-200 bg-slate-50 dark:bg-zinc-800/40 whitespace-nowrap">
                          {renderInline(h, `th${i}-${j}-`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, ri) => (
                      <tr key={ri} className="even:bg-slate-50/60 dark:even:bg-zinc-800/30 [&:last-child>td]:border-b-0">
                        {r.map((c, ci) => (
                          <td key={ci} className="px-2.5 py-2 border-b border-slate-100 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 align-top">
                            {renderInline(c, `td${i}-${ri}-${ci}-`)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'quote':
            return (
              <blockquote key={i} className="border-l-2 border-blue-300 dark:border-blue-500/50 pl-3 text-slate-600 dark:text-zinc-400 italic">
                {renderInline(b.text, `q${i}-`)}
              </blockquote>
            );
          case 'hr':
            return <hr key={i} className="border-[var(--line)]" />;
          default:
            return (
              <p key={i} className="text-slate-800 dark:text-zinc-200 leading-relaxed">
                {renderInline(b.text, `p${i}-`)}
              </p>
            );
        }
      })}
    </div>
  );
};
