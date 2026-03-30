'use client';

import { LeadSource } from '@/lib/types';

const SOURCE_STYLES: Record<LeadSource, string> = {
  Meta: 'bg-blue-50 text-blue-700 border-blue-200',
  Instagram: 'bg-purple-50 text-purple-700 border-purple-200',
  Website: 'bg-emerald-50 text-emerald-700 border-emerald-200',
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
