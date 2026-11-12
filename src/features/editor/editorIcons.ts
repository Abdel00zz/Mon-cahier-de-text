import { createIcon } from '@/components/ui/icons';

export const Undo2 = createIcon('EditorUndo', [['path', { d: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3' }]]);
export const Redo2 = createIcon('EditorRedo', [['path', { d: 'm15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3' }]]);
export const Search = createIcon('EditorSearch', [['circle', { cx: 11, cy: 11, r: 7 }], ['path', { d: 'm20 20-3.5-3.5' }]]);
export const X = createIcon('EditorClose', [['path', { d: 'M6 6l12 12M18 6 6 18' }]]);
export const MoreVertical = createIcon('EditorMore', [5, 12, 19].map(cy => ['circle', { cx: 12, cy, r: 1.7, fill: 'currentColor', stroke: 'none' }]));
export const GripVertical = createIcon('EditorGrip', [6, 12, 18].flatMap(cy =>
  [9, 15].map(cx => ['circle', { cx, cy, r: 1.5, fill: 'currentColor', stroke: 'none' }] as const)));
const calendarFrame = [
  ['rect', { x: 3.5, y: 5, width: 17, height: 15.5, rx: 3 }],
  ['path', { d: 'M8 3v4M16 3v4M3.5 10h17' }],
] as const;
export const CalendarDays = createIcon('EditorCalendar', calendarFrame);
export const CalendarCheck = createIcon('EditorToday', [...calendarFrame, ['path', { d: 'm9 15 2.2 2.2L15.5 13' }]]);
export const Remark = createIcon('EditorRemark', [['path', { d: 'M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12z' }]]);
export const CalendarX = createIcon('EditorClearDate', [...calendarFrame, ['path', { d: 'm10 13 4 4m0-4-4 4' }]]);
export const Plus = createIcon('EditorAdd', [['path', { d: 'M12 5v14M5 12h14' }]]);
export const Pencil = createIcon('EditorEdit', [['path', { d: 'm5 15 10-10a2.1 2.1 0 0 1 3 3L8 18l-4 1zM13 7l3 3' }]]);
export const Trash2 = createIcon('EditorDelete', [['path', { d: 'M4 7h16M9 7V4h6v3M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M10 10v7m4-7v7' }]]);
export const Database = createIcon('EditorData', [['ellipse', { cx: 12, cy: 6, rx: 8, ry: 3 }], ['path', { d: 'M4 6v12c0 4 16 4 16 0V6M4 12c0 4 16 4 16 0' }]]);
export const ListChecks = createIcon('EditorList', [['path', { d: 'm3 7 2 2 4-5m-6 12 2 2 4-5M12 7h8m-8 9h8' }]]);
export const PieChart = createIcon('EditorAnalysis', [['path', { d: 'M10 4a8 8 0 1 0 10 10H10zM14 3v7h7a8 8 0 0 0-7-7z' }]]);
export const Printer = createIcon('EditorPrint', [['path', { d: 'M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7zM16 11h1' }]]);
export const CircleHelp = createIcon('EditorHelp', [['circle', { cx: 12, cy: 12, r: 9 }], ['path', { d: 'M9.5 9a2.6 2.6 0 1 1 4 2.2c-1 .7-1.5 1.2-1.5 2.8m0 3h.01' }]]);
