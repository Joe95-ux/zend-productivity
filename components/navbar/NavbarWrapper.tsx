"use client";

import { Navbar } from "@/components/navbar/Navbar";
import { usePathname } from "next/navigation";

export function NavbarWrapper() {
  const pathname = usePathname();

  const hideNavbar =
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/onboarding");

  if (hideNavbar) return null;

  return <Navbar />;
}
