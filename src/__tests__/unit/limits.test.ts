import { LIMITS } from '@/lib/limits';

describe('LIMITS 상수', () => {
  it('MESSAGE_MAX_CHARS는 양수이다', () => {
    expect(LIMITS.MESSAGE_MAX_CHARS).toBeGreaterThan(0);
  });

  it('MESSAGE_WARN_CHARS는 MESSAGE_MAX_CHARS보다 작다', () => {
    expect(LIMITS.MESSAGE_WARN_CHARS).toBeLessThan(LIMITS.MESSAGE_MAX_CHARS);
  });

  it('SESSION_WARN_MESSAGES는 SESSION_MAX_MESSAGES보다 작다', () => {
    expect(LIMITS.SESSION_WARN_MESSAGES).toBeLessThan(LIMITS.SESSION_MAX_MESSAGES);
  });

  it('DAILY_WARN_MESSAGES는 DAILY_MAX_MESSAGES보다 작다', () => {
    expect(LIMITS.DAILY_WARN_MESSAGES).toBeLessThan(LIMITS.DAILY_MAX_MESSAGES);
  });

  it('MESSAGE_COOLDOWN_MS는 양수이다', () => {
    expect(LIMITS.MESSAGE_COOLDOWN_MS).toBeGreaterThan(0);
  });

  it('MAX_ACTIVE_BLOCKS는 양수이다', () => {
    expect(LIMITS.MAX_ACTIVE_BLOCKS).toBeGreaterThan(0);
  });

  it('기본값 확인', () => {
    expect(LIMITS.MESSAGE_MAX_CHARS).toBe(1000);
    expect(LIMITS.MESSAGE_WARN_CHARS).toBe(900);
    expect(LIMITS.SESSION_MAX_MESSAGES).toBe(50);
    expect(LIMITS.SESSION_WARN_MESSAGES).toBe(45);
    expect(LIMITS.DAILY_MAX_MESSAGES).toBe(30);
    expect(LIMITS.DAILY_WARN_MESSAGES).toBe(25);
    expect(LIMITS.MESSAGE_COOLDOWN_MS).toBe(3000);
    expect(LIMITS.MAX_ACTIVE_BLOCKS).toBe(10);
  });
});
