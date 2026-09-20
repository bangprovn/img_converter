export function Footer() {
  return (
    <footer className="mt-auto border-t bg-muted/50">
      <div className="container flex flex-col items-center gap-2 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-sm text-muted-foreground sm:flex-row sm:justify-between sm:gap-4 sm:text-left">
        <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-4">
          <p>Built with React, TypeScript, and Tailwind CSS</p>
          <span className="hidden sm:inline">•</span>
          <p className="hidden sm:inline">Powered by jSquash WASM codecs</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <p className="flex items-center gap-1">
            Made by{' '}
            <a
              href="https://github.com/bangprovn"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded font-medium hover:underline focus-visible:underline"
            >
              bangprovn
            </a>
          </p>
          <p className="hidden sm:inline">© {new Date().getFullYear()}</p>
        </div>
      </div>
    </footer>
  );
}
