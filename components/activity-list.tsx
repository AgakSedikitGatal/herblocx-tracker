import Link from "next/link";

export type ActivityRow = {
  id: number;
  actor: string;
  sentence: string;
  when: string; // already formatted (Jakarta)
  taskTitle?: string;
  taskHref?: string | null; // null = the task was deleted since
};

// One line per log entry: "Admin moved it from To Do to In Progress · 2026/10/16 09:27".
export function ActivityList({ rows, showTask }: { rows: ActivityRow[]; showTask: boolean }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No activity yet.</p>;

  return (
    <ol className="grid gap-3">
      {rows.map((row) => (
        <li key={row.id} className="grid gap-0.5 border-l-2 pl-3 text-sm">
          {showTask && (
            <span className="font-medium">
              {row.taskHref ? (
                <Link href={row.taskHref} className="hover:underline">
                  {row.taskTitle}
                </Link>
              ) : (
                <>
                  {row.taskTitle} <span className="font-normal text-muted-foreground">(deleted)</span>
                </>
              )}
            </span>
          )}
          <span>
            <span className="font-medium">{row.actor}</span> {row.sentence}
          </span>
          <span className="text-xs text-muted-foreground">{row.when}</span>
        </li>
      ))}
    </ol>
  );
}
