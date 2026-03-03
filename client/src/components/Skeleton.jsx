// Reusable skeleton / loading placeholder components
// Usage: import { SkeletonStatCard, SkeletonTradeRow, SkeletonTableRows, SkeletonDetailCard, SkeletonSummaryCards, SkeletonChartBlock } from '../components/Skeleton';

function Pulse({ className = '' }) {
  return <div className={`animate-pulse bg-gray-800 rounded-lg ${className}`} />;
}

export function SkeletonStatCard() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <Pulse className="h-3 w-20 mb-3" />
      <Pulse className="h-8 w-16 mb-2" />
      <Pulse className="h-3 w-12" />
    </div>
  );
}

export function SkeletonTradeRow() {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
      <div className="flex items-center gap-2">
        <Pulse className="h-4 w-14" />
        <Pulse className="h-5 w-10 rounded-full" />
        <Pulse className="h-3 w-20 hidden sm:block" />
      </div>
      <div className="flex items-center gap-4">
        <Pulse className="h-4 w-12" />
        <div className="space-y-1.5 text-right">
          <Pulse className="h-4 w-10 ml-auto" />
          <Pulse className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTableRows({ cols = 9, rows = 8 }) {
  return Array.from({ length: rows }, (_, i) => (
    <tr key={i}>
      {Array.from({ length: cols }, (_, j) => (
        <td key={j} className="px-3 py-3">
          <Pulse className="h-4 w-full" />
        </td>
      ))}
    </tr>
  ));
}

export function SkeletonSummaryCards({ count = 4 }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <Pulse className="h-3 w-24 mb-3" />
      <Pulse className="h-8 w-20 mb-2" />
      <Pulse className="h-3 w-16" />
    </div>
  ));
}

export function SkeletonChartBlock({ className = '' }) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-5 ${className}`}>
      <Pulse className="h-3 w-32 mb-5" />
      <Pulse className="h-48 w-full" />
    </div>
  );
}

export function SkeletonDetailCard() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* header row */}
      <div className="flex items-center gap-3">
        <Pulse className="h-5 w-20" />
        <Pulse className="h-6 w-32" />
        <Pulse className="h-5 w-16 ml-auto" />
        <Pulse className="h-5 w-16" />
      </div>
      {/* main card */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <Pulse className="h-3 w-24 mb-4" />
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex gap-3">
                <Pulse className="h-4 w-32 shrink-0" />
                <Pulse className="h-4 w-28" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <Pulse className="h-3 w-24 mb-4" />
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex gap-3">
                <Pulse className="h-4 w-32 shrink-0" />
                <Pulse className="h-4 w-28" />
              </div>
            ))}
          </div>
        </div>
        <Pulse className="h-px w-full" />
        <div className="space-y-2">
          <Pulse className="h-3 w-16 mb-3" />
          <Pulse className="h-4 w-full" />
          <Pulse className="h-4 w-3/4" />
        </div>
      </div>
      {/* chart placeholder */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <Pulse className="h-40 w-full rounded-none" />
            <div className="p-3">
              <Pulse className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
