"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

export default function ThemeSelector() {
  const [theme, setTheme] = useState<Theme>("system");
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Check system theme
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    setSystemTheme(mediaQuery.matches ? "dark" : "light");
    mediaQuery.addEventListener("change", handleChange);

    // Get saved theme
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    const initialTheme = savedTheme || "system";
    setTheme(initialTheme);

    // Apply initial theme
    applyTheme(initialTheme, mediaQuery.matches ? "dark" : "light");

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (theme === "system") {
      applyTheme("system", systemTheme);
    }
  }, [systemTheme]);

  const applyTheme = (selectedTheme: Theme, sysTheme: "light" | "dark") => {
    const actualTheme = selectedTheme === "system" ? sysTheme : selectedTheme;
    document.documentElement.setAttribute("data-theme", actualTheme);
  };

  const changeTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme, systemTheme);
  };

  const getDisplayText = () => {
    if (theme === "system") {
      return `🖥️ System (${systemTheme === "dark" ? "Dark" : "Light"})`;
    }
    return theme === "light" ? "☀️ Light" : "🌙 Dark";
  };

  const cycleTheme = () => {
    const themes: Theme[] = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    changeTheme(themes[nextIndex]);
  };

  return (
    <button
      onClick={cycleTheme}
      className="btn btn-secondary"
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: 1000,
        padding: "8px 12px",
        fontSize: "14px",
      }}
      title="Click to cycle through themes: Light → Dark → System"
    >
      {getDisplayText()}
    </button>
  );
}
