import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GitBranch, Zap } from "lucide-react"

interface Repo {
  id: string
  name: string
  plan: string
  entryCount: number
  lastEntry: string
}

export function RepoCard({ repo }: { repo: Repo }) {
  return (
    <Card className="hover:border-teal/50 transition-colors cursor-pointer">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4" style={{ color: "#0D9488" }} />
          <span className="font-medium text-sm truncate">{repo.name}</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {repo.plan}
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold" style={{ color: "#0F172A" }}>{repo.entryCount}</p>
        <p className="text-xs text-muted-foreground">changelog entries</p>
        <div className="flex items-center gap-1 mt-3 text-xs" style={{ color: "#0D9488" }}>
          <Zap className="w-3 h-3" />
          <span>Last entry {repo.lastEntry}</span>
        </div>
      </CardContent>
    </Card>
  )
}