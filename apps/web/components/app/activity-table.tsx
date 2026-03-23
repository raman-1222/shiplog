import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"

interface ActivityEntry {
  id: string
  repoName: string
  title: string
  timeAgo: string
}

export function ActivityTable({ entries }: { entries: ActivityEntry[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id} className="hover:bg-muted/40 cursor-pointer">
                <TableCell className="text-xs text-muted-foreground w-36 pl-6 font-mono">
                  {entry.repoName}
                </TableCell>
                <TableCell className="text-sm font-medium" style={{ color: "#0F172A" }}>
                  {entry.title}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground text-right pr-6">
                  {entry.timeAgo}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}