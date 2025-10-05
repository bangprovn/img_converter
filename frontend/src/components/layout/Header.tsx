import { Link, useLocation } from 'react-router-dom';
import { ImageIcon, Film, Video } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

export function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-6 overflow-hidden">
          <Link to="/" className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <ImageIcon className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            <div>
              <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ProConverter
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                WASM-powered media conversion
              </p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={cn(
                "px-3 lg:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                location.pathname === "/"
                  ? "bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-950 dark:to-purple-950 text-blue-900 dark:text-blue-100"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <ImageIcon className="h-4 w-4 inline mr-1.5" />
              <span className="hidden lg:inline">Image Converter</span>
              <span className="lg:hidden">Image</span>
            </Link>
            <Link
              to="/gif"
              className={cn(
                "px-3 lg:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                location.pathname === "/gif"
                  ? "bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-950 dark:to-purple-950 text-pink-900 dark:text-pink-100"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Film className="h-4 w-4 inline mr-1.5" />
              <span className="hidden lg:inline">GIF Tools</span>
              <span className="lg:hidden">GIF</span>
            </Link>
            <Link
              to="/video"
              className={cn(
                "px-3 lg:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                location.pathname === "/video"
                  ? "bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-950 dark:to-indigo-950 text-blue-900 dark:text-blue-100"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Video className="h-4 w-4 inline mr-1.5" />
              <span className="hidden lg:inline">Video Tools</span>
              <span className="lg:hidden">Video</span>
            </Link>
          </nav>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center gap-2">
          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className={cn(
                "p-2 rounded-md transition-colors",
                location.pathname === "/"
                  ? "bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-950 dark:to-purple-950 text-blue-900 dark:text-blue-100"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title="Image Converter"
            >
              <ImageIcon className="h-5 w-5" />
            </Link>
            <Link
              to="/gif"
              className={cn(
                "p-2 rounded-md transition-colors",
                location.pathname === "/gif"
                  ? "bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-950 dark:to-purple-950 text-pink-900 dark:text-pink-100"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title="GIF Tools"
            >
              <Film className="h-5 w-5" />
            </Link>
            <Link
              to="/video"
              className={cn(
                "p-2 rounded-md transition-colors",
                location.pathname === "/video"
                  ? "bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-950 dark:to-indigo-950 text-blue-900 dark:text-blue-100"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title="Video Tools"
            >
              <Video className="h-5 w-5" />
            </Link>
          </nav>
          <ThemeToggle />
        </div>

        {/* Desktop Theme Toggle */}
        <div className="hidden md:flex items-center gap-4">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
