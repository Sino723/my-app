import express from "express";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const app = express();
const port = 3000;

// 1. DBアダプターの設定（前回成功した接続設定です）
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 2. フォームからのデータを受け取る設定と、HTMLを描画するエンジンの設定
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", "./views");

// 3. 【機能1】トップページ：タスクの一覧を表示する（GET /）
app.get("/", async (req, res) => {
  try {
    const tasks = await prisma.task.findMany(); // DBからタスクを全部取得
    res.render("index", { tasks: tasks });      // index.ejs に渡して表示
  } catch (error) {
    console.error(error);
    res.status(500).send("エラーが発生しました");
  }
});

// 4. 【機能2】タスクの登録処理（POST /tasks）
app.post("/tasks", async (req, res) => {
  try {
    const { title } = req.body;
    if (title) {
      // DBにタスクを新規作成
      await prisma.task.create({
        data: {
          title: title,
          // ※もしschema.prismaでweight等が「必須」になっている場合はエラーになる可能性があります。
          // その場合は以下のように適当な初期値を足してください。
          // weight: 1, 
          // deadline: new Date(),
        },
      });
    }
    res.redirect("/"); // 登録したらトップページに戻る
  } catch (error) {
    console.error(error);
    res.status(500).send("登録に失敗しました（※schema.prismaの必須項目が足りない可能性があります）");
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});