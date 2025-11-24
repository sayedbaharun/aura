import { Link } from "wouter";
import { Brain } from "lucide-react";

export default function Logo() {
  return (
    <Link href="/">
      <a className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <Brain className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="font-bold text-xl">Hikma-OS</span>
      </a>
    </Link>
  );
}
