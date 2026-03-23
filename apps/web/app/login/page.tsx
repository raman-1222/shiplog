import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Github } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect("/dashboard")

  async function signInWithGithub() {
    "use server"
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: "http://localhost:3000/auth/callback",
        scopes: "repo read:user",
      },
    })

    if (!error && data.url) {
      redirect(data.url)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "#0F172A" }}>
            Ship<span style={{ color: "#0D9488" }}>Log</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            AI-powered changelogs. Zero manual writing.
          </p>
        </div>

        <form action={signInWithGithub}>
          <Button
            type="submit"
            className="w-full gap-2 text-white"
            style={{ backgroundColor: "#0F172A" }}
          >
            <Github className="w-4 h-4" />
            Continue with GitHub
          </Button>
        </form>
      </div>
    </div>
  )
}