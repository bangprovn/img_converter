import { Link, useLocation } from 'react-router-dom';
import { ImageIcon, Film } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

export function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <ImageIcon className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Image Converter Pro
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                WASM-powered image conversion
              </p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                location.pathname === "/"
                  ? "bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-950 dark:to-purple-950 text-blue-900 dark:text-blue-100"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <ImageIcon className="h-4 w-4 inline mr-2" />
              Image Converter
            </Link>
            <Link
              to="/gif"
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                location.pathname === "/gif"
                  ? "bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-950 dark:to-purple-950 text-pink-900 dark:text-pink-100"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Film className="h-4 w-4 inline mr-2" />
              GIF Tools
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
