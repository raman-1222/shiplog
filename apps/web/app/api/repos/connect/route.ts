import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse, type NextRequest } from "next/server"
import crypto from "crypto"

interface ConnectBody {
  repoId: number        // GitHub repo id
  repoName: string      // e.g. "myapp"
  repoFullName: string  // e.g. "ramandeep/myapp"
}

interface DisconnectBody {
  repositoryId: string  // Supabase repositories.id (uuid)
}

// POST /api/repos/connect — register a GitHub webhook and save the repo to DB.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body: ConnectBody = await request.json()
  const { repoId, repoName, repoFullName } = body

  if (!repoFullName) return NextResponse.json({ error: "repoFullName required" }, { status: 400 })

  const admin = createAdminClient()

  // Get the user's GitHub access token.
  const { data: profile } = await admin
    .from("profiles")
    .select("github_access_token")
    .eq("id", user.id)
    .single()

  if (!profile?.github_access_token) {
    return NextResponse.json({ error: "No GitHub token" }, { status: 400 })
  }

  // Generate a unique secret for this repo's webhook signature verification.
  const webhookSecret = crypto.randomBytes(32).toString("hex")
  const webhookUrl = process.env.GITHUB_WEBHOOK_URL

  if (!webhookUrl) {
    return NextResponse.json({ error: "GITHUB_WEBHOOK_URL not configured" }, { status: 500 })
  }

  // Register the webhook on GitHub.
  const ghResponse = await fetch(`https://api.github.com/repos/${repoFullName}/hooks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${profile.github_access_token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "web",
      active: true,
      events: ["pull_request"],
      config: {
        url: webhookUrl,
        content_type: "json",
        secret: webhookSecret,
      },
    }),
  })

  if (!ghResponse.ok) {
    const err = await ghResponse.json()
    return NextResponse.json({ error: err.message ?? "GitHub webhook creation failed" }, { status: ghResponse.status })
  }

  const hook = await ghResponse.json() as { id: number }

  // Save the repo to the repositories table.
  const { data, error } = await admin
    .from("repositories")
    .upsert({
      user_id: user.id,
      github_repo_id: repoId,
      repo_name: repoName,
      repo_full_name: repoFullName,
      webhook_id: hook.id,
      webhook_secret: webhookSecret,
      is_active: true,
    }, { onConflict: "repo_full_name, user_id" })
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, repositoryId: data.id })
}

// DELETE /api/repos/connect — remove a GitHub webhook and delete the repo from DB.
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body: DisconnectBody = await request.json()
  const { repositoryId } = body

  const admin = createAdminClient()

  // Fetch the repo to get the GitHub token and webhook id.
  const { data: repo } = await admin
    .from("repositories")
    .select("repo_full_name, webhook_id")
    .eq("id", repositoryId)
    .eq("user_id", user.id)
    .single()

  if (!repo) return NextResponse.json({ error: "Repo not found" }, { status: 404 })

  const { data: profile } = await admin
    .from("profiles")
    .select("github_access_token")
    .eq("id", user.id)
    .single()

  // Best-effort: delete the webhook from GitHub if we have a token + hook id.
  if (profile?.github_access_token && repo.webhook_id) {
    await fetch(`https://api.github.com/repos/${repo.repo_full_name}/hooks/${repo.webhook_id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${profile.github_access_token}`,
        Accept: "application/vnd.github+json",
      },
    })
  }

  const { error } = await admin
    .from("repositories")
    .delete()
    .eq("id", repositoryId)
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
