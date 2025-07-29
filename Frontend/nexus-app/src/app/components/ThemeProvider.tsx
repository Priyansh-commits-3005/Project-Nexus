"use client";
import { createContext, useState, useEffect, ReactNode } from "react";

interface ThemeContextProps {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextProps>({
  theme: "dark",
  toggleTheme: () => {},
});

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const stored = localStorage.getItem("nexus_theme");
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    console.log('Theme changed to:', theme);
    localStorage.setItem("nexus_theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
    console.log('HTML class list:', document.documentElement.classList.toString());
  }, [theme]);

  const toggleTheme = () => {
    console.log('Toggle theme called, current theme:', theme);
    setTheme((prev) => {
      const newTheme = prev === "dark" ? "light" : "dark";
      console.log('Switching from', prev, 'to', newTheme);
      return newTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
