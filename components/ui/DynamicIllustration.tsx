import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import './dynamic-illustrations.css';

interface IllustrationProps { className?: string; size?: number; }

/** Original educational scenes: layered study cards and pinned notes.
 * Text remains in the UI, so the artwork works in French and Arabic alike. */
function IllustrationFrame({ children, className, size = 140 }: IllustrationProps & { children: ReactNode }) {
  return <div aria-hidden="true" className={cn('dynamic-illustration', className)}
    style={{ '--illustration-size': `${size}px` } as CSSProperties}>
    <svg viewBox="0 0 160 160" fill="none" focusable="false" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="81" cy="137" rx="54" ry="4" className="illustration-shadow" />
      {children}
    </svg>
  </div>;
}

/** Write a first lesson: an open notebook, a note and a pencil. */
export function NotebookOpeningIllustration(props: IllustrationProps) {
  return <IllustrationFrame {...props}>
    <g transform="rotate(-8 46 46)">
      <rect x="21" y="22" width="49" height="49" rx="9" className="illustration-note illustration-outline" />
      <path d="M33 36H54M33 44H49" className="illustration-writing" />
    </g>
    <path d="M23 62Q49 54 79 64Q110 54 139 62V127Q109 120 79 130Q49 120 23 127Z" className="illustration-learning illustration-outline" />
    <path d="M28 57Q53 51 79 61Q106 51 134 57V119Q107 113 79 123Q53 113 28 119Z" className="illustration-paper illustration-outline" />
    <path d="M79 61V123M39 74L64 75M39 85L63 86M39 96L58 97M93 73L121 72M93 84L120 83M93 95L111 94" className="illustration-writing" />
    <path d="M88 58V83L94 78L100 81V55" className="illustration-note" />
    <g className="illustration-float">
      <path d="M118 25L128 31L102 83L92 77Z" className="illustration-learning illustration-outline" />
      <path d="M92 77L91 91L102 83Z" className="illustration-paper illustration-outline" />
      <path d="M91 91L94 85" className="illustration-ink" strokeWidth="3" />
      <path d="M118 25L121 20Q124 17 127 20L131 23Q134 25 131 29L128 31" className="illustration-note illustration-outline" />
    </g>
  </IllustrationFrame>;
}

/** Completed work: a checked note, used only for an actual clear state. */
export function SereneStudyIllustration(props: IllustrationProps) {
  return <IllustrationFrame {...props}>
    <rect x="28" y="33" width="87" height="97" rx="12" transform="rotate(-7 72 82)" className="illustration-learning illustration-outline" />
    <rect x="38" y="26" width="83" height="101" rx="12" className="illustration-note illustration-outline" />
    <path d="M73 20V35M67 21H79" className="illustration-ink" strokeWidth="3" />
    <path d="M53 51L56 54L62 47M53 72L56 75L62 68M53 93L56 96L62 89" className="illustration-success-stroke illustration-draw" strokeWidth="2.8" />
    <path d="M71 51H103M71 72H99M71 93H88" className="illustration-writing" />
    <g className="illustration-pop">
      <circle cx="119" cy="111" r="23" className="illustration-mint illustration-outline" />
      <path d="M108 111L116 119L131 103" className="illustration-success-stroke" strokeWidth="4" />
    </g>
  </IllustrationFrame>;
}

/** Class creation: a group card and two pupils, never a success badge. */
export function ClassroomWelcomeIllustration(props: IllustrationProps) {
  return <IllustrationFrame {...props}>
    <rect x="20" y="33" width="91" height="89" rx="12" transform="rotate(-9 65 77)" className="illustration-note illustration-outline" />
    <rect x="37" y="35" width="98" height="96" rx="12" className="illustration-paper illustration-outline" />
    <path d="M38 47Q38 36 49 36H123Q134 36 134 47V61H38Z" className="illustration-learning" />
    <path d="M51 49H83" className="illustration-ink" strokeWidth="3" />
    <circle cx="65" cy="83" r="8" className="illustration-learning illustration-outline" />
    <path d="M51 108V103Q51 93 65 93Q79 93 79 103V108Z" className="illustration-learning illustration-outline" />
    <circle cx="104" cy="83" r="8" className="illustration-note illustration-outline" />
    <path d="M90 108V103Q90 93 104 93Q118 93 118 103V108Z" className="illustration-note illustration-outline" />
    <g className="illustration-pop">
      <circle cx="126" cy="36" r="17" className="illustration-paper illustration-outline" />
      <path d="M126 29V43M119 36H133" className="illustration-ink" strokeWidth="3" />
    </g>
  </IllustrationFrame>;
}

