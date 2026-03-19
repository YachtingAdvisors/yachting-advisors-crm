'use client';

import { LeadSource } from '@/lib/types';

const SOURCE_STYLES: Record<LeadSource, string> = {
  Meta: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Instagram: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Website: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

export default function SourceBadge({ source }: { source: LeadSource }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${SOURCE_STYLES[source] || SOURCE_STYLES.Meta}`}
    >
      {source}
    </span>
  );
}
