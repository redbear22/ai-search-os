"use client";

import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  FolderPlus,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useTaskStore } from "@/store/taskStore";
import { useAuditStore } from "@/store/auditStore";
import { detectGapsRemote } from "@/lib/client/proprietary-api";
import { generateSuggestedTasksFromGaps } from "@/lib/task-generator";
import type { ProjectTask } from "@/types/task";
import { TaskFeatureOverview } from "@/components/tasks/TaskFeatureOverview";
import { useTasksDbSync } from "@/hooks/useWorkflowDb";

const priorityColors = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-500",
};

const statusIcons = {
  not_started: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  blocked: AlertCircle,
};

export default function TasksPage() {
  const folders = useTaskStore((s) => s.folders);
  const currentFolderId = useTaskStore((s) => s.currentFolderId);
  const addFolder = useTaskStore((s) => s.addFolder);
  const addTask = useTaskStore((s) => s.addTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const updateChecklistItem = useTaskStore((s) => s.updateChecklistItem);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const deleteFolder = useTaskStore((s) => s.deleteFolder);
  const setCurrentFolderId = useTaskStore((s) => s.setCurrentFolderId);
  const calculateProgress = useTaskStore((s) => s.calculateProgress);

  const auditData = useAuditStore(
    useShallow((s) => ({
      discoverability: s.discoverability,
      clarity: s.clarity,
      authority: s.authority,
      trust: s.trust,
    }))
  );

  const [hydrated, setHydrated] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  useTasksDbSync();

  useEffect(() => {
    const unsub = useTaskStore.persist.onFinishHydration(() => setHydrated(true));
    void useTaskStore.persist.rehydrate();
    if (useTaskStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  const selectedFolder = currentFolderId;
  const currentFolder = folders.find((f) => f.id === selectedFolder);
  const progress = currentFolder ? calculateProgress(currentFolder.id) : 0;

  const handleSuggestTasks = async () => {
    if (!selectedFolder) {
      toast.error("Select or create a folder first");
      return;
    }

    try {
      const result = await detectGapsRemote(auditData);
      if (result.gaps.length === 0) {
        toast.info("No gaps found — your brand is doing great!");
        return;
      }

      const suggestedTasks = generateSuggestedTasksFromGaps(result.gaps);
      suggestedTasks.forEach((task) => addTask(selectedFolder, task));
      toast.success(`Added ${suggestedTasks.length} suggested tasks from gaps`);
    } catch {
      toast.error("Failed to detect gaps from server");
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast.error("Folder name required");
      return;
    }

    addFolder({
      name: newFolderName.trim(),
      description: newFolderDesc.trim(),
      tasks: [],
    });

    const latestId = useTaskStore.getState().currentFolderId;
    if (latestId) setCurrentFolderId(latestId);

    setNewFolderName("");
    setNewFolderDesc("");
    setShowNewFolder(false);
    toast.success("Folder created");
  };

  const handleAddEmptyTask = () => {
    if (!selectedFolder) return;
    addTask(selectedFolder, {
      title: "New Task",
      description: "",
      checklist: [],
      status: "not_started",
      priority: "medium",
      estimatedTime: "1-2 hours",
      suggestedActionPlan: "",
      resourcesNeeded: [],
    });
  };

  const getTaskStatusBadge = (status: ProjectTask["status"]) => {
    const colors = {
      not_started: "bg-gray-500",
      in_progress: "bg-yellow-500",
      completed: "bg-green-500",
      blocked: "bg-red-500",
    };
    const labels = {
      not_started: "Not Started",
      in_progress: "In Progress",
      completed: "Completed",
      blocked: "Blocked",
    };
    return (
      <Badge className={`${colors[status]} text-white`}>{labels[status]}</Badge>
    );
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        Loading tasks...
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-4 p-4 animate-fade-in sm:space-y-6 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Project Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Turn gaps into actionable checklists
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleSuggestTasks} className="w-full sm:w-auto">
            <Sparkles className="mr-2 h-4 w-4" />
            Suggest from Gaps
          </Button>
          <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <FolderPlus className="mr-2 h-4 w-4" />
                New Folder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Project Folder</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Folder Name</Label>
                  <Input
                    placeholder="e.g., Q4 SEO Initiative"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    placeholder="What's the goal of this project?"
                    value={newFolderDesc}
                    onChange={(e) => setNewFolderDesc(e.target.value)}
                  />
                </div>
                <Button onClick={handleCreateFolder} className="w-full">
                  Create Folder
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {folders.length === 0 && <TaskFeatureOverview compact />}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Project Folders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {folders.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <FolderPlus className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm">No folders yet</p>
                <p className="text-xs">Create one to start tracking tasks</p>
              </div>
            ) : (
              folders.map((folder) => {
                const folderProgress = calculateProgress(folder.id);
                return (
                  <div
                    key={folder.id}
                    className={`cursor-pointer rounded-lg p-3 transition-all hover:bg-accent ${
                      selectedFolder === folder.id ? "bg-accent" : ""
                    }`}
                    onClick={() => setCurrentFolderId(folder.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium">{folder.name}</h3>
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {folder.description || "No description"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFolder(folder.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="mt-2">
                      <div className="mb-1 flex justify-between text-xs">
                        <span>Progress</span>
                        <span>{folderProgress}%</span>
                      </div>
                      <Progress value={folderProgress} className="h-1" />
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {folder.tasks.length} tasks
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{currentFolder?.name || "Select a folder"}</CardTitle>
              {currentFolder && (
                <Button size="sm" onClick={handleAddEmptyTask}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add Task
                </Button>
              )}
            </div>
            {currentFolder?.description && (
              <p className="text-sm text-muted-foreground">{currentFolder.description}</p>
            )}
          </CardHeader>
          <CardContent>
            {!currentFolder ? (
              <div className="py-12 text-center text-muted-foreground">
                <FolderPlus className="mx-auto mb-3 h-12 w-12 opacity-50" />
                <p>Select a folder or create one to get started</p>
              </div>
            ) : currentFolder.tasks.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted p-3">
                  <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="mb-4 text-muted-foreground">No tasks yet</p>
                <div className="flex flex-col justify-center gap-2 sm:flex-row">
                  <Button variant="outline" onClick={handleSuggestTasks}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Suggest from Gaps
                  </Button>
                  <Button onClick={handleAddEmptyTask}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Task
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {currentFolder.tasks.map((task) => {
                  const StatusIcon = statusIcons[task.status];
                  const completedCount = task.checklist.filter((i) => i.completed).length;
                  const taskProgress =
                    task.checklist.length > 0
                      ? (completedCount / task.checklist.length) * 100
                      : 0;

                  return (
                    <div key={task.id} className="hover-lift rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <StatusIcon className="h-4 w-4 text-muted-foreground" />
                            {getTaskStatusBadge(task.status)}
                            <Badge className={`${priorityColors[task.priority]} text-white`}>
                              {task.priority.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">{task.estimatedTime}</Badge>
                          </div>
                          <h3 className="font-semibold">{task.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {task.description || "No description"}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTask(task.id)}
                          aria-label="Delete task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {task.checklist.length > 0 && (
                        <div className="mt-3">
                          <div className="mb-1 flex justify-between text-xs">
                            <span>Checklist Progress</span>
                            <span>
                              {completedCount}/{task.checklist.length}
                            </span>
                          </div>
                          <Progress value={taskProgress} className="h-1" />
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={() =>
                          setExpandedTask(expandedTask === task.id ? null : task.id)
                        }
                      >
                        <ChevronRight
                          className={`mr-1 h-4 w-4 transition-transform ${
                            expandedTask === task.id ? "rotate-90" : ""
                          }`}
                        />
                        {expandedTask === task.id ? "Hide Checklist" : "Show Checklist"}
                      </Button>

                      {expandedTask === task.id && (
                        <div className="mt-3 space-y-2 border-l-2 border-primary/30 pl-2">
                          {task.checklist.map((item) => (
                            <div key={item.id} className="flex items-start gap-2">
                              <Checkbox
                                checked={item.completed}
                                onCheckedChange={(checked) =>
                                  updateChecklistItem(task.id, item.id, checked === true)
                                }
                                className="mt-0.5"
                              />
                              <div className="flex-1">
                                <p
                                  className={`text-sm ${
                                    item.completed
                                      ? "text-muted-foreground line-through"
                                      : ""
                                  }`}
                                >
                                  {item.text}
                                </p>
                                {item.notes && (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {item.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 w-full"
                            onClick={() => {
                              const newItem = prompt("Add checklist item:");
                              if (newItem?.trim()) {
                                updateTask(task.id, {
                                  checklist: [
                                    ...task.checklist,
                                    {
                                      id: crypto.randomUUID(),
                                      text: newItem.trim(),
                                      completed: false,
                                    },
                                  ],
                                });
                              }
                            }}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Add Item
                          </Button>
                        </div>
                      )}

                      {task.suggestedActionPlan && (
                        <div className="mt-3 rounded-lg bg-muted p-3">
                          <p className="mb-1 text-xs font-medium">Suggested Action Plan</p>
                          <p className="text-sm">{task.suggestedActionPlan}</p>
                        </div>
                      )}

                      {task.resourcesNeeded.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {task.resourcesNeeded.map((resource, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {resource}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {currentFolder && currentFolder.tasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Project Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Overall Completion</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {currentFolder.tasks.filter((t) => t.status === "completed").length}
                  </div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {currentFolder.tasks.filter((t) => t.status === "in_progress").length}
                  </div>
                  <div className="text-xs text-muted-foreground">In Progress</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {currentFolder.tasks.filter((t) => t.status === "not_started").length}
                  </div>
                  <div className="text-xs text-muted-foreground">Not Started</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {currentFolder.tasks.filter((t) => t.status === "blocked").length}
                  </div>
                  <div className="text-xs text-muted-foreground">Blocked</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
