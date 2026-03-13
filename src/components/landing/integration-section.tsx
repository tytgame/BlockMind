'use client';

import { User, FileText, Database, FileOutput } from 'lucide-react';
import { useTranslations } from 'next-intl';

const BLOCK_ICONS = [User, FileText, Database, FileOutput];
const BLOCK_COLORS = [
  'from-purple-600 to-purple-700',
  'from-blue-600 to-blue-700',
  'from-green-600 to-green-700',
  'from-orange-600 to-orange-700',
];

export function IntegrationSection() {
  const t = useTranslations('integration');
  const blocks = t.raw('blocks') as Array<{ name: string; description: string }>;
  const blockTypes = blocks.map((block, i) => ({
    icon: BLOCK_ICONS[i],
    color: BLOCK_COLORS[i],
    name: block.name,
    description: block.description,
  }));

  return (
    <section className="py-24 px-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-full blur-3xl" />
      </div>

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

        {/* Block Type Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {blockTypes.map((block, index) => {
            const Icon = block.icon;
            return (
              <div
                key={index}
                className="group relative p-6 rounded-xl border border-gray-800 bg-gray-900/50 hover:border-gray-700 transition-all duration-300 text-center"
              >
                {/* Icon */}
                <div className={`mb-4 mx-auto inline-flex p-4 rounded-xl bg-gradient-to-br ${block.color} group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>

                {/* Name */}
                <h3 className="text-lg font-bold text-white mb-2">
                  {block.name}
                </h3>

                {/* Description */}
                <p className="text-xs text-gray-400">
                  {block.description}
                </p>

                {/* Hover effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/0 to-white/0 group-hover:from-white/5 group-hover:to-white/5 transition-all duration-300" />
              </div>
            );
          })}
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            {t('tip')}
          </p>
        </div>
      </div>
    </section>
  );
}
