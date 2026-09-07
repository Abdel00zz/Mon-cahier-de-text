import { DualProgressBar } from '@/components/ui/dual-progress-bar';
import type { computeOfficialProgression } from '@/utils/officialCurriculum';

type Row = ReturnType<typeof computeOfficialProgression>['rows'][number];

/** Business details stay in the engine; the teacher sees only a single two-tone bar. */
export function CurriculumChapterProgress({ row, label = '' }: { row: Row; label?: string }) {
  return <div data-curriculum-progress={row.officialChapter.id}>
    <DualProgressBar label={label}
      value={row.completionRate === null ? null : row.completionRate * 100}
      target={row.expectedRate === null ? null : row.expectedRate * 100} />
  </div>;
}
