import React from 'react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'Aucune donnée enregistrée.',
  className,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="rounded-[16px] border border-[#e0e0e0] dark:border-[#5f6368] bg-white p-8 text-center text-sm text-[#5f6368] dark:text-[#9aa0a6] font-sans">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('w-full overflow-hidden rounded-[16px] border border-[#e0e0e0] dark:border-[#5f6368] bg-white shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] dark:shadow-[0_1px_3px_1px_rgba(255,255,255,0.15)] font-sans', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#e0e0e0] dark:border-[#5f6368] bg-[#f1f3f4] dark:bg-[#3c4043] text-[#202124] dark:text-[#e8eaed]">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-xs font-bold uppercase tracking-wider',
                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left',
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e0e0e0] dark:divide-[#5f6368]">
            {data.map((item, rowIdx) => {
              const isEven = rowIdx % 2 === 1;
              return (
                <tr
                  key={keyExtractor(item, rowIdx)}
                  className={cn(
                    'transition-colors hover:bg-slate-50 dark:bg-[#3c4043]',
                    isEven ? 'bg-slate-50 dark:bg-[#3c4043]' : 'bg-white'
                  )}
                >
                  {columns.map(col => {
                    const value = (item as any)[col.key];
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          'px-4 py-3 text-[#202124] dark:text-[#e8eaed]',
                          col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left',
                          col.className
                        )}
                      >
                        {col.render ? col.render(item, rowIdx) : value}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
