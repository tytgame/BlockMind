'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle, UtensilsCrossed, Plane, DollarSign, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface BlockIcon {
  Icon: LucideIcon;
  color: string;
}

const BLOCK_ICONS: BlockIcon[] = [
  { Icon: UtensilsCrossed, color: 'text-yellow-400' },
  { Icon: Plane,           color: 'text-sky-400'    },
  { Icon: DollarSign,      color: 'text-green-400'  },
];

// 시나리오별 newBlock / existingBlocks 아이콘 (순서 고정)
const SCENARIO_ICONS = [
  { newBlock: BLOCK_ICONS[0], existingBlocks: [BLOCK_ICONS[1], BLOCK_ICONS[2]] },
  { newBlock: BLOCK_ICONS[1], existingBlocks: [BLOCK_ICONS[0], BLOCK_ICONS[2]] },
  { newBlock: BLOCK_ICONS[2], existingBlocks: [BLOCK_ICONS[0], BLOCK_ICONS[1]] },
];

const WORD_MS = 90;

interface ScenarioText {
  sessionTitle: string;
  otherSessions: string[];
  userMessage: string;
  aiResponse: string;
  blockLabel: string;
}

export function DemoSection() {
  const t = useTranslations('demo');
  const scenarios = t.raw('scenarios') as ScenarioText[];

  const sectionRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isVisible, setIsVisible] = useState(false);
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [showUserMsg, setShowUserMsg] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [showNewBlock, setShowNewBlock] = useState(false);

  const sc = scenarios[scenarioIdx];
  const icons = SCENARIO_ICONS[scenarioIdx];

  function clearAll() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function addTimer(fn: () => void, delay: number) {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
  }

  // Intersection Observer — 처음 진입 시 한 번만 시작
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // 시나리오 애니메이션
  useEffect(() => {
    if (!isVisible) return;

    clearAll();
    setShowUserMsg(false);
    setShowThinking(false);
    setWordCount(0);
    setShowToast(false);
    setShowNewBlock(false);

    const words = scenarios[scenarioIdx].aiResponse.split(' ');

    addTimer(() => setShowUserMsg(true), 500);
    addTimer(() => setShowThinking(true), 1400);
    addTimer(() => {
      setShowThinking(false);
      let i = 0;
      intervalRef.current = setInterval(() => {
        i++;
        setWordCount(i);
        if (i >= words.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          addTimer(() => setShowToast(true), 350);
          addTimer(() => setShowNewBlock(true), 750);
          addTimer(() => setShowToast(false), 2800);
          addTimer(() => {
            setScenarioIdx(prev => (prev + 1) % scenarios.length);
          }, 4200);
        }
      }, WORD_MS);
    }, 2400);

    return clearAll;
  }, [isVisible, scenarioIdx, scenarios]);

  const aiWords = sc ? sc.aiResponse.split(' ') : [];
  const displayedText = aiWords.slice(0, wordCount).join(' ');
  const isStreaming = wordCount > 0 && wordCount < aiWords.length;

  return (
    <section ref={sectionRef} className="py-16 px-6">
      <div className="container mx-auto max-w-5xl">
        {/* Section header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            {t('sectionTitle')}
          </h2>
          <p className="text-gray-400 text-sm">
            {t('sectionSubtitle')}
          </p>
        </div>

        {/* App mockup */}
        <div className="rounded-xl overflow-hidden border border-gray-800 bg-[#1a1d21] shadow-2xl">
          {/* Title bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 bg-[#141618]">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="flex-1 text-center">
              <span className="text-xs text-gray-500 font-sora">
                <span className="font-bold">Block</span>
                <span className="font-normal">Mind</span>
              </span>
            </div>
          </div>

          {/* 3-column layout */}
          <div className="flex h-[440px]">
            {/* Left: Chat sidebar */}
            <div className="hidden sm:flex w-44 border-r border-gray-800 bg-[#141618] flex-col p-3 gap-1.5 flex-shrink-0">
              <button className="w-full text-xs bg-blue-600 text-white rounded-md py-1.5 px-2 text-left mb-1">
                {t('newChat')}
              </button>
              <div className="text-[10px] text-gray-600 px-1 mb-0.5">{t('recent')}</div>

              {/* Current session — 유저 메시지 나타나면 함께 등장 */}
              <div
                className={`text-xs text-white bg-gray-800 rounded-md px-2 py-1.5 truncate transition-all duration-500 ${
                  showUserMsg ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {sc?.sessionTitle}
              </div>

              {sc?.otherSessions.map((s, i) => (
                <div key={i} className="text-xs text-gray-500 px-2 py-1 truncate">
                  {s}
                </div>
              ))}
            </div>

            {/* Center: Chat area */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
              <div className="flex-1 p-4 space-y-4 overflow-hidden">
                {/* User message */}
                <div
                  className={`flex justify-end transition-all duration-500 ${
                    showUserMsg ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
                  }`}
                >
                  <div className="bg-[#2d2f33] text-white text-sm rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[75%]">
                    {sc?.userMessage}
                  </div>
                </div>

                {/* AI thinking indicator */}
                {showThinking && (
                  <div className="flex gap-2 items-start">
                    <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 150}ms` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI streaming response */}
                {wordCount > 0 && (
                  <div className="text-sm text-gray-200 leading-relaxed max-w-[85%]">
                    {displayedText}
                    {isStreaming && (
                      <span className="inline-block w-0.5 h-3.5 bg-blue-400 ml-0.5 align-middle animate-pulse" />
                    )}
                  </div>
                )}
              </div>

              {/* Toast notification */}
              <div
                className={`absolute top-4 left-1/2 -translate-x-1/2 transition-all duration-500 z-10 ${
                  showToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'
                }`}
              >
                <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  <span className="text-xs text-gray-300">
                    {t('blockCreatedPrefix')}{' '}
                    <span className="text-white font-medium">{sc?.blockLabel}</span>
                  </span>
                </div>
              </div>

              {/* Input bar */}
              <div className="p-3 border-t border-gray-800 flex-shrink-0">
                <div className="bg-gray-800/50 rounded-lg px-3 py-2 text-xs text-gray-600">
                  {t('placeholder')}
                </div>
              </div>
            </div>

            {/* Right: Block panel (collapsed) */}
            <div className="w-14 border-l border-gray-800 bg-[#141618] flex flex-col items-center pt-4 gap-2.5 flex-shrink-0">
              {icons.existingBlocks.map(({ Icon, color }, i) => (
                <div
                  key={`${scenarioIdx}-existing-${i}`}
                  className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center"
                >
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
              ))}
              {/* New block — 토스트 이후 scale-in */}
              <div
                className={`w-9 h-9 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center transition-all duration-500 ${
                  showNewBlock ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                }`}
              >
                <icons.newBlock.Icon className={`w-5 h-5 ${icons.newBlock.color}`} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
