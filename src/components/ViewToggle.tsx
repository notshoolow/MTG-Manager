"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ArrowLeftRight } from "lucide-react";

export function ViewToggle() {
  const pathname = usePathname();
  
  const getTargetPath = (currentPath: string) => {
    if (!currentPath.startsWith("/admin") && !currentPath.startsWith("/player")) {
      return "/";
    }

    const mode = currentPath.startsWith("/admin") ? "admin" : "player";
    const targetMode = mode === "admin" ? "/player" : "/admin";
    const subPath = currentPath.substring(mode.length + 1);

    // Rutas compartidas exactas
    const sharedPaths = ["/articles", "/singles", "/tournaments"];
    if (sharedPaths.includes(subPath)) {
      return `${targetMode}${subPath}`;
    }

    // Rutas compartidas dinámicas (excluyendo las exclusivas de cada modo)
    if (subPath.startsWith("/tournaments/tournament/") && subPath !== "/tournaments/tournament/new") {
      return `${targetMode}${subPath}`;
    }
    
    if (subPath.startsWith("/tournaments/history/") && subPath !== "/tournaments/history") {
      return `${targetMode}${subPath}`;
    }

    // Si la ruta es exclusiva (ej. /player/profile) o la raíz del modo, redirigimos a la página principal por defecto del otro modo
    return `${targetMode}/tournaments`;
  };

  const targetPath = getTargetPath(pathname || "");

  // Prevención de discrepancias de hidratación (hydration mismatch): se renderiza un componente neutro durante el SSR
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="secondary" className="gap-2 flex items-center opacity-70 py-1 px-3 text-sm">
        <ArrowLeftRight className="w-4 h-4" />
        Alternar Vista
      </Button>
    );
  }

  return (
    <Link href={targetPath} prefetch={false}>
      <Button variant="secondary" className="gap-2 flex items-center py-1 px-3 text-sm">
        <ArrowLeftRight className="w-4 h-4" />
        Alternar Vista
      </Button>
    </Link>
  );
}
