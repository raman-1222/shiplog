"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GitBranch, Lock, Plus, Trash2 } from "lucide-react"

interface GithubRepo {
  id: number
  name: string
  full_name: string
  private: boolean
}

interface ConnectedRepo {
  id: string
  repo_full_name: string
  repo_name: string
}

export default function ConnectPage() {
  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([])
  const [connected, setConnected] = useState<ConnectedRepo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      try {
        const [ghRes, connRes] = await Promise.all([
          fetch("/api/repos/github"),
          fetch("/api/repos"),
        ])
        if (!ghRes.ok) throw new Error((await ghRes.json()).error)
        if (!connRes.ok) throw new Error((await connRes.json()).error)

        const ghData = await ghRes.json()
        const connData = await connRes.json()

        setGithubRepos(ghData.repos)
        setConnected(connData.repos)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load repos")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const connectedFullNames = new Set(connected.map((r) => r.repo_full_name))

  async function handleConnect(repo: GithubRepo) {
    setBusy((prev) => new Set(prev).add(repo.full_name))
    try {
      const res = await fetch("/api/repos/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoId: repo.id,
          repoName: repo.name,
          repoFullName: repo.full_name,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setConnected((prev) => [
        ...prev,
        { id: data.repositoryId, repo_full_name: repo.full_name, repo_name: repo.name },
      ])
    } catch (err) {
      alert(err instanceof Error ? err.message : "Connect failed")
    } finally {
      setBusy((prev) => { const s = new Set(prev); s.delete(repo.full_name); return s })
    }
  }

  async function handleDisconnect(repo: ConnectedRepo) {
    setBusy((prev) => new Set(prev).add(repo.repo_full_name))
    try {
      const res = await fetch("/api/repos/connect", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryId: repo.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setConnected((prev) => prev.filter((r) => r.id !== repo.id))
    } catch (err) {
      alert(err instanceof Error ? err.message : "Disconnect failed")
    } finally {
      setBusy((prev) => { const s = new Set(prev); s.delete(repo.repo_full_name); return s })
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <p className="text-sm text-muted-foreground">Loading your repositories…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#0F172A" }}>Connect a Repository</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select a repo to register a webhook. ShipLog will generate a changelog entry each time a PR is merged.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Your GitHub Repositories
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {githubRepos.map((repo) => {
              const isConnected = connectedFullNames.has(repo.full_name)
              const connectedRow = connected.find((r) => r.repo_full_name === repo.full_name)
              const isBusy = busy.has(repo.full_name)

              return (
                <li key={repo.id} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <GitBranch className="w-4 h-4 shrink-0" style={{ color: "#0D9488" }} />
                    <span className="text-sm font-medium truncate" style={{ color: "#0F172A" }}>
                      {repo.full_name}
                    </span>
                    {repo.private && (
                      <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    {isConnected && (
                      <Badge variant="outline" className="text-xs" style={{ color: "#0D9488", borderColor: "#0D9488" }}>
                        Connected
                      </Badge>
                    )}
                    {isConnected && connectedRow ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isBusy}
                        onClick={() => handleDisconnect(connectedRow)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={isBusy}
                        onClick={() => handleConnect(repo)}
                        style={{ backgroundColor: "#0D9488" }}
                        className="text-white gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        {isBusy ? "Connecting…" : "Connect"}
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
