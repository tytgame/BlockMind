'use client';

import { User, Bot, Send } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function DemoSection() {
  return (
    <section className="py-12 px-6">
      <div className="container mx-auto max-w-4xl">
        {/* Chat Window Mockup */}
        <div className="relative rounded-xl overflow-hidden border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 shadow-2xl">
          {/* Window Controls */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 bg-gray-900/50">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="flex-1 text-center">
              <span className="text-xs text-gray-500 font-medium">BlockMind 1.0 Pro</span>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="p-6 space-y-6 min-h-[400px] max-h-[500px] overflow-y-auto">
            {/* User Message */}
            <div className="flex gap-3 justify-end">
              <div className="bg-blue-600 rounded-2xl rounded-tr-sm px-5 py-3 max-w-[80%]">
                <p className="text-white text-sm leading-relaxed">
                  Write a Python script to analyze sentiment in customer reviews.
                </p>
              </div>
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-gray-700">
                  <User className="h-4 w-4 text-gray-300" />
                </AvatarFallback>
              </Avatar>
            </div>

            {/* AI Response */}
            <div className="flex gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600">
                  <Bot className="h-4 w-4 text-white" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-5 py-3 max-w-[80%]">
                <p className="text-gray-300 text-sm leading-relaxed mb-3">
                  Here is a simple Python script using "TextBlob" for sentiment analysis:
                </p>
                <div className="bg-gray-950 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                  <pre className="text-gray-300">
                    <span className="text-purple-400">from</span> textblob <span className="text-purple-400">import</span> TextBlob
                    {'\n\n'}
                    reviews = [<span className="text-green-400">"I love this product!"</span>, <span className="text-green-400">"It was okay, not great."</span>]
                    {'\n'}
                    <span className="text-purple-400">for</span> review <span className="text-purple-400">in</span> reviews:
                    {'\n'}
                    {'    '}analysis = TextBlob(review)
                    {'\n'}
                    {'    '}<span className="text-blue-400">print</span>(<span className="text-green-400">f"Sentiment: </span>{'{'}<span className="text-yellow-400">analysis.sentiment</span>{'}'}<span className="text-green-400">"</span>)
                  </pre>
                </div>
              </div>
            </div>

            {/* Typing Indicator */}
            <div className="flex gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600">
                  <Bot className="h-4 w-4 text-white" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-gray-800 rounded-2xl px-5 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-800 bg-gray-900/50">
            <div className="flex gap-2">
              <Input
                placeholder="Message BlockMind..."
                className="flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                disabled
              />
              <Button size="icon" className="bg-blue-600 hover:bg-blue-700" disabled>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
