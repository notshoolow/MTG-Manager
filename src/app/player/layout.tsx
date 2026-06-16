import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { LayoutDashboard, ShoppingCart, BookOpen, Trophy, Coins } from "lucide-react";
import { ViewToggle } from "@/components/ViewToggle";
import CartIcon from "@/components/singles/CartIcon";
import { CartProvider } from "@/components/singles/CartContext";
import NotificationBell from "@/components/layout/NotificationBell";
 
export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-[var(--color-surface)] shadow-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-bold text-xl text-white tracking-tight">
              MTG Manager
            </Link>
            <nav className="hidden md:flex gap-6">
              <Link href="/player/tournaments" className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                <Trophy className="w-4 h-4" /> Torneos
              </Link>
              <Link href="/player/singles" className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                <ShoppingCart className="w-4 h-4" /> Singles
              </Link>
              <Link href="/player/buylist" className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                <Coins className="w-4 h-4" /> Vender Singles
              </Link>
              <Link href="/player/articles" className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                <BookOpen className="w-4 h-4" /> Artículos
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <ViewToggle />
            <NotificationBell />
            <CartIcon />
            <Link href="/player/profile">
              <Button variant="secondary" className="gap-2">
                <LayoutDashboard className="w-4 h-4" /> Mi Perfil
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
    </CartProvider>
  );
}
