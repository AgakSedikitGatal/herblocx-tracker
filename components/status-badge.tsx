import { taskStatusLabel } from "@/lib/constants";
import type { Enums } from "@/lib/database.types";

// One colour per task status, used everywhere a status appears.
export const STATUS_STYLES: Record<Enums<"task_status">, { chip: string; border: string; text: string }> = {
  todo: {
    chip: "bg-status-todo text-status-todo-foreground ring-status-todo-border/50",
    border: "border-t-status-todo-border",
    text: "text-status-todo-foreground",
  },
  in_progress: {
    chip: "bg-status-progress text-status-progress-foreground ring-status-progress-border/40",
    border: "border-t-status-progress-border",
    text: "text-status-progress-foreground",
  },
  review: {
    chip: "bg-status-review text-status-review-foreground ring-status-review-border/50",
    border: "border-t-status-review-border",
    text: "text-status-review-foreground",
  },
  done: {
    chip: "bg-status-done text-status-done-foreground ring-status-done-border/40",
    border: "border-t-status-done-border",
    text: "text-status-done-foreground",
  },
};

export function StatusBadge({
  status,
  suffix,
  className = "",
}: {
  status: Enums<"task_status">;
  suffix?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${STATUS_STYLES[status].chip} ${className}`}
    >
      {taskStatusLabel(status)}
      {suffix}
    </span>
  );
}
