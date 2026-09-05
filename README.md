# The Spatial Bureau

**English** | [中文](README.zh-CN.md)

An immersive spatial-statistics trainer. The on-screen title is「空间探案局」(*Spatial Detective*): you are an investigator in **新域市**, using maps, neighbors, a weights matrix, and Moran’s I / LISA to explain urban anomalies.

*The Spatial Bureau* is the English name of 探案局. The UI is in Chinese.

Repository: <https://github.com/Lynnyyang/The-Spatial-Bureau>

---

## What this is

A client-only React app. An 8×8 city grid (plus a hex map) lets you *see* spatial dependence instead of only reading formulas. Progress, XP, badges, a leaderboard, and a certificate live in `src/store/app.ts`.

---

## Four labs

| Route | In-app name | Idea |
| --- | --- | --- |
| `/lab/dependency` | 依赖性实验室 | Clustered vs random maps |
| `/lab/neighbors` | 邻居中心 | Rook / queen / distance / KNN |
| `/lab/weights` | 权重矩阵工坊 | Build and repair **W** |
| `/lab/autocorrelation` | 自相关作战室 | Global Moran’s I and LISA scatter |

Core code: `src/lib/spatial.ts` (no extra stats library).

---

## Cases

| Id | Title | Theme |
| --- | --- | --- |
| heat | 热力失衡 | Urban heat island |
| epidemic | 疫情蔓延 | Contagion across adjacent districts |
| housing | 房价迷局 | Price clusters and **W** |
| crime | 治安黑洞 | Hotspots, Moran’s I / LISA |
| traffic | 拥堵之链 | Network adjacency |
| final | 城市风险总指挥 | Capstone |

Also: `/training`, `/leaderboard`, `/achievements`, `/certificate`.

---

## Stack

Vite, TypeScript, React, Tailwind CSS, shadcn/ui, React Router. Dev port **8080**.

---

## Run locally

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

No backend, no API keys.

---

## Layout

```
src/
  pages/Home.tsx
  pages/Cases.tsx, CasePage.tsx
  pages/labs/          # four labs
  pages/Training.tsx, Leaderboard.tsx, Achievements.tsx, Certificate.tsx
  components/GridCity.tsx, HexCity.tsx, MatrixView.tsx, MoranScatter.tsx
  lib/spatial.ts
  store/app.ts
```

---

## License

[MIT](LICENSE)
