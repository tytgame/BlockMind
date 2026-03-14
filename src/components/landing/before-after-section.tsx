'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function BeforeAfterSection() {
  const t = useTranslations('beforeAfter');
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const rows = [
    { before: t('row1Before'), after: t('row1After') },
    { before: t('row2Before'), after: t('row2After') },
    { before: t('row3Before'), after: t('row3After') },
  ];

  return (
    <section ref={sectionRef} className="py-24 px-6 bg-[#0f1419]">
      <div className="mx-auto max-w-2xl">

        {/* 헤드라인 */}
        <div
          className={`mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
            {t('headingLine1')}
            <br />
            <span className="text-white/40">{t('headingLine2')}</span>
          </h2>
        </div>

        {/* 행 */}
        <div className="flex flex-col">
          {rows.map((row, i) => (
            <div
              key={i}
              className={`group relative transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
              style={{ transitionDelay: visible ? `${(i + 1) * 150}ms` : '0ms' }}
            >
              {/* 구분선 */}
              {i > 0 && <div className="h-px bg-white/5 mb-8" />}

              <div className="flex items-start gap-6 pb-8">
                {/* 번호 */}
                <span
                  className={`text-4xl font-bold tabular-nums transition-all duration-500 select-none ${visible ? 'text-blue-500/60' : 'text-transparent'}`}
                  style={{ transitionDelay: visible ? `${(i + 1) * 150 + 200}ms` : '0ms' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>

                <div className="flex-1 space-y-3">
                  {/* Before */}
                  <p
                    className={`text-base text-white/30 line-through leading-relaxed decoration-white/20 transition-all duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
                    style={{ transitionDelay: visible ? `${(i + 1) * 150 + 100}ms` : '0ms' }}
                  >
                    {row.before}
                  </p>

                  {/* Arrow + After */}
                  <div
                    className={`flex items-start gap-2 transition-all duration-600 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}
                    style={{ transitionDelay: visible ? `${(i + 1) * 150 + 300}ms` : '0ms' }}
                  >
                    <ArrowRight className="h-4 w-4 text-blue-400 mt-1 shrink-0" />
                    <p className="text-base text-white font-medium leading-relaxed">
                      {row.after}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
