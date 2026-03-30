'use client';

interface StatsBarProps {
  total: number;
  newCount: number;
  qualifiedCount: number;
  convertedCount: number;
  inactiveCount: number;
}

export default function StatsBar({ total, newCount, qualifiedCount, convertedCount, inactiveCount }: StatsBarProps) {
  const stats = [
    { label: 'Total Leads', value: total, color: 'text-[#1a1a2e]' },
    { label: 'New', value: newCount, color: 'text-blue-600' },
    { label: 'Qualified', value: qualifiedCount, color: 'text-amber-600' },
    { label: 'Converted', value: convertedCount, color: 'text-emerald-600' },
    { label: 'Inactive', value: inactiveCount, color: 'text-gray-400' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-white shadow-sm border border-gray-200 rounded-xl p-4"
        >
          <p className="text-xs text-gray-500 uppercase tracking-wider">{s.label}</p>
          <p className={`text-2xl font-semibold mt-1 ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}
