import { useState } from 'react';
import type { GuideChapter } from '@/constants/guides';

const captureSizes: Record<string, readonly [number, number]> = {
  classes: [1280, 720],
  schedule: [1280, 720],
  editor: [1280, 720],
  add: [1280, 720],
  dates: [1280, 720],
  notifications: [1280, 720],
  appearance: [1280, 720],
  assessments: [1280, 720],
  print: [1280, 720],
  students: [1280, 720],
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
      <button type="button" onClick={() => { setAttempt(Date.now()); setFailed(false); }}>{isAr ? 'إعادة تحميل الصورة' : 'Recharger l\u2019image'}</button>
    </div> : <button type="button" className="guide-image-toggle" aria-expanded={zoomed}
      style={zoomed ? { minWidth: '200%', width: 'max-content' } : undefined}
      onClick={() => setZoomed(current => !current)}
      aria-label={`${image.caption} \u2014 ${zoomed ? (isAr ? 'تصغير الصورة' : 'R\u00e9duire l\u2019image') : (isAr ? 'تكبير الصورة' : 'Agrandir l\u2019image')}`}>
      <img src={src} alt={image.caption}
        width={width} height={height}
        loading="lazy" decoding="async" onError={() => setFailed(true)} />
    </button>}</div>
    <figcaption><strong>{image.caption}</strong><span>{isAr
      ? (zoomed ? 'اسحب للتفاصيل · اضغط للتصغير' : 'لقطة حقيقية من التطبيق · بيانات توضيحية · اضغط للتكبير')
      : (zoomed ? 'Faites d\u00e9filer pour lire les d\u00e9tails \u00b7 Touchez pour r\u00e9duire' : 'Capture r\u00e9elle de l\u2019application \u00b7 Donn\u00e9es d\u2019exemple \u00b7 Touchez pour agrandir')}</span></figcaption>
  </figure>;
}
