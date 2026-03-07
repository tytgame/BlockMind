import { getTodayDate, readUsage, writeUsage } from '@/hooks/use-daily-limit';
import { LIMITS } from '@/lib/limits';

const STORAGE_KEY = 'bm_daily_usage';

beforeEach(() => {
  localStorage.clear();
});

// ──────────────────────────────────────────
// getTodayDate
// ──────────────────────────────────────────
describe('getTodayDate', () => {
  it('YYYY-MM-DD 형식을 반환한다', () => {
    const result = getTodayDate();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('현재 날짜를 반환한다', () => {
    const expected = new Date().toISOString().slice(0, 10);
    expect(getTodayDate()).toBe(expected);
  });
});

// ──────────────────────────────────────────
// readUsage
// ──────────────────────────────────────────
describe('readUsage', () => {
  it('localStorage가 비어있으면 count=0, 오늘 날짜를 반환한다', () => {
    const usage = readUsage();
    expect(usage.count).toBe(0);
    expect(usage.date).toBe(getTodayDate());
  });

  it('오늘 날짜 데이터가 있으면 그대로 반환한다', () => {
    const today = getTodayDate();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: 5, date: today }));

    const usage = readUsage();
    expect(usage.count).toBe(5);
    expect(usage.date).toBe(today);
  });

  it('어제 날짜 데이터가 있으면 count=0으로 리셋한다', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: 20, date: yesterday }));

    const usage = readUsage();
    expect(usage.count).toBe(0);
    expect(usage.date).toBe(getTodayDate());
  });

  it('손상된 JSON이면 count=0, 오늘 날짜를 반환한다', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');

    const usage = readUsage();
    expect(usage.count).toBe(0);
    expect(usage.date).toBe(getTodayDate());
  });
});

// ──────────────────────────────────────────
// writeUsage
// ──────────────────────────────────────────
describe('writeUsage', () => {
  it('localStorage에 사용량을 저장한다', () => {
    const today = getTodayDate();
    writeUsage({ count: 7, date: today });

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.count).toBe(7);
    expect(parsed.date).toBe(today);
  });

  it('write 후 readUsage로 동일한 값을 읽는다', () => {
    const today = getTodayDate();
    writeUsage({ count: 12, date: today });

    const usage = readUsage();
    expect(usage.count).toBe(12);
  });
});

// ──────────────────────────────────────────
// 일일 제한 경계값 테스트
// ──────────────────────────────────────────
describe('일일 제한 경계값', () => {
  it('count가 DAILY_WARN_MESSAGES 미만이면 경고 조건이 아니다', () => {
    const today = getTodayDate();
    writeUsage({ count: LIMITS.DAILY_WARN_MESSAGES - 1, date: today });

    const usage = readUsage();
    expect(usage.count < LIMITS.DAILY_WARN_MESSAGES).toBe(true);
  });

  it('count가 DAILY_WARN_MESSAGES 이상이면 경고 조건이다', () => {
    const today = getTodayDate();
    writeUsage({ count: LIMITS.DAILY_WARN_MESSAGES, date: today });

    const usage = readUsage();
    expect(usage.count >= LIMITS.DAILY_WARN_MESSAGES).toBe(true);
  });

  it('count가 DAILY_MAX_MESSAGES 이상이면 최대 조건이다', () => {
    const today = getTodayDate();
    writeUsage({ count: LIMITS.DAILY_MAX_MESSAGES, date: today });

    const usage = readUsage();
    expect(usage.count >= LIMITS.DAILY_MAX_MESSAGES).toBe(true);
  });

  it('count가 DAILY_MAX_MESSAGES 미만이면 최대 조건이 아니다', () => {
    const today = getTodayDate();
    writeUsage({ count: LIMITS.DAILY_MAX_MESSAGES - 1, date: today });

    const usage = readUsage();
    expect(usage.count >= LIMITS.DAILY_MAX_MESSAGES).toBe(false);
  });
});

// ──────────────────────────────────────────
// 날짜 전환 시나리오
// ──────────────────────────────────────────
describe('날짜 전환 시나리오', () => {
  it('3일 전 날짜로 저장된 데이터는 리셋된다', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: 30, date: threeDaysAgo }));

    const usage = readUsage();
    expect(usage.count).toBe(0);
    expect(usage.date).toBe(getTodayDate());
  });

  it('미래 날짜 데이터도 오늘과 다르면 리셋된다', () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: 15, date: tomorrow }));

    const usage = readUsage();
    expect(usage.count).toBe(0);
    expect(usage.date).toBe(getTodayDate());
  });
});
