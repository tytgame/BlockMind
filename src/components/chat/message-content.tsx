'use client';

import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';

interface MessageContentProps {
  content: string;
  isUser: boolean;
}

export function MessageContent({ content, isUser }: MessageContentProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <p className="whitespace-pre-wrap leading-relaxed text-sm">{content}</p>
    );
  }

  return (
    <div className="text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-white mt-5 mb-3 first:mt-0 pb-1 border-b border-white/10">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-white mt-5 mb-2 first:mt-0 pb-1 border-b border-white/10">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-gray-100 mt-4 mb-1.5 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold text-gray-200 mt-3 mb-1 first:mt-0">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-gray-100 leading-relaxed mb-3 last:mb-0">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-200">{children}</em>
          ),
          hr: () => <hr className="my-4 border-white/10" />,
          ul: ({ children }) => (
            <ul className="space-y-1 mb-3 text-gray-100 pl-5 list-disc marker:text-gray-500">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-1 mb-3 text-gray-100 pl-5 list-decimal marker:text-gray-500">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),
          pre: ({ children }) => (
            <pre className="bg-[#1a1d21] border border-white/10 rounded-lg p-4 mb-3 overflow-x-auto text-sm">
              {children}
            </pre>
          ),
          code: ({ className, children }) => {
            const isCodeBlock = !!className;
            if (isCodeBlock) {
              return (
                <code className="text-gray-200 font-mono text-sm">
                  {children}
                </code>
              );
            }
            return (
              <code className="bg-white/10 text-blue-300 rounded px-1.5 py-0.5 font-mono text-[0.85em]">
                {children}
              </code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-white/20 pl-4 text-gray-400 my-3 italic">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-sm border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-white/10 px-3 py-2 text-left font-semibold text-gray-200 bg-white/5">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-white/10 px-3 py-2 text-gray-300">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>

      <div className="mt-1 flex items-center">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-gray-600 hover:text-gray-300 transition-colors py-1 px-1.5 rounded hover:bg-white/5"
          aria-label={copied ? 'Copied' : 'Copy message'}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
