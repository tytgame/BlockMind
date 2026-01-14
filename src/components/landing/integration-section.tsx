'use client';

import { User, FileText, Database, FileOutput } from 'lucide-react';

const blockTypes = [
  {
    icon: User,
    name: 'Persona',
    description: 'AI의 역할과 성격 정의',
    color: 'from-purple-600 to-purple-700',
  },
  {
    icon: FileText,
    name: 'Rule',
    description: '대화 규칙과 가이드라인',
    color: 'from-blue-600 to-blue-700',
  },
  {
    icon: Database,
    name: 'Data',
    description: '참조할 데이터와 컨텍스트',
    color: 'from-green-600 to-green-700',
  },
  {
    icon: FileOutput,
    name: 'Output',
    description: '출력 형식과 스타일',
    color: 'from-orange-600 to-orange-700',
  },
];

export function IntegrationSection() {
  return (
    <section className="py-24 px-6 relative">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto max-w-6xl relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Build with Blocks
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            네 가지 블록 타입으로 AI의 완벽한 맥락을 구성하세요. 각 블록은 독립적으로 작동하며 조합됩니다.
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
            각 블록은 드래그하여 순서를 변경하고, 클릭하여 활성화/비활성화할 수 있습니다.
          </p>
        </div>
      </div>
    </section>
  );
}
