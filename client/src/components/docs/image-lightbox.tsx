import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageLightbox({
  images,
  initialIndex = 0,
  open,
  onOpenChange,
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setScale(1);
    }
  }, [open, initialIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onOpenChange(false);
          break;
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          goToNext();
          break;
        case "+":
        case "=":
          zoomIn();
          break;
        case "-":
          zoomOut();
          break;
        case "0":
          resetZoom();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, currentIndex, scale]);

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setScale(1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setScale(1);
    }
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const resetZoom = () => {
    setScale(1);
  };

  if (images.length === 0) return null;

  const currentImage = images[currentIndex];
  const hasMultipleImages = images.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogOverlay className="bg-black/90" />
      <DialogContent
        className="max-w-[95vw] max-h-[95vh] p-0 border-0 bg-transparent overflow-hidden"
        onPointerDownOutside={() => onOpenChange(false)}
        aria-describedby={undefined}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white"
        >
          <X className="h-6 w-6" />
        </Button>

        {/* Zoom controls */}
        <div className="absolute top-4 left-4 z-50 flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="bg-black/50 hover:bg-black/70 text-white"
          >
            <ZoomOut className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetZoom}
            className="bg-black/50 hover:bg-black/70 text-white px-3"
          >
            {Math.round(scale * 100)}%
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomIn}
            disabled={scale >= 3}
            className="bg-black/50 hover:bg-black/70 text-white"
          >
            <ZoomIn className="h-5 w-5" />
          </Button>
        </div>

        {/* Image counter */}
        {hasMultipleImages && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black/50 text-white px-3 py-1 rounded-md text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        )}

        {/* Navigation arrows */}
        {hasMultipleImages && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 hover:bg-black/70 text-white disabled:opacity-30"
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNext}
              disabled={currentIndex === images.length - 1}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 hover:bg-black/70 text-white disabled:opacity-30"
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </>
        )}

        {/* Image */}
        <div className="flex items-center justify-center w-full h-full p-12">
          <img
            src={currentImage}
            alt={`Image ${currentIndex + 1}`}
            className={cn(
              "max-w-full max-h-full object-contain transition-transform duration-200",
              "select-none"
            )}
            style={{ transform: `scale(${scale})` }}
            draggable={false}
          />
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-black/50 text-white/70 px-3 py-1 rounded-md text-xs">
          ESC: Close | ←→: Navigate | +/-: Zoom | 0: Reset
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to setup image click handlers in markdown content
export function useImageLightbox(containerRef: React.RefObject<HTMLElement>) {
  const [images, setImages] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const imgElements = container.querySelectorAll("img");

    // Extract all image sources
    const imageSources = Array.from(imgElements).map((img) => img.src);
    setImages(imageSources);

    // Add click handlers
    const handleImageClick = (index: number) => {
      setSelectedIndex(index);
      setLightboxOpen(true);
    };

    imgElements.forEach((img, index) => {
      img.style.cursor = "pointer";
      const clickHandler = () => handleImageClick(index);
      img.addEventListener("click", clickHandler);

      // Store handler for cleanup
      (img as any)._lightboxClickHandler = clickHandler;
    });

    // Cleanup
    return () => {
      imgElements.forEach((img) => {
        if ((img as any)._lightboxClickHandler) {
          img.removeEventListener("click", (img as any)._lightboxClickHandler);
          delete (img as any)._lightboxClickHandler;
        }
      });
    };
  }, [containerRef.current?.innerHTML]);

  return {
    images,
    selectedIndex,
    lightboxOpen,
    setLightboxOpen,
  };
}
