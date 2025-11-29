import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon } from 'lucide-react';
import { ImageUploadDialog } from './image-upload-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ImageUploadButtonProps {
  onInsert: (markdown: string) => void;
  docId?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ImageUploadButton({
  onInsert,
  docId,
  variant = 'ghost',
  size = 'sm',
}: ImageUploadButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={variant}
              size={size}
              onClick={() => setDialogOpen(true)}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Upload Image</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <ImageUploadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onInsert={onInsert}
        docId={docId}
      />
    </>
  );
}
