'use client';

import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { GripVertical, X, Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react';
import { Block, BlockType } from '@/types/block';
import { useBlockStore } from '@/store/block-store';
import { cn } from '@/lib/utils';

interface BlockItemProps {
  block: Block;
}

const typeColors: Record<BlockType, string> = {
  persona: 'bg-blue-500',
  rule: 'bg-red-500',
  data: 'bg-green-500',
  output: 'bg-purple-500',
};

const typeDescriptions: Record<BlockType, string> = {
  persona: 'AI personality context.',
  rule: 'Behavioral constraint.',
  data: 'Reference information.',
  output: 'Response format specification.',
};

export function BlockItem({ block }: BlockItemProps) {
  const { updateBlock, removeBlock } = useBlockStore();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-2 group">
      <div
        className={cn(
          'relative rounded-lg bg-[#252830] overflow-hidden transition-all',
          'hover:bg-[#2a2f3a]',
          !block.isVisible && 'opacity-50'
        )}
      >
        {/* Color Bar */}
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 w-1',
            typeColors[block.type]
          )}
        />

        {/* Main Content */}
        <div className="pl-4 pr-2 py-3">
          <div className="flex items-start gap-2">
            {/* Drag Handle - Hidden by default, show on hover */}
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/5 rounded"
            >
              <GripVertical className="h-4 w-4 text-gray-500" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <Input
                  value={block.label}
                  onChange={(e) => updateBlock(block.id, { label: e.target.value })}
                  onBlur={() => setIsEditing(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
                  autoFocus
                  className="h-6 text-sm font-medium bg-transparent border-white/20 text-white px-1"
                />
              ) : (
                <h4
                  className="text-sm font-medium text-white cursor-pointer hover:text-blue-400 transition-colors truncate"
                  onClick={() => setIsEditing(true)}
                >
                  {block.label}
                </h4>
              )}
              <p className="text-xs text-gray-400 mt-0.5 truncate">
                {block.content || typeDescriptions[block.type]}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-500 hover:text-white hover:bg-white/10"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-500 hover:text-white hover:bg-white/10"
                onClick={() => updateBlock(block.id, { isVisible: !block.isVisible })}
              >
                {block.isVisible ? (
                  <Eye className="h-3 w-3" />
                ) : (
                  <EyeOff className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                onClick={() => removeBlock(block.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Expanded Content Editor */}
          {isExpanded && (
            <div className="mt-3 pl-5">
              <Textarea
                value={block.content}
                onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                className="min-h-[80px] text-sm resize-none bg-[#1a1d21] border-white/10 text-gray-200 placeholder:text-gray-500 focus-visible:ring-blue-500"
                placeholder="Enter context prompt..."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
