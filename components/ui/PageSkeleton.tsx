import React from 'react';
import { Skeleton } from './skeleton';

export const AppBootSkeleton: React.FC = () => (
  <div className="min-h-screen bg-background p-4 sm:p-8">
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-full" />
          <div>
            <Skeleton className="h-6 w-44" />
            <Skeleton className="mt-2 h-3 w-56" />
          </div>
        </div>
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
      <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-[92px] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-[128px] rounded-2xl" />
        ))}
      </div>
    </div>
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="min-h-screen bg-background p-3 pb-8 sm:p-8">
    <div className="mx-auto max-w-5xl px-3 sm:px-4">
      <div className="mb-6 flex items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-full" />
          <div>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-2 h-3 w-52" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
      <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-[92px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="mb-3.5 h-6 w-32" />
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-[128px] rounded-2xl" />
        ))}
      </div>
    </div>
  </div>
);

export const EditorSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className="min-h-screen bg-background p-2 sm:p-5">
    <div className="container mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-7xl flex-col bg-card p-3 shadow-2xl sm:p-6">
      <div className="mb-6 flex items-center justify-center">
        <Skeleton className="absolute left-4 h-10 w-10 rounded-xl" />
        <div className="text-center">
          <Skeleton className="mx-auto h-4 w-48" />
          <Skeleton className="mx-auto mt-3 h-7 w-64 max-w-full" />
        </div>
      </div>
      <Skeleton className="mb-4 h-14 w-full rounded-xl" />
      <div className="overflow-hidden rounded-b-lg border border-border">
        <div className="hidden border-b border-border bg-background md:flex">
          <Skeleton className="m-3 h-4 w-[15%]" />
          <Skeleton className="m-3 h-4 flex-1" />
          <Skeleton className="m-3 h-4 w-[15%]" />
        </div>
        {Array.from({ length: 9 }).map((_, index) => (
          <div key={index} className="flex">
            <div className="w-[17%] border-r border-border px-2 py-2 sm:w-[15%]">
              <Skeleton className="mx-auto h-10 w-12" />
            </div>
            <div className="flex-1 border-r border-border px-3 py-3">
              <Skeleton className={`h-4 ${index % 3 === 0 ? 'w-2/3' : 'w-11/12'}`} />
              {index % 3 === 1 && <Skeleton className="mt-2 h-8 w-4/5" />}
            </div>
            <div className="hidden w-[15%] p-2 md:block">
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        ))}
      </div>
      {className && <span className="sr-only">{className}</span>}
    </div>
  </div>
);
