'use client';

import { DealStage, DEAL_STAGE_COLORS } from '@/lib/types';

export default function DealStageBadge({ stage }: { stage: DealStage }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${DEAL_STAGE_COLORS[stage] || DEAL_STAGE_COLORS.Prospecting}`}
    >
      {stage}
    </span>
  );
}
