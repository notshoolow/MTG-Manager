import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <div className="max-w-md w-full space-y-8 text-center p-8 bg-[var(--color-surface)] rounded-xl shadow-2xl border border-gray-800">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">MTG Manager</h1>
          <p className="text-gray-400">Tournament & League Organization Platform</p>
        </div>

        <div className="flex flex-col space-y-4 pt-4">
          <Link href="/admin" className="w-full">
            <Button variant="primary" className="w-full text-lg py-3">Store Admin Dashboard</Button>
          </Link>
          <Link href="/player/tournaments" className="w-full">
            <Button variant="secondary" className="w-full text-lg py-3 border border-gray-700">Player Portal</Button>
          </Link>
        </div>
      </div>

      <div className="mt-16 text-sm text-gray-500 whitespace-pre-wrap text-center">
        Built with Next.js & Prisma • Designed for Dark Mode
      </div>
    </main>
  );
}
