import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TASK_FEATURES = [
  { name: "Project Folders", description: "Organize tasks by project or quarter" },
  { name: "Auto-Suggest Tasks", description: "One-click generate tasks from audit gaps" },
  { name: "Checklist System", description: "Step-by-step sub-tasks" },
  { name: "Progress Tracking", description: "Visual completion percentage" },
  { name: "Priority Levels", description: "Critical → High → Medium → Low" },
  {
    name: "Status Management",
    description: "Not started → In progress → Completed → Blocked",
  },
  { name: "Resources Needed", description: "Track what you need to execute" },
  { name: "Suggested Action Plan", description: "AI-generated execution steps" },
] as const;

export function TaskFeatureOverview({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {TASK_FEATURES.map((feature) => (
          <div key={feature.name} className="rounded-lg border bg-muted/30 p-3">
            <p className="text-sm font-medium">{feature.name}</p>
            <p className="text-xs text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>What this gives you</CardTitle>
        <p className="text-sm text-muted-foreground">
          Users never wonder &quot;what&apos;s next?&quot; again.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4 font-medium">Feature</th>
                <th className="pb-2 font-medium">What it does</th>
              </tr>
            </thead>
            <tbody>
              {TASK_FEATURES.map((feature) => (
                <tr key={feature.name} className="border-b last:border-0">
                  <td className="py-2 pr-4 align-top font-medium">{feature.name}</td>
                  <td className="py-2 text-muted-foreground">{feature.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
