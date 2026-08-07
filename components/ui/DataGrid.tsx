import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown } from './icons';

export interface DataGridColumn<T> {
  key: keyof T | string;
  title: string;
  render?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface DataGridProps<T extends { id: string | number }> {
  data: T[];
  columns: DataGridColumn<T>[];
  variant?: 'table' | 'cards' | 'list';
  onSelect?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  cardRender?: (item: T, index: number) => React.ReactNode;
}

export function DataGrid<T extends { id: string | number }>({
  data,
  columns,
  variant = 'table',
  onSelect,
  loading = false,
  emptyMessage = 'Aucune donnée disponible',
  className,
  cardRender,
}: DataGridProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a: any, b: any) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortOrder]);

  if (loading) {
    return (
      <div className="flex animate-pulse flex-col gap-3 py-6">
        <div className="h-10 w-full rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-12 w-full rounded-xl bg-zinc-100 dark:bg-zinc-800/50" />
        <div className="h-12 w-full rounded-xl bg-zinc-100 dark:bg-zinc-800/50" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-xs font-medium text-zinc-400">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  // 1. Rendu mode Cards
  if (variant === 'cards') {
    return (
      <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
        {sortedData.map((item, idx) =>
          cardRender ? (
            <div key={item.id} onClick={() => onSelect?.(item)}>
              {cardRender(item, idx)}
            </div>
          ) : (
            <div
              key={item.id}
              onClick={() => onSelect?.(item)}
              className={cn(
                'card-press rounded-[20px] border border-zinc-200/80 bg-white p-4 shadow-ios-card transition-all dark:border-zinc-800 dark:bg-zinc-900',
                onSelect && 'cursor-pointer hover:shadow-ios-elevated'
              )}
            >
              {columns.map((col) => (
                <div key={String(col.key)} className="mb-2 text-xs">
                  <span className="font-semibold text-zinc-400">{col.title}: </span>
                  <span className="text-zinc-900 dark:text-zinc-100">
                    {col.render ? col.render(item, idx) : (item as any)[col.key]}
                  </span>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    );
  }

  // 2. Rendu mode List
  if (variant === 'list') {
    return (
      <div className={cn('divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900', className)}>
        {sortedData.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => onSelect?.(item)}
            className={cn(
              'flex items-center justify-between px-4 py-3 text-xs transition-colors',
              onSelect && 'cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800'
            )}
          >
            {columns.map((col) => (
              <div key={String(col.key)} className={cn('min-w-0 flex-1', col.className)}>
                {col.render ? col.render(item, idx) : (item as any)[col.key]}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // 3. Rendu mode Table
  return (
    <div className={cn('overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900', className)}>
      <table className="w-full text-left text-xs">
        <thead className="border-b border-zinc-100 bg-zinc-50/50 text-[11px] font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/40">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                onClick={() => col.sortable && handleSort(String(col.key))}
                className={cn(
                  'px-4 py-3',
                  col.sortable && 'cursor-pointer select-none hover:text-zinc-900 dark:hover:text-zinc-200',
                  col.className
                )}
              >
                <div className="flex items-center gap-1">
                  <span>{col.title}</span>
                  {col.sortable && sortKey === String(col.key) && (
                    <span>{sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}</span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {sortedData.map((item, idx) => (
            <tr
              key={item.id}
              onClick={() => onSelect?.(item)}
              className={cn(
                'transition-colors',
                onSelect && 'cursor-pointer hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50'
              )}
            >
              {columns.map((col) => (
                <td key={String(col.key)} className={cn('px-4 py-3.5', col.className)}>
                  {col.render ? col.render(item, idx) : (item as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
