'use client';

import { Zap, Target, Eye } from 'lucide-react';
import { useTranslations } from 'next-intl';

const FEATURE_ICONS = [Zap, Target, Eye];

export function FeaturesSection() {
  const t = useTranslations('features');
  const items = t.raw('items') as Array<{ title: string; description: string }>;
  const features = items.map((item, i) => ({
    icon: FEATURE_ICONS[i],
    title: item.title,
    description: item.description,
  }));

  return (
    <section className="py-24 px-6 relative" id="features">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/5 to-transparent" />

      <div className="container mx-auto max-w-6xl relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t('sectionTitle')}
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            {t('sectionSubtitle')}
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group relative p-8 rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/50 to-gray-950/50 hover:border-blue-800/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-900/20"
              >
                {/* Icon */}
                <div className="mb-6 inline-flex p-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-6 h-6 text-white" />
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-white mb-3">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-gray-400 leading-relaxed text-sm">
                  {feature.description}
                </p>

                {/* Hover gradient */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-600/0 to-purple-600/0 group-hover:from-blue-600/5 group-hover:to-purple-600/5 transition-all duration-300" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
