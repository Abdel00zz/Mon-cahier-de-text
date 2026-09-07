import { performance } from 'node:perf_hooks';
import { bundledCurricula, computeOfficialProgression } from '../utils/officialCurriculum';
import { detectChapterLifecycles } from '../utils/chapterLifecycle';
import type { AppConfig, ClassInfo, LessonsData } from '../types';

// Reproducible local CPU benchmark, no network, no user data, no generated files.
const count = 60;
const lessons: LessonsData = Array.from({ length: count }, (_, index) => ({
  type: 'chapter', title: `Cours ${index + 1}`, date: '2026-09-14',
  sections: Array.from({ length: 10 }, (_, section) => ({ name: `Section ${section + 1}`,
    items: Array.from({ length: 20 }, (_, item) => ({ type: item % 7 === 0 ? 'activité' : 'exercice', date: item < 10 ? '2026-09-14' : undefined })),
  })),
}));
const curriculum = { ...bundledCurricula.plans.find(plan => plan.id === '1ac-mouzoun')!,
  chapters: lessons.map((chapter, index) => ({ id: `c${index}`, title: chapter.title, order: index + 1, semester: 1 as const, allocatedHours: 4 })),
};
const classInfo: ClassInfo = { id: 'bench', name: '1AC 1', subject: 'Mathématiques', teacherName: '', color: '', createdAt: '2026-09-01',
  curriculumChapterMatches: Object.fromEntries(curriculum.chapters.map((chapter, index) => [chapter.id, [{ index, title: chapter.title }]])),
};
const config: AppConfig = { establishmentName: '', defaultTeacherName: '', printShowDescriptions: true, schoolYearStart: '2026-09-07',
  timetable: Array.from({ length: 48 }, (_, index) => ({ day: Math.floor(index / 8) + 1, slot: index % 8, classId: index % 3 === 0 ? 'bench' : `other-${index % 5}` })),
};
const options = { curriculum, config, today: '2026-10-01' };
const period = { start: '2026-09-07', end: '2027-06-30', today: options.today };
const measure = (run: () => void, samples: number) => {
  const values = Array.from({ length: samples }, () => { const start = performance.now(); run(); return performance.now() - start; }).sort((a, b) => a - b);
  return { medianMs: +values[Math.floor(samples / 2)].toFixed(3), p95Ms: +values[Math.floor(samples * 0.95)].toFixed(3) };
};
const coldSamples = Array.from({ length: 15 }, () => structuredClone(lessons));
const cold = measure(() => { computeOfficialProgression(classInfo, coldSamples.pop()!, options); }, 15);
computeOfficialProgression(classInfo, lessons, options);
const warm = measure(() => { computeOfficialProgression(classInfo, lessons, options); }, 100);
detectChapterLifecycles(lessons, period);
const lifecycleWarm = measure(() => { detectChapterLifecycles(lessons, period); }, 100);
console.log(JSON.stringify({ chapters: count, elements: count * 200, cold, warm, lifecycleWarm }, null, 2));
