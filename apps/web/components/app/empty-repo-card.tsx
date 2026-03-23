import { Card } from "@/components/ui/card"
import { Plus } from "lucide-react"

export function EmptyRepoCard() {
  return (
    <Card className="border-dashed border-2 flex flex-col items-center justify-center p-8 text-center hover:border-teal/50 transition-colors cursor-pointer min-h-[140px]">
      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: "#0D948820" }}>
        <Plus className="w-5 h-5" style={{ color: "#0D9488" }} />
      </div>
      <p className="font-medium text-sm" style={{ color: "#0F172A" }}>Connect a repo</p>
      <p className="text-xs text-muted-foreground mt-1">
        Link GitHub to start auto-generating changelogs
      </p>
    </Card>
  )
}