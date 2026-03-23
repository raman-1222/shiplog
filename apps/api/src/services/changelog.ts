import { createClient } from "../lib/supabase"
import type { ChangelogEntry } from "./claude"

interface RawPRData {
  prNumber: number
  prTitle: string
  prBody: string
  prMergedAt: string
}

// Look up the repository row by full name and return its id + user_id.
async function getRepo(repoFullName: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("repositories")
    .select("id, user_id")
    .eq("repo_full_name", repoFullName)
    .single()

  if (error || !data) throw new Error(`Repo not found: ${repoFullName}`)
  return data
}

// Persist the raw PR data immediately when a webhook arrives.
// Returns the new changelog_entry id so the AI pass can update it later.
export async function saveRawEntry(repoFullName: string, pr: RawPRData): Promise<string> {
  const supabase = createClient()
  const repo = await getRepo(repoFullName)

  const { data, error } = await supabase
    .from("changelog_entries")
    .insert({
      user_id: repo.user_id,
      repo_id: repo.id,
      pr_number: pr.prNumber,
      pr_title: pr.prTitle,
      pr_body: pr.prBody,
      pr_merged_at: pr.prMergedAt,
      status: "draft",
      label: "feature",
    })
    .select("id")
    .single()

  if (error || !data) throw error ?? new Error("Insert failed")

  console.log(`Saved raw entry for PR #${pr.prNumber} from ${repoFullName}`)
  return data.id
}

// Called after AI generation completes to update the entry with AI output.
export async function updateEntryWithAI(entryId: string, entry: ChangelogEntry): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("changelog_entries")
    .update({
      raw_ai_output: JSON.stringify(entry),
      final_content: entry.body,
      label: entry.type,
    })
    .eq("id", entryId)

  if (error) throw error

  console.log(`Updated entry ${entryId} with AI output`)
}
