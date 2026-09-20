import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Eraser,
  Film,
  ImageIcon,
  ImageOff,
  Menu,
  Stamp,
  Video,
  X,
  type LucideIcon,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  activeClassName: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    label: 'Image Converter',
    shortLabel: 'Image',
    icon: ImageIcon,
    activeClassName:
      'bg-gradient-to-r from-blue-100 to-purple-100 text-blue-900 dark:from-blue-950 dark:to-purple-950 dark:text-blue-100',
  },
  {
    to: '/gif',
    label: 'GIF Tools',
    shortLabel: 'GIF',
    icon: Film,
    activeClassName:
      'bg-gradient-to-r from-pink-100 to-purple-100 text-pink-900 dark:from-pink-950 dark:to-purple-950 dark:text-pink-100',
  },
  {
    to: '/video',
    label: 'Video Tools',
    shortLabel: 'Video',
    icon: Video,
    activeClassName:
      'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-900 dark:from-blue-950 dark:to-indigo-950 dark:text-blue-100',
  },
  {
    to: '/background-removal',
    label: 'Background Removal',
    shortLabel: 'BG',
    icon: ImageOff,
    activeClassName:
      'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-900 dark:from-indigo-950 dark:to-purple-950 dark:text-indigo-100',
  },
  {
    to: '/watermark',
    label: 'Watermark',
    shortLabel: 'Watermark',
    icon: Stamp,
    activeClassName:
      'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-900 dark:from-emerald-950 dark:to-teal-950 dark:text-emerald-100',
  },
  {
    to: '/watermark-removal',
    label: 'Remove Watermark',
    shortLabel: 'Remove',
    icon: Eraser,
    activeClassName:
      'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-900 dark:from-amber-950 dark:to-orange-950 dark:text-amber-100',
  },
];

function isActive(pathname: string, to: string) {
  if (to === '/') {
    return pathname === '/';
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function Header() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close the mobile drawer whenever the route changes (including back/forward).
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 pt-safe-top backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex min-h-16 items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2" aria-label="ProConverter home">
          <ImageIcon className="h-6 w-6 shrink-0 text-primary sm:h-7 sm:w-7" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="truncate bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-base font-bold text-transparent sm:text-xl">
              ProConverter
            </h1>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              WASM-powered media conversion
            </p>
          </div>
        </Link>

        {/* Desktop navigation. Tablets and phones use the accessible drawer. */}
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const active = isActive(location.pathname, item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? item.activeClassName
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden xl:inline">{item.label}</span>
                <span className="xl:hidden">{item.shortLabel}</span>
              </Link>
            );
          })}
        </nav>

        {/* Desktop theme toggle. */}
        <div className="hidden shrink-0 lg:block">
          <ThemeToggle />
        </div>

        {/* Mobile / tablet navigation. */}
        <div className="flex shrink-0 items-center gap-1 lg:hidden">
          <ThemeToggle />
          <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </DialogTrigger>
            <DialogContent className="!left-auto !right-0 !top-0 !flex !h-[100dvh] !w-[86%] !max-w-xs !translate-x-0 !translate-y-0 !animate-none !flex-col !gap-0 !rounded-none !border-y-0 !border-r-0 !p-0 [&>button]:hidden">
              <DialogHeader className="border-b p-4 pt-safe-top text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <DialogTitle className="truncate text-base font-semibold">Navigation</DialogTitle>
                    <DialogDescription className="sr-only">
                      Choose a tool to open.
                    </DialogDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-mr-1 -mt-1 h-11 w-11 shrink-0"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Close navigation menu"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </div>
              </DialogHeader>

              <nav aria-label="Mobile" className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
                {NAV_ITEMS.map((item) => {
                  const active = isActive(location.pathname, item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex min-h-12 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
                        active ? item.activeClassName : 'text-foreground hover:bg-muted'
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <p className="px-1 text-xs text-muted-foreground">
                  Everything is processed locally in your browser.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
