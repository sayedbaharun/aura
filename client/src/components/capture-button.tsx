import { Plus } from 'lucide-react';
import { useCaptureModal } from '@/lib/capture-modal-store';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';

export default function CaptureButton() {
  const { openCaptureModal } = useCaptureModal();

  // Keyboard shortcut (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openCaptureModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openCaptureModal]);

  return (
    <Button
      onClick={openCaptureModal}
      className="fixed bottom-6 right-6 h-14 px-5 rounded-full shadow-lg hover:shadow-xl transition-all z-50 gap-2"
      size="lg"
    >
      <Plus className="h-5 w-5" />
      <span className="hidden sm:inline">Capture</span>
    </Button>
  );
}
