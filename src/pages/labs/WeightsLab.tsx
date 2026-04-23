import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { GridCity } from "@/components/GridCity";
import { GRID_SIZE, TOTAL } from "@/lib/spatial";
import { useAppStore } from "@/store/app";
import {
  Grid3x3,
  Coffee,
  Wifi,
  Megaphone,
  Truck,
  Search,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

export default function WeightsLab() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <header>
        <Badge variant="secondary" className="mb-2">模块三</Badge>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Grid3x3 className="h-6 w-6 text-primary" /> 空间权重矩阵工坊
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          忘掉公式吧——用三个生活化故事，亲手"调出"邻居之间的影响力强弱。
        </p>
      </header>

      <Tabs defaultValue="influence" className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="influence">📣 影响力调音台</TabsTrigger>
          <TabsTrigger value="delivery">🎪 嘉年华人流疏导</TabsTrigger>
          <TabsTrigger value="bug">🔍 矩阵找茬</TabsTrigger>
        </TabsList>

        <TabsContent value="influence" className="mt-4">
          <InfluenceMixer />
        </TabsContent>
        <TabsContent value="delivery" className="mt-4">
          <DeliveryAllocator />
        </TabsContent>
        <TabsContent value="bug" className="mt-4">
          <BugHunt />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============ 玩法一：影响力调音台 ============
// 故事：选一个"网红咖啡店"街区，调节它对邻居的影响半径与衰减强度，
// 看周围街区的"咖啡热度"如何被点亮。
function InfluenceMixer() {
  const award = useAppStore((s) => s.awardXp);

  // ---- 关卡定义 ----
  // 每关给定情境 + 目标（被影响街区数 + 权重总和范围）+ 任务描述
  const LEVELS = [
    {
      scenario: "coffee" as const,
      title: "第 1 关 · 小范围试营业",
      brief:
        "网红咖啡店刚开业，老板想先做小范围测试：精准影响 4 个最近的邻居街区，权重总和在 3.5 ~ 4.5 之间。",
      targetReached: { min: 4, max: 4 },
      targetSum: { min: 3.5, max: 4.5 },
      hint: "提示：把半径调到 1.0，影响只覆盖正东南西北 4 格（每个权重 1，总和 4）。",
    },
    {
      scenario: "wifi" as const,
      title: "第 2 关 · 5G 信号覆盖",
      brief:
        "新基站要求覆盖 8 个邻居街区（包括对角），权重总和因衰减落在 6.0 ~ 7.5 之间。",
      targetReached: { min: 8, max: 8 },
      targetSum: { min: 6.0, max: 7.5 },
      hint: "提示：半径 1.5 可覆盖 Queen 八向；α 在 0.5~2 之间调，让对角邻居权重明显小于直邻。",
    },
    {
      scenario: "rumor" as const,
      title: "第 3 关 · 全城八卦",
      brief:
        "这条八卦极度劲爆，要让 ≥ 20 个街区知晓，但因为越远越模糊，权重总和必须 ≤ 10。",
      targetReached: { min: 20, max: 99 },
      targetSum: { min: 0, max: 10 },
      hint: "提示：把半径开大到 2.5 或 3，并把 α 调到 ≥ 2 让远处快速衰减。",
    },
    {
      scenario: "coffee" as const,
      title: "第 4 关 · 平等的邻里",
      brief:
        "老板希望影响范围内每个街区都获得几乎相同的热度（不要因距离打折）。覆盖恰好 12 个邻居，权重总和约 12（每个 ≈ 1）。",
      targetReached: { min: 12, max: 12 },
      targetSum: { min: 11, max: 13 },
      hint: "提示：半径=2.0 恰好包括 12 个邻居；α=0 时每个邻居权重都=1。",
    },
  ];

  const [levelIdx, setLevelIdx] = useState(0);
  const level = LEVELS[levelIdx];

  const [center, setCenter] = useState(27);
  const [radius, setRadius] = useState([2]);
  const [decay, setDecay] = useState([1.0]);
  const [cleared, setCleared] = useState<boolean[]>(() => LEVELS.map(() => false));

  const SCENARIOS = {
    coffee: {
      icon: Coffee,
      name: "网红咖啡店",
      story: "新开的网红咖啡店在这里开业，香气和打卡风潮会向周边街区扩散。",
      unit: "热度",
    },
    wifi: {
      icon: Wifi,
      name: "5G 基站信号",
      story: "新装的 5G 基站发出信号，越近的街区信号越强，远距离迅速衰减。",
      unit: "信号强度",
    },
    rumor: {
      icon: Megaphone,
      name: "社区八卦传播",
      story: "一条劲爆消息从这里传出，靠口口相传扩散，远了就没人讲了。",
      unit: "知晓度",
    },
  } as const;

  const sc = SCENARIOS[level.scenario];
  const Icon = sc.icon;

  // 计算每个格子受到 center 的影响值
  const values = useMemo(() => {
    const out = new Array(TOTAL).fill(0);
    const r0 = Math.floor(center / GRID_SIZE);
    const c0 = center % GRID_SIZE;
    for (let i = 0; i < TOTAL; i++) {
      if (i === center) {
        out[i] = 100;
        continue;
      }
      const r = Math.floor(i / GRID_SIZE);
      const c = i % GRID_SIZE;
      const d = Math.hypot(r - r0, c - c0);
      if (d > radius[0]) {
        out[i] = 0;
      } else {
        const w = Math.pow(1 / d, decay[0]);
        out[i] = Math.min(100, Math.round(w * 100));
      }
    }
    return out;
  }, [center, radius, decay]);

  // 被影响街区：半径内、非中心、且权重 > 0 的格子（包含 d=1 直邻和 α=0 时的等权邻居）
  const reachedCount = values.filter((v, i) => i !== center && v > 0).length;
  const sumWeights = values.reduce((a, v, i) => (i === center ? a : a + v / 100), 0);

  // 判定
  const reachedOk =
    reachedCount >= level.targetReached.min && reachedCount <= level.targetReached.max;
  const sumOk = sumWeights >= level.targetSum.min && sumWeights <= level.targetSum.max;
  const passed = reachedOk && sumOk;

  const [attempts, setAttempts] = useState(0);

  const submit = () => {
    setAttempts((n) => n + 1);
    if (!passed) {
      const msgs: string[] = [];
      if (!reachedOk) msgs.push(`被影响街区 ${reachedCount}，目标 ${level.targetReached.min}-${level.targetReached.max}`);
      if (!sumOk) msgs.push(`权重总和 ${sumWeights.toFixed(2)}，目标 ${level.targetSum.min.toFixed(1)}-${level.targetSum.max.toFixed(1)}`);
      toast.error(`未达成 · ${msgs.join(" · ")}`);
      return;
    }
    if (cleared[levelIdx]) {
      toast.message("本关已通过，可直接进入下一关");
      return;
    }
    const next = [...cleared];
    next[levelIdx] = true;
    setCleared(next);
    const bonus = attempts === 0 ? 10 : 0;
    award(30 + bonus);
    toast.success(`🎉 ${level.title} 通关！+${30 + bonus} XP${bonus ? " · 一次过奖励" : ""}`);
  };

  const goNext = () => {
    if (levelIdx < LEVELS.length - 1) {
      setLevelIdx((i) => i + 1);
      setRadius([2]);
      setDecay([1.0]);
      setAttempts(0);
    }
  };

  const reset = () => {
    setRadius([2]);
    setDecay([1.0]);
    setCenter(27);
  };

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <Card className="p-5 shadow-panel border-border/60">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-mono tracking-wider text-muted-foreground">
            点击任意格子设为"影响中心"
          </div>
          <Badge variant="outline" className="font-mono text-[10px]">
            #{center}
          </Badge>
        </div>
        <GridCity
          values={values}
          size={520}
          selected={center}
          onCellClick={setCenter}
        />
      </Card>

      <div className="space-y-4">
        {/* 关卡卡片 */}
        <Card
          className={`p-4 shadow-panel border-2 transition-colors ${
            passed ? "border-success bg-success/5" : "border-primary/40 bg-primary-soft/40"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {LEVELS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setLevelIdx(i)}
                  className={`w-6 h-6 rounded text-[11px] font-mono font-bold transition-all ${
                    i === levelIdx
                      ? "bg-primary text-primary-foreground"
                      : cleared[i]
                      ? "bg-success/20 text-success border border-success"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cleared[i] ? "✓" : i + 1}
                </button>
              ))}
            </div>
            {passed && <Trophy className="h-4 w-4 text-success" />}
          </div>
          <div className="text-sm font-semibold mb-1.5">{level.title}</div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-2">{level.brief}</p>
          <div className="rounded bg-background/60 border border-border p-2 text-[11px] font-mono space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">🎯 被影响街区</span>
              <span className="flex items-center gap-1">
                <span className={reachedOk ? "text-success font-bold" : "text-foreground"}>
                  {reachedCount}
                </span>
                <span className="text-muted-foreground">
                  /{" "}
                  {level.targetReached.min === level.targetReached.max
                    ? level.targetReached.min
                    : level.targetReached.max >= 99
                    ? `≥${level.targetReached.min}`
                    : `${level.targetReached.min}-${level.targetReached.max}`}
                </span>
                {reachedOk ? (
                  <CheckCircle2 className="h-3 w-3 text-success" />
                ) : (
                  <XCircle className="h-3 w-3 text-muted-foreground" />
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">⚖️ 权重总和</span>
              <span className="flex items-center gap-1">
                <span className={sumOk ? "text-success font-bold" : "text-foreground"}>
                  {sumWeights.toFixed(2)}
                </span>
                <span className="text-muted-foreground">
                  / {level.targetSum.min.toFixed(1)}-{level.targetSum.max.toFixed(1)}
                </span>
                {sumOk ? (
                  <CheckCircle2 className="h-3 w-3 text-success" />
                ) : (
                  <XCircle className="h-3 w-3 text-muted-foreground" />
                )}
              </span>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {cleared[levelIdx] ? (
              levelIdx < LEVELS.length - 1 ? (
                <Button size="sm" onClick={goNext} className="w-full">
                  ✓ 已通关 · 进入下一关 →
                </Button>
              ) : (
                <Badge variant="secondary" className="w-full justify-center py-1.5">
                  🏆 全部关卡通关！
                </Badge>
              )
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={submit}
                  className="w-full"
                  variant={passed ? "default" : "outline"}
                >
                  <Target className="h-3.5 w-3.5 mr-1" />
                  {passed ? "提交方案 · 完美达成！" : `提交方案${attempts > 0 ? ` · 第 ${attempts + 1} 次` : ""}`}
                </Button>
                <div className="text-[11px] text-muted-foreground italic">💡 {level.hint}</div>
              </>
            )}
          </div>
        </Card>

        {/* 情境说明 */}
        <Card className="p-3 shadow-panel border-border/60">
          <div className="rounded-md bg-muted/40 p-2 text-xs leading-relaxed text-muted-foreground flex gap-2">
            <Icon className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">{sc.name}：</strong>
              {sc.story}
            </span>
          </div>
        </Card>

        {/* 调音台 */}
        <Card className="p-4 shadow-panel border-border/60 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">影响半径</span>
              <span className="font-mono text-sm font-semibold text-primary">
                {radius[0].toFixed(1)} 格
              </span>
            </div>
            <Slider min={1} max={4} step={0.5} value={radius} onValueChange={setRadius} />
            <p className="text-[11px] text-muted-foreground mt-1">
              超过这个距离的街区一点{sc.unit}也收不到。
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">衰减强度 α</span>
              <span className="font-mono text-sm font-semibold text-primary">
                {decay[0].toFixed(1)}
              </span>
            </div>
            <Slider min={0} max={3} step={0.1} value={decay} onValueChange={setDecay} />
            <p className="text-[11px] text-muted-foreground mt-1">
              α 越大，{sc.unit}下降越快；α=0 表示半径内所有邻居影响相同。
            </p>
          </div>

          <Button variant="ghost" size="sm" onClick={reset} className="w-full">
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> 重置参数
          </Button>
        </Card>
      </div>

    </div>
  );
}

