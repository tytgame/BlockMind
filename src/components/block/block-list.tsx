'use client';

import * as React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useBlockStore } from '@/store/block-store';
import { BlockItem } from './block-item';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';
import { BlockType } from '@/types/block';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function BlockList() {
  const { blocks, reorderBlocks, addBlock } = useBlockStore();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      reorderBlocks(active.id as string, over.id as string);
    }
  }

  const handleAddBlock = (type: BlockType) => {
    addBlock({
      type,
      label: `New ${type}`,
      content: '',
      color: '',
    });
  };

  return (
    <div className="h-full flex flex-col bg-[#1a1d21]">
      {/* Header */}
      <div className="px-4 py-4 border-b border-white/10 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">B</span>
          </div>
          <h2 className="font-semibold text-white">Context Blocks</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Active Memory Label */}
      <div className="px-4 py-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Active Memory
        </h3>
      </div>

      {/* Block List */}
      <ScrollArea className="flex-1 px-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={blocks.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            {blocks.map((block) => (
              <BlockItem key={block.id} block={block} />
            ))}
            {blocks.length === 0 && (
              <div className="text-center py-10 text-gray-500 border-2 border-dashed border-white/10 rounded-lg">
                <p className="text-sm">No blocks yet.</p>
                <p className="text-xs mt-1">
                  Add a block or start chatting to generate context.
                </p>
              </div>
            )}
          </SortableContext>
        </DndContext>
      </ScrollArea>

      {/* Add Block Button */}
      <div className="p-4 border-t border-white/10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full border-dashed border-white/20 text-gray-400 hover:text-white hover:bg-white/5 hover:border-white/30"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Context Block
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            className="w-48 bg-[#252830] border-white/10"
          >
            <DropdownMenuItem
              onClick={() => handleAddBlock('persona')}
              className="text-gray-300 focus:text-white focus:bg-white/10"
            >
              <div className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
              Persona
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleAddBlock('rule')}
              className="text-gray-300 focus:text-white focus:bg-white/10"
            >
              <div className="w-2 h-2 rounded-full bg-red-500 mr-2" />
              Rule
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleAddBlock('data')}
              className="text-gray-300 focus:text-white focus:bg-white/10"
            >
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
              Data
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleAddBlock('output')}
              className="text-gray-300 focus:text-white focus:bg-white/10"
            >
              <div className="w-2 h-2 rounded-full bg-purple-500 mr-2" />
              Output Format
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
