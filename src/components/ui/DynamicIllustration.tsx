import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import './dynamic-illustrations.css';

interface IllustrationProps { className?: string; size?: number; }

/** One transparent canvas, a shared geometric grid and theme-aware flat colors. */
function Figure({ children, className, size = 140 }: IllustrationProps & { children: ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className={cn('dynamic-illustration', className)}
      style={{ '--illustration-size': `${size}px` } as CSSProperties}
    >
      <svg viewBox="0 0 240 240" fill="none" focusable="false" xmlns="http://www.w3.org/2000/svg">
        <g className="figure-scene">{children}</g>
      </svg>
    </div>
  );
}

/* ── Les personnages ────────────────────────────────────────────────────────
 * Un seul dessin de personne, décliné en situations pédagogiques : même grille (240),
 * mêmes aplats, mêmes visages. Les variantes (peau, tenue, cheveux, foulard) donnent
 * des enseignants et des élèves différents sans changer de style.
 * Coordonnées locales : tête centrée en (120,100), buste jusqu'à y = 216. */

type Tone = 1 | 2 | 3;
type Face = 'joy' | 'calm' | 'curious';
type HairStyle = 'short' | 'long' | 'scarf';
interface Look { skin: Tone; outfit: Tone; hair?: HairStyle; hairTone?: Tone; }

/** Four-point sparkle, centred on its own origin. */
const SPARKLE = 'M0 -9Q1.5 -1.5 9 0Q1.5 1.5 0 9Q-1.5 1.5 -9 0Q-1.5 -1.5 0 -9Z';

function Sparkle({ x, y, scale = 1, tone = 'gold', delay = 0 }: { x: number; y: number; scale?: number; tone?: 'gold' | 'soft'; delay?: number }) {
  return <path transform={`translate(${x} ${y}) scale(${scale})`} d={SPARKLE}
    className={cn('figure-sparkle', tone === 'gold' ? 'figure-gold' : 'figure-soft')} style={{ animationDelay: `${delay}s` }} />;
}

/** Sleeve + hand. `front` arms cross the jacket, so their sleeve is a shade darker to stay readable. */
function Arm({ d, hand, look, front = false }: { d: string; hand?: [number, number]; look: Look; front?: boolean }) {
  return <>
    <path d={d} className={cn('figure-sleeve', front ? `figure-sleeve-shade-${look.outfit}` : `figure-sleeve-${look.outfit}`)} />
    {hand && <Hand at={hand} look={look} />}
  </>;
}

function Hand({ at, look }: { at: [number, number]; look: Look }) {
  return <circle cx={at[0]} cy={at[1]} r="12" className={`figure-skin-${look.skin}`} />;
}
function FaceDrawing({ face }: { face: Face }) {
  if (face === 'joy') {
    return <>
      <path d="M104 88Q110 83 116 86M124 86Q130 83 136 88" className="figure-face-line" />
      <path d="M104 99Q110 92 116 99M124 99Q130 92 136 99" className="figure-face-line figure-face-eyes" />
      <circle cx="102" cy="112" r="5" className="figure-cheek" />
      <circle cx="138" cy="112" r="5" className="figure-cheek" />
      <path d="M106 109Q120 134 134 109Z" className="figure-mouth" />
      <path d="M108.5 109.5H131.5Q120 117 108.5 109.5Z" className="figure-teeth" />
    </>;
  }
  if (face === 'curious') {
    return <>
      <path d="M104 87Q110 82 116 85M124 88Q130 86 136 88" className="figure-face-line" />
      <circle cx="113" cy="98" r="3" className="figure-face-dot" />
      <circle cx="133" cy="98" r="3" className="figure-face-dot" />
      <ellipse cx="124" cy="115" rx="4.5" ry="3.6" className="figure-mouth" />
    </>;
  }
  return <>
    <path d="M104 89Q110 86 116 88M124 88Q130 86 136 89" className="figure-face-line" />
    <circle cx="110" cy="98" r="3" className="figure-face-dot" />
    <circle cx="130" cy="98" r="3" className="figure-face-dot" />
    <circle cx="102" cy="111" r="4.5" className="figure-cheek" />
    <circle cx="138" cy="111" r="4.5" className="figure-cheek" />
    <path d="M109 111Q120 122 131 111" className="figure-face-line" />
  </>;
}

