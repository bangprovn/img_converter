import { ImageIcon, Zap, Layers, Settings } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Image Converter Pro
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                WASM-powered image conversion
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              <span>Simple</span>
            </div>
            <div className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              <span>Batch</span>
            </div>
            <div className="flex items-center gap-1">
              <Settings className="h-3 w-3" />
              <span>Advanced</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
