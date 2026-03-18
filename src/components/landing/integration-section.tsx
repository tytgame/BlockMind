'use client';

import { useEffect, useState } from 'react';
import { Image, FileText, PawPrint, Dumbbell, Plane, Code2, UtensilsCrossed, Music, BookOpen, Heart, Briefcase, Gamepad2, DollarSign, ShoppingBag, Home, Trophy, Film, User, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

const CATEGORY_ICONS: { Icon: LucideIcon; color: string }[] = [
  { Icon: Briefcase,     color: 'text-slate-300'   },
  { Icon: Code2,         color: 'text-emerald-400' },
  { Icon: BookOpen,      color: 'text-blue-400'    },
  { Icon: UtensilsCrossed, color: 'text-yellow-400' },
  { Icon: Heart,         color: 'text-rose-400'    },
  { Icon: Plane,         color: 'text-sky-400'     },
  { Icon: Music,         color: 'text-purple-400'  },
  { Icon: DollarSign,    color: 'text-green-400'   },
  { Icon: Gamepad2,      color: 'text-violet-400'  },
  { Icon: PawPrint,      color: 'text-amber-400'   },
  { Icon: Dumbbell,      color: 'text-orange-400'  },
  { Icon: ShoppingBag,   color: 'text-pink-400'    },
  { Icon: Home,          color: 'text-amber-300'   },
  { Icon: Trophy,        color: 'text-lime-400'    },
  { Icon: Film,          color: 'text-red-400'     },
  { Icon: User,          color: 'text-cyan-400'    },
];

function CyclingIcon() {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIdx(prev => (prev + 1) % CATEGORY_ICONS.length);
        setFade(true);
      }, 200);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  const { Icon, color } = CATEGORY_ICONS[idx];
  return (
    <div className={`transition-opacity duration-200 ${fade ? 'opacity-100' : 'opacity-0'}`}>
      <Icon className={`w-6 h-6 ${color}`} />
    </div>
  );
}

const BLOCK_CONFIG = [
  { gradientFrom: 'from-blue-600', gradientTo: 'to-blue-700', cycling: true },
  { gradientFrom: 'from-teal-600', gradientTo: 'to-teal-700', cycling: false, Icon: Image, color: 'text-teal-400' },
  { gradientFrom: 'from-green-600', gradientTo: 'to-green-700', cycling: false, Icon: FileText, color: 'text-green-400' },
];

export function IntegrationSection() {
  const t = useTranslations('integration');
  const blocks = t.raw('blocks') as Array<{ name: string; description: string }>;
  const blockTypes = blocks.map((block, i) => ({
    ...BLOCK_CONFIG[i],
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

        {/* Block Types */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {blockTypes.map((block, index) => (
            <div
              key={index}
              className="p-6 text-center"
            >
              {/* Icon */}
              <div className="mb-4 mx-auto inline-flex p-4">
                {block.cycling ? (
                  <CyclingIcon />
                ) : (
                  block.Icon && <block.Icon className={`w-6 h-6 ${block.color}`} />
                )}
              </div>

              {/* Name */}
              <h3 className="text-lg font-bold text-white mb-2">{block.name}</h3>

              {/* Description */}
              <p className="text-xs text-gray-400">{block.description}</p>
            </div>
          ))}
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