interface PersonProps {
  x?: number; y?: number; scale?: number;
  look: Look; face?: Face; breathe?: boolean;
  /** Drawn behind the body (raised arms). */
  back?: ReactNode;
  /** Drawn over the body (props held in front, crossing arms). */
  front?: ReactNode;
}

function Person({ x = 0, y = 0, scale = 1, look, face = 'calm', breathe = false, back, front }: PersonProps) {
  const { skin, outfit, hair = 'short', hairTone = 1 } = look;
  const skinClass = `figure-skin-${skin}`;
  const hairClass = `figure-hair-${hairTone}`;
  const scarf = hair === 'scarf';
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <g className={breathe ? 'figure-breathe' : undefined}>
      {back}
      {hair === 'long' && <path d="M90 98C82 136 84 158 102 164H138C156 158 158 136 150 98Z" className={hairClass} />}
      {scarf && <path d="M87 100C83 60 103 52 120 52C137 52 157 60 153 100C153 124 151 142 147 158H93C89 142 87 124 87 100Z" className="figure-soft" />}
      <path d="M70 216V178Q70 150 98 146H142Q170 150 170 178V216Z" className={`figure-outfit-${outfit}`} />
      {scarf
        ? <path d="M93 143Q120 178 147 143Q120 152 93 143Z" className="figure-soft" />
        : <>
          <path d="M104 146L120 172L136 146Z" className="figure-paper" />
          <rect x="109" y="122" width="22" height="28" rx="9" className={skinClass} />
        </>}
      {!scarf && <>
        <circle cx="93" cy="102" r="5.5" className={skinClass} />
        <circle cx="147" cy="102" r="5.5" className={skinClass} />
      </>}
      <ellipse cx="120" cy="100" rx="27" ry="30" className={skinClass} />
      {scarf
        ? <path d="M92 93C92 70 107 63 120 63C133 63 148 70 148 93C141 80 133 76 120 76C107 76 99 80 92 93Z" className="figure-soft" />
        : <path d="M92 100C87 62 112 57 122 59C147 57 153 80 148 100C144 86 136 77 120 77C104 77 96 86 92 100Z" className={hairClass} />}
      <FaceDrawing face={face} />
      {front}
    </g>
  </g>;
}

/* ── Les situations ─────────────────────────────────────────────────────────*/

const TEACHER_A: Look = { skin: 1, outfit: 1 };

/** Le travail avance : l'enseignant lève les bras, l'étoile sur la veste dit sa fierté. */
export function ProudTeacherIllustration(props: IllustrationProps) {
  return <Figure {...props}>
    <Sparkle x={34} y={70} delay={0} />
    <Sparkle x={206} y={58} tone="soft" delay={.6} />
    <Sparkle x={176} y={26} scale={.7} delay={1.2} />
    <Sparkle x={62} y={28} scale={.6} tone="soft" delay={1.8} />
    <circle cx="20" cy="124" r="4" className="figure-soft" />
    <circle cx="222" cy="112" r="4" className="figure-gold" />
    <Person look={TEACHER_A} face="joy" breathe
      back={<>
        <Arm d="M84 172Q50 162 46 120" hand={[46, 108]} look={TEACHER_A} />
        <Arm d="M156 172Q190 162 194 120" hand={[194, 108]} look={TEACHER_A} />
      </>}
      front={<path transform="translate(146 174)" d="M0 -8L1.9 -2.6L7.6 -2.5L3 1L4.7 6.5L0 3.2L-4.7 6.5L-3 1L-7.6 -2.5L-1.9 -2.6Z" className="figure-gold" />} />
  </Figure>;
}

const ACHIEVER: Look = { skin: 2, outfit: 3, hair: 'long', hairTone: 2 };

