import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/repos — return the current user's connected repositories.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("repositories")
    .select("id, repo_name, repo_full_name, template, is_active, created_at, webhook_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ repos: data })
}
