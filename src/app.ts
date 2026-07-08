import express from "express";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const app = express();
const port = 3000;

// 1. PostgreSQLに接続するための「アダプター」を準備する
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// 2. アダプターをPrismaClientに渡す！
let prisma: PrismaClient;

console.log("★新しいapp.tsが確実に保存されて動いています！"); 
try {
    // ここが真の解決策！空っぽではなく { adapter } を渡して起動します
    prisma = new PrismaClient({ adapter });
    console.log("Prismaの準備完了！DBと完全に繋がりました！");
} catch (error: any) {
    console.error("\n==================================");
    console.error("【本当のエラー原因はコレです】");
    console.error(error.message);
    console.error("==================================\n");
    process.exit(1); // エラーを見やすくするためにここで強制停止します
}

//クライアントから送られてくるJSONデータを扱えるようにする設定
app.use(express.json());

//==設計書に沿ったAPIのルーティング==
// 1. タスク一覧取得（階層構造を含む）
app.get("/tasks", async (req, res) => {
    //Prismaを使ってデータベースから全てのタスクを取得
    const tasks = await prisma.task.findMany();
    //結果をJSON形式でブラウザに返す
    res.json(tasks);
});

// 2. 新規タスク登録（親子関係の指定含む）
app.post("/tasks", async (req, res) => {
    //クライアントから送られてきたデータを受け取る
    const { title, weight } = req.body;

    //Prismaを使ってデータベースに新しいタスクを保存
    const newTask = await prisma.task.create({
        data: {
            title: title,
            weight: weight,
            // idは自動連番、is_completedはデフォルトfalseより指定不要
        }
    });

    //登録できたデータを返す
    res.json(newTask);
});

// 3. 今日の空き時間に基づいた最適タスクの選出
app.get("/tasks/recommend", (req, res) => {
    res.send("おすすめのタスクを返す予定のAPIです");
});

// 4. 生活リズムのパターンの作成
app.post("/patterns", (req, res) => {
    res.send("生活リズムパターンを登録する予定のAPIです");
});

// 5. 各曜日のパターン割り当て
app.put("/weekly-schedule", (req, res) => {
    res.send("習慣スケジュールを更新する予定のAPIです");
});

//サーバーを起動して待機する
app.listen(port, () =>{
    console.log(`Server is running on http://localhost:${port}`);
});