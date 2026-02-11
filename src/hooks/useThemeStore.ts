import { create } from "zustand";

type ThemeMode = "light" | "dark";

interface ThemeState {
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const getInitialTheme = (): ThemeMode => {
  const saved = localStorage.getItem("theme-mode");
  if (saved === "dark" || saved === "light") return saved;
  // Respetar preferencia del sistema
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
};

const useThemeStore = create<ThemeState>((set) => ({
  mode: getInitialTheme(),

  toggleTheme: () =>
    set((state) => {
      const next = state.mode === "dark" ? "light" : "dark";
      localStorage.setItem("theme-mode", next);
      return { mode: next };
    }),

  setTheme: (mode) => {
    localStorage.setItem("theme-mode", mode);
    set({ mode });
  },
}));

export default useThemeStore;
