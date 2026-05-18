import { createContext, useContext, useEffect, useMemo, useState } from "react"

export type Theme = "dark" | "light"
type ResolvedTheme = Theme

type ThemeProviderProps = {
    children: React.ReactNode
    defaultTheme?: Theme
    storageKey?: string
}

type ThemeProviderState = {
    theme: Theme
    resolvedTheme: ResolvedTheme
    setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
    theme: "dark",
    resolvedTheme: "dark",
    setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

const isTheme = (value: string | null): value is Theme =>
    value === "dark" || value === "light"

const normalizeStoredTheme = (storedTheme: string | null, defaultTheme: Theme): Theme =>
    storedTheme === "system" ? defaultTheme : isTheme(storedTheme) ? storedTheme : defaultTheme

export function ThemeProvider({
    children,
    defaultTheme = "dark",
    storageKey = "vite-ui-theme",
    ...props
}: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(
        () => {
            const storedTheme = localStorage.getItem(storageKey)
            return normalizeStoredTheme(storedTheme, defaultTheme)
        }
    )
    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(theme)

    useEffect(() => {
        const root = window.document.documentElement

        root.classList.remove("light", "dark")
        root.classList.add(theme)
        root.style.colorScheme = theme
        setResolvedTheme(theme)
    }, [theme])

    const value = useMemo(() => ({
        theme,
        resolvedTheme,
        setTheme: (theme: Theme) => {
            localStorage.setItem(storageKey, theme)
            setTheme(theme)
        },
    }), [resolvedTheme, storageKey, theme])

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext)

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider")

    return context
}
