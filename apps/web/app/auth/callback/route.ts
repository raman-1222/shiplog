import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (code) {
    const supabase = await createClient()
    const { data } = await supabase.auth.exchangeCodeForSession(code)

    // Save GitHub access token and username to profiles table.
    // provider_token is the GitHub OAuth token returned during the code exchange.
    if (data.session && data.user) {
      const admin = createAdminClient()
      await admin.from("profiles").upsert({
        id: data.user.id,
        github_access_token: data.session.provider_token ?? null,
        github_username: data.user.user_metadata?.user_name ?? null,
      }, { onConflict: "id" })
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}