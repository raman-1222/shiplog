# ShipLog — AI Agent Context File

## What is ShipLog?
ShipLog is a SaaS product that automatically converts GitHub PR merges into beautiful, human-readable changelog entries using AI. The core pitch is: **"Your changelog writes itself."**

Users connect their GitHub repo, pick a tone template, and every time they merge a PR, ShipLog generates a polished changelog entry automatically. They get a hosted public changelog page and an embeddable widget for their app.

---

## Tech Stack
- **Frontend + Backend:** Next.js 14 App Router (TypeScript)
- **Database + Auth:** Supabase
- **Styling:** Tailwind CSS
- **AI (changelog generation):** AirLLM running locally (Llama 3.1 70B) via HTTP — fallback to Groq API
- **Payments:** Stripe (Week 6)
- **Email:** Resend (Week 5)
- **Hosting:** Railway

---

## Project Structure
```
shiplog/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── github/
│   │   │       └── callback/route.ts      # GitHub OAuth callback
│   │   ├── webhooks/
│   │   │   └── github/route.ts            # GitHub webhook receiver
│   │   ├── repos/route.ts                 # Fetch + connect user repos
│   │   ├── changelog/route.ts             # CRUD for changelog entries
│   │   └── generate/route.ts              # Trigger AI generation
│   ├── dashboard/
│   │   ├── page.tsx                       # Main dashboard
│   │   ├── connect/page.tsx               # Connect GitHub repos
│   │   ├── entries/page.tsx               # View all changelog entries
│   │   └── settings/page.tsx              # Template + account settings
│   ├── changelog/
│   │   └── [username]/page.tsx            # Public changelog page
│   └── layout.tsx
├── components/
│   ├── ui/                                # Reusable UI components
│   ├── dashboard/                         # Dashboard specific components
│   └── widget/                            # Embeddable widget components
├── lib/
│   ├── supabase/
│   │   ├── client.ts                      # Browser client
│   │   └── server.ts                      # Server client
│   ├── github/
│   │   ├── oauth.ts                       # OAuth helpers
│   │   ├── webhooks.ts                    # Webhook verification + parsing
│   │   └── api.ts                         # GitHub API calls
│   ├── ai/
│   │   ├── generate.ts                    # Main generation function
│   │   └── templates.ts                   # Template prompt definitions
│   └── utils.ts
├── AGENTS.md                              # This file
└── .env.local
```

---

## Database Schema (Supabase)

### `profiles` (extends auth.users)
```sql
id uuid references auth.users primary key
github_access_token text
github_username text
plan text default 'free'          -- free, starter, pro
created_at timestamp with time zone default now()
```

### `repositories`
```sql
id uuid primary key
user_id uuid references auth.users
github_repo_id bigint
repo_name text
repo_full_name text               -- e.g. "ramandeep/myapp"
installation_id bigint
webhook_id bigint                 -- GitHub webhook ID for deletion
webhook_secret text               -- unique per repo for signature verification
template text default 'minimal'  -- which template to use
is_active boolean default true
created_at timestamp with time zone default now()
```

### `changelog_entries`
```sql
id uuid primary key
user_id uuid references auth.users
repo_id uuid references repositories
pr_number integer
pr_title text
pr_body text
pr_merged_at timestamp with time zone
commits jsonb                     -- array of commit messages
raw_ai_output text                -- raw output from AirLLM
final_content text                -- edited/final version
label text default 'feature'     -- feature, fix, improvement, breaking
status text default 'draft'      -- draft, published
published_at timestamp with time zone
created_at timestamp with time zone default now()
```

### `templates`
```sql
id uuid primary key
user_id uuid references auth.users
name text
type text                         -- minimal, marketing, technical, storytelling, custom
prompt text                       -- the actual system prompt sent to AI
is_default boolean default false
created_at timestamp with time zone default now()
```

### `subscribers`
```sql
id uuid primary key
repo_id uuid references repositories
email text
confirmed boolean default false
created_at timestamp with time zone default now()
```

