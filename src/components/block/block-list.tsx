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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useBlockStore } from '@/store/block-store';
import { BlockItem } from './block-item';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
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
    <div className="h-full flex flex-col bg-muted/30">
      <div className="p-4 border-b bg-background flex justify-between items-center">
        <h2 className="font-semibold text-lg">Context Blocks</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> Add Block
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleAddBlock('persona')}>
              Persona
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddBlock('rule')}>
              Rule
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddBlock('data')}>
              Data
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddBlock('output')}>
              Output Format
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ScrollArea className="flex-1 p-4">
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
              <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                <p>No blocks yet.</p>
                <p className="text-sm">Add a block or start chatting to generate context.</p>
              </div>
            )}
          </SortableContext>
        </DndContext>
      </ScrollArea>
    </div>
  );
}
