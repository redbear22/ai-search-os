import { NextResponse } from "next/server";
import type { ProjectFolder, ProjectTask } from "@/types/task";
import { prisma } from "@/lib/prisma";
import { requireWorkflowContext } from "@/lib/workflow-access";
import {
  calculateFolderProgress,
  folderFromProject,
  projectTaskToDbFields,
  taskRowToProjectTask,
} from "@/lib/workflow-mappers";
import { workflowErrorResponse } from "@/lib/workflow-route";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const ctx = await requireWorkflowContext();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") ?? "task";

  try {
    if (kind === "folder") {
      const body = (await request.json()) as Partial<ProjectFolder>;
    const project = await prisma.taskProject.findFirst({
      where: { id, clientId: ctx.clientId },
    });
    if (!project) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const updated = await prisma.taskProject.update({
      where: { id },
      data: {
        name: body.name ?? project.name,
        description: body.description ?? project.description,
        sortOrder: body.name ? project.sortOrder : project.sortOrder,
      },
      include: { tasks: { orderBy: { sortOrder: "asc" } } },
    });

    return NextResponse.json({
      folder: folderFromProject(updated, calculateFolderProgress),
    });
  }

  const body = (await request.json()) as Partial<ProjectTask>;
  const task = await prisma.task.findFirst({
    where: {
      id,
      project: { clientId: ctx.clientId },
    },
  });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const merged = {
    ...taskRowToProjectTask(task),
    ...body,
    id,
  };

  const updated = await prisma.task.update({
    where: { id },
    data: projectTaskToDbFields(merged, task.sortOrder),
  });

  return NextResponse.json({ task: taskRowToProjectTask(updated) });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const ctx = await requireWorkflowContext();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") ?? "task";

  try {
    if (kind === "folder") {
    const project = await prisma.taskProject.findFirst({
      where: { id, clientId: ctx.clientId },
    });
    if (!project) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
    await prisma.taskProject.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }

  const task = await prisma.task.findFirst({
    where: { id, project: { clientId: ctx.clientId } },
  });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
