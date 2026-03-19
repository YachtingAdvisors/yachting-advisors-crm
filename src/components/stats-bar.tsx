'use client';

interface StatsBarProps {
  total: number;
  newCount: number;
  qualifiedCount: number;
  convertedCount: number;
}

export default function StatsBar({ total, newCount, qualifiedCount, convertedCount }: StatsBarProps) {
  const stats = [
    { label: 'Total Leads', value: total, color: 'text-white' },
    { label: 'New', value: newCount, color: 'text-blue-400' },
    { label: 'Qualified', value: qualifiedCount, color: 'text-amber-400' },
    { label: 'Converted', value: convertedCount, color: 'text-emerald-400' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-[#141620] border border-gray-800 rounded-xl p-4"
        >
          <p className="text-xs text-gray-500 uppercase tracking-wider">{s.label}</p>
          <p className={`text-2xl font-semibold mt-1 ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}
