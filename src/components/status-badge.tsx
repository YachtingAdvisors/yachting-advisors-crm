'use client';

import { LeadStatus } from '@/lib/types';

const STATUS_STYLES: Record<LeadStatus, string> = {
  New: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Qualified: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Converted: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export default function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[status] || STATUS_STYLES.New}`}
    >
      {status}
    </span>
  );
}
