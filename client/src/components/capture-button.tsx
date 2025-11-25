import { Plus, Zap } from 'lucide-react';
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
      className="fixed bottom-6 right-6 h-16 px-6 rounded-full shadow-2xl hover:shadow-xl hover:scale-105 transition-all z-50 gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold animate-pulse hover:animate-none"
      size="lg"
    >
      <Zap className="h-5 w-5" />
      <span>Capture</span>
      <kbd className="hidden sm:inline-flex ml-1 px-1.5 py-0.5 text-xs bg-white/20 rounded">⌘K</kbd>
    </Button>
  );
}
