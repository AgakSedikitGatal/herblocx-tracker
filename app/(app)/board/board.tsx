"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { moveTask } from "@/app/(app)/tasks/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { STATUS_STYLES, StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { TASK_STATUSES, taskPriorityLabel } from "@/lib/constants";
import type { Enums } from "@/lib/database.types";
import { formatDate } from "@/lib/format";

export type BoardTask = {
  id: string;
  title: string;
  status: Enums<"task_status">;
  priority: Enums<"task_priority">;
  dueDate: string;
  assigneeName: string | null;
  departmentLabel: string;
  milestoneTitle: string | null;
  canEdit: boolean;
};

const PRIORITY_STYLE: Record<Enums<"task_priority">, string> = {
  urgent: "bg-destructive/10 text-destructive",
  high: "bg-amber-100 text-amber-900",
  medium: "bg-secondary text-secondary-foreground",
  low: "bg-muted text-muted-foreground",
};

export function Board({ initialTasks, today }: { initialTasks: BoardTask[]; today: string }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const dndId = useId();
  const sensors = useSensors(
    // A small movement is needed before a drag starts, so clicking a card still opens it.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragEnd(event: DragEndEvent) {
    const status = event.over?.id as Enums<"task_status"> | undefined;
    const task = tasks.find((t) => t.id === event.active.id);
    if (!status || !task || task.status === status) return;

    const before = tasks;
    setError(null);
    setTasks((current) => current.map((t) => (t.id === task.id ? { ...t, status } : t)));
    startTransition(async () => {
      const result = await moveTask(task.id, status);
      if (result.error) {
        setTasks(before); // put the card back
        setError(result.error);
      }
    });
  }

  return (
    <div className="grid gap-3">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <DndContext id={dndId} sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid auto-cols-[minmax(14rem,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2">
          {TASK_STATUSES.map((column) => (
            <Column
              key={column.value}
              status={column.value}
              label={column.label}
              tasks={tasks.filter((t) => t.status === column.value)}
              today={today}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function Column({
  status,
  label,
  tasks,
  today,
}: {
  status: Enums<"task_status">;
  label: string;
  tasks: BoardTask[];
  today: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      aria-label={label}
      className={`flex min-h-64 flex-col gap-2 rounded-lg border border-t-4 p-2 transition-colors ${STATUS_STYLES[status].border} ${
        isOver ? "bg-accent/60 ring-2 ring-primary/30" : "bg-muted/60"
      }`}
    >
      <header className="flex items-center justify-between px-1 py-1">
        <h2 className="text-sm">
          <StatusBadge status={status} />
        </h2>
        <span className="text-xs font-medium text-muted-foreground">{tasks.length}</span>
      </header>
      {tasks.map((task) => (
        <Card key={task.id} task={task} today={today} />
      ))}
      <Link
        href={`/tasks/new?status=${status}`}
        className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-card hover:text-foreground"
      >
        + Add task
      </Link>
    </section>
  );
}

function Card({ task, today }: { task: BoardTask; today: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: !task.canEdit,
  });
  const overdue = task.status !== "done" && task.dueDate < today;

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
      aria-roledescription={task.canEdit ? "draggable task" : "task"}
      className={`grid gap-2 rounded-md border bg-card p-3 text-sm shadow-xs ${
        task.canEdit ? "cursor-grab touch-none active:cursor-grabbing" : ""
      } ${isDragging ? "relative z-20 opacity-80 shadow-lg" : ""} ${overdue ? "border-destructive/60" : ""}`}
    >
      <Link href={`/tasks/${task.id}`} className="font-medium leading-snug hover:underline">
        {task.title}
      </Link>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className={`rounded px-1.5 py-0.5 font-medium ${PRIORITY_STYLE[task.priority]}`}>
          {taskPriorityLabel(task.priority)}
        </span>
        <span className={overdue ? "font-medium text-destructive" : "text-muted-foreground"}>
          Due {formatDate(task.dueDate)}
        </span>
        {overdue && <Badge variant="destructive">Overdue</Badge>}
      </div>
      <div className="grid gap-0.5 text-xs text-muted-foreground">
        <span>{task.assigneeName ?? "Unassigned"} · {task.departmentLabel}</span>
        {task.milestoneTitle && <span>◆ {task.milestoneTitle}</span>}
      </div>
    </article>
  );
}
