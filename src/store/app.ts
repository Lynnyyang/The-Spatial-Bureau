import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CaseId = "heat" | "epidemic" | "housing" | "crime" | "traffic" | "final";

export interface CaseProgress {
  started: boolean;
  completed: boolean;
  score: number; // 0-100
  badges: string[];
}

interface AppState {
  xp: number;
  coins: number;
  cases: Record<CaseId, CaseProgress>;
  badges: string[];
  certificateLevel: "none" | "bronze" | "silver" | "gold" | "honor";
  userName: string;
  setName: (n: string) => void;
  awardXp: (n: number) => void;
  awardCoins: (n: number) => void;
  completeCase: (id: CaseId, score: number, badges?: string[]) => void;
  startCase: (id: CaseId) => void;
  reset: () => void;
}

const emptyCase = (): CaseProgress => ({ started: false, completed: false, score: 0, badges: [] });

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      xp: 0,
      coins: 0,
      cases: {
        heat: emptyCase(),
        epidemic: emptyCase(),
        housing: emptyCase(),
        crime: emptyCase(),
        traffic: emptyCase(),
        final: emptyCase(),
      },
      badges: [],
      certificateLevel: "none",
      userName: "空间调查员",
      setName: (n) => set({ userName: n }),
      awardXp: (n) => set({ xp: get().xp + n }),
      awardCoins: (n) => set({ coins: get().coins + n }),
      startCase: (id) =>
        set((s) => ({ cases: { ...s.cases, [id]: { ...s.cases[id], started: true } } })),
      completeCase: (id, score, badges = []) => {
        const s = get();
        const newCases = {
          ...s.cases,
          [id]: { ...s.cases[id], started: true, completed: true, score, badges },
        };
        const allBadges = Array.from(new Set([...s.badges, ...badges]));
        const completedList = (Object.values(newCases) as CaseProgress[]).filter((c) => c.completed);
        const completedCount = completedList.length;
        const avg = completedList.reduce((a, c) => a + c.score, 0) / Math.max(completedCount, 1);
        let level: AppState["certificateLevel"] = "none";
        if (completedCount >= 1) level = "bronze";
        if (completedCount >= 4 && avg >= 70) level = "silver";
        if (completedCount >= 6 && avg >= 85) level = "gold";
        if (completedCount >= 6 && avg >= 95) level = "honor";
        set({
          cases: newCases,
          badges: allBadges,
          certificateLevel: level,
          xp: s.xp + Math.round(score),
          coins: s.coins + 20,
        });
      },
      reset: () =>
        set({
          xp: 0,
          coins: 0,
          cases: {
            heat: emptyCase(),
            epidemic: emptyCase(),
            housing: emptyCase(),
            crime: emptyCase(),
            traffic: emptyCase(),
            final: emptyCase(),
          },
          badges: [],
          certificateLevel: "none",
        }),
    }),
    { name: "spatial-detective-store" }
  )
);

export const CASE_META: Record<CaseId, { title: string; subtitle: string; tag: string; color: string }> = {
  heat: { title: "热力失衡", subtitle: "环保局：城市热岛是否显著聚集？", tag: "空间依赖", color: "hsl(var(--hl))" },
  epidemic: { title: "疫情蔓延", subtitle: "卫健委：相邻社区扩散判断", tag: "空间邻居", color: "hsl(var(--hh))" },
  housing: { title: "房价迷局", subtitle: "住房局：高房价泡沫聚集？", tag: "权重矩阵", color: "hsl(var(--primary))" },
  crime: { title: "治安黑洞", subtitle: "公安局：热点街区识别", tag: "Moran's I / LISA", color: "hsl(var(--lh))" },
  traffic: { title: "拥堵之链", subtitle: "交管局：网络空间结构", tag: "网络邻接", color: "hsl(var(--accent))" },
  final: { title: "城市风险总指挥", subtitle: "市政府：综合分析与决策", tag: "终极任务", color: "hsl(var(--ll))" },
};