---

## Environment Variables
```bash
# GitHub OAuth App
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_WEBHOOK_SECRET=            # random string for webhook signature verification

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-side only, never expose to client

# AI
AIRLLM_URL=http://localhost:8080  # local AirLLM instance via Ngrok tunnel
GROQ_API_KEY=                     # fallback if AirLLM is offline

# Email (Week 5)
RESEND_API_KEY=

# Payments (Week 6)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

---

## AI Generation Pipeline

### How it works:
1. GitHub webhook fires when PR is merged
2. Webhook handler extracts PR title, body, commits
3. `lib/ai/generate.ts` sends data to AirLLM with the user's selected template prompt
4. AirLLM returns a clean changelog entry
5. Entry saved to `changelog_entries` with status `draft`
6. User can edit and publish from dashboard

### AirLLM endpoint:
```typescript
// POST to AIRLLM_URL/generate
// Falls back to Groq if AirLLM unavailable
const response = await fetch(process.env.AIRLLM_URL + '/generate', {
  method: 'POST',
  body: JSON.stringify({ prompt: fullPrompt })
})
```

### Template prompts (defined in lib/ai/templates.ts):
- **minimal** — "Rewrite this PR into one clear, concise sentence. No jargon. Plain English."
- **marketing** — "Rewrite this as an exciting product update focused on user benefit. Punchy, positive tone."
- **technical** — "Rewrite this for a developer audience. Keep technical detail but improve clarity."
- **storytelling** — "Explain what changed and WHY it matters to the user. Conversational tone."
- **custom** — user-defined prompt stored in templates table

---

## Key Business Rules
- Free plan: 5 changelog entries/month, ShipLog branding on widget
- Starter ($12/mo): unlimited entries, custom domain, remove branding, 3 templates
- Pro ($29/mo): custom templates, email digest, analytics, all integrations
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or `GITHUB_CLIENT_SECRET` to the client
- Always verify GitHub webhook signatures before processing
- Webhook secret is unique per repository, stored in `repositories.webhook_secret`

---

## Weekly Build Plan

| Week | Focus | Status |
|------|-------|--------|
| 1 | GitHub OAuth + webhook data capture | 🔨 In Progress |
| 2 | AirLLM pipeline + template system | ⏳ Pending |
| 3 | Dashboard — view, edit, publish entries | ⏳ Pending |
| 4 | Public changelog page + embeddable widget | ⏳ Pending |
| 5 | Email digest + Slack notifications + analytics | ⏳ Pending |
| 6 | Landing page + Stripe payments + launch | ⏳ Pending |

---

## Current Week 1 Tasks
- [ ] Finalize Supabase schema (all tables above)
- [ ] Complete GitHub OAuth callback — save token to profiles table
- [ ] Build `app/api/webhooks/github/route.ts` — verify signature, parse PR merge event, save to changelog_entries
- [ ] Build `app/dashboard/connect/page.tsx` — list repos, register/delete webhooks
- [ ] Test end to end: merge PR → raw entry appears in Supabase

---

## Coding Conventions
- Use TypeScript strictly — no `any` types
- All Supabase server calls use `lib/supabase/server.ts`
- All Supabase client calls use `lib/supabase/client.ts`
- API routes are in `app/api/` following Next.js App Router conventions
- Use `async/await` not `.then()` chains
- Error handling on every API route — return proper HTTP status codes
- Keep components small and focused — split if over 150 lines
- Comment any non-obvious logic especially webhook signature verification

---

## Important Notes for AI Agents
- Supabase auth is already working — do not rebuild auth
- GitHub OAuth is partially set up — complete it, do not replace it
- Always use the service role key for server-side Supabase writes
- The webhook endpoint MUST verify signatures before doing anything else
- AirLLM runs locally on a separate laptop, accessed via Ngrok tunnel — treat it as an HTTP endpoint
- This is a solo founder project — keep solutions simple and maintainable