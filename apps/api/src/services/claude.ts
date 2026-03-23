export interface ChangelogEntry {
  title: string
  body: string
  tags: string[]
  type: "feature" | "fix" | "improvement" | "breaking"
}

interface RawPRData {
  prNumber: number
  prTitle: string
  prBody: string
  repoFullName: string
  mergedAt: string
}

const SYSTEM_PROMPT = `You are a technical writer that transforms raw GitHub PR data into clear, 
customer-friendly changelog entries.

Rules:
- Write for end users, not developers. No jargon, no commit hashes.
- Title: one clear sentence, max 10 words, present tense ("Add X", "Fix Y", "Improve Z")
- Body: 1-2 sentences explaining the user benefit, not the implementation
- Tags: 1-3 relevant tags from [feature, fix, improvement, performance, security, breaking]
- Type: one of feature | fix | improvement | breaking

Respond ONLY with valid JSON, no markdown, no backticks, no code fences:
{
  "title": "string",
  "body": "string",
  "tags": ["string"],
  "type": "feature | fix | improvement | breaking"
}`

export async function rewriteWithClaude(data: RawPRData): Promise<ChangelogEntry> {
  const userMessage = `
PR Title: ${data.prTitle}
PR Description: ${data.prBody || "No description provided"}
`

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://shiplog.app",
      "X-Title": "ShipLog",
    },
    body: JSON.stringify({
      model: "mistralai/mistral-7b-instruct:free",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenRouter error ${response.status}: ${err}`)
  }

  const result = await response.json() as { choices: Array<{ message: { content: string } }> }
  const text = result.choices[0].message.content
  const clean = text.replace(/```json\n?|\n?```/g, "").trim()

  try {
    return JSON.parse(clean) as ChangelogEntry
  } catch {
    throw new Error(`Failed to parse response: ${text}`)
  }
}