/** Tout est à jour : une enseignante sereine tient sa liste de séances cochées. */
export function SereneStudyIllustration(props: IllustrationProps) {
  return <Figure {...props}>
    <circle cx="186" cy="64" r="22" className="figure-success" />
    <path d="M175 64L183 72L197 55" className="figure-cut" />
    <Sparkle x={40} y={62} tone="soft" delay={.3} />
    <Sparkle x={58} y={34} scale={.6} delay={1.1} />
    <Person look={ACHIEVER} face="calm" breathe
      front={<>
        <Arm d="M84 176Q86 198 120 196" look={ACHIEVER} front />
        <Arm d="M156 176Q176 182 172 206" look={ACHIEVER} front />
        <rect x="108" y="142" width="70" height="74" rx="9" className="figure-neutral" />
        <rect x="114" y="152" width="58" height="64" rx="5" className="figure-paper" />
        <rect x="131" y="146" width="22" height="10" rx="4" className="figure-ink" />
        <path d="M122 170L126 174L133 166M122 188L126 192L133 184" className="figure-line figure-success-line" />
        <path d="M140 170H164M140 188H164M140 206H156" className="figure-line figure-muted-line" />
        <rect x="122" y="200" width="10" height="10" rx="2.5" className="figure-line figure-muted-line" />
        <Hand at={[108, 198]} look={ACHIEVER} />
        <Hand at={[177, 208]} look={ACHIEVER} />
      </>} />
  </Figure>;
}

const WELCOMER: Look = { skin: 1, outfit: 1 };
const STUDENT_A: Look = { skin: 2, outfit: 2, hair: 'long', hairTone: 1 };
const STUDENT_B: Look = { skin: 3, outfit: 3, hairTone: 1 };

/** Nouvelle classe : l'enseignant accueille deux élèves qui lèvent la main. */
export function ClassroomWelcomeIllustration(props: IllustrationProps) {
  return <Figure {...props}>
    <Sparkle x={36} y={62} delay={.2} />
    <Sparkle x={204} y={50} tone="soft" delay={.9} />
    <Person x={18} y={32.4} scale={.85} look={WELCOMER} face="joy" breathe
      back={<Arm d="M156 172Q190 162 194 120" hand={[194, 108]} look={WELCOMER} />} />
    <Person x={-9.2} y={116.6} scale={.46} look={STUDENT_A} face="joy"
      back={<Arm d="M84 172Q50 160 46 120" hand={[46, 108]} look={STUDENT_A} />} />
    <Person x={138.8} y={116.6} scale={.46} look={STUDENT_B} face="joy"
      back={<Arm d="M156 172Q190 160 194 120" hand={[194, 108]} look={STUDENT_B} />} />
  </Figure>;
}

const LIBRARIAN: Look = { skin: 1, outfit: 3, hair: 'long', hairTone: 2 };

/** Choisir ses matières : une enseignante porte une pile de manuels. */
export function SubjectsLibraryIllustration(props: IllustrationProps) {
  return <Figure {...props}>
    <Sparkle x={38} y={76} tone="soft" delay={.4} />
    <Sparkle x={204} y={64} delay={1} />
    <Person look={LIBRARIAN} face="joy" breathe
      front={<>
        <rect x="70" y="192" width="100" height="24" rx="6" className="figure-book-cover" />
        <path d="M82 204H158" className="figure-book-bands" />
        <rect x="78" y="168" width="86" height="24" rx="6" className="figure-book-spine" />
        <path d="M90 180H152" className="figure-book-bands" />
        <rect x="74" y="148" width="92" height="20" rx="6" className="figure-book-pages" />
        <path d="M86 158H150" className="figure-book-page-lines" />
        <Arm d="M84 172Q60 178 68 202" hand={[70, 200]} look={LIBRARIAN} front />
        <Arm d="M156 172Q180 178 172 202" hand={[170, 200]} look={LIBRARIAN} front />
      </>} />
  </Figure>;
}

