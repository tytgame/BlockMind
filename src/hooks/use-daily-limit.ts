import { useState, useCallback } from 'react';
import { LIMITS } from '@/lib/limits';

const STORAGE_KEY = 'bm_daily_usage';

interface DailyUsage {
  count: number;
  date: string; // 'YYYY-MM-DD'
}

export function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function readUsage(): DailyUsage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, date: getTodayDate() };
    const parsed: DailyUsage = JSON.parse(raw);
    if (parsed.date !== getTodayDate()) {
      return { count: 0, date: getTodayDate() };
    }
    return parsed;
  } catch {
    return { count: 0, date: getTodayDate() };
  }
}

export function writeUsage(usage: DailyUsage): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
  } catch {
    // localStorage 접근 불가 시 무시
  }
}

export function useDailyLimit() {
  const [usage, setUsage] = useState<DailyUsage>(() => readUsage());

  const increment = useCallback(() => {
    const current = readUsage();
    const updated = { count: current.count + 1, date: current.date };
    writeUsage(updated);
    setUsage(updated);
    return updated.count;
  }, []);

  const isMaxReached = usage.count >= LIMITS.DAILY_MAX_MESSAGES;
  const isWarnReached = usage.count >= LIMITS.DAILY_WARN_MESSAGES;
  const remaining = Math.max(0, LIMITS.DAILY_MAX_MESSAGES - usage.count);

  return { count: usage.count, remaining, isMaxReached, isWarnReached, increment };
}
