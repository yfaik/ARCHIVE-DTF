import React from 'react';

export const Skeleton = ({ className = '', height = 'h-4', width = 'w-full', rounded = 'rounded-md' }) => {
  return (
    <div className={`skeleton ${height} ${width} ${rounded} ${className}`} />
  );
};

export const TableSkeleton = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="w-full space-y-3 p-5">
      {/* Header skeleton */}
      <div className="flex gap-4 items-center pb-3 border-b border-surface-200 dark:border-surface-700">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} height="h-3" className="flex-1" rounded="rounded" />
        ))}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 items-center py-1">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} height="h-5" className="flex-1" rounded="rounded" />
          ))}
        </div>
      ))}
    </div>
  );
};
