# The Spatial Bureau

[English](README.md) | **中文**

沉浸式空间统计训练。界面标题为「空间探案局」(*Spatial Detective*)：你在 **新域市** 当调查员，用地图、邻居、权重矩阵和 Moran’s I / LISA 解释城市异常。

英文名 *The Spatial Bureau* 即「探案局」。界面为中文。

仓库：<https://github.com/Lynnyyang/The-Spatial-Bureau>

---

## 这是什么

纯前端 React 应用。8×8 城市网格（另有六边形地图）让你**看见**空间依赖，而不只是读公式。进度、经验、徽章、排行榜与证书存在 `src/store/app.ts`。

---

## 四个实验室

| 路由 | 课名 | 内容 |
| --- | --- | --- |
| `/lab/dependency` | 依赖性实验室 | 聚集 vs 随机地图 |
| `/lab/neighbors` | 邻居中心 | Rook / queen / 距离 / KNN |
| `/lab/weights` | 权重矩阵工坊 | 构建并修复 **W** |
| `/lab/autocorrelation` | 自相关作战室 | 全局 Moran’s I 与 LISA 散点 |

核心代码：`src/lib/spatial.ts`（不另引统计库）。

---

## 案件

| Id | 标题 | 主题 |
| --- | --- | --- |
| heat | 热力失衡 | 城市热岛 |
| epidemic | 疫情蔓延 | 相邻社区扩散 |
| housing | 房价迷局 | 房价聚集与 **W** |
| crime | 治安黑洞 | 热点、Moran’s I / LISA |
| traffic | 拥堵之链 | 网络邻接 |
| final | 城市风险总指挥 | 综合收官 |

另有：`/training`、`/leaderboard`、`/achievements`、`/certificate`。

---

## 技术栈

Vite、TypeScript、React、Tailwind CSS、shadcn/ui、React Router。开发端口 **8080**。

---

## 本地运行

```bash
git clone https://github.com/Lynnyyang/The-Spatial-Bureau.git
cd The-Spatial-Bureau
npm install
npm run dev
```

```bash
npm run build
npm run preview
npm run lint
npm test
```

无后端、无需 API Key。

---

## 目录

```
src/
  pages/Home.tsx
  pages/Cases.tsx, CasePage.tsx
  pages/labs/
  pages/Training.tsx, Leaderboard.tsx, Achievements.tsx, Certificate.tsx
  components/GridCity.tsx, HexCity.tsx, MatrixView.tsx, MoranScatter.tsx
  lib/spatial.ts
  store/app.ts
```

---

## 许可

[MIT](LICENSE)
