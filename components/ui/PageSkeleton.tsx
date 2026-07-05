import React from 'react';

const SkeletonBlock: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-lg bg-[#EFE7DE] ${className}`} />
);

export const AppBootSkeleton: React.FC = () => (
  <div className="min-h-screen bg-[#FAF8F5] p-4 sm:p-8">
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <SkeletonBlock className="h-8 w-56" />
          <SkeletonBlock className="mt-3 h-4 w-72" />
        </div>
        <SkeletonBlock className="h-10 w-10 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-[#E8E2DA] bg-white p-4 shadow-sm">
            <SkeletonBlock className="ml-auto h-7 w-7 rounded-lg" />
            <div className="mt-3 flex items-center gap-2">
              <SkeletonBlock className="h-3 w-3 rounded-full" />
              <SkeletonBlock className="h-5 w-32" />
            </div>
            <SkeletonBlock className="mt-4 h-3 w-20" />
            <SkeletonBlock className="mt-8 h-px w-full" />
            <SkeletonBlock className="mt-3 h-3 w-36" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="min-h-screen bg-[#FAF8F5] p-2 pb-8 sm:p-8">
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 text-center">
        <SkeletonBlock className="mx-auto h-8 w-64" />
        <SkeletonBlock className="mx-auto mt-3 h-4 w-80 max-w-full" />
      </div>
      <SkeletonBlock className="mx-auto mb-6 h-10 w-64 rounded-xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-[#E8E2DA] bg-white p-4 shadow-sm">
            <SkeletonBlock className="ml-auto h-7 w-7 rounded-lg" />
            <div className="mt-3 flex items-center gap-2">
              <SkeletonBlock className="h-3 w-3 rounded-full" />
              <SkeletonBlock className="h-5 w-28" />
            </div>
            <SkeletonBlock className="mt-3 h-3 w-16" />
            <SkeletonBlock className="mt-8 h-px w-full" />
            <SkeletonBlock className="mt-3 h-3 w-32" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const EditorSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className="min-h-screen bg-slate-50 p-2 sm:p-5">
    <div className="container mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-7xl flex-col bg-white p-3 shadow-2xl sm:p-6">
      <div className="mb-6 flex items-center justify-center">
        <SkeletonBlock className="absolute left-4 h-10 w-10 rounded-xl" />
        <div className="text-center">
          <SkeletonBlock className="mx-auto h-4 w-48" />
          <SkeletonBlock className="mx-auto mt-3 h-7 w-64 max-w-full" />
        </div>
      </div>
      <SkeletonBlock className="mb-4 h-14 w-full rounded-xl" />
      <div className="overflow-hidden rounded-b-lg border border-slate-200">
        <div className="hidden border-b border-[#E8E2DA] bg-[#FAF8F5] md:flex">
          <SkeletonBlock className="m-3 h-4 w-[15%]" />
          <SkeletonBlock className="m-3 h-4 flex-1" />
          <SkeletonBlock className="m-3 h-4 w-[15%]" />
        </div>
        {Array.from({ length: 9 }).map((_, index) => (
          <div key={index} className="flex">
            <div className="w-[17%] border-r border-[#F0EBE4] px-2 py-2 sm:w-[15%]">
              <SkeletonBlock className="mx-auto h-10 w-12" />
            </div>
            <div className="flex-1 border-r border-[#F0EBE4] px-3 py-3">
              <SkeletonBlock className={`h-4 ${index % 3 === 0 ? 'w-2/3' : 'w-11/12'}`} />
              {index % 3 === 1 && <SkeletonBlock className="mt-2 h-8 w-4/5" />}
            </div>
            <div className="hidden w-[15%] p-2 md:block">
              <SkeletonBlock className="h-8 w-full" />
            </div>
          </div>
        ))}
      </div>
      {className && <span className="sr-only">{className}</span>}
    </div>
  </div>
);
