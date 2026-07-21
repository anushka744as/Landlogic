import type { ReactNode } from 'react';
import { CountUp } from './CountUp';

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  icon,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 animate-fade-in-up">
      <div className="flex items-start gap-4">
        {icon && (
          <div className="hidden sm:grid h-12 w-12 rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 dark:bg-brand-900/40 dark:text-brand-300 dark:ring-brand-800 place-items-center shrink-0">
            {icon}
          </div>
        )}
        <div>
          {eyebrow && (
            <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-brand-600 dark:text-brand-400 mb-1">
              {eyebrow}
            </div>
          )}
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-ink-900 dark:text-white tracking-tight">
            {title}
          </h1>
          {subtitle && <p className="mt-2 text-ink-500 dark:text-ink-300 max-w-2xl leading-relaxed">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white dark:bg-ink-800 rounded-2xl border border-ink-100 dark:border-ink-700 shadow-card dark:shadow-card-dark ${className}`}
    >
      {children}
    </div>
  );
}

export type KpiTone = 'neutral' | 'brand' | 'green' | 'blue';

const KPI_GRADIENTS: Record<KpiTone, string> = {
  neutral:
    'bg-gradient-to-br from-white to-ink-50 dark:from-ink-800 dark:to-ink-850',
  brand:
    'bg-gradient-to-br from-brand-50 to-white dark:from-brand-900/40 dark:to-ink-800',
  green:
    'bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/35 dark:to-ink-800',
  blue:
    'bg-gradient-to-br from-sky-50 to-white dark:from-sky-900/35 dark:to-ink-800',
};

export function KpiTile({
  label,
  value,
  numericValue,
  format,
  sub,
  tone = 'neutral',
  delay = 0,
}: {
  label: string;
  value?: string;
  numericValue?: number;
  format?: (v: number) => string;
  sub?: string;
  tone?: KpiTone;
  delay?: number;
}) {
  const accentText =
    tone === 'brand' ? 'text-brand-700 dark:text-brand-300'
    : tone === 'green' ? 'text-emerald-700 dark:text-emerald-300'
    : tone === 'blue' ? 'text-sky-700 dark:text-sky-300'
    : 'text-ink-900 dark:text-white';

  return (
    <div
      className={`rounded-2xl border border-ink-100 dark:border-ink-700 p-4 shadow-card dark:shadow-card-dark animate-fade-in-up ${KPI_GRADIENTS[tone]}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-400">{label}</div>
      <div className={`mt-1 font-display font-extrabold text-2xl ${accentText}`}>
        {numericValue != null && format ? <CountUp value={numericValue} format={format} /> : value}
      </div>
      {sub && <div className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export function StatPill({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger';
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-ink-50 text-ink-700 ring-ink-100 dark:bg-ink-700/60 dark:text-ink-200 dark:ring-ink-600',
    brand: 'bg-brand-50 text-brand-700 ring-brand-100 dark:bg-brand-900/40 dark:text-brand-300 dark:ring-brand-800',
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800',
    warning: 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-800',
    danger: 'bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-900/40 dark:text-rose-300 dark:ring-rose-800',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tones[tone]}`}>
      {label && <span className="text-ink-400 dark:text-ink-400 font-medium">{label}</span>}
      <span>{value}</span>
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="grid place-items-center py-24 text-center">
      <div className="h-12 w-12 rounded-full bg-ink-100 dark:bg-ink-700 animate-pulse mb-3" />
      <p className="text-ink-400 dark:text-ink-400 font-medium">{message}</p>
    </div>
  );
}

/** A sortable column-header button with an asc/desc arrow indicator. */
export function SortHeader({
  label,
  active,
  direction,
  onClick,
  align = 'right',
}: {
  label: string;
  active: boolean;
  direction: 'asc' | 'desc';
  onClick: () => void;
  align?: 'left' | 'right';
}) {
  return (
    <th className={`px-5 py-3 font-semibold ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 group transition ${
          align === 'right' ? 'flex-row-reverse' : ''
        } ${active ? 'text-brand-600 dark:text-brand-300' : 'hover:text-ink-700 dark:hover:text-ink-200'}`}
      >
        <span>{label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-opacity ${active ? 'opacity-100' : 'opacity-30 group-hover:opacity-60'}`}
          aria-hidden="true"
        >
          {active && direction === 'asc' ? (
            <path d="M18 15l-6-6-6 6" />
          ) : active && direction === 'desc' ? (
            <path d="M6 9l6 6 6-6" />
          ) : (
            <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
          )}
        </svg>
      </button>
    </th>
  );
}
