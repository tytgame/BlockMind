import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { GripVertical, X, Eye, EyeOff } from 'lucide-react';
import { Block, BlockType } from '@/types/block';
import { useBlockStore } from '@/store/block-store';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface BlockItemProps {
  block: Block;
}

const typeColors: Record<BlockType, string> = {
  persona: 'bg-blue-100 dark:bg-blue-900 border-blue-200 dark:border-blue-800',
  rule: 'bg-red-100 dark:bg-red-900 border-red-200 dark:border-red-800',
  data: 'bg-green-100 dark:bg-green-900 border-green-200 dark:border-green-800',
  output: 'bg-purple-100 dark:bg-purple-900 border-purple-200 dark:border-purple-800',
};

const typeLabels: Record<BlockType, string> = {
  persona: 'Persona',
  rule: 'Rule',
  data: 'Data',
  output: 'Output Format',
};

export function BlockItem({ block }: BlockItemProps) {
  const { updateBlock, removeBlock } = useBlockStore();
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
    <div ref={setNodeRef} style={style} className="mb-3 group">
      <Card
        className={cn(
          'border-l-4 transition-all shadow-sm hover:shadow-md',
          typeColors[block.type],
          !block.isVisible && 'opacity-60 grayscale'
        )}
      >
        <CardHeader className="p-3 pb-2 flex flex-row items-center space-y-0 gap-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="flex-1 flex items-center gap-2 overflow-hidden">
            <Badge variant="outline" className="text-xs uppercase font-bold px-1.5 py-0 h-5">
              {typeLabels[block.type]}
            </Badge>
            {isEditing ? (
               <Input
               value={block.label}
               onChange={(e) => updateBlock(block.id, { label: e.target.value })}
               className="h-7 text-sm font-medium"
             />
            ) : (
              <span className="text-sm font-medium truncate cursor-pointer" onClick={() => setIsEditing(true)}>
                {block.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => updateBlock(block.id, { isVisible: !block.isVisible })}
            >
              {block.isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => removeBlock(block.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        
        {block.isVisible && (
          <CardContent className="p-3 pt-0">
            <Textarea
              value={block.content}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              className="min-h-[80px] text-sm resize-none bg-background/50 focus:bg-background transition-colors"
              placeholder="Enter context prompt..."
            />
          </CardContent>
        )}
      </Card>
    </div>
  );
}
