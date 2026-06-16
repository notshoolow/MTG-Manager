import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { LayoutDashboard, ShoppingCart, BookOpen, Trophy, Settings, Coins } from "lucide-react";
import { ViewToggle } from "@/components/ViewToggle";
import NotificationBell from "@/components/layout/NotificationBell";
import { CartProvider } from "@/components/singles/CartContext";
 
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="min-h-screen flex bg-background">
        {/* Barra lateral */}
        <aside className="w-64 border-r border-gray-800 bg-[var(--color-surface)] flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-gray-800">
            <Link href="/" className="font-bold text-xl text-white tracking-tight">
              MTG Admin
            </Link>
          </div>
          
          <nav className="flex-1 py-6 px-4 space-y-2">
            <Link href="/admin" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">
              <LayoutDashboard className="w-5 h-5" /> Dashboard
            </Link>
            <Link href="/admin/tournaments" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">
              <Trophy className="w-5 h-5" /> Torneos
            </Link>
            <Link href="/admin/singles" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">
              <ShoppingCart className="w-5 h-5" /> Inventario
            </Link>
            <Link href="/admin/pricing" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">
              <Settings className="w-5 h-5" /> Precios
            </Link>
            <Link href="/admin/buylist" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">
              <Coins className="w-5 h-5" /> Tasaciones Buylist
            </Link>
            <Link href="/admin/articles" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">
              <BookOpen className="w-5 h-5" /> Artículos
            </Link>
          </nav>
 
          <div className="p-4 border-t border-gray-800">
            <Link href="/admin/settings" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
              <Settings className="w-5 h-5" /> Ajustes
            </Link>
          </div>
        </aside>
 
        {/* Contenido principal */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <header className="h-16 border-b border-gray-800 bg-[var(--color-surface)]/50 backdrop-blur-sm flex items-center justify-between px-8 relative z-30">
            <h1 className="text-lg font-semibold text-white">Panel de Administración</h1>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <ViewToggle />
            </div>
          </header>
          <div className="flex-1 overflow-auto p-8">
            {children}
          </div>
        </main>
      </div>
    </CartProvider>
  );
}
