import express from "express";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const app = express();
const port = 3000;

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ 
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", "./views");

app.get("/", async (req, res) => {
  try {
    // 1. まず「ジャンル（重さが0のタスク）」をすべて取得し、辞書化する
    const genres = await prisma.task.findMany({ where: { weight: 0 }, orderBy: { id: 'desc' } });
    const genreMap: Record<number, string> = {};
    genres.forEach(g => { genreMap[g.id] = g.title; });

    // 2. タスクにジャンル名を紐付けるヘルパー関数
    const attachGenre = (t: any) => ({
      ...t,
      genreName: t.from_template_id ? genreMap[t.from_template_id] : null,
      children: t.children ? t.children.map((c: any) => ({...c, genreName: c.from_template_id ? genreMap[c.from_template_id] : null})) : []
    });

    // 3. 通常のタスク（重さが0より大きいもの）を取得し、ジャンル名をくっつける
    const incompleteParentTasks = (await prisma.task.findMany({
      where: { parent_id: null, is_completed: false, weight: { gt: 0 } },
      include: { children: { orderBy: { id: 'asc' } } },
      orderBy: { id: 'desc' }
    })).map(attachGenre);

    const completedParentTasks = (await prisma.task.findMany({
      where: { parent_id: null, is_completed: true, weight: { gt: 0 } },
      include: { children: { orderBy: { id: 'asc' } } },
      orderBy: { id: 'desc' }
    })).map(attachGenre);

    const allParentTasks = await prisma.task.findMany({
      where: { parent_id: null, is_completed: false, weight: { gt: 0 } },
      orderBy: { id: 'desc' }
    });

    const allIncompleteWithChildren = await prisma.task.findMany({
      where: { is_completed: false, weight: { gt: 0 } },
      include: { children: true }
    });

    const now = new Date().getTime();
    
    let matrixTasks = allIncompleteWithChildren
      .filter(t => t.deadline && t.children.length === 0) 
      .map(t => {
        const timeLeft = Math.max(0, t.deadline!.getTime() - now);
        return attachGenre({ ...t, timeLeft: timeLeft });
      });

    const ONE_DAY = 24 * 60 * 60 * 1000; 
    const DEFAULT_MAX_TIME = ONE_DAY;    

    const maxTaskTimeLeft = matrixTasks.length > 0 ? Math.max(...matrixTasks.map(t => t.timeLeft)) : 0;
    let matrixMaxTime = Math.max(DEFAULT_MAX_TIME, maxTaskTimeLeft);
    const maxDays = Math.ceil(matrixMaxTime / ONE_DAY);
    matrixMaxTime = maxDays * ONE_DAY;

    const MAX_TICKS = 15; 
    let tickIntervalDays = 1; 
    while (maxDays / tickIntervalDays > MAX_TICKS) {
        tickIntervalDays *= 2;
    }

    const matrixTasksWithPosition = matrixTasks.map(t => {
      const timeRatio = t.timeLeft / matrixMaxTime;
      return {
        ...t,
        timeRatio: timeRatio,
        x: timeRatio * 85, 
        y: (t.weight / 10) * 85 
      };
    });

    const ticks = [];
    for (let i = 0; i <= maxDays; i += tickIntervalDays) {
        ticks.push({
            ratio: (i * ONE_DAY) / matrixMaxTime,
            label: i === 0 ? "0日" : `${i}日`
        });
    }

    res.render("index", { 
        incompleteParentTasks: incompleteParentTasks,
        completedParentTasks: completedParentTasks,
        allParentTasks: allParentTasks,
        genres: genres, // プルダウン用にジャンル一覧を渡す
        matrixTasks: matrixTasksWithPosition,
        matrixTicks: ticks 
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("エラーが発生しました");
  }
});

app.post("/tasks", async (req, res) => {
  try {
    const { title, deadline, weight, parent_id, from_template_id, is_genre } = req.body;
    if (title) {
      if (is_genre === 'true') {
        // 【ジャンル登録】重さを0にして保存する！
        await prisma.task.create({
          data: { title: title, weight: 0 }
        });
      } else {
        // 【通常タスク登録】
        await prisma.task.create({
          data: {
            title: title,
            deadline: deadline ? new Date(deadline) : null,
            weight: weight ? parseInt(weight, 10) : 1, 
            parent_id: parent_id ? parseInt(parent_id, 10) : null,
            from_template_id: from_template_id ? parseInt(from_template_id, 10) : null 
          },
        });
      }
    }
    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).send("登録に失敗しました");
  }
});

app.post("/tasks/:id/edit", async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const { title, deadline, weight, from_template_id } = req.body;
    await prisma.task.update({
      where: { id: taskId },
      data: {
        title: title,
        deadline: deadline ? new Date(deadline) : null,
        weight: weight ? parseInt(weight, 10) : 1,
        from_template_id: from_template_id ? parseInt(from_template_id, 10) : null 
      }
    });
    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).send("更新に失敗しました");
  }
});

// --- 新機能：ジャンル別表示ページ ---
app.get("/genres", async (req, res) => {
  try {
    // ジャンル（weight: 0）を取得
    const genres = await prisma.task.findMany({
      where: { weight: 0 },
      orderBy: { id: 'desc' }
    });
    // ジャンルが紐づいている全タスクを取得
    const tasksWithGenre = await prisma.task.findMany({
      where: { from_template_id: { not: null }, weight: { gt: 0 } },
      orderBy: { id: 'desc' }
    });
    res.render("genres", { genres: genres, tasksWithGenre: tasksWithGenre });
  } catch (error) {
    console.error(error);
    res.status(500).send("エラーが発生しました");
  }
});

app.post("/tasks/:id/toggle", async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (task) {
        const newCompleted = !task.is_completed;
        await prisma.task.update({ where: { id: taskId }, data: { is_completed: newCompleted } });
        if (task.parent_id) {
            const siblings = await prisma.task.findMany({ where: { parent_id: task.parent_id } });
            const allSiblingsCompleted = siblings.length > 0 && siblings.every(s => s.is_completed);
            await prisma.task.update({ where: { id: task.parent_id }, data: { is_completed: allSiblingsCompleted } });
        }
    }
    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).send("更新に失敗しました");
  }
});

app.post("/tasks/:id/delete", async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const taskToDelete = await prisma.task.findUnique({ where: { id: taskId } });
    if (!taskToDelete) return res.redirect("/");
    
    await prisma.task.deleteMany({ where: { parent_id: taskId } });
    await prisma.task.delete({ where: { id: taskId } });

    if (taskToDelete.parent_id) {
        const siblings = await prisma.task.findMany({ where: { parent_id: taskToDelete.parent_id } });
        if (siblings.length > 0) {
            const allSiblingsCompleted = siblings.every(s => s.is_completed);
            await prisma.task.update({ where: { id: taskToDelete.parent_id }, data: { is_completed: allSiblingsCompleted } });
        }
    }
    // 削除元がジャンルページならジャンルページに戻るための簡易対応
    res.redirect(req.headers.referer || "/"); 
  } catch (error) {
    console.error(error);
    res.status(500).send("削除に失敗しました");
  }
});

app.get("/hierarchy", async (req, res) => { res.redirect("/"); });

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});