const PLANNER: Look = { skin: 1, outfit: 2, hair: 'scarf' };

/** Emploi du temps : l'enseignante montre une case sur le planning de la semaine. */
export function SchedulePlanningIllustration(props: IllustrationProps) {
  return <Figure {...props}>
    <rect x="116" y="52" width="108" height="140" rx="12" className="figure-paper" />
    <path d="M128 52H212Q224 52 224 64V84H116V64Q116 52 128 52Z" className="figure-soft" />
    <path d="M144 44V62M196 44V62" className="figure-line" />
    {[0, 1, 2].flatMap(row => [0, 1, 2].map(col => (
      <rect key={`${row}-${col}`} x={130 + col * 30} y={98 + row * 30} width="20" height="20" rx="5"
        className={row === 1 && col === 1 ? 'figure-accent' : 'figure-neutral'} />
    )))}
    <Person x={-26} y={43.2} scale={.8} look={PLANNER} face="calm" breathe
      back={<Arm d="M156 172Q196 162 218 122" hand={[218, 120]} look={PLANNER} />} />
    <Sparkle x={40} y={44} tone="soft" delay={.5} />
  </Figure>;
}

const SEEKER: Look = { skin: 3, outfit: 1 };

/** Aucun résultat : l'enseignant cherche, loupe en main, parmi ses fiches. */
export function LessonSearchIllustration(props: IllustrationProps) {
  return <Figure {...props}>
    <g transform="rotate(-8 46 112)">
      <rect x="20" y="78" width="52" height="68" rx="7" className="figure-neutral" />
      <rect x="27" y="86" width="52" height="68" rx="7" className="figure-paper" />
      <path d="M38 104H68M38 118H68M38 132H56" className="figure-line figure-muted-line" />
    </g>
    <Person look={SEEKER} face="curious" breathe
      back={<>
        <path d="M173 121L167 138" className="figure-line figure-search-handle" />
        <Arm d="M156 172Q182 172 169 142" hand={[168, 140]} look={SEEKER} />
        <circle cx="190" cy="104" r="24" className="figure-lens" />
      </>} />  </Figure>;
}

const MENTOR: Look = { skin: 2, outfit: 1, hairTone: 3 };

/** Les cycles : l'enseignant montre la montée du primaire au lycée. */
export function TeachingCyclesIllustration(props: IllustrationProps) {
  return <Figure {...props}>
    <rect x="108" y="172" width="30" height="44" rx="6" className="figure-neutral" />
    <rect x="142" y="140" width="30" height="76" rx="6" className="figure-soft" />
    <rect x="176" y="104" width="30" height="112" rx="6" className="figure-accent" />
    <path d="M116 162L156 126L196 86M182 86H196V100" className="figure-line" />
    <Person x={-22} y={64.8} scale={.7} look={MENTOR} face="joy" breathe
      back={<Arm d="M156 172Q190 152 200 112" hand={[200, 100]} look={MENTOR} />} />
    <Sparkle x={214} y={62} scale={.8} delay={.8} />
  </Figure>;
}

const IMPORTER: Look = { skin: 2, outfit: 3, hairTone: 2 };

/** Programme officiel : l'enseignant tend la main vers le document qu'il va importer. */
export function CurriculumImportIllustration(props: IllustrationProps) {
  return <Figure {...props}>
    <path d="M42 46H99L122 69V149Q122 157 114 157H42Q34 157 34 149V54Q34 46 42 46Z" className="figure-paper" />
    <path d="M99 46V69H122Z" className="figure-neutral" />
    <path d="M54 86H96M54 104H84M54 122H90" className="figure-line figure-muted-line" />
    <path d="M40 196H86M74 184L86 196L74 208" className="figure-line" />
    <Person x={64} y={43.2} scale={.8} look={IMPORTER} face="joy" breathe
      back={<Arm d="M84 174Q52 176 44 150" hand={[44, 142]} look={IMPORTER} />} />
    <Sparkle x={206} y={50} delay={.5} />
  </Figure>;
}
