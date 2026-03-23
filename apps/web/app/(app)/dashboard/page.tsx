import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { RepoCard } from "@/components/app/repo-card"
import { EmptyRepoCard } from "@/components/app/empty-repo-card"
import { ActivityTable } from "@/components/app/activity-table"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: repos } = await supabase
    .from("repositories")
    .select("id, repo_name, repo_full_name, created_at")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  const { data: recentEntries } = await supabase
    .from("changelog_entries")
    .select("id, repo_id, pr_title, created_at, repositories(repo_full_name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10)

  // Build entry counts per repo.
  const { data: entryCounts } = await supabase
    .from("changelog_entries")
    .select("repo_id")
    .eq("user_id", user.id)

  const countByRepo = (entryCounts ?? []).reduce<Record<string, number>>((acc, e) => {
    acc[e.repo_id] = (acc[e.repo_id] ?? 0) + 1
    return acc
  }, {})

  const repoCards = (repos ?? []).map((r) => ({
    id: r.id,
    name: r.repo_full_name,
    plan: "Free",
    entryCount: countByRepo[r.id] ?? 0,
    lastEntry: "—",
  }))

  const activityRows = (recentEntries ?? []).map((e) => {
    const elapsed = Math.round((Date.now() - new Date(e.created_at).getTime()) / 60000)
    const timeAgo = elapsed < 60
      ? `${elapsed}m ago`
      : elapsed < 1440
        ? `${Math.round(elapsed / 60)}h ago`
        : `${Math.round(elapsed / 1440)}d ago`

    const repoFullName =
      (e.repositories as unknown as { repo_full_name: string } | null)?.repo_full_name ?? "unknown"

    return {
      id: e.id,
      repoName: repoFullName,
      title: e.pr_title ?? "Untitled PR",
      timeAgo,
    }
  })

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0F172A" }}>Your Changelogs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {repoCards.length} {repoCards.length === 1 ? "repo" : "repos"} connected
          </p>
        </div>
        <Button asChild style={{ backgroundColor: "#0D9488" }} className="text-white gap-2">
          <Link href="/dashboard/connect">
            <Plus className="w-4 h-4" />
            Connect Repo
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {repoCards.map((repo) => (
          <RepoCard key={repo.id} repo={repo} />
        ))}
        <EmptyRepoCard />
      </div>

      {activityRows.length > 0 && <ActivityTable entries={activityRows} />}
    </div>
  )
}