// ============ 玩法二：嘉年华人流疏导 🎪 ============
// 故事：你是嘉年华的入口指挥官，每条道路通往一个邻居场地（餐厅/停车场/酒店等），
// 每个场地有不同的"接待容量"。你为每条道路设置权重（拖滑杆），
// 入口的人流会按权重比例流向各场地。超过容量的场地会变红警告！
// 交互：① 拖滑杆调权重 ② 点场地卡片看详情 ③ 切换 Rook/Queen 邻接看连接变化
// ④ 一键最优分配 ⑤ 实时人流动画 ⑥ 多轮关卡 ⑦ 行标准化矩阵实时显示
function DeliveryAllocator() {
  const award = useAppStore((s) => s.awardXp);
  const [round, setRound] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [rule, setRule] = useState<"rook" | "queen">("queen");
  const [pickedIdx, setPickedIdx] = useState<number | null>(null);

  const center = 27; // 入口固定在中心

  // 关卡：每关人流量 + 各场地容量配置（按方向：N, NE, E, SE, S, SW, W, NW）
  const ROUNDS = [
    {
      title: "周五傍晚 · 中等人流",
      crowd: 600,
      capacities: [200, 80, 150, 60, 220, 70, 180, 90],
      icons: ["🍔", "🅿️", "🎡", "🎪", "🏨", "🎭", "🍜", "🎠"],
      names: ["美食街", "停车场A", "摩天轮", "马戏帐篷", "大酒店", "剧场", "面馆", "旋转木马"],
    },
    {
      title: "周六中午 · 大客流来袭",
      crowd: 1200,
      capacities: [350, 120, 280, 100, 400, 150, 320, 130],
      icons: ["🍔", "🅿️", "🎡", "🎪", "🏨", "🎭", "🍜", "🎠"],
      names: ["美食街", "停车场A", "摩天轮", "马戏帐篷", "大酒店", "剧场", "面馆", "旋转木马"],
    },
    {
      title: "节日烟花夜 · 极限调度",
      crowd: 2000,
      capacities: [500, 180, 600, 150, 700, 200, 480, 220],
      icons: ["🍔", "🅿️", "🎡", "🎪", "🏨", "🎭", "🍜", "🎠"],
      names: ["美食街", "停车场A", "摩天轮", "马戏帐篷", "大酒店", "剧场", "面馆", "旋转木马"],
    },
  ];
  const cur = ROUNDS[round % ROUNDS.length];

  // 8 个方向偏移（Queen 邻接顺序：N, NE, E, SE, S, SW, W, NW）
  const ALL_DIRS = [
    { label: "北 ↑", offset: -GRID_SIZE, isDiag: false },
    { label: "东北 ↗", offset: -GRID_SIZE + 1, isDiag: true },
    { label: "东 →", offset: 1, isDiag: false },
    { label: "东南 ↘", offset: GRID_SIZE + 1, isDiag: true },
    { label: "南 ↓", offset: GRID_SIZE, isDiag: false },
    { label: "西南 ↙", offset: GRID_SIZE - 1, isDiag: true },
    { label: "西 ←", offset: -1, isDiag: false },
    { label: "西北 ↖", offset: -GRID_SIZE - 1, isDiag: true },
  ];

  // 根据规则筛选活动方向
  const activeIdxs = ALL_DIRS.map((_, i) => i).filter((i) =>
    rule === "queen" ? true : !ALL_DIRS[i].isDiag
  );
  const N = activeIdxs.length; // rook=4, queen=8

  // 玩家权重（每个活动方向 0-10，平均初始）
  const [weights, setWeights] = useState<number[]>(() => Array(8).fill(5));

  // 切换规则时重置权重
  const onRuleChange = (r: "rook" | "queen") => {
    setRule(r);
    setWeights(Array(8).fill(5));
    setSubmitted(false);
    setPickedIdx(null);
  };

  const updateWeight = (idx: number, v: number) => {
    setWeights((prev) => {
      const next = [...prev];
      next[idx] = v;
      return next;
    });
  };

  // 行标准化：只在活动方向中归一化
  const sumActive = activeIdxs.reduce((a, i) => a + weights[i], 0) || 1;
  const normalized = ALL_DIRS.map((_, i) =>
    activeIdxs.includes(i) ? weights[i] / sumActive : 0
  );

  // 实际流入各场地的人数
  const flow = normalized.map((w) => Math.round(w * cur.crowd));

  // 超载场地数
  const overloaded = activeIdxs.filter((i) => flow[i] > cur.capacities[i]);
  const overloadCount = overloaded.length;

  // 利用率（接近 1 是好事，>1 = 超载）
  const utilization = activeIdxs.map((i) => flow[i] / cur.capacities[i]);
  const avgUtil =
    utilization.reduce((a, b) => a + b, 0) / utilization.length;

  // 一键最优：按容量比例分配
  const autoOptimize = () => {
    const totalCap = activeIdxs.reduce((a, i) => a + cur.capacities[i], 0);
    const next = [...weights];
    activeIdxs.forEach((i) => {
      next[i] = Math.round((cur.capacities[i] / totalCap) * 50);
    });
    // 非活动方向清零
    ALL_DIRS.forEach((_, i) => {
      if (!activeIdxs.includes(i)) next[i] = 0;
    });
    setWeights(next);
    toast.message("已套用容量比例最优方案 ✨", {
      description: "权重 ∝ 场地容量，让每个场地利用率接近 100%。",
    });
  };

  const reset = () => {
    setWeights(Array(8).fill(5));
    setSubmitted(false);
    setPickedIdx(null);
  };

  // 点击场地卡片：显示详细分析
  const showDetail = (idx: number) => {
    setPickedIdx(idx);
    const cap = cur.capacities[idx];
    const flo = flow[idx];
    const w = (normalized[idx] * 100).toFixed(1);
    const status = flo > cap ? `⚠️ 超载 ${flo - cap} 人！` : `✅ 还可接 ${cap - flo} 人`;
    toast.message(`${cur.icons[idx]} ${cur.names[idx]}`, {
      description: `权重 ${w}% → 流入 ${flo} 人 / 容量 ${cap} 人 · ${status}`,
    });
  };

  const submit = () => {
    setSubmitted(true);
    // 评分：超载越少越好，平均利用率越接近 0.85 越好
    const overloadPenalty = overloadCount * 15;
    const utilScore = Math.max(0, 50 - Math.abs(avgUtil - 0.85) * 100);
    const pts = Math.max(5, Math.round(utilScore + 30 - overloadPenalty));
    setScore((s) => s + pts);
    award(pts);
    if (overloadCount === 0 && avgUtil > 0.7) {
      toast.success(`🎉 完美调度！+${pts} XP · 零超载，平均利用率 ${(avgUtil * 100).toFixed(0)}%`);
    } else if (overloadCount === 0) {
      toast.message(`+${pts} XP · 没有超载，但部分场地利用率低`);
    } else {
      toast.error(`+${pts} XP · ${overloadCount} 个场地超载！`);
    }
  };

  const nextRound = () => {
    setRound((r) => r + 1);
    setSubmitted(false);
    setWeights(Array(8).fill(5));
    setPickedIdx(null);
  };

  // 地图：中心紫色，邻居按"流入人数 / 容量 比例"上色（utilization）
  const neighbors = activeIdxs.map((i) => center + ALL_DIRS[i].offset);
  const mapValues = useMemo(() => {
    const out = new Array(TOTAL).fill(0);
    activeIdxs.forEach((i) => {
      const cellId = center + ALL_DIRS[i].offset;
      // 把利用率映射到 0-100 颜色（>100 表示超载，截到 100 但用 colorOf 标红）
      const u = flow[i] / cur.capacities[i];
      out[cellId] = Math.min(100, Math.round(u * 80));
    });
    out[center] = 100;
    return out;
  }, [activeIdxs, flow, cur.capacities, center]);

  const colorOf = (i: number) => {
    if (i === center) return "hsl(var(--primary))";
    const dirIdx = activeIdxs.find((di) => center + ALL_DIRS[di].offset === i);
    if (dirIdx === undefined) return "hsl(var(--muted))";
    const u = flow[dirIdx] / cur.capacities[dirIdx];
    if (u > 1) return "hsl(var(--destructive))"; // 超载红
    if (u > 0.85) return "hsl(var(--success))"; // 接近满 绿
    if (u > 0.4) return "hsl(var(--warning))"; // 中等 黄
    return "";
  };

  // 中心到邻居的连线（人流通道）
  const edges: Array<[number, number]> = neighbors.map((j) => [center, j]);

  return (
    <Card className="p-6 shadow-panel border-border/60">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="text-xs text-muted-foreground font-mono tracking-wider mb-1">
            第 {round + 1} 轮 · 嘉年华人流疏导 🎪
          </div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" /> {cur.title}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            🎟️ 入口涌入 <strong className="text-primary">{cur.crowd} 人</strong>
            ，为每条道路设权重，让人流按比例分配到 {N} 个场地。别让场地超载！
          </p>
        </div>
        <Badge variant="secondary">累计 {score} XP</Badge>
      </div>

      {/* 规则切换 */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <span className="text-xs text-muted-foreground">邻接规则：</span>
        <Button
          size="sm"
          variant={rule === "rook" ? "default" : "outline"}
          onClick={() => onRuleChange("rook")}
        >
          ♜ Rook · 4 个方向
        </Button>
        <Button
          size="sm"
          variant={rule === "queen" ? "default" : "outline"}
          onClick={() => onRuleChange("queen")}
        >
          ♛ Queen · 8 个方向
        </Button>
        <span className="text-[11px] text-muted-foreground italic ml-2">
          切换会重置权重，看看不同邻接方式如何影响调度难度。
        </span>
      </div>

      <div className="grid lg:grid-cols-[1fr_440px] gap-6 items-start">
        <div className="space-y-3">
          <GridCity
            values={mapValues}
            size={500}
            selected={center}
            highlight={[center, ...neighbors]}
            colorOf={colorOf}
            edges={edges}
            showLabels={false}
          />
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-md border border-border p-2 bg-background">
              <div className="text-muted-foreground">📊 平均利用率</div>
              <div className={`text-lg font-bold font-mono ${avgUtil > 0.7 && avgUtil < 1 ? "text-success" : avgUtil >= 1 ? "text-destructive" : "text-warning"}`}>
                {(avgUtil * 100).toFixed(0)}%
              </div>
            </div>
            <div className="rounded-md border border-border p-2 bg-background">
              <div className="text-muted-foreground">⚠️ 超载场地</div>
              <div className={`text-lg font-bold font-mono ${overloadCount === 0 ? "text-success" : "text-destructive"}`}>
                {overloadCount} / {N}
              </div>
            </div>
          </div>
          <div className="flex gap-3 text-[10px] text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-primary" />入口
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-success" />利用佳
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-warning" />空闲
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-destructive" />超载
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {/* 场地卡片网格 */}
          <div className="text-xs text-muted-foreground">
            🖱️ 拖动滑杆设置权重 · 点击场地图标查看详情
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-[420px] overflow-y-auto pr-1">
            {activeIdxs.map((i) => {
              const cap = cur.capacities[i];
              const flo = flow[i];
              const u = flo / cap;
              const isOver = flo > cap;
              const isPicked = pickedIdx === i;
              const cardCls = isOver
                ? "border-destructive bg-destructive/5"
                : u > 0.85
                ? "border-success bg-success/5"
                : isPicked
                ? "border-primary bg-primary-soft"
                : "border-border bg-background hover:border-primary/50";
              return (
                <div
                  key={i}
                  className={`rounded-lg border-2 p-2.5 transition-all ${cardCls}`}
                >
                  <button
                    type="button"
                    onClick={() => showDetail(i)}
                    className="w-full text-left mb-1.5 group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {ALL_DIRS[i].label}
                      </span>
                      {isOver && (
                        <Badge variant="destructive" className="h-4 px-1 text-[9px]">
                          超载
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xl">{cur.icons[i]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] truncate font-medium">{cur.names[i]}</div>
                        <div className="text-[10px] font-mono text-muted-foreground">
                          容量 {cap}
                        </div>
                      </div>
                    </div>
                  </button>
                  {/* 流入条 */}
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full transition-all ${
                        isOver ? "bg-destructive" : u > 0.85 ? "bg-success" : "bg-primary"
                      }`}
                      style={{ width: `${Math.min(100, u * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono mb-1">
                    <span className={isOver ? "text-destructive font-bold" : "text-foreground"}>
                      {flo} 人
                    </span>
                    <span className="text-primary font-bold">
                      w={normalized[i].toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={10}
                    step={1}
                    value={[weights[i]]}
                    onValueChange={(v) => updateWeight(i, v[0])}
                    disabled={submitted}
                  />
                </div>
              );
            })}
          </div>

          {/* 操作按钮 */}
          <div className="grid grid-cols-3 gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> 重置
            </Button>
            <Button variant="outline" size="sm" onClick={autoOptimize}>
              <Sparkles className="h-3.5 w-3.5 mr-1" /> 智能分配
            </Button>
            {!submitted ? (
              <Button onClick={submit} size="sm">
                <Target className="h-3.5 w-3.5 mr-1" /> 开闸放行
              </Button>
            ) : (
              <Button onClick={nextRound} size="sm">
                下一轮 →
              </Button>
            )}
          </div>

          {/* 行标准化矩阵实时显示 */}
          <div className="rounded-md border border-border bg-muted/30 p-2.5">
            <div className="text-[10px] text-muted-foreground mb-1.5 flex items-center justify-between">
              <span>📐 当前行标准化权重 W[入口, *]</span>
              <span className="font-mono">Σw = {normalized.reduce((a, b) => a + b, 0).toFixed(2)}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {activeIdxs.map((i) => (
                <span
                  key={i}
                  className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-background border border-border"
                >
                  {cur.icons[i]} {normalized[i].toFixed(2)}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-md bg-primary-soft p-2.5 text-[11px] text-primary leading-relaxed">
            🎯 <strong>这就是行标准化的空间权重矩阵 W！</strong>
            wᵢⱼ = 你给道路 j 的原始权重 ÷ 所有道路权重之和。规则不同（Rook/Queen），矩阵的非零元数也不同。
          </div>
        </div>
      </div>
    </Card>
  );
}


// ============ 玩法三：矩阵找茬（点击式）============
// 故事：实习生构建了权重矩阵，犯了几个常见错误。
// 玩家直接点击矩阵中可疑的格子，弹出选项卡选择问题类型。
type BugType = {
  id: string;
  label: string;
  short: string; // 短标签，显示在格子上
  explain: string;
  emoji: string;
};

const BUG_TYPES: BugType[] = [
  { id: "self", short: "自邻", label: "对角线非零（自己是自己的邻居）", explain: "权重矩阵规定 wᵢᵢ = 0，区域不能成为自己的邻居。", emoji: "🪞" },
  { id: "fake", short: "假邻", label: "把不相邻的远距离区域设为邻居", explain: "权重应反映实际空间关系，跨区域赋权会污染分析结果。", emoji: "🛸" },
  { id: "miss", short: "漏邻", label: "漏掉了真实相邻的邻居", explain: "邻接关系不完整，会低估空间依赖性。", emoji: "🕳️" },
  { id: "asym", short: "不对称", label: "矩阵不对称（A→B 是邻居，B→A 不是）", explain: "对于无向邻接关系，W 应该对称：wᵢⱼ = wⱼᵢ。", emoji: "↔️" },
  { id: "neg", short: "负值", label: "出现负数权重", explain: "标准空间权重应非负；负权重需要特殊设定且很少使用。", emoji: "➖" },
  { id: "island", short: "孤岛", label: "中心区域没有任何邻居（孤岛）", explain: "孤岛单元在 Moran's I 计算中会被忽略，应改用 KNN 或扩大阈值。", emoji: "🏝️" },
];

// 每个格子：display(显示值)、isCenter、bugId（如果有问题，标注问题类型；否则 null）
type BugCell = {
  id: number;
  display: string; // 显示文本，如 "0", "1", "0.5", "-0.5"
  isCenter?: boolean;
  isNormal?: boolean; // 正常邻居（高亮但无问题）
  bugId?: string | null; // 此格的真实问题
};

type BugCase = {
  title: string;
  story: string;
  rule: string;
  cells: BugCell[];
};

// 辅助函数：构建一个 5x5 case
const buildCase = (overrides: Partial<BugCell>[]): BugCell[] => {
  const cells: BugCell[] = Array.from({ length: 25 }, (_, i) => ({ id: i, display: "0" }));
  overrides.forEach((o) => {
    if (o.id === undefined) return;
    cells[o.id] = { ...cells[o.id], ...o };
  });
  return cells;
};

const BUG_CASES: BugCase[] = [
  {
    title: "案例 1 · 实习生小李的 Rook 矩阵",
    story: "小李用 Rook 邻接为中心街区构建权重，但他的矩阵看起来怪怪的……找出所有错误格子。",
    rule: "Rook（上下左右）",
    cells: buildCase([
      { id: 2, display: "1", isNormal: true }, // 上邻 ✓
      { id: 10, display: "1", isNormal: true }, // 左邻 ✓
      { id: 12, display: "0.5", isCenter: true, bugId: "self" }, // 中心非零
      { id: 13, display: "1", isNormal: true }, // 右邻 ✓
      { id: 14, display: "1", bugId: "fake" }, // 远距离假邻
      { id: 22, display: "0", bugId: "miss" }, // 下邻被漏
    ]),
  },
  {
    title: "案例 2 · 距离阈值矩阵",
    story: "用距离阈值 = 1.0 为角落街区构建矩阵，结果中心格成了孤岛。",
    rule: "距离阈值 d ≤ 1.0",
    cells: buildCase([
      { id: 0, display: "0", isCenter: true, bugId: "island" },
    ]),
  },
  {
    title: "案例 3 · Queen 矩阵的对称性",
    story: "Queen 邻接矩阵中藏着负权重 + 不对称问题，请找出来。",
    rule: "Queen（八向）",
    cells: buildCase([
      { id: 6, display: "1", isNormal: true },
      { id: 7, display: "1", isNormal: true },
      { id: 8, display: "-0.5", bugId: "neg" }, // 负值
      { id: 11, display: "1", isNormal: true },
      { id: 12, display: "0", isCenter: true },
      { id: 13, display: "0", bugId: "asym" }, // A→13=1 但 13→A=0
      { id: 16, display: "1", isNormal: true },
      { id: 17, display: "1", isNormal: true },
      { id: 18, display: "1", isNormal: true },
    ]),
  },
];

function BugHunt() {
  const award = useAppStore((s) => s.awardXp);
  const [caseIdx, setCaseIdx] = useState(0);
  // 玩家标注：cellId -> bugTypeId
  const [marks, setMarks] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [openCellId, setOpenCellId] = useState<number | null>(null);

  const cs = BUG_CASES[caseIdx];

  // 真实答案：cellId -> bugId
  const truth = useMemo(() => {
    const t: Record<number, string> = {};
    cs.cells.forEach((c) => {
      if (c.bugId) t[c.id] = c.bugId;
    });
    return t;
  }, [cs]);

  const markCell = (cellId: number, bugId: string) => {
    if (submitted) return;
    setMarks((prev) => ({ ...prev, [cellId]: bugId }));
    setOpenCellId(null);
  };

  const clearMark = (cellId: number) => {
    if (submitted) return;
    setMarks((prev) => {
      const next = { ...prev };
      delete next[cellId];
      return next;
    });
    setOpenCellId(null);
  };

  const submit = () => {
    setSubmitted(true);
    let correctCells = 0; // 标对了位置
    let correctLabels = 0; // 位置 + 标签都对
    let wrongCells = 0; // 标在了正常格子上
    Object.entries(marks).forEach(([cidStr, bid]) => {
      const cid = Number(cidStr);
      if (truth[cid]) {
        correctCells++;
        if (truth[cid] === bid) correctLabels++;
      } else {
        wrongCells++;
      }
    });
    const totalBugs = Object.keys(truth).length;
    const missed = totalBugs - correctCells;
    const pts = Math.max(0, correctLabels * 20 + (correctCells - correctLabels) * 8 - wrongCells * 10);
    setScore((s) => s + pts);
    award(pts);
    if (correctLabels === totalBugs && wrongCells === 0) {
      setStreak((s) => s + 1);
      toast.success(`完美！全部精准命中 +${pts} XP · 连胜 ${streak + 1} 🔥`);
    } else if (correctCells === totalBugs && wrongCells === 0) {
      setStreak(0);
      toast.message(`+${pts} XP · 位置全对，但 ${totalBugs - correctLabels} 个标签错了`);
    } else {
      setStreak(0);
      toast.message(`+${pts} XP · 命中 ${correctCells}/${totalBugs}，错标 ${wrongCells}，遗漏 ${missed}`);
    }
  };

  const next = () => {
    setCaseIdx((i) => (i + 1) % BUG_CASES.length);
    setMarks({});
    setSubmitted(false);
    setOpenCellId(null);
  };

  const reset = () => {
    setMarks({});
    setSubmitted(false);
    setOpenCellId(null);
  };

  return (
    <Card className="p-6 shadow-panel border-border/60">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="text-xs text-muted-foreground font-mono tracking-wider mb-1">
            案例 {caseIdx + 1} / {BUG_CASES.length} · 矩阵找茬
          </div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" /> {cs.title}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            规则：{cs.rule} · {cs.story}
          </p>
          <p className="text-xs text-primary mt-1.5">
            👆 直接点击矩阵中可疑的格子，从弹窗中选择问题类型并贴标签。
          </p>
        </div>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Trophy className="h-3 w-3 text-warning" /> {streak}
            </Badge>
          )}
          <Badge variant="secondary">累计 {score} XP</Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
        {/* 5x5 可点击矩阵 */}
        <div className="rounded-lg border border-border p-4 bg-muted/20">
          <div className="text-xs text-muted-foreground mb-3 text-center">
            中心街区（紫色）的 5×5 邻域权重示意 · 点击格子标注问题
          </div>
          <div className="grid grid-cols-5 gap-1.5 max-w-[460px] mx-auto">
            {cs.cells.map((c) => {
              const mark = marks[c.id];
              const truthBug = truth[c.id];
              const weight = parseFloat(c.display);
              // 基础底色
              let bg = "bg-background border-border";
              if (c.isCenter) bg = "bg-primary/20 text-primary-foreground border-primary";
              else if (weight < 0) bg = "bg-destructive/20 border-destructive";
              else if (weight > 0) bg = "bg-accent/30 border-accent";

              // 提交后状态覆盖
              if (submitted) {
                if (mark && truthBug && mark === truthBug) {
                  bg = "bg-success/30 border-success"; // 完美命中
                } else if (mark && truthBug && mark !== truthBug) {
                  bg = "bg-warning/30 border-warning"; // 位置对、标签错
                } else if (mark && !truthBug) {
                  bg = "bg-destructive/30 border-destructive"; // 错标在正常格子
                } else if (!mark && truthBug) {
                  bg = "bg-warning/20 border-warning border-dashed"; // 遗漏
                }
              } else if (mark) {
                bg = "bg-primary-soft border-primary";
              }

              const markedBug = mark ? BUG_TYPES.find((b) => b.id === mark) : null;
              const truthBugObj = truthBug ? BUG_TYPES.find((b) => b.id === truthBug) : null;

              return (
                <Popover
                  key={c.id}
                  open={openCellId === c.id}
                  onOpenChange={(o) => setOpenCellId(o ? c.id : null)}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      disabled={submitted}
                      className={`relative aspect-square rounded border-2 ${bg} flex flex-col items-center justify-center text-[11px] transition-all hover:scale-105 hover:z-10 disabled:hover:scale-100`}
                    >
                      <span className="font-mono font-semibold text-foreground">
                        {c.display === "0" ? "·" : c.display}
                      </span>
                      {/* 玩家标记标签 */}
                      {mark && markedBug && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 rounded text-[8px] font-bold whitespace-nowrap bg-primary text-primary-foreground shadow-sm">
                          {markedBug.emoji}{markedBug.short}
                        </span>
                      )}
                      {/* 提交后：遗漏的真实答案 */}
                      {submitted && !mark && truthBugObj && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 rounded text-[8px] font-bold whitespace-nowrap bg-warning text-warning-foreground shadow-sm">
                          应为 {truthBugObj.short}
                        </span>
                      )}
                      {/* 中心标识 */}
                      {c.isCenter && (
                        <span className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-primary text-primary-foreground text-[8px] flex items-center justify-center font-bold">
                          C
                        </span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" side="top">
                    <div className="text-[11px] text-muted-foreground mb-2 px-1">
                      格子 #{c.id} · 值 = {c.display} · 你认为这里是？
                    </div>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {BUG_TYPES.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => markCell(c.id, b.id)}
                          className={`w-full text-left rounded p-1.5 text-xs transition-colors flex items-start gap-2 ${
                            mark === b.id
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          }`}
                        >
                          <span className="text-base leading-none">{b.emoji}</span>
                          <div className="flex-1">
                            <div className="font-semibold">{b.short}</div>
                            <div className={`text-[10px] leading-tight mt-0.5 ${mark === b.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                              {b.label}
                            </div>
                          </div>
                        </button>
                      ))}
                      {mark && (
                        <button
                          type="button"
                          onClick={() => clearMark(c.id)}
                          className="w-full text-left rounded p-1.5 text-[11px] text-muted-foreground hover:bg-muted border-t border-border mt-1 pt-2"
                        >
                          ✕ 清除此格标记
                        </button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 justify-center text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-primary/20 border border-primary" /> 中心
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-accent/30 border border-accent" /> 正权重
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-destructive/20 border border-destructive" /> 负权重
            </span>
            {submitted && (
              <>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-success/30 border border-success" /> 完美命中
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-warning/30 border border-warning" /> 位置对/标签错
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-destructive/30 border border-destructive" /> 错标
                </span>
              </>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {/* 进度面板 */}
          <div className="rounded-md border-2 border-primary/40 bg-primary-soft/40 p-3">
            <div className="text-xs text-muted-foreground mb-1">已标注</div>
            <div className="text-2xl font-bold font-mono text-primary">
              {Object.keys(marks).length} <span className="text-sm text-muted-foreground">个格子</span>
            </div>
          </div>

          {/* 标签图例 */}
          <div className="rounded-md border border-border bg-background p-2.5 space-y-1.5">
            <div className="text-[11px] font-semibold text-muted-foreground mb-1">📚 问题类型速查</div>
            {BUG_TYPES.map((b) => (
              <div key={b.id} className="flex items-start gap-2 text-[11px]">
                <span className="text-base leading-none mt-0.5">{b.emoji}</span>
                <div className="flex-1">
                  <span className="font-semibold">{b.short}</span>
                  <span className="text-muted-foreground"> · {b.label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* 提交后：详细答案解释 */}
          {submitted && (
            <div className="rounded-md border border-border bg-background p-2.5 space-y-2">
              <div className="text-[11px] font-semibold">📖 答案解析</div>
              {Object.entries(truth).map(([cidStr, bid]) => {
                const cid = Number(cidStr);
                const b = BUG_TYPES.find((x) => x.id === bid)!;
                const userMark = marks[cid];
                const status =
                  userMark === bid
                    ? { txt: "✓ 完美", cls: "text-success" }
                    : userMark
                    ? { txt: "△ 标错类型", cls: "text-warning" }
                    : { txt: "✗ 遗漏", cls: "text-destructive" };
                return (
                  <div key={cid} className="text-[11px] border-l-2 border-border pl-2">
                    <div className="flex justify-between items-center">
                      <span className="font-mono">
                        格子 #{cid} {b.emoji} {b.short}
                      </span>
                      <span className={`font-bold ${status.cls}`}>{status.txt}</span>
                    </div>
                    <div className="text-muted-foreground leading-relaxed mt-0.5">
                      💡 {b.explain}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!submitted ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> 清空
              </Button>
              <Button onClick={submit} disabled={Object.keys(marks).length === 0}>
                <Search className="h-3.5 w-3.5 mr-1" /> 提交
              </Button>
            </div>
          ) : (
            <Button onClick={next} className="w-full">
              下一案例 →
            </Button>
          )}

          <div className="rounded-md bg-primary-soft p-3 text-[11px] text-primary leading-relaxed flex gap-2">
            <Sparkles className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>
              一个好的权重矩阵要满足：对角线为 0、非邻居赋 0、相邻关系完整、对称（无向时）、非负数。
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

