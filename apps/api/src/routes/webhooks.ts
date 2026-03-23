import { Router, Request, Response } from "express"
import crypto from "crypto"
import { saveRawEntry, updateEntryWithAI } from "../services/changelog"
import { rewriteWithClaude } from "../services/claude"
import { createClient } from "../lib/supabase"

export const webhookRouter = Router()

webhookRouter.get("/github", (_req, res) => {
  res.status(200).json({ ok: true })
})

// Look up the repo-specific webhook secret from the database.
async function getWebhookSecret(repoFullName: string): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from("repositories")
    .select("webhook_secret")
    .eq("repo_full_name", repoFullName)
    .single()
  return data?.webhook_secret ?? null
}

// Verify the GitHub signature using HMAC-SHA256.
// The payload must be the raw Buffer — not parsed JSON.
function verifySignature(payload: Buffer, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret)
  const digest = "sha256=" + hmac.update(payload).digest("hex")
  // Both sides must be the same length before timingSafeEqual.
  if (digest.length !== signature.length) return false
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
}

webhookRouter.post("/github", async (req: Request, res: Response) => {
  const signature = req.headers["x-hub-signature-256"] as string
  const event = req.headers["x-github-event"] as string

  if (!signature) {
    return res.status(401).json({ error: "Missing signature" })
  }

  const rawBody = req.body as Buffer

  // Parse the payload (unverified at this point) only to read repo name,
  // so we can look up the per-repo secret for proper signature verification.
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody.toString())
  } catch {
    return res.status(400).json({ error: "Invalid JSON" })
  }

  const repoFullName = (payload.repository as Record<string, unknown>)?.full_name as string | undefined
  if (!repoFullName) {
    return res.status(400).json({ error: "Missing repository.full_name" })
  }

  // Fetch per-repo secret from DB; fall back to the global env secret for safety.
  const secret = (await getWebhookSecret(repoFullName)) ?? process.env.GITHUB_WEBHOOK_SECRET
  if (!secret) {
    return res.status(401).json({ error: "No webhook secret configured" })
  }

  if (!verifySignature(rawBody, signature, secret)) {
    return res.status(401).json({ error: "Invalid signature" })
  }

  // Only handle merged pull_request events.
  if (event !== "pull_request") {
    return res.status(200).json({ ok: true, skipped: true })
  }

  const pr = payload.pull_request as Record<string, unknown>
  if (!pr || payload.action !== "closed" || !pr.merged) {
    return res.status(200).json({ ok: true, skipped: true })
  }

  try {
    // Persist the raw PR data immediately so the entry shows up in the dashboard.
    const entryId = await saveRawEntry(repoFullName, {
      prNumber: pr.number as number,
      prTitle: pr.title as string,
      prBody: (pr.body as string) || "",
      prMergedAt: pr.merged_at as string,
    })

    // Fire AI generation in the background so the webhook returns quickly.
    rewriteWithClaude({
      prNumber: pr.number as number,
      prTitle: pr.title as string,
      prBody: (pr.body as string) || "",
      repoFullName,
      mergedAt: pr.merged_at as string,
    })
      .then((entry) => updateEntryWithAI(entryId, entry))
      .catch((err) => console.error("AI generation failed for entry", entryId, err))

    return res.status(200).json({ ok: true, entryId })
  } catch (err) {
    console.error("Webhook processing failed:", err)
    return res.status(500).json({ error: "Processing failed" })
  }
})
