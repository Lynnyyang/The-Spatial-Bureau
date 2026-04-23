import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GridCity } from "@/components/GridCity";
import {
  buildNeighbors,
  generateClustered,
  neighborsOf,
  GRID_SIZE,
  TOTAL,
} from "@/lib/spatial";
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
          <TabsTrigger value="delivery">🚚 配送权重分配</TabsTrigger>
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
        "网红咖啡店刚开业，老板想先做小范围测试：精准影响 4 个最近的邻居街区，且总扩散力（权重总和）控制在 2.5 ~ 3.5 之间。",
      targetReached: { min: 4, max: 4 },
      targetSum: { min: 2.5, max: 3.5 },
      hint: "提示：试试半径=1.0，让影响只覆盖正东南西北 4 格。",
    },
    {
      scenario: "wifi" as const,
      title: "第 2 关 · 5G 信号覆盖",
      brief:
        "新基站要求覆盖 8 个邻居街区，且因为信号衰减很快，权重总和应在 3.5 ~ 4.5 之间。",
      targetReached: { min: 8, max: 8 },
      targetSum: { min: 3.5, max: 4.5 },
      hint: "提示：半径放大到能覆盖 Queen 八向（约 1.5），再调 α 让衰减明显。",
    },
    {
      scenario: "rumor" as const,
      title: "第 3 关 · 全城八卦",
      brief:
        "这条八卦极度劲爆，要让 ≥ 20 个街区知晓，但因为越远越模糊，权重总和必须 ≤ 8。",
      targetReached: { min: 20, max: 99 },
      targetSum: { min: 0, max: 8 },
      hint: "提示：把半径开大（≥3），并增大 α 让远处衰减更快、总权重不至于爆炸。",
    },
    {
      scenario: "coffee" as const,
      title: "第 4 关 · 平等的邻里",
      brief:
        "老板希望影响范围内每个街区都获得几乎相同的热度（不要因距离打折）。覆盖恰好 12 个邻居，权重总和约 12（每个 ≈ 1）。",
      targetReached: { min: 12, max: 12 },
      targetSum: { min: 11, max: 13 },
      hint: "提示：α 越接近 0，距离的影响越弱，所有邻居权重趋于相等。",
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

  const reachedCount = values.filter((v) => v > 0 && v < 100).length;
  const sumWeights = values.reduce((a, v, i) => (i === center ? a : a + v / 100), 0);

  // 判定
  const reachedOk =
    reachedCount >= level.targetReached.min && reachedCount <= level.targetReached.max;
  const sumOk = sumWeights >= level.targetSum.min && sumWeights <= level.targetSum.max;
  const passed = reachedOk && sumOk;

  // 自动通关：第一次满足条件时奖励 + 标记
  useMemo(() => {
    if (passed && !cleared[levelIdx]) {
      const next = [...cleared];
      next[levelIdx] = true;
      setCleared(next);
      award(30);
      toast.success(`🎉 ${level.title} 通关！+30 XP`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passed]);

  const goNext = () => {
    if (levelIdx < LEVELS.length - 1) {
      setLevelIdx((i) => i + 1);
      setRadius([2]);
      setDecay([1.0]);
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
          {passed ? (
            <div className="mt-2 flex gap-2">
              {levelIdx < LEVELS.length - 1 ? (
                <Button size="sm" onClick={goNext} className="flex-1">
                  进入下一关 →
                </Button>
              ) : (
                <Badge variant="secondary" className="w-full justify-center py-1.5">
                  🏆 全部关卡通关！
                </Badge>
              )}
            </div>
          ) : (
            <div className="mt-2 text-[11px] text-muted-foreground italic">💡 {level.hint}</div>
          )}
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

// ============ 玩法二：配送权重分配 ============
// 故事：你是某街区的快递站长，要给周边几个邻居街区分配派送车辆比例（总和=1）。
// 系统按邻居的"客户密度"给出参考答案，玩家用滑杆分配。
function DeliveryAllocator() {
  const award = useAppStore((s) => s.awardXp);
  const [round, setRound] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // 随机一个 center，用 queen 邻接取邻居（保证有 3-8 个邻居）
  const seed = 11 + round * 7;
  const center = useMemo(() => {
    // 选个不在角落的 center，邻居数稳定为 5-8
    const interior = [
      18, 19, 20, 21, 22, 26, 27, 28, 29, 30, 34, 35, 36, 37, 38, 42, 43, 44, 45, 46,
    ];
    const rng = (seed * 9301 + 49297) % 233280;
    return interior[rng % interior.length];
  }, [seed]);

  const W = useMemo(() => buildNeighbors({ rule: "queen" }), []);
  const neighbors = useMemo(() => neighborsOf(W, center), [W, center]);

  // 邻居各自的"客户密度" 0..100
  const customerDensity = useMemo(() => {
    const vals = generateClustered(seed, 1);
    return neighbors.map((j) => vals[j]);
  }, [neighbors, seed]);

  const truthRatios = useMemo(() => {
    const sum = customerDensity.reduce((a, b) => a + b, 0) || 1;
    return customerDensity.map((v) => v / sum);
  }, [customerDensity]);

  // 玩家分配：默认平均分配
  const [allocation, setAllocation] = useState<number[]>([]);

  // 当邻居数变化时重置
  useMemo(() => {
    setAllocation(neighbors.map(() => Math.round(100 / neighbors.length)));
  }, [neighbors]);

  const total = allocation.reduce((a, b) => a + b, 0);
  const valid = total === 100;

  const updateAlloc = (idx: number, v: number) => {
    setAllocation((prev) => {
      const next = [...prev];
      next[idx] = v;
      return next;
    });
  };

  // 准备地图：center 高亮为紫色，邻居根据 customerDensity 上色
  const mapValues = useMemo(() => {
    const out = new Array(TOTAL).fill(0);
    neighbors.forEach((j, idx) => {
      out[j] = customerDensity[idx];
    });
    out[center] = 100;
    return out;
  }, [neighbors, customerDensity, center]);

  const colorOf = (i: number) => {
    if (i === center) return "hsl(var(--primary))";
    if (!neighbors.includes(i)) return "hsl(var(--muted))";
    return "";
  };

  const submit = () => {
    if (!valid) {
      toast.error(`分配总和必须为 100%（当前 ${total}%）`);
      return;
    }
    setSubmitted(true);
    // 误差：用户分配（百分比/100）与真实比例的 L1 距离
    const err = allocation.reduce(
      (acc, v, i) => acc + Math.abs(v / 100 - truthRatios[i]),
      0
    );
    const pts = Math.max(5, Math.round(40 - err * 60));
    setScore((s) => s + pts);
    award(pts);
    if (err < 0.1) toast.success(`完美分配！+${pts} XP · 总误差 ${(err * 100).toFixed(0)}%`);
    else if (err < 0.25) toast.message(`不错！+${pts} XP · 总误差 ${(err * 100).toFixed(0)}%`);
    else toast.message(`+${pts} XP · 误差较大，再试试看`);
  };

  const next = () => {
    setRound((r) => r + 1);
    setSubmitted(false);
  };

  return (
    <Card className="p-6 shadow-panel border-border/60">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="text-xs text-muted-foreground font-mono tracking-wider mb-1">
            第 {round + 1} 轮 · 配送权重分配
          </div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" /> 给每个邻居街区分配派送车辆比例
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            紫色为你的快递站。颜色越深表示该邻居街区"客户密度"越高，应该分到更多运力。所有邻居加起来必须 = 100%。
          </p>
        </div>
        <Badge variant="secondary">累计 {score} XP</Badge>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div>
          <GridCity
            values={mapValues}
            size={500}
            selected={center}
            highlight={[center, ...neighbors]}
            colorOf={colorOf}
            showLabels={true}
          />
          <p className="text-xs text-muted-foreground mt-2 text-center">
            数字 = 该街区的客户密度（0-100）
          </p>
        </div>

        <div className="space-y-3">
          <div
            className={`rounded-md border-2 p-3 text-sm font-mono flex items-center justify-between ${
              valid ? "border-success bg-success/10" : "border-warning bg-warning/10"
            }`}
          >
            <span>分配总和</span>
            <span className="text-lg font-bold">{total}%</span>
          </div>

          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {neighbors.map((j, idx) => (
              <div key={j} className="rounded-md border border-border p-2.5 bg-background">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-mono">
                    邻居 #{j} · 客户密度{" "}
                    <span className="font-semibold text-primary">{customerDensity[idx]}</span>
                  </span>
                  <span className="font-mono font-bold">{allocation[idx] ?? 0}%</span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[allocation[idx] ?? 0]}
                  onValueChange={(v) => updateAlloc(idx, v[0])}
                  disabled={submitted}
                />
                {submitted && (
                  <div className="text-[10px] mt-1 font-mono flex justify-between">
                    <span className="text-muted-foreground">
                      参考答案 {(truthRatios[idx] * 100).toFixed(0)}%
                    </span>
                    <span
                      className={
                        Math.abs(allocation[idx] - truthRatios[idx] * 100) < 8
                          ? "text-success"
                          : "text-warning"
                      }
                    >
                      偏差 {Math.abs(allocation[idx] - truthRatios[idx] * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {!submitted ? (
            <Button onClick={submit} disabled={!valid} className="w-full">
              <Target className="h-3.5 w-3.5 mr-1" /> 提交分配方案
            </Button>
          ) : (
            <Button onClick={next} className="w-full">
              下一轮
            </Button>
          )}

          <div className="rounded-md bg-primary-soft p-3 text-[11px] text-primary leading-relaxed">
            🎯 <strong>这就是行标准化的权重矩阵 W 的一行！</strong>每个权重 wᵢⱼ
            表示邻居 j 对中心 i 的相对重要性，所有邻居权重加起来 = 1。
          </div>
        </div>
      </div>
    </Card>
  );
}

// ============ 玩法三：矩阵找茬 ============
// 故事：实习生构建了一个权重矩阵，犯了几个常见错误。请找出来。
type Bug = { id: string; label: string; explain: string };

const ALL_BUGS: Bug[] = [
  { id: "self", label: "对角线非零（自己是自己的邻居）", explain: "权重矩阵规定 wᵢᵢ = 0，区域不能成为自己的邻居。" },
  { id: "island", label: "某个区域没有任何邻居（孤岛）", explain: "孤岛单元在 Moran's I 计算中会被忽略，应改用 KNN 或扩大阈值。" },
  { id: "fake", label: "把不相邻的远距离区域设为邻居", explain: "权重应反映实际空间关系，跨城市赋权会污染分析结果。" },
  { id: "miss", label: "漏掉了真实相邻的邻居", explain: "邻接关系不完整，会低估空间依赖性。" },
  { id: "asym", label: "矩阵不对称（A→B 是邻居，B→A 不是）", explain: "对于无向邻接关系，W 应该对称：wᵢⱼ = wⱼᵢ。" },
  { id: "neg", label: "出现负数权重", explain: "标准空间权重应非负；负权重需要特殊设定且很少使用。" },
];

type BugCase = {
  title: string;
  story: string;
  rule: string;
  // 显示用的小矩阵示意（5x5），值用文字描述邻居关系
  cells: { id: number; isCenter?: boolean; isNeighbor?: boolean; weight: number; note?: string }[];
  bugs: string[]; // bug ids present in this case
};

const BUG_CASES: BugCase[] = [
  {
    title: "案例 1 · 实习生小李的 Rook 矩阵",
    story: "小李用 Rook 邻接为中心街区构建权重，但他的矩阵看起来怪怪的……",
    rule: "Rook（上下左右）",
    cells: [
      { id: 0, weight: 0 },
      { id: 1, weight: 0 },
      { id: 2, isNeighbor: true, weight: 1, note: "上邻 ✓" },
      { id: 3, weight: 0 },
      { id: 4, weight: 0 },
      { id: 5, weight: 0 },
      { id: 6, weight: 0 },
      { id: 7, weight: 0 },
      { id: 8, weight: 0 },
      { id: 9, weight: 0 },
      { id: 10, isNeighbor: true, weight: 1, note: "左邻 ✓" },
      { id: 11, weight: 0 },
      { id: 12, isCenter: true, weight: 0.5, note: "❓ 中心自身" },
      { id: 13, isNeighbor: true, weight: 1, note: "右邻 ✓" },
      { id: 14, isNeighbor: true, weight: 1, note: "❓ 远距离" },
      { id: 15, weight: 0 },
      { id: 16, weight: 0 },
      { id: 17, weight: 0 },
      { id: 18, weight: 0 },
      { id: 19, weight: 0 },
      { id: 20, weight: 0 },
      { id: 21, weight: 0 },
      { id: 22, weight: 0, note: "下邻被漏掉" },
      { id: 23, weight: 0 },
      { id: 24, weight: 0 },
    ],
    bugs: ["self", "fake", "miss"],
  },
  {
    title: "案例 2 · 距离阈值矩阵",
    story: "用距离阈值 = 1.0 构建的矩阵，但有一个角落街区似乎被孤立了……",
    rule: "距离阈值 d ≤ 1.0",
    cells: [
      { id: 0, isCenter: true, weight: 0, note: "❓ 角落中心" },
      { id: 1, weight: 0, note: "未连接" },
      { id: 2, weight: 0 },
      { id: 3, weight: 0 },
      { id: 4, weight: 0 },
      { id: 5, weight: 0, note: "未连接" },
      { id: 6, weight: 0 },
      { id: 7, weight: 0 },
      { id: 8, weight: 0 },
      { id: 9, weight: 0 },
      { id: 10, weight: 0 },
      { id: 11, weight: 0 },
      { id: 12, weight: 0 },
      { id: 13, weight: 0 },
      { id: 14, weight: 0 },
      { id: 15, weight: 0 },
      { id: 16, weight: 0 },
      { id: 17, weight: 0 },
      { id: 18, weight: 0 },
      { id: 19, weight: 0 },
      { id: 20, weight: 0 },
      { id: 21, weight: 0 },
      { id: 22, weight: 0 },
      { id: 23, weight: 0 },
      { id: 24, weight: 0 },
    ],
    bugs: ["island"],
  },
  {
    title: "案例 3 · Queen 矩阵的对称性",
    story: "用 Queen 邻接构建的矩阵中，A→B 标了邻居，但 B→A 却是 0。还有一个权重出现了奇怪的负数。",
    rule: "Queen（八向）",
    cells: [
      { id: 0, weight: 0 },
      { id: 1, weight: 0 },
      { id: 2, weight: 0 },
      { id: 3, weight: 0 },
      { id: 4, weight: 0 },
      { id: 5, weight: 0 },
      { id: 6, isNeighbor: true, weight: 1 },
      { id: 7, isNeighbor: true, weight: 1 },
      { id: 8, isNeighbor: true, weight: -0.5, note: "❓ 负权重" },
      { id: 9, weight: 0 },
      { id: 10, weight: 0 },
      { id: 11, isNeighbor: true, weight: 1 },
      { id: 12, isCenter: true, weight: 0 },
      { id: 13, weight: 0, note: "❓ A→13=1 但 13→A=0" },
      { id: 14, weight: 0 },
      { id: 15, weight: 0 },
      { id: 16, isNeighbor: true, weight: 1 },
      { id: 17, isNeighbor: true, weight: 1 },
      { id: 18, isNeighbor: true, weight: 1 },
      { id: 19, weight: 0 },
      { id: 20, weight: 0 },
      { id: 21, weight: 0 },
      { id: 22, weight: 0 },
      { id: 23, weight: 0 },
      { id: 24, weight: 0 },
    ],
    bugs: ["asym", "neg"],
  },
];

function BugHunt() {
  const award = useAppStore((s) => s.awardXp);
  const [caseIdx, setCaseIdx] = useState(0);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);

  const cs = BUG_CASES[caseIdx];
  const truth = useMemo(() => new Set(cs.bugs), [cs]);

  const togglePick = (id: string) => {
    if (submitted) return;
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = () => {
    setSubmitted(true);
    let correct = 0,
      wrong = 0;
    truth.forEach((id) => {
      if (picked.has(id)) correct++;
    });
    picked.forEach((id) => {
      if (!truth.has(id)) wrong++;
    });
    const pts = Math.max(0, correct * 15 - wrong * 8);
    setScore((s) => s + pts);
    award(pts);
    if (correct === truth.size && wrong === 0) {
      setStreak((s) => s + 1);
      toast.success(`完美！全部找到 +${pts} XP · 连胜 ${streak + 1}`);
    } else {
      setStreak(0);
      toast.message(`+${pts} XP · 命中 ${correct}/${truth.size}，错选 ${wrong}`);
    }
  };

  const next = () => {
    setCaseIdx((i) => (i + 1) % BUG_CASES.length);
    setPicked(new Set());
    setSubmitted(false);
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

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* 5x5 示意矩阵 */}
        <div className="rounded-lg border border-border p-4 bg-muted/20">
          <div className="text-xs text-muted-foreground mb-3 text-center">
            中心街区（紫色）的 5×5 邻域权重示意
          </div>
          <div className="grid grid-cols-5 gap-1.5 max-w-[420px] mx-auto">
            {cs.cells.map((c) => {
              const bg = c.isCenter
                ? "bg-primary text-primary-foreground border-primary"
                : c.weight > 0
                ? "bg-accent/30 border-accent"
                : c.weight < 0
                ? "bg-destructive/20 border-destructive"
                : "bg-background border-border";
              return (
                <div
                  key={c.id}
                  className={`relative aspect-square rounded border-2 ${bg} flex flex-col items-center justify-center text-[11px]`}
                  title={c.note}
                >
                  <span className="font-mono font-semibold">
                    {c.weight === 0 ? "·" : c.weight}
                  </span>
                  {c.note && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-warning text-warning-foreground text-[8px] flex items-center justify-center font-bold">
                      !
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 justify-center text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-primary" /> 中心
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-accent/30 border border-accent" /> 正权重
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-destructive/20 border border-destructive" /> 负权重
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-warning" /> 可疑标记
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            勾选所有你认为有问题的地方（可能不止一个）：
          </div>
          {ALL_BUGS.map((b) => {
            const isPicked = picked.has(b.id);
            const isTruth = truth.has(b.id);
            let cls = "border-border hover:border-primary/50 bg-background";
            if (submitted) {
              if (isTruth && isPicked) cls = "border-success bg-success/10";
              else if (isTruth && !isPicked) cls = "border-warning bg-warning/10";
              else if (!isTruth && isPicked) cls = "border-destructive bg-destructive/10";
              else cls = "border-border opacity-50";
            } else if (isPicked) {
              cls = "border-primary bg-primary-soft";
            }
            return (
              <button
                key={b.id}
                onClick={() => togglePick(b.id)}
                disabled={submitted}
                className={`w-full text-left rounded-md border-2 p-2.5 text-xs transition-all ${cls}`}
              >
                <div className="flex items-start gap-2">
                  {submitted && isTruth && isPicked && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 flex-shrink-0" />
                  )}
                  {submitted && !isTruth && isPicked && (
                    <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <div className="font-medium">{b.label}</div>
                    {submitted && isTruth && (
                      <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                        💡 {b.explain}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {!submitted ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPicked(new Set())}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> 清空
              </Button>
              <Button onClick={submit} disabled={picked.size === 0}>
                <Search className="h-3.5 w-3.5 mr-1" /> 提交
              </Button>
            </div>
          ) : (
            <Button onClick={next} className="w-full">
              下一案例
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
