import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

// GET /api/repos/github — return the user's GitHub repos (fetched with their stored token).
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Retrieve the stored GitHub access token from profiles.
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("github_access_token")
    .eq("id", user.id)
    .single()

  if (!profile?.github_access_token) {
    return NextResponse.json({ error: "No GitHub token — please reconnect" }, { status: 400 })
  }

  const response = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
    headers: {
      Authorization: `Bearer ${profile.github_access_token}`,
      Accept: "application/vnd.github+json",
    },
  })

  if (!response.ok) {
    return NextResponse.json({ error: "GitHub API error" }, { status: response.status })
  }

  const ghRepos = await response.json() as Array<{
    id: number
    name: string
    full_name: string
    private: boolean
  }>

  return NextResponse.json({
    repos: ghRepos.map((r) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      private: r.private,
    })),
  })
}
