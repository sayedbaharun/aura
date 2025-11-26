/**
 * Aura Chat Button Component
 *
 * Floating action button to open/close the Aura chat interface.
 * Position: fixed bottom-right corner.
 */

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuraChat from "./aura-chat";
import { cn } from "@/lib/utils";

export default function AuraChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-40",
          "h-14 w-14 rounded-full shadow-lg",
          "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600",
          "transition-all duration-200 hover:scale-110",
          isOpen && "hidden"
        )}
        size="icon"
        aria-label="Open Aura chat"
      >
        <Sparkles className="h-6 w-6" />
      </Button>

      {/* Chat Interface */}
      <AuraChat isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
