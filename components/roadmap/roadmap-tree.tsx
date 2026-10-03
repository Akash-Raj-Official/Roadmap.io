"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Circle, ExternalLink, Info, PlayCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ResourceItem = { id: string; title: string; url: string; type: string };
export type TopicNode = {
  id: string;
  title: string;
  description: string | null;
  level: "milestone" | "topic" | "subtopic";
  parentTopicId: string | null;
  order: number;
  resources: ResourceItem[];
  children?: TopicNode[];
};

export function RoadmapTree({
  topics,
  completedIds = [],
  interactive = false,
  onToggle,
}: {
  topics: TopicNode[];
  completedIds?: string[];
  interactive?: boolean;
  onToggle?: (topicId: string, completed: boolean) => Promise<void>;
}) {
  const milestones = useMemo(() => {
    const byParent = new Map<string, TopicNode[]>();
    for (const t of topics) {
      const key = t.parentTopicId ?? "root";
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(t);
    }
    const attach = (node: TopicNode): TopicNode => ({
      ...node,
      children: (byParent.get(node.id) ?? []).sort((a, b) => a.order - b.order).map(attach),
    });
    return (byParent.get("root") ?? []).sort((a, b) => a.order - b.order).map(attach);
  }, [topics]);

  const [completed, setCompleted] = useState(new Set(completedIds));
  const [, startTransition] = useTransition();
  const [activeTopic, setActiveTopic] = useState<TopicNode | null>(null);

  const toggle = (id: string) => {
    const isDone = completed.has(id);
    const next = new Set(completed);
    if (isDone) next.delete(id);
    else next.add(id);
    setCompleted(next);
    if (onToggle) startTransition(() => onToggle(id, !isDone));
  };

  return (
    <div className="relative mx-auto max-w-2xl py-12">
      <svg
        className="pointer-events-none absolute left-1/2 top-0 h-full w-2 -translate-x-1/2"
        aria-hidden
      >
        <line x1="1" y1="0" x2="1" y2="100%" className="trail-path" strokeWidth="2" />
      </svg>

      <ol className="relative flex flex-col gap-10">
        {milestones.map((m, i) => (
          <li key={m.id} className={cn("relative flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
            <MilestoneCard
              node={m}
              side={i % 2 === 0 ? "left" : "right"}
              completed={completed}
              interactive={interactive}
              onToggle={toggle}
              onShowInfo={setActiveTopic}
            />
          </li>
        ))}
      </ol>

      <Dialog open={!!activeTopic} onOpenChange={(open) => !open && setActiveTopic(null)}>
        <DialogContent>
          {activeTopic && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading">{activeTopic.title}</DialogTitle>
                {activeTopic.description && (
                  <DialogDescription>{activeTopic.description}</DialogDescription>
                )}
              </DialogHeader>

              <div className="mt-2 space-y-2">
                {activeTopic.resources.length === 0 && (
                  <p className="text-sm text-muted-foreground">No resources added yet.</p>
                )}
                {activeTopic.resources.map((r) => (
                  <a
                    key={r.id}
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 p-3 text-sm transition-colors hover:bg-muted"
                  >
                    {r.type === "video" ? (
                      <PlayCircle className="size-4 shrink-0 text-accent" />
                    ) : (
                      <FileText className="size-4 shrink-0 text-accent" />
                    )}
                    <span className="flex-1">{r.title}</span>
                    <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MilestoneCard({
  node,
  side,
  completed,
  interactive,
  onToggle,
  onShowInfo,
}: {
  node: TopicNode;
  side: "left" | "right";
  completed: Set<string>;
  interactive: boolean;
  onToggle: (id: string) => void;
  onShowInfo: (node: TopicNode) => void;
}) {
  const isDone = completed.has(node.id);
  const childCount = node.children?.length ?? 0;
  const childDone = node.children?.filter((c) => completed.has(c.id)).length ?? 0;

  return (
    <div className={cn("w-[calc(50%-2rem)]", side === "left" ? "text-right pr-2" : "text-left pl-2")}>
      <div
        className={cn(
          "absolute top-3 z-10 h-4 w-4 rounded-full border-2 border-background shadow",
          side === "left" ? "-right-[2px] translate-x-1/2" : "-left-[2px] -translate-x-1/2",
          isDone ? "bg-moss" : "bg-accent",
        )}
      />
      <div
        className={cn(
          "group w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:shadow-md",
          isDone && "border-moss/40 bg-moss/5",
        )}
      >
        <div
          className="flex items-center gap-2"
          style={{ flexDirection: side === "left" ? "row-reverse" : "row" }}
        >
          {interactive && (
            <button
              type="button"
              onClick={() => onToggle(node.id)}
              aria-label={isDone ? "Mark incomplete" : "Mark complete"}
              className="shrink-0"
            >
              {isDone ? (
                <Check className="size-4 text-moss" />
              ) : (
                <Circle className="size-4 text-muted-foreground" />
              )}
            </button>
          )}
          <h3 className="flex-1 font-heading text-lg font-semibold">{node.title}</h3>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Resources for ${node.title}`}
            onClick={() => onShowInfo(node)}
          >
            <Info className="size-4 text-muted-foreground" />
          </Button>
        </div>
        {node.description && (
          <p className="mt-1 text-sm text-muted-foreground">{node.description}</p>
        )}

        {childCount > 0 && (
          <div className={cn("mt-3 flex flex-wrap items-center gap-1.5", side === "left" && "justify-end")}>
            {node.children!.map((c) => (
              <Badge
                key={c.id}
                variant="outline"
                className={cn(
                  "cursor-pointer font-normal",
                  completed.has(c.id) && "border-moss/40 bg-moss/10 text-moss",
                )}
                onClick={() => (interactive ? onToggle(c.id) : onShowInfo(c))}
              >
                {c.title}
              </Badge>
            ))}
            {interactive && (
              <span className="text-xs text-muted-foreground">
                {childDone}/{childCount}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
