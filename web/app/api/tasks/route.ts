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

async function loadFolders(clientId: string) {
  const projects = await prisma.taskProject.findMany({
    where: { clientId },
    include: { tasks: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });
  return projects.map((p) => folderFromProject(p, calculateFolderProgress));
}

export async function GET() {
  const ctx = await requireWorkflowContext();
  if (ctx instanceof NextResponse) return ctx;

  const folders = await loadFolders(ctx.clientId);
  return NextResponse.json({ folders });
}

type PostTasksBody =
  | {
      type: "folder";
      name: string;
      description?: string;
    }
  | {
      type: "task";
      projectId: string;
      task: Omit<ProjectTask, "id" | "createdAt"> & { id?: string };
    }
  | {
      type: "sync";
      folders: ProjectFolder[];
    };

export async function POST(request: Request) {
  const ctx = await requireWorkflowContext();
  if (ctx instanceof NextResponse) return ctx;

  const body = (await request.json()) as PostTasksBody;

  if (body.type === "folder") {
    const maxSort = await prisma.taskProject.aggregate({
      where: { clientId: ctx.clientId },
      _max: { sortOrder: true },
    });
    const project = await prisma.taskProject.create({
      data: {
        clientId: ctx.clientId,
        userId: ctx.userId,
        name: body.name.trim() || "Untitled folder",
        description: body.description?.trim() ?? "",
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
      include: { tasks: true },
    });
    const folder = folderFromProject(project, calculateFolderProgress);
    return NextResponse.json({ folder }, { status: 201 });
  }

  if (body.type === "task") {
    const project = await prisma.taskProject.findFirst({
      where: { id: body.projectId, clientId: ctx.clientId },
    });
    if (!project) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const maxSort = await prisma.task.aggregate({
      where: { projectId: project.id },
      _max: { sortOrder: true },
    });

    const created = await prisma.task.create({
      data: {
        projectId: project.id,
        ...projectTaskToDbFields(body.task, (maxSort._max.sortOrder ?? -1) + 1),
      },
    });

    return NextResponse.json({ task: taskRowToProjectTask(created) }, { status: 201 });
  }

  if (body.type === "sync") {
    await prisma.$transaction(async (tx) => {
      const existingProjects = await tx.taskProject.findMany({
        where: { clientId: ctx.clientId },
        select: { id: true },
      });
      const existingIds = new Set(existingProjects.map((p) => p.id));

      for (let fi = 0; fi < body.folders.length; fi++) {
        const folder = body.folders[fi];
        const projectId =
          folder.id && existingIds.has(folder.id) ? folder.id : undefined;

        const project = projectId
          ? await tx.taskProject.update({
              where: { id: projectId },
              data: {
                name: folder.name,
                description: folder.description,
                sortOrder: fi,
              },
            })
          : await tx.taskProject.create({
              data: {
                clientId: ctx.clientId,
                userId: ctx.userId,
                name: folder.name,
                description: folder.description,
                sortOrder: fi,
              },
            });

        await tx.task.deleteMany({ where: { projectId: project.id } });
        for (let ti = 0; ti < folder.tasks.length; ti++) {
          await tx.task.create({
            data: {
              projectId: project.id,
              ...projectTaskToDbFields(folder.tasks[ti], ti),
            },
          });
        }
      }

      const incomingIds = new Set(body.folders.map((f) => f.id).filter(Boolean));
      const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));
      if (toDelete.length > 0) {
        await tx.taskProject.deleteMany({
          where: { id: { in: toDelete }, clientId: ctx.clientId },
        });
      }
    });

    const folders = await loadFolders(ctx.clientId);
    return NextResponse.json({ folders });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
