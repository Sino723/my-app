import express from "express";

const app = express();
const port = 3000;

//クライアントから送られてくるJSONデータを扱えるようにする設定
app.use(express.json());

//==設計書に沿ったAPIのルーティング==
// 1. タスク一覧取得（階層構造を含む）
app.get("/tasks", (req, res) => {
    res.send("タスク一覧を返す予定のAPIです");
});

// 2. 新規タスク登録（親子関係の指定含む）
app.post("/tasks", (req, res) => {
    res.send("タスクを登録する予定のAPIです");
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
    console.log("Server is running on http://localhost:${port}");
});