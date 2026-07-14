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

// トップページ（マトリックス用の座標計算を追加！）
app.get("/", async (req, res) => {
  try {
    const incompleteTasks = await prisma.task.findMany({
      where: { is_completed: false },
      orderBy: { id: 'desc' }
    });
    const completedTasks = await prisma.task.findMany({
      where: { is_completed: true },
      orderBy: { id: 'desc' }
    });

    // --- マトリックス用の計算ロジック ---
    const now = new Date().getTime();
    
    // 1. 期限が設定されている未完了タスクを抽出して残り時間を計算
    let matrixTasks = incompleteTasks
      .filter(t => t.deadline) 
      .map(t => {
        // 期限切れは0とする
        const timeLeft = Math.max(0, t.deadline!.getTime() - now);
        return { ...t, timeLeft: timeLeft };
      });

    // 2. 最も残り時間が大きいタスクの時間を取得（分母にするため）
    // （※タスクがない時の0除算エラーを防ぐため最低でも1にする）
    const maxTimeLeft = Math.max(...matrixTasks.map(t => t.timeLeft), 1);

    // 3. 画面の縦横のパーセンテージ(X, Y座標)を計算して付与
    const matrixTasksWithPosition = matrixTasks.map(t => {
      return {
        ...t,
        // X軸(横): 残り時間（緊急なものほど左の0に近づく。端に行きすぎないよう最大85%）
        x: (t.timeLeft / maxTimeLeft) * 85, 
        // Y軸(縦): 重さ（1〜10の値を割合に。端に行きすぎないよう最大85%）
        y: (t.weight / 10) * 85 
      };
    });

    res.render("index", { 
        incompleteTasks: incompleteTasks,
        completedTasks: completedTasks,
        allTasks: incompleteTasks,
        matrixTasks: matrixTasksWithPosition // 計算したデータを画面に渡す！
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("エラーが発生しました");
  }
});

// 新規登録
app.post("/tasks", async (req, res) => {
  try {
    const { title, deadline, weight, parent_id } = req.body;
    if (title) {
      await prisma.task.create({
        data: {
          title: title,
          deadline: deadline ? new Date(deadline) : null,
          weight: weight ? parseInt(weight, 10) : 1, 
          parent_id: parent_id ? parseInt(parent_id, 10) : null 
        },
      });
    }
    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).send("登録に失敗しました");
  }
});

// 階層表示ページ
app.get("/hierarchy", async (req, res) => {
  try {
    const parentTasks = await prisma.task.findMany({
      where: { parent_id: null },
      include: { children: true },
      orderBy: { id: 'desc' }
    });
    res.render("hierarchy", { parentTasks: parentTasks });
  } catch (error) {
    console.error(error);
    res.status(500).send("エラーが発生しました");
  }
});

// 完了トグルと削除
app.post("/tasks/:id/toggle", async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (task) {
        await prisma.task.update({
          where: { id: taskId },
          data: { is_completed: !task.is_completed }
        });
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
    await prisma.task.delete({ where: { id: taskId } });
    res.redirect("/"); 
  } catch (error) {
    console.error(error);
    res.status(500).send("削除に失敗しました");
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});