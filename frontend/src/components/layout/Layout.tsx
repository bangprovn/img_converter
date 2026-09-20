import { Header } from "./Header"
import { Footer } from "./Footer"

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[100] -translate-y-[200%] rounded-md bg-background px-4 py-3 text-sm font-medium shadow ring-2 ring-ring transition-transform focus:translate-y-0 focus-visible:outline-none"
      >
        Skip to main content
      </a>
      <Header />
      <main
        id="main-content"
        tabIndex={-1}
        className="container w-full flex-1 px-3 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 md:py-8"
      >
        {children}
      </main>
      <Footer />
    </div>
  )
}
