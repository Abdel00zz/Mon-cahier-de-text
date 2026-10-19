import { useState } from 'react';
import type { GuideChapter } from '@/constants/guides';

const captureSizes: Record<string, readonly [number, number]> = {
  classes: [1120, 260],
  schedule: [1120, 620],
  editor: [1120, 920],
  add: [1120, 940],
  dates: [704, 880],
  notifications: [1140, 910],
  appearance: [1060, 500],
  assessments: [1120, 460],
  print: [930, 900],
  students: [800, 760],
};

export function GuideFigure({ image, lang }: { image: NonNullable<GuideChapter['image']>; lang: 'fr' | 'ar' }) {
  const [failed, setFailed] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const isAr = lang === 'ar';
  const [width, height] = captureSizes[image.key] ?? [1120, 800];
  const src = `/guide/current/${image.key}-${lang}.webp${attempt ? `?retry=${attempt}` : ''}`;
  return <figure className="guide-figure">
    <div className={`guide-image-frame${zoomed ? ' is-zoomed' : ''}`}>{failed ? <div className="guide-image-fallback" role="status">
      <p>{isAr ? 'الصورة غير متاحة حالياً. يمكنك متابعة الخطوات أدناه.' : 'Image momentanément indisponible. Les étapes restent accessibles ci-dessous.'}</p>
      <button type="button" onClick={() => { setAttempt(Date.now()); setFailed(false); }}>{isAr ? 'إعادة تحميل الصورة' : 'Recharger l’image'}</button>
    </div> : <button type="button" className="guide-image-toggle" aria-expanded={zoomed}
      style={zoomed ? { width, minWidth: '100%' } : undefined}
      onClick={() => setZoomed(current => !current)}
      aria-label={`${image.caption} — ${zoomed ? (isAr ? 'تصغير الصورة' : 'Réduire l’image') : (isAr ? 'تكبير الصورة' : 'Agrandir l’image')}`}>
      <img src={src} alt={image.caption}
        width={width} height={height}
        loading="lazy" decoding="async" onError={() => setFailed(true)} />
    </button>}</div>
    <figcaption><strong>{image.caption}</strong><span>{isAr
      ? (zoomed ? 'اسحب للتفاصيل · اضغط للتصغير' : 'لقطة حقيقية من التطبيق · بيانات توضيحية · اضغط للتكبير')
      : (zoomed ? 'Faites défiler pour lire les détails · Touchez pour réduire' : 'Capture réelle de l’application · Données d’exemple · Touchez pour agrandir')}</span></figcaption>
  </figure>;
}
