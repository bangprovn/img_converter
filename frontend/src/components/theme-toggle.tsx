import { Moon, Sun, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { useState, useEffect } from "react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [showLabel, setShowLabel] = useState(false)

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark")
    } else if (theme === "dark") {
      setTheme("system")
    } else {
      setTheme("light")
    }
    setShowLabel(true)
  }

  useEffect(() => {
    if (showLabel) {
      const timer = setTimeout(() => setShowLabel(false), 1500)
      return () => clearTimeout(timer)
    }
  }, [showLabel])

  const getIcon = () => {
    if (theme === "light") return <Sun className="h-[1.2rem] w-[1.2rem]" />
    if (theme === "dark") return <Moon className="h-[1.2rem] w-[1.2rem]" />
    return <Monitor className="h-[1.2rem] w-[1.2rem]" />
  }

  const getLabel = () => {
    if (theme === "light") return "Light"
    if (theme === "dark") return "Dark"
    return "Auto"
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className={`transition-all duration-300 overflow-hidden ${
        showLabel ? "w-auto px-3 gap-2" : ""
      }`}
    >
      {getIcon()}
      <span
        className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
          showLabel ? "max-w-[4rem] opacity-100 ml-2" : "max-w-0 opacity-0"
        }`}
      >
        {getLabel()}
      </span>
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
