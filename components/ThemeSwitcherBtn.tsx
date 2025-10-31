"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeSwitcherBtn() {
  const { setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [isBlueTheme, setIsBlueTheme] = React.useState(false);

  // Avoid hydration mismatch by only rendering after mount
  React.useEffect(() => {
    setMounted(true);
    // Check if blue theme is enabled (teal is default)
    const savedTheme = localStorage.getItem("color-theme");
    if (savedTheme === "blue") {
      setIsBlueTheme(true);
      document.body.setAttribute("data-theme", "blue");
    }
  }, []);

  const toggleBlueTheme = () => {
    const newBlueTheme = !isBlueTheme;
    setIsBlueTheme(newBlueTheme);
    
    if (newBlueTheme) {
      document.body.setAttribute("data-theme", "blue");
      localStorage.setItem("color-theme", "blue");
    } else {
      document.body.removeAttribute("data-theme");
      localStorage.setItem("color-theme", "teal");
    }
  };

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" disabled>
        <Sun className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
        <DropdownMenuItem onClick={toggleBlueTheme}>
          {isBlueTheme ? "Teal Theme" : "Blue Theme"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
