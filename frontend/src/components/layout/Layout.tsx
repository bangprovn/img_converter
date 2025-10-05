import { Header } from "./Header"
import { Footer } from "./Footer"

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container flex-1 py-4 px-4 sm:py-6 sm:px-6 md:py-8">
        {children}
      </main>
      <Footer />
    </div>
  )
}
