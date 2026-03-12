import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { ChatInputComposer } from '@/components/chat/chat-input-composer';

// ── Mocks ────────────────────────────────────────────────────

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockSetInput = jest.fn();
let mockInput = '';

jest.mock('@/store/chat-store', () => ({
  useChatStore: () => ({ input: mockInput, setInput: mockSetInput }),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, type, className }: React.ComponentProps<'button'>) =>
    React.createElement('button', { onClick, disabled, type, className }, children),
}));

jest.mock('@/components/chat/file-attachment-preview', () => ({
  FileAttachmentPreview: () => null,
}));

jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' '),
}));

// ── 헬퍼 ─────────────────────────────────────────────────────

const defaultProps = {
  attachedFiles: [],
  onRemoveFile: jest.fn(),
  onFileInputChange: jest.fn(),
  onPaste: jest.fn(),
  onSubmit: jest.fn(),
  onStop: jest.fn(),
  isLoading: false,
  apiError: null,
  onErrorClose: jest.fn(),
};

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
  mockInput = '';
});

// ── 테스트 ────────────────────────────────────────────────────

describe('ChatInputComposer — 전송 버튼 (isLoading=false)', () => {
  it('type="submit" 버튼이 렌더링된다', () => {
    const { container } = render(React.createElement(ChatInputComposer, defaultProps));
    const submitBtn = container.querySelector('button[type="submit"]');
    expect(submitBtn).not.toBeNull();
  });

  it('정지 버튼(Square)이 없다 — type="button" 버튼은 Plus + Settings 2개만', () => {
    const { container } = render(React.createElement(ChatInputComposer, defaultProps));
    const typeBtns = container.querySelectorAll('button[type="button"]');
    // Plus, Settings = 2개 (stop 버튼 없음)
    expect(typeBtns.length).toBe(2);
  });

  it('input이 비어있으면 전송 버튼이 disabled다', () => {
    mockInput = '';
    const { container } = render(React.createElement(ChatInputComposer, defaultProps));
    const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it('input이 있으면 전송 버튼이 활성화된다', () => {
    mockInput = '안녕하세요';
    const { container } = render(React.createElement(ChatInputComposer, defaultProps));
    const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);
  });

  it('isDisabled=true이면 전송 버튼이 disabled다', () => {
    mockInput = '입력 있음';
    const { container } = render(
      React.createElement(ChatInputComposer, { ...defaultProps, isDisabled: true })
    );
    const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it('전송 버튼 클릭 시 form submit → onSubmit이 호출된다', () => {
    mockInput = '테스트 메시지';
    const onSubmit = jest.fn((e: React.FormEvent) => e.preventDefault());
    const { container } = render(
      React.createElement(ChatInputComposer, { ...defaultProps, onSubmit })
    );
    const form = container.querySelector('form')!;
    fireEvent.submit(form);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe('ChatInputComposer — 정지 버튼 (isLoading=true)', () => {
  it('type="submit" 버튼이 없다', () => {
    const { container } = render(
      React.createElement(ChatInputComposer, { ...defaultProps, isLoading: true })
    );
    const submitBtn = container.querySelector('button[type="submit"]');
    expect(submitBtn).toBeNull();
  });

  it('type="button" 버튼이 3개다 — Plus + Settings + Stop', () => {
    const { container } = render(
      React.createElement(ChatInputComposer, { ...defaultProps, isLoading: true })
    );
    const typeBtns = container.querySelectorAll('button[type="button"]');
    expect(typeBtns.length).toBe(3);
  });

  it('정지 버튼(마지막 버튼) 클릭 시 onStop이 호출된다', () => {
    const onStop = jest.fn();
    const { container } = render(
      React.createElement(ChatInputComposer, { ...defaultProps, isLoading: true, onStop })
    );
    const typeBtns = container.querySelectorAll('button[type="button"]');
    const stopBtn = typeBtns[typeBtns.length - 1];
    fireEvent.click(stopBtn);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('정지 버튼 클릭 시 onSubmit은 호출되지 않는다', () => {
    const onSubmit = jest.fn();
    const onStop = jest.fn();
    const { container } = render(
      React.createElement(ChatInputComposer, { ...defaultProps, isLoading: true, onStop, onSubmit })
    );
    const typeBtns = container.querySelectorAll('button[type="button"]');
    const stopBtn = typeBtns[typeBtns.length - 1];
    fireEvent.click(stopBtn);
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('ChatInputComposer — 에러 배너', () => {
  it('apiError가 있으면 에러 배너가 표시된다', () => {
    const { container } = render(
      React.createElement(ChatInputComposer, { ...defaultProps, apiError: '오류 발생' })
    );
    expect(container.textContent).toContain('오류 발생');
  });

  it('apiError가 null이면 에러 배너가 없다', () => {
    const { container } = render(React.createElement(ChatInputComposer, defaultProps));
    expect(container.querySelector('[class*="red"]')).toBeNull();
  });
});