/** Subject choice: a deck of study cards, with distinct subject symbols. */
export function SubjectsLibraryIllustration(props: IllustrationProps) {
  return <IllustrationFrame {...props}>
    <g transform="rotate(-14 60 83)">
      <rect x="20" y="34" width="75" height="91" rx="12" className="illustration-note illustration-outline" />
      <path d="M33 52H60M33 61H51" className="illustration-writing" />
    </g>
    <g transform="rotate(10 104 79)">
      <rect x="72" y="30" width="66" height="92" rx="12" className="illustration-mint illustration-outline" />
      <circle cx="110" cy="50" r="8" className="illustration-ink" strokeWidth="2" />
    </g>
    <g className="illustration-float">
      <rect x="43" y="43" width="76" height="87" rx="12" className="illustration-paper illustration-outline" />
      <rect x="54" y="54" width="54" height="44" rx="8" className="illustration-learning" />
      <path d="M65 68H77M71 62V74M87 64L97 74M97 64L87 74M64 85H78M88 83H98M88 88H98" className="illustration-ink" strokeWidth="2.3" />
      <path d="M59 110H103M66 117H96" className="illustration-writing" />
    </g>
  </IllustrationFrame>;
}

/** Weekly planning: colored lesson slots, rather than a generic date calendar. */
export function SchedulePlanningIllustration(props: IllustrationProps) {
  return <IllustrationFrame {...props}>
    <rect x="21" y="32" width="112" height="94" rx="12" className="illustration-paper illustration-outline" />
    <path d="M22 44Q22 33 33 33H121Q132 33 132 44V57H22Z" className="illustration-learning" />
    <path d="M43 26V40M111 26V40" className="illustration-ink" strokeWidth="3.5" />
    <path d="M34 68H119M34 87H119M34 106H119M53 65V116M76 65V116M99 65V116" className="illustration-grid" />
    <rect x="34" y="72" width="16" height="12" rx="3" className="illustration-note" />
    <rect x="57" y="91" width="15" height="22" rx="3" className="illustration-learning" />
    <rect x="80" y="72" width="15" height="12" rx="3" className="illustration-mint" />
    <g className="illustration-float">
      <circle cx="119" cy="113" r="23" className="illustration-note illustration-outline" />
      <path d="M119 100V113L128 118" className="illustration-ink" strokeWidth="3" />
      <circle cx="119" cy="113" r="2.5" className="illustration-ink-fill" />
    </g>
  </IllustrationFrame>;
}

/** Search and filters: a lens over notes, without suggesting failure or success. */
export function LessonSearchIllustration(props: IllustrationProps) {
  return <IllustrationFrame {...props}>
    <rect x="26" y="26" width="78" height="91" rx="11" transform="rotate(-9 65 71)" className="illustration-note illustration-outline" />
    <rect x="40" y="37" width="76" height="89" rx="11" className="illustration-paper illustration-outline" />
    <path d="M53 52H92M53 62H78M53 106H74" className="illustration-writing" />
    <g className="illustration-float">
      <path d="M113 108L133 129" className="illustration-ink" strokeWidth="9" />
      <circle cx="97" cy="91" r="27" className="illustration-learning illustration-outline" />
      <circle cx="97" cy="91" r="19" className="illustration-paper illustration-outline" />
      <path d="M87 88H106M87 95H101" className="illustration-writing" />
    </g>
  </IllustrationFrame>;
}

/** Teaching cycles: three levels in a learning path, not a class already created. */
export function TeachingCyclesIllustration(props: IllustrationProps) {
  return <IllustrationFrame {...props}>
    <path d="M21 130V103Q21 96 28 96H56V77Q56 70 63 70H96V49Q96 42 103 42H134V130Z" className="illustration-paper illustration-outline" />
    <rect x="26" y="102" width="25" height="22" rx="5" className="illustration-note" />
    <rect x="62" y="78" width="28" height="46" rx="5" className="illustration-mint" />
    <rect x="102" y="50" width="26" height="74" rx="5" className="illustration-learning" />
    <path d="M31 82L64 53L85 56L112 27M102 27H112V37" className="illustration-ink illustration-draw" strokeWidth="2.5" />
    <g className="illustration-float">
      <path d="M24 45L43 35L63 45L43 56Z" className="illustration-learning illustration-outline" />
      <path d="M32 50V60Q43 68 54 60V50M62 45V61" className="illustration-ink" strokeWidth="2" />
    </g>
  </IllustrationFrame>;
}

/** Import curriculum: a source document becomes an organized lesson notebook. */
export function CurriculumImportIllustration(props: IllustrationProps) {
  return <IllustrationFrame {...props}>
    <g transform="rotate(-8 53 66)">
      <path d="M24 25H70L84 40V104Q84 111 77 111H24Q17 111 17 104V32Q17 25 24 25Z" className="illustration-paper illustration-outline" />
      <path d="M70 25V40H84" className="illustration-learning illustration-outline" />
      <path d="M30 46H60M30 57H68M30 68H61" className="illustration-writing" />
      <rect x="29" y="81" width="28" height="12" rx="4" className="illustration-note" />
    </g>
    <rect x="83" y="60" width="57" height="73" rx="10" className="illustration-learning illustration-outline" />
    <path d="M93 61V132" className="illustration-ink" strokeWidth="2" />
    <rect x="102" y="74" width="28" height="21" rx="4" className="illustration-paper" />
    <path d="M107 82H125M107 88H120" className="illustration-writing" />
    <g className="illustration-transfer">
      <circle cx="75" cy="104" r="20" className="illustration-note illustration-outline" />
      <path d="M64 104H86M79 97L86 104L79 111" className="illustration-ink" strokeWidth="2.8" />
    </g>
  </IllustrationFrame>;
}
