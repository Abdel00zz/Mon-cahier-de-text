import { useId, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import './dynamic-illustrations.css';

interface IllustrationProps { className?: string; size?: number; }
type Materials = Record<'paper' | 'edge' | 'blue' | 'mint' | 'metal' | 'shadow' | 'halo', string>;

/** Original optical illustrations: opaque faces, translucent edges, soft directional light.
 * IDs are instance-local, so scenes can coexist in a dashboard or a modal. */
function Studio({ children, className, size = 140 }: IllustrationProps & { children: (m: Materials) => ReactNode }) {
  const id = useId().replace(/:/g, '');
  const m = Object.fromEntries(['paper', 'edge', 'blue', 'mint', 'metal', 'shadow', 'halo'].map(key => [key, `url(#${id}-${key})`])) as Materials;
  return <div aria-hidden="true" className={cn('dynamic-illustration', className)} style={{ '--illustration-size': `${size}px` } as CSSProperties}>
    <svg viewBox="0 0 240 240" fill="none" focusable="false" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-paper`} x1="0" y1="0" x2=".85" y2="1"><stop className="art-paper-top" /><stop offset=".56" className="art-paper-mid" /><stop offset="1" className="art-paper-bottom" /></linearGradient>
        <linearGradient id={`${id}-edge`} x1=".1" y1="0" x2=".8" y2="1"><stop className="art-edge-light" /><stop offset=".48" className="art-edge-mid" /><stop offset="1" className="art-edge-end" /></linearGradient>
        <linearGradient id={`${id}-blue`} x1="0" y1="0" x2="1" y2="1"><stop className="art-blue-top" /><stop offset=".52" className="art-blue-mid" /><stop offset="1" className="art-blue-bottom" /></linearGradient>
        <linearGradient id={`${id}-mint`} x1="0" y1="0" x2="1" y2="1"><stop className="art-mint-top" /><stop offset="1" className="art-mint-bottom" /></linearGradient>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="0"><stop className="art-metal-edge" /><stop offset=".35" className="art-metal-light" /><stop offset="1" className="art-metal-edge" /></linearGradient>
        <radialGradient id={`${id}-halo`}><stop className="art-halo" stopOpacity=".28" /><stop offset="1" className="art-halo" stopOpacity="0" /></radialGradient>
        <filter id={`${id}-shadow`} x="-35%" y="-30%" width="175%" height="190%" colorInterpolationFilters="sRGB"><feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="var(--art-shadow)" floodOpacity=".18" /><feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="var(--art-shadow)" floodOpacity=".08" /></filter>
      </defs>
      <ellipse cx="120" cy="135" rx="116" ry="94" fill={m.halo} />
      <g className="art-scene">{children(m)}</g>
    </svg>
  </div>;
}
function Panel({ m, x, y, width, height, radius = 18, fill, children }: { m: Materials; x: number; y: number; width: number; height: number; radius?: number; fill?: string; children?: ReactNode }) {
  return <g>
    <rect x={x} y={y + 3} width={width} height={height} rx={radius} className="art-depth" />
    <rect x={x} y={y} width={width} height={height} rx={radius} fill={fill ?? m.paper} stroke={m.edge} strokeWidth="1.5" />
    <path d={`M${x + 5} ${y + radius + 3}Q${x + 5} ${y + 5} ${x + radius + 3} ${y + 5}H${x + width - radius}`} className="art-specular" />
    {children}
  </g>;
}
function Writing({ x, y, width = 55 }: { x: number; y: number; width?: number }) {
  return <path d={`M${x} ${y}H${x + width}M${x} ${y + 13}H${x + width * .72}`} className="art-writing" />;
}
function Checkmark({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return <path d="M-12 0L-3 9L14-10" transform={`translate(${x} ${y}) scale(${size})`} className="art-check" />;
}

export function NotebookOpeningIllustration(props: IllustrationProps) {
  return <Studio {...props}>{m => <>
    <g transform="rotate(-8 116 129)" filter={m.shadow}>
      <path d="M34 65Q77 54 117 73Q157 54 200 65V179Q157 167 117 186Q77 167 34 179Z" fill={m.blue} />
      <path d="M39 60Q80 53 117 70Q154 53 195 60V171Q154 163 117 181Q80 163 39 171Z" fill={m.paper} stroke={m.edge} strokeWidth="1.5" />
      <path d="M117 72V174" className="art-fold" />
      <path d="M45 66Q79 61 110 74M124 74Q154 61 189 66" className="art-specular" />
      <Writing x={55} y={91} width={43} /><Writing x={55} y={126} width={38} /><Writing x={133} y={91} width={43} />
      <rect x="133" y="122" width="40" height="27" rx="8" fill={m.blue} opacity=".22" />
    </g>
    <g className="art-detail"><g transform="rotate(28 182 124)" filter={m.shadow}>
      <rect x="176" y="58" width="13" height="118" rx="6.5" fill={m.metal} stroke={m.edge} />
      <path d="M177 170H188L182.5 185Z" fill={m.paper} /><path d="M182.5 185V181" className="art-ink" strokeWidth="2.5" />
      <path d="M176.5 74H188.5" className="art-fold" /><path d="M179 80V157" className="art-specular" />
    </g></g>
  </>}</Studio>;
}

export function SereneStudyIllustration(props: IllustrationProps) {
  return <Studio {...props}>{m => <>
    <g transform="rotate(-9 114 123)" filter={m.shadow}><Panel m={m} x={56} y={39} width={120} height={158} fill={m.mint} /></g>
    <g transform="rotate(3 118 119)" filter={m.shadow}><Panel m={m} x={57} y={33} width={120} height={158}>
      <rect x="76" y="55" width="52" height="8" rx="4" className="art-heading" />
      {[86, 115, 144].map((y, i) => <g key={y}><rect x="76" y={y - 7} width="15" height="15" rx="5" fill={m.mint} opacity=".35" /><Checkmark x={83} y={y} size={.34} /><path d={`M103 ${y}H${i === 2 ? 134 : 152}`} className="art-writing" /></g>)}
    </Panel></g>
    <g className="art-detail" filter={m.shadow}><circle cx="178" cy="169" r="31" fill={m.mint} stroke={m.edge} strokeWidth="1.5" /><path d="M153 161A26 26 0 0 1 188 146" className="art-specular" /><Checkmark x={178} y={169} size={1.1} /></g>
  </>}</Studio>;
}

export function ClassroomWelcomeIllustration(props: IllustrationProps) {
  return <Studio {...props}>{m => <>
    <g transform="rotate(-10 120 115)" filter={m.shadow}><Panel m={m} x={45} y={44} width={144} height={130} fill={m.blue} /></g>
    <g transform="rotate(3 120 129)" filter={m.shadow}><Panel m={m} x={36} y={68} width={166} height={120}>
      <rect x="53" y="83" width="41" height="5" rx="2.5" className="art-heading" />
      <circle cx="87" cy="119" r="13" fill={m.blue} /><path d="M62 160C62 133 112 133 112 160Q112 166 106 166H68Q62 166 62 160Z" fill={m.blue} />
      <circle cx="150" cy="119" r="13" fill={m.mint} /><path d="M125 160C125 133 175 133 175 160Q175 166 169 166H131Q125 166 125 160Z" fill={m.mint} />
      <path d="M78 111Q84 106 91 109M141 111Q147 106 154 109" className="art-specular" />
    </Panel></g>
    <g className="art-detail" filter={m.shadow}><circle cx="187" cy="63" r="23" fill={m.paper} stroke={m.edge} strokeWidth="1.5" /><path d="M187 53V73M177 63H197" className="art-accent-line" /></g>
  </>}</Studio>;
}

export function SubjectsLibraryIllustration(props: IllustrationProps) {
  return <Studio {...props}>{m => <>
    <g transform="rotate(-20 103 133)" filter={m.shadow}><Panel m={m} x={36} y={59} width={88} height={133} fill={m.mint}><path d="M53 80H91M53 91H77" className="art-light-line" /></Panel></g>
    <g transform="rotate(17 151 127)" filter={m.shadow}><Panel m={m} x={112} y={43} width={83} height={138} fill={m.blue}><circle cx="153" cy="74" r="12" className="art-light-line" /></Panel></g>
    <g filter={m.shadow}><Panel m={m} x={68} y={60} width={104} height={140}>
      <path d="M83 62V195" className="art-fold" />
      <rect x="98" y="84" width="55" height="56" rx="15" fill={m.blue} opacity=".16" />
      <path d="M107 103H119M113 97V109M134 98L144 108M144 98L134 108M107 125H119M135 122H145M135 128H145" className="art-accent-line" strokeWidth="2.8" />
      <Writing x={100} y={161} width={47} />
    </Panel></g>
  </>}</Studio>;
}

export function SchedulePlanningIllustration(props: IllustrationProps) {
  return <Studio {...props}>{m => <>
    <g transform="rotate(-5 113 114)" filter={m.shadow}><Panel m={m} x={37} y={43} width={152} height={145}>
      <path d="M38 64Q38 44 57 44H169Q188 44 188 64V81H38Z" fill={m.blue} opacity=".22" />
      <rect x="67" y="33" width="9" height="26" rx="4.5" fill={m.metal} /><rect x="151" y="33" width="9" height="26" rx="4.5" fill={m.metal} />
      {[0,1,2].flatMap(row => [0,1,2,3].map(col => <rect key={`${row}-${col}`} x={58 + col * 30} y={96 + row * 24} width="16" height="13" rx="5" fill={row === 1 && col === 1 ? m.blue : row === 0 && col === 2 ? m.mint : 'var(--art-cell)'} />))}
    </Panel></g>
    <g className="art-detail" filter={m.shadow}><circle cx="175" cy="174" r="32" fill={m.paper} stroke={m.edge} strokeWidth="1.5" /><circle cx="175" cy="174" r="25" className="art-clock-rim" /><path d="M175 156V174L187 181" className="art-accent-line" /><circle cx="175" cy="174" r="3" className="art-heading" /></g>
  </>}</Studio>;
}

export function LessonSearchIllustration(props: IllustrationProps) {
  return <Studio {...props}>{m => <>
    <g transform="rotate(-8 100 115)" filter={m.shadow}><Panel m={m} x={44} y={37} width={115} height={152}>
      <rect x="63" y="58" width="39" height="7" rx="3.5" className="art-heading" />
      <Writing x={63} y={84} width={72} /><Writing x={63} y={118} width={58} />
      <rect x="63" y="155" width="36" height="10" rx="5" fill={m.blue} opacity=".24" />
    </Panel></g>
    <g className="art-detail" filter={m.shadow}>
      <path d="M158 153L187 184" stroke={m.metal} strokeWidth="15" strokeLinecap="round" />
      <path d="M161 154L189 184" className="art-specular" />
      <circle cx="135" cy="125" r="36" fill={m.blue} fillOpacity=".14" stroke={m.blue} strokeWidth="12" />
      <circle cx="135" cy="125" r="41" stroke={m.edge} strokeWidth="1.5" />
      <path d="M103 110A35 35 0 0 1 147 92" className="art-specular" strokeWidth="2" />
      <path d="M121 119H147M121 131H140" className="art-accent-line" strokeWidth="3" />
    </g>
  </>}</Studio>;
}

export function TeachingCyclesIllustration(props: IllustrationProps) {
  return <Studio {...props}>{m => <>
    <g filter={m.shadow}><Panel m={m} x={31} y={132} width={49} height={65} fill={m.paper} /><Panel m={m} x={94} y={99} width={49} height={98} fill={m.mint} /><Panel m={m} x={157} y={61} width={49} height={136} fill={m.blue} />
      <path d="M44 149H64M44 158H57" className="art-writing" /><path d="M108 116H128M108 125H121M171 78H191M171 87H184" className="art-light-line" />
    </g>
    <path d="M49 111C73 64 117 65 141 36M125 37L141 36L141 52" className="art-accent-line" strokeWidth="3" />
    <circle cx="48" cy="110" r="4" fill={m.blue} />
  </>}</Studio>;
}

export function CurriculumImportIllustration(props: IllustrationProps) {
  return <Studio {...props}>{m => <>
    <g transform="rotate(-9 79 105)" filter={m.shadow}><Panel m={m} x={32} y={38} width={95} height={130}>
      <rect x="49" y="58" width="28" height="7" rx="3.5" className="art-heading" /><Writing x={49} y={84} width={58} /><Writing x={49} y={117} width={48} />
    </Panel></g>
    <g transform="rotate(7 162 137)" filter={m.shadow}><Panel m={m} x={113} y={70} width={93} height={129} fill={m.blue}>
      <path d="M128 74V194" className="art-light-line" strokeOpacity=".4" /><rect x="142" y="93" width="45" height="47" rx="11" fill={m.paper} /><path d="M153 109H176M153 120H168" className="art-writing" />
    </Panel></g>
    <g className="art-detail" filter={m.shadow}><Panel m={m} x={65} y={156} width={73} height={38} radius={19}><path d="M83 175H120M112 167L120 175L112 183" className="art-accent-line" /></Panel></g>
  </>}</Studio>;
}
