'use client';

import { Zap, Target, Eye } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Context Block System',
    description:
      '페르소나, 규칙, 데이터, 출력 형식을 독립적인 블록으로 구성하여 AI의 맥락을 명확하게 관리하세요. 블록을 추가하고 제거하며 실시간으로 AI 동작을 조정할 수 있습니다.',
  },
  {
    icon: Target,
    title: 'Visual Control',
    description:
      '드래그 앤 드롭으로 블록의 우선순위를 변경하고, 토글로 활성화/비활성화를 제어하세요. AI가 현재 어떤 맥락을 따르고 있는지 시각적으로 확인할 수 있습니다.',
  },
  {
    icon: Eye,
    title: 'AI Tool Calling',
    description:
      'AI가 대화 흐름을 분석하여 필요한 블록을 자동으로 생성합니다. 사용자가 직접 입력하지 않아도 AI가 맥락을 이해하고 최적의 블록 구조를 제안합니다.',
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 px-6 relative" id="features">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/5 to-transparent" />

      <div className="container mx-auto max-w-6xl relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Key Features
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            BlockMind를 가장 진보된 AI 맥락 관리 플랫폼으로 만드는 핵심 기능들을 알아보세요.
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
