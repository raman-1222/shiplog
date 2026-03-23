import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ReactNode } from "react"

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="font-bold text-lg" style={{ color: "#0F172A" }}>
          Ship<span style={{ color: "#0D9488" }}>Log</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Changelogs</Link>
          <Link href="/dashboard/connect" className="hover:text-foreground transition-colors">Connect Repo</Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  )
}
