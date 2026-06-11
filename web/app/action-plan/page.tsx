"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { AUDIT_LAYER_META, type AuditLayerId } from "@/lib/audit-types";
import {
  ACTION_STATUSES,
  OWNER_TEAMS,
  useActionStore,
  type Action,
  type ActionLayerId,
  type ActionStatus,
} from "@/store/actionStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useMobile } from "@/hooks/useMobile";

const LAYER_IDS: ActionLayerId[] = ["discoverability", "clarity", "authority", "trust"];

const layerColumnColors: Record<ActionLayerId, string> = {
  discoverability: "border-t-blue-500",
  clarity: "border-t-green-500",
  authority: "border-t-purple-500",
  trust: "border-t-orange-500",
};

const statusLabels: Record<ActionStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  blocked: "Blocked",
};

const statusVariants: Record<ActionStatus, "default" | "secondary" | "outline" | "destructive"> = {
  not_started: "outline",
  in_progress: "secondary",
  completed: "default",
  blocked: "destructive",
};

const emptyForm = {
  layerId: "discoverability" as ActionLayerId,
  description: "",
  ownerTeam: "SEO",
  ownerPerson: "",
  dueWeek: 1,
  resourceAsks: "",
  status: "not_started" as ActionStatus,
};

function LayerColumn({
  layerId,
  title,
  actions,
  onEdit,
  onDelete,
}: {
  layerId: ActionLayerId;
  title: string;
  actions: Action[];
  onEdit: (action: Action) => void;
  onDelete: (id: string) => void;
}) {
  const ids = actions.map((a) => a.id);
  const { setNodeRef, isOver } = useDroppable({ id: layerId });

  return (
    <Card
      className={cn(
        "flex h-full w-full min-h-[240px] flex-col border-t-4 sm:min-h-[420px]",
        layerColumnColors[layerId]
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span>{title}</span>
          <Badge variant="outline">{actions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2 p-3 pt-0">
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div
            ref={setNodeRef}
            className={cn(
              "flex min-h-[200px] flex-1 flex-col gap-2 rounded-md bg-muted/30 p-2 transition-colors sm:min-h-[320px]",
              isOver && "bg-muted/60 ring-2 ring-primary/40"
            )}
          >
            {actions.map((action) => (
              <ActionCard
                key={action.id}
                action={action}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </SortableContext>
      </CardContent>
    </Card>
  );
}

function ActionCard({
  action,
  onEdit,
  onDelete,
  overlay,
}: {
  action: Action;
  onEdit: (action: Action) => void;
  onDelete: (id: string) => void;
  overlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: action.id,
    data: { type: "action", layerId: action.layerId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "min-h-[120px] rounded-lg border bg-card p-3 shadow-sm sm:p-4",
        isDragging && "opacity-40",
        overlay && "rotate-1 shadow-lg"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="shrink-0 cursor-grab touch-none rounded-md p-2 -m-2 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm leading-snug">{action.description}</p>
          <div className="flex flex-wrap gap-1">
            <Badge variant={statusVariants[action.status]}>{statusLabels[action.status]}</Badge>
            <Badge variant="outline">Week {action.dueWeek}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {action.ownerTeam}
            {action.ownerPerson ? ` · ${action.ownerPerson}` : ""}
          </p>
          {action.resourceAsks.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Resources: {action.resourceAsks.join(", ")}
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-11 min-h-[44px] flex-1 sm:h-9 sm:min-h-0 sm:flex-none"
              onClick={() => onEdit(action)}
            >
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-11 min-h-[44px] w-11 shrink-0 text-destructive sm:h-9 sm:min-h-0 sm:w-auto"
              onClick={() => onDelete(action.id)}
              aria-label="Delete action"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ActionPlanPage() {
  const isMobile = useMobile();
  const actions = useActionStore((s) => s.actions);
  const addAction = useActionStore((s) => s.addAction);
  const updateAction = useActionStore((s) => s.updateAction);
  const deleteAction = useActionStore((s) => s.deleteAction);
  const moveAction = useActionStore((s) => s.moveAction);
  const reorderAction = useActionStore((s) => s.reorderAction);

  const [hydrated, setHydrated] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<Action | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const unsub = useActionStore.persist.onFinishHydration(() => setHydrated(true));
    void useActionStore.persist.rehydrate();
    if (useActionStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const byLayer = useMemo(() => {
    const map = Object.fromEntries(LAYER_IDS.map((id) => [id, [] as Action[]])) as Record<
      ActionLayerId,
      Action[]
    >;
    for (const action of actions) {
      map[action.layerId].push(action);
    }
    return map;
  }, [actions]);

  const activeAction = activeId ? actions.find((a) => a.id === activeId) : null;

  const layerTitle = (id: AuditLayerId) =>
    AUDIT_LAYER_META.find((m) => m.id === id)?.title ?? id;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeActionId = String(active.id);
    const overId = String(over.id);

    if (LAYER_IDS.includes(overId as ActionLayerId)) {
      moveAction(activeActionId, overId as ActionLayerId);
      return;
    }

    const overAction = actions.find((a) => a.id === overId);
    if (!overAction) return;

    if (overAction.layerId !== actions.find((a) => a.id === activeActionId)?.layerId) {
      moveAction(activeActionId, overAction.layerId);
    }
    reorderAction(activeActionId, overId);
  };

  const openEdit = (action: Action) => {
    setEditing(action);
    setForm({
      layerId: action.layerId,
      description: action.description,
      ownerTeam: action.ownerTeam,
      ownerPerson: action.ownerPerson,
      dueWeek: action.dueWeek,
      resourceAsks: action.resourceAsks.join(", "),
      status: action.status,
    });
  };

  const saveForm = () => {
    const resourceAsks = form.resourceAsks
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (editing) {
      updateAction(editing.id, {
        layerId: form.layerId,
        description: form.description,
        ownerTeam: form.ownerTeam,
        ownerPerson: form.ownerPerson,
        dueWeek: form.dueWeek,
        resourceAsks,
        status: form.status,
      });
      setEditing(null);
    } else {
      addAction({
        id: `action-${Date.now()}`,
        layerId: form.layerId,
        description: form.description,
        ownerTeam: form.ownerTeam,
        ownerPerson: form.ownerPerson,
        dueWeek: form.dueWeek,
        resourceAsks,
        status: form.status,
        createdAt: new Date().toISOString(),
      });
      setIsAddOpen(false);
    }
    setForm(emptyForm);
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-4 text-muted-foreground sm:p-8">
        Loading action plan...
      </div>
    );
  }

  const layerBoard = (layerId: ActionLayerId) => (
    <LayerColumn
      layerId={layerId}
      title={layerTitle(layerId)}
      actions={byLayer[layerId]}
      onEdit={openEdit}
      onDelete={deleteAction}
    />
  );

  return (
    <div
      className={cn(
        "container mx-auto space-y-4 animate-fade-in sm:space-y-6 sm:py-8",
        isMobile ? "p-3" : "p-4 sm:p-6"
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl md:text-3xl">90-Day Action Plan</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            {isMobile
              ? "Swipe between layers · drag to reorder"
              : "Drag actions between layers"}{" "}
            · {actions.length} items across 12 weeks
          </p>
        </div>
        <Dialog
          open={isAddOpen || !!editing}
          onOpenChange={(open) => {
            if (!open) {
              setIsAddOpen(false);
              setEditing(null);
              setForm(emptyForm);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddOpen(true)} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add Action
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Action" : "Add Action"}</DialogTitle>
            </DialogHeader>
            <ActionForm form={form} setForm={setForm} onSave={saveForm} />
          </DialogContent>
        </Dialog>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-4 touch-pan-x sm:grid sm:grid-cols-4 sm:snap-none sm:overflow-x-visible sm:touch-auto">
          {LAYER_IDS.map((layerId) => (
            <div
              key={layerId}
              className="min-w-[280px] flex-1 shrink-0 snap-start sm:min-w-0"
            >
              {layerBoard(layerId)}
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeAction ? (
            <ActionCard
              action={activeAction}
              onEdit={() => {}}
              onDelete={() => {}}
              overlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function ActionForm({
  form,
  setForm,
  onSave,
}: {
  form: typeof emptyForm;
  setForm: Dispatch<SetStateAction<typeof emptyForm>>;
  onSave: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Layer</Label>
        <Select
          value={form.layerId}
          onValueChange={(v) => setForm({ ...form, layerId: v as ActionLayerId })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LAYER_IDS.map((id) => (
              <SelectItem key={id} value={id}>
                {id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>Owner team</Label>
          <Select
            value={form.ownerTeam}
            onValueChange={(v) => setForm({ ...form, ownerTeam: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OWNER_TEAMS.map((team) => (
                <SelectItem key={team} value={team}>
                  {team}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Owner person</Label>
          <Input
            value={form.ownerPerson}
            onChange={(e) => setForm({ ...form, ownerPerson: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>Due week (1–12)</Label>
          <Input
            type="number"
            min={1}
            max={12}
            value={form.dueWeek}
            onChange={(e) =>
              setForm({ ...form, dueWeek: Math.min(12, Math.max(1, Number(e.target.value) || 1)) })
            }
          />
        </div>
        <div>
          <Label>Status</Label>
          <Select
            value={form.status}
            onValueChange={(v) => setForm({ ...form, status: v as ActionStatus })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabels[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Resource asks (comma-separated)</Label>
        <Input
          value={form.resourceAsks}
          onChange={(e) => setForm({ ...form, resourceAsks: e.target.value })}
          placeholder="2 dev days, PR retainer"
        />
      </div>
      <Button
        type="button"
        onClick={onSave}
        disabled={!form.description.trim()}
        className="w-full sm:w-auto"
      >
        Save
      </Button>
    </div>
  );
}
