export function Footer() {
  return (
    <footer className="mt-auto border-t bg-muted/50">
      <div className="container flex h-16 items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <p>Built with React, TypeScript, and Tailwind CSS</p>
          <span className="hidden sm:inline">•</span>
          <p className="hidden sm:inline">Powered by jSquash WASM codecs</p>
        </div>
        <div className="flex items-center gap-4">
          <p className="flex items-center gap-1">
            Made by <a href="https://github.com/bangprovn" target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">bangprovn</a>
          </p>
          <p className="hidden sm:inline">© {new Date().getFullYear()}</p>
        </div>
      </div>
    </footer>
  );
}
