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
          <TabsTrigger value="delivery">🌊 高阶邻居探秘</TabsTrigger>
          <TabsTrigger value="bug">🔍 矩阵找茬</TabsTrigger>
        </TabsList>

        <TabsContent value="influence" className="mt-4">
          <InfluenceMixer />
        </TabsContent>
        <TabsContent value="delivery" className="mt-4">
          <HigherOrderLab />
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

// ============ 玩法二：高阶邻居探秘 🌊 ============
// 教学目标：让学生直观理解一阶 W¹（直接邻居）与二阶 W² = W·W（邻居的邻居）的差异。
// 4×4 = 16 个街区，Rook 邻接。点击任一街区作为"消息源"，
//   ① 切换"第 K 天"看 W^K 的扩散范围  ② 地图与矩阵第 i 行同步高亮
//   ③ 点击矩阵单元格反查"为什么 j 是 i 的二阶邻居"——展示中间路径。
function HigherOrderLab() {
  const award = useAppStore((s) => s.awardXp);

  const SIZE = 4;
  const N = SIZE * SIZE; // 16
  const NAMES = [
    "A1","A2","A3","A4",
    "B1","B2","B3","B4",
    "C1","C2","C3","C4",
    "D1","D2","D3","D4",
  ];

  const [source, setSource] = useState(5); // B2
  const [order, setOrder] = useState<1 | 2>(1);
  const [target, setTarget] = useState<number | null>(null);
  const [explored, setExplored] = useState<Set<string>>(new Set());

  // ---- 挑战模式 ----
  type ChallengeKind = "max2" | "countPaths" | "onlyVia2";
  type Challenge = {
    kind: ChallengeKind;
    src: number;
    tgt?: number;
    answers: number[]; // 任选一个即可；countPaths 时长度=1
    options?: number[];
    prompt: string;
  };
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [streak, setStreak] = useState(0);
  const [solved, setSolved] = useState(0);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  // 一阶 Rook 邻居矩阵 W（0/1）
  const W1 = useMemo(() => {
    const M: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
    for (let i = 0; i < N; i++) {
      const ri = Math.floor(i / SIZE), ci = i % SIZE;
      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        const rj = Math.floor(j / SIZE), cj = j % SIZE;
        const dr = Math.abs(ri - rj), dc = Math.abs(ci - cj);
        if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) M[i][j] = 1;
      }
    }
    return M;
  }, []);

  // 二阶矩阵 W² = W · W
  const W2 = useMemo(() => {
    const M: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        let s = 0;
        for (let k = 0; k < N; k++) s += W1[i][k] * W1[k][j];
        M[i][j] = s;
      }
    }
    return M;
  }, [W1]);

  const W = order === 1 ? W1 : W2;
  const row = W[source];

  const reach = useMemo(() => {
    const set = new Set<number>();
    for (let j = 0; j < N; j++) if (W[source][j] > 0) set.add(j);
    return set;
  }, [W, source]);

  const paths = useMemo(() => {
    if (target === null || target === source) return [];
    const mids: number[] = [];
    for (let k = 0; k < N; k++) {
      if (W1[source][k] === 1 && W1[k][target] === 1) mids.push(k);
    }
    return mids;
  }, [W1, source, target]);

  const onPickSource = (i: number) => {
    setSource(i);
    setTarget(null);
    setExplored((prev) => {
      const key = `s${i}`;
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      if (next.size === 6) {
        award(20);
        toast.success("🎉 探索 6 个不同消息源 +20 XP");
      }
      return next;
    });
  };

  const switchOrder = (k: 1 | 2) => {
    setOrder(k);
    setTarget(null);
    setExplored((prev) => {
      if (k === 2 && !prev.has("o2")) {
        const next = new Set(prev);
        next.add("o2");
        award(15);
        toast.success("🌊 第一次切换到二阶 W² · +15 XP");
        return next;
      }
      return prev;
    });
  };

  const cellShade = (val: number) => {
    if (val <= 0) return "hsl(var(--muted) / 0.25)";
    const maxV = Math.max(1, ...row);
    const t = Math.min(1, val / maxV);
    return `hsl(212 80% ${82 - t * 40}%)`;
  };

  // ---- 挑战生成 & 校验 ----
  const rngPick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

  const nextChallenge = () => {
    setFeedback(null);
    setTarget(null);
    const kind = rngPick<ChallengeKind>(["max2", "countPaths", "onlyVia2"]);
    const src = Math.floor(Math.random() * N);

    if (kind === "max2") {
      // 自动切到 W²，让玩家点出 W²[src,*] 最大的那个 j（排除 src 本身的对角项）
      setOrder(2);
      setSource(src);
      const rowVals = W2[src];
      let maxV = -1, ans = -1;
      for (let j = 0; j < N; j++) {
        if (j === src) continue;
        if (rowVals[j] > maxV) { maxV = rowVals[j]; ans = j; }
      }
      setChallenge({
        kind, src, answer: ans,
        prompt: `🏆 二阶热点：从 ${NAMES[src]} 出发，哪个街区在 W² 中拥有最多 2 步路径？（点地图作答）`,
      });
    } else if (kind === "onlyVia2") {
      // 找一个 j，使 W¹[src,j] = 0 且 W²[src,j] > 0
      setOrder(2);
      setSource(src);
      const cands: number[] = [];
      for (let j = 0; j < N; j++) {
        if (j === src) continue;
        if (W1[src][j] === 0 && W2[src][j] > 0) cands.push(j);
      }
      if (cands.length === 0) {
        // 换一个源
        setTimeout(nextChallenge, 0);
        return;
      }
      const ans = rngPick(cands);
      setChallenge({
        kind, src, answer: ans,
        prompt: `🌉 桥接挑战：找一个街区——它<strong class="text-foreground">不是 ${NAMES[src]} 的直接邻居</strong>，但能在 <strong class="text-foreground">2 步内</strong>被影响。（点地图作答）`,
      });
    } else {
      // countPaths：固定 src 与 tgt，问路径数
      setOrder(2);
      setSource(src);
      // 找一个 W²[src,tgt] > 0 的 tgt
      const cands: number[] = [];
      for (let j = 0; j < N; j++) if (j !== src && W2[src][j] > 0) cands.push(j);
      if (cands.length === 0) { setTimeout(nextChallenge, 0); return; }
      const tgt = rngPick(cands);
      const ans = W2[src][tgt];
      // 4 个选项：包含正确答案，加几个干扰项
      const optsSet = new Set<number>([ans]);
      while (optsSet.size < 4) optsSet.add(Math.max(0, ans + Math.floor(Math.random() * 5) - 2));
      const options = Array.from(optsSet).sort((a, b) => a - b);
      setTarget(tgt);
      setChallenge({
        kind, src, tgt, answer: ans, options,
        prompt: `🧮 路径计数：从 <strong class="text-foreground">${NAMES[src]}</strong> 到 <strong class="text-foreground">${NAMES[tgt]}</strong> 共有几条 2 步路径？`,
      });
    }
  };

  const submitAnswer = (val: number) => {
    if (!challenge) return;
    const ok = val === challenge.answer;
    if (ok) {
      const xp = 15 + streak * 5;
      award(xp);
      const newStreak = streak + 1;
      setStreak(newStreak);
      setSolved((s) => s + 1);
      setFeedback({ ok: true, msg: `✅ 答对！+${xp} XP · 连胜 ${newStreak}` });
      toast.success(`+${xp} XP · 连胜 ${newStreak}`);
    } else {
      setStreak(0);
      const ansName = NAMES[challenge.answer] ?? challenge.answer;
      setFeedback({
        ok: false,
        msg:
          challenge.kind === "countPaths"
            ? `❌ 正确答案是 ${challenge.answer} 条路径。`
            : `❌ 正确答案是 ${ansName}。看看路径解释面板。`,
      });
      // 自动展示正确答案的路径
      if (challenge.kind !== "countPaths") setTarget(challenge.answer);
    }
  };



  return (
    <div className="space-y-4">
      {/* 故事卡 */}
      <Card className="p-4 shadow-panel border-border/60 bg-primary-soft/30">
        <div className="flex items-start gap-3">
          <div className="text-3xl">🌊</div>
          <div className="flex-1">
            <div className="font-semibold text-sm mb-1">高阶邻居探秘：一阶 W¹ vs 二阶 W²</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              一条小道消息从消息源传出。<strong className="text-foreground">第 1 天</strong>只到"直接邻居"——
              这就是一阶矩阵 <span className="font-mono text-primary">W¹</span>；
              <strong className="text-foreground"> 第 2 天</strong>这些邻居又传给自己的邻居——
              这就是二阶矩阵 <span className="font-mono text-primary">W² = W · W</span>。
              W²[i,j] 的值 = 从 i 经过 1 个中间街区到 j 的<strong className="text-foreground">路径数量</strong>。
            </p>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-[1fr_1fr] gap-4">
        {/* ===== 左：地图 ===== */}
        <Card className="p-4 shadow-panel border-border/60">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-mono text-muted-foreground">城市地图 (4×4 · Rook 邻接)</div>
            <Badge className="font-mono text-[10px]">消息源：{NAMES[source]}</Badge>
          </div>

          <div className="flex gap-2 mb-3">
            <Button
              size="sm"
              variant={order === 1 ? "default" : "outline"}
              onClick={() => switchOrder(1)}
              className="flex-1"
            >
              第 1 天 · 一阶 W¹
            </Button>
            <Button
              size="sm"
              variant={order === 2 ? "default" : "outline"}
              onClick={() => switchOrder(2)}
              className="flex-1"
            >
              第 2 天 · 二阶 W²
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-1.5 aspect-square">
            {Array.from({ length: N }).map((_, i) => {
              const isSource = i === source;
              const isTarget = i === target;
              const v = row[i];
              const isOnPath = paths.includes(i);
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (i === source) return;
                    if (challenge && (challenge.kind === "max2" || challenge.kind === "onlyVia2") && !feedback) {
                      submitAnswer(i);
                      return;
                    }
                    setTarget(target === i ? null : i);
                  }}
                  onDoubleClick={() => onPickSource(i)}
                  title={
                    isSource
                      ? "消息源（双击其他格切换）"
                      : v > 0
                      ? `W^${order}[${source},${i}] = ${v}（点击查看路径，双击设为新消息源）`
                      : "未被波及（双击设为新消息源）"
                  }
                  className={`relative rounded-md border-2 flex flex-col items-center justify-center transition-all ${
                    isSource
                      ? "border-primary ring-2 ring-primary/40 scale-105 z-10"
                      : isTarget
                      ? "border-warning ring-2 ring-warning/40 scale-105 z-10"
                      : isOnPath
                      ? "border-success"
                      : "border-border/50 hover:border-primary/50"
                  }`}
                  style={{
                    backgroundColor: isSource ? "hsl(var(--primary))" : cellShade(v),
                  }}
                >
                  <span
                    className={`text-[10px] font-mono ${
                      isSource ? "text-primary-foreground font-bold" : "text-foreground"
                    }`}
                  >
                    {NAMES[i]}
                  </span>
                  {isSource ? (
                    <span className="text-[9px] text-primary-foreground">📣 源</span>
                  ) : v > 0 ? (
                    <span className="text-[10px] font-mono font-bold text-foreground/80">
                      {order === 2 ? `${v}条路径` : "邻居"}
                    </span>
                  ) : (
                    <span className="text-[9px] text-muted-foreground">—</span>
                  )}
                  {isOnPath && (
                    <span className="absolute top-0 right-0.5 text-[10px]">🔗</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 text-[11px] text-muted-foreground space-y-1">
            <div>👆 单击：选目标格查看 2 步路径 · 双击：切换消息源</div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="rounded bg-muted/40 p-2 text-center">
                <div>波及数</div>
                <div className="font-mono font-bold text-primary text-base">{reach.size}</div>
              </div>
              <div className="rounded bg-muted/40 p-2 text-center">
                <div>{order === 2 ? "总路径数" : "邻居数"}</div>
                <div className="font-mono font-bold text-primary text-base">
                  {row.reduce((a, b) => a + b, 0)}
                </div>
              </div>
              <div className="rounded bg-muted/40 p-2 text-center">
                <div>当前阶</div>
                <div className="font-mono font-bold text-primary text-base">W^{order}</div>
              </div>
            </div>
          </div>
        </Card>

        {/* ===== 右：矩阵 + 解释 ===== */}
        <div className="space-y-3">
          <Card className="p-4 shadow-panel border-border/60">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-mono text-muted-foreground">
                W^{order} 矩阵 (16×16) · 第 {source} 行 ({NAMES[source]}) 高亮
              </div>
              <Badge variant="outline" className="font-mono text-[10px]">
                {order === 1 ? "0/1 邻接" : "整数=路径数"}
              </Badge>
            </div>
            <div className="aspect-square w-full max-w-[360px] mx-auto">
              <svg viewBox="0 0 160 160" className="w-full h-auto border border-border rounded">
                {W.map((rowVals, i) =>
                  rowVals.map((v, j) => {
                    const maxV = Math.max(1, ...row);
                    let fill = "hsl(var(--muted) / 0.3)";
                    if (v > 0) {
                      const t = Math.min(1, v / maxV);
                      fill = `hsl(212 80% ${85 - t * 45}%)`;
                    }
                    if (i === j) fill = "hsl(var(--border))";
                    const isSrcRow = i === source;
                    const isTargetCell = i === source && j === target;
                    return (
                      <g key={`${i}-${j}`}>
                        <rect
                          x={j * 10}
                          y={i * 10}
                          width={9.5}
                          height={9.5}
                          fill={fill}
                          stroke={
                            isTargetCell
                              ? "hsl(var(--warning))"
                              : isSrcRow
                              ? "hsl(var(--primary) / 0.5)"
                              : "none"
                          }
                          strokeWidth={isTargetCell ? 1.6 : isSrcRow ? 0.5 : 0}
                          onClick={() => {
                            if (i === source && j !== source) setTarget(target === j ? null : j);
                          }}
                          style={{ cursor: i === source && j !== source ? "pointer" : "default" }}
                        >
                          <title>{`W^${order}[${i}][${j}] = ${v}`}</title>
                        </rect>
                        {isSrcRow && v > 0 && (
                          <text
                            x={j * 10 + 4.75}
                            y={i * 10 + 7}
                            textAnchor="middle"
                            fontSize="6"
                            fontFamily="monospace"
                            fontWeight="bold"
                            fill="hsl(var(--foreground))"
                            pointerEvents="none"
                          >
                            {v}
                          </text>
                        )}
                      </g>
                    );
                  })
                )}
                <rect
                  x={0}
                  y={source * 10}
                  width={160}
                  height={10}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth={1.2}
                />
              </svg>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 text-center">
              💡 蓝色行 = 消息源对所有街区的影响向量。点击该行任一格查看路径解释。
            </p>
          </Card>

          {/* 路径解释面板 */}
          <Card className="p-4 shadow-panel border-border/60">
            {target === null ? (
              <div className="text-xs text-muted-foreground text-center py-4 leading-relaxed">
                {order === 1 ? (
                  <>👈 点击地图或矩阵中的任一格，查看它与 <strong>{NAMES[source]}</strong> 是否直接相邻。</>
                ) : (
                  <>👈 点击地图或矩阵中的任一格，查看从 <strong>{NAMES[source]}</strong> 到它的所有 <strong>2 步路径</strong>。</>
                )}
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="font-semibold text-sm flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />
                  路径分析：{NAMES[source]} → {NAMES[target]}
                </div>
                {order === 1 ? (
                  W1[source][target] === 1 ? (
                    <div className="rounded bg-success/10 border border-success/30 p-2 leading-relaxed">
                      ✅ <strong>{NAMES[source]}</strong> 与 <strong>{NAMES[target]}</strong> 是
                      <strong className="text-success"> 直接邻居</strong>，
                      所以 W¹[{source},{target}] = <span className="font-mono">1</span>。
                    </div>
                  ) : (
                    <div className="rounded bg-muted/40 border border-border p-2 leading-relaxed">
                      ❌ 它们不是直接邻居，所以 W¹[{source},{target}] = <span className="font-mono">0</span>。
                      切换到 <strong>第 2 天</strong> 看看二阶能不能到达。
                    </div>
                  )
                ) : paths.length > 0 ? (
                  <div className="space-y-1.5">
                    <div className="rounded bg-primary-soft/40 border border-primary/30 p-2 leading-relaxed">
                      ✅ 共找到 <strong className="text-primary">{paths.length}</strong> 条 2 步路径，
                      所以 W²[{source},{target}] = <span className="font-mono font-bold">{paths.length}</span>。
                    </div>
                    {paths.map((k) => (
                      <div
                        key={k}
                        className="flex items-center gap-2 p-1.5 rounded bg-muted/40 font-mono text-[11px]"
                      >
                        <Badge variant="outline" className="font-mono">{NAMES[source]}</Badge>
                        <span>→</span>
                        <Badge className="font-mono bg-success text-success-foreground hover:bg-success">{NAMES[k]}</Badge>
                        <span>→</span>
                        <Badge variant="outline" className="font-mono">{NAMES[target]}</Badge>
                        <span className="ml-auto text-muted-foreground text-[10px]">中间：{NAMES[k]}</span>
                      </div>
                    ))}
                    <p className="text-[10px] text-muted-foreground italic mt-1">
                      🧮 公式：W²[i,j] = Σₖ W[i,k] · W[k,j]，求和等于路径数。
                    </p>
                  </div>
                ) : target === source ? (
                  <div className="rounded bg-muted/40 border border-border p-2">
                    自己回到自己的路径数 = 邻居数（每个邻居走过去再走回来）。
                  </div>
                ) : (
                  <div className="rounded bg-muted/40 border border-border p-2 leading-relaxed">
                    ❌ 没有 2 步路径。<strong>{NAMES[target]}</strong> 离 <strong>{NAMES[source]}</strong> 太远，
                    需要更高阶的 W³ 才能到达。
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* 🎯 挑战模式 */}
          <Card className="p-4 shadow-panel border-2 border-primary/40 bg-primary-soft/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">高阶挑战</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                <Badge variant="secondary">解锁 {solved}</Badge>
                <Badge className={streak > 0 ? "bg-success text-success-foreground hover:bg-success" : ""}>
                  连胜 {streak}
                </Badge>
              </div>
            </div>

            {!challenge ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  随机出题考察你对 W¹ 与 W² 的理解。答对 +XP（连胜越长奖励越多），答错重置连胜。
                </p>
                <Button size="sm" onClick={nextChallenge} className="w-full">
                  <Sparkles className="h-3.5 w-3.5 mr-1" /> 开始挑战
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div
                  className="rounded bg-background/70 border border-border p-2 text-xs leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: challenge.prompt }}
                />

                {challenge.kind === "countPaths" && challenge.options && (
                  <div className="grid grid-cols-4 gap-1.5">
                    {challenge.options.map((opt) => (
                      <Button
                        key={opt}
                        size="sm"
                        variant={
                          feedback
                            ? opt === challenge.answer
                              ? "default"
                              : "outline"
                            : "outline"
                        }
                        disabled={!!feedback}
                        onClick={() => submitAnswer(opt)}
                        className={
                          feedback && opt === challenge.answer
                            ? "bg-success text-success-foreground hover:bg-success"
                            : ""
                        }
                      >
                        {opt}
                      </Button>
                    ))}
                  </div>
                )}

                {feedback && (
                  <div
                    className={`rounded p-2 text-xs leading-relaxed border ${
                      feedback.ok
                        ? "bg-success/10 border-success/40 text-success"
                        : "bg-destructive/10 border-destructive/40 text-destructive"
                    }`}
                  >
                    {feedback.msg}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={nextChallenge} className="flex-1">
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    {feedback ? "下一题" : "换一题"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setChallenge(null); setFeedback(null); }}
                  >
                    退出
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* 教学提示 */}
          <Card className="p-3 shadow-panel border-border/60 bg-muted/20">
            <div className="text-[11px] leading-relaxed text-muted-foreground space-y-1">
              <div>📘 <strong className="text-foreground">关键洞察：</strong></div>
              <div>• W¹ 只能告诉你"谁挨着谁"——这是<strong>直接</strong>空间依赖。</div>
              <div>• W² 揭示"谁能在 2 步内被影响"——这是<strong>间接</strong>溢出效应。</div>
              <div>• W²[i,i] &gt; 0 说明从 i 出发走 2 步能回到自己（=邻居数）。</div>
              <div>• 一般地，W^K 描述<strong>第 K 阶</strong>空间关系，是空间滞后模型 (SAR/SLM) 的核心。</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}


// ============ 玩法三：矩阵找茬（9×9 行标准化权重矩阵）============
// 故事：实习生构建了 9 个区域的行标准化空间权重矩阵 W（9×9），
// 但 W 中藏着几处错误。点击任何可疑的元素 wᵢⱼ，选择问题类型并贴标签。
// 9 个区域排成 3×3 小地图：A B C / D E F / G H I（行优先 0..8）
type BugType = {
  id: string;
  label: string;
  short: string;
  explain: string;
  emoji: string;
};

const BUG_TYPES: BugType[] = [
  { id: "self", short: "自邻", label: "对角线非零（wᵢᵢ ≠ 0）", explain: "权重矩阵规定 wᵢᵢ = 0，区域不能成为自己的邻居。", emoji: "🪞" },
  { id: "fake", short: "假邻", label: "把不相邻的区域标为邻居（wᵢⱼ > 0 但 i,j 实际不相邻）", explain: "权重应反映真实空间关系，给非邻居赋权会污染分析。", emoji: "🛸" },
  { id: "miss", short: "漏邻", label: "漏掉了真实相邻的邻居（wᵢⱼ = 0 但 i,j 应为邻居）", explain: "邻接关系不完整，会低估空间依赖性。", emoji: "🕳️" },
  { id: "asym", short: "不对称", label: "矩阵不对称（wᵢⱼ ≠ 0 但 wⱼᵢ = 0）", explain: "无向邻接关系应满足对称性 wᵢⱼ = wⱼᵢ（标准化前）。", emoji: "↔️" },
  { id: "neg", short: "负值", label: "出现负数权重（wᵢⱼ < 0）", explain: "标准空间权重应非负；负权重很少使用。", emoji: "➖" },
  { id: "rowsum", short: "行和≠1", label: "该行所有非零权重之和 ≠ 1（行标准化错误）", explain: "行标准化要求 Σⱼ wᵢⱼ = 1（除非该行全为孤岛）。", emoji: "🧮" },
];

// 9 个区域排成 3×3 小地图（Rook 邻接）
const REGIONS = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
const REGION_POS: Record<number, [number, number]> = {
  0: [0, 0], 1: [0, 1], 2: [0, 2],
  3: [1, 0], 4: [1, 1], 5: [1, 2],
  6: [2, 0], 7: [2, 1], 8: [2, 2],
};
// Rook 真实邻接（对称）
const TRUE_NEIGHBORS: Record<number, number[]> = {
  0: [1, 3],
  1: [0, 2, 4],
  2: [1, 5],
  3: [0, 4, 6],
  4: [1, 3, 5, 7],
  5: [2, 4, 8],
  6: [3, 7],
  7: [4, 6, 8],
  8: [5, 7],
};

// 单元格：display(显示文本)、bugId(此格的真实问题类型；null=无问题)
type MatrixCell = {
  display: string; // 字符串，如 "0", "0.50", "1.00", "-0.20"
  bugId?: string | null;
};

type BugCase = {
  title: string;
  story: string;
  // 9x9 矩阵：W[i][j]，行 i = 当前区域，列 j = 邻居
  matrix: MatrixCell[][];
  // 行级问题：rowIndex -> bugId（目前只用于 "rowsum"）
  rowBugs?: Record<number, string>;
};

// 智能格式化数字：浮点累加误差 < 0.005 时四舍五入
function smartSum(n: number): string {
  if (Math.abs(n - Math.round(n)) < 0.005) return Math.round(n).toFixed(2);
  return n.toFixed(2);
}

// 辅助：基于 Rook 真实邻接，生成"完美的行标准化矩阵"，再注入错误
function buildPerfectMatrix(): MatrixCell[][] {
  const W: MatrixCell[][] = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => ({ display: "0" }))
  );
  for (let i = 0; i < 9; i++) {
    const ns = TRUE_NEIGHBORS[i];
    const w = (1 / ns.length).toFixed(2);
    ns.forEach((j) => {
      W[i][j] = { display: w };
    });
  }
  return W;
}

const BUG_CASES: BugCase[] = (() => {
  // 案例 1：自邻 + 假邻（A→I 跨对角） + 漏邻（漏 D→A）
  const m1 = buildPerfectMatrix();
  // 自邻 bug：D 行 D 列（i=3,j=3）非零
  m1[3][3] = { display: "0.25", bugId: "self" };
  // 假邻 bug：A 行 I 列（i=0,j=8）非零，A 和 I 不是邻居
  m1[0][8] = { display: "0.33", bugId: "fake" };
  // 漏邻 bug：D 行 A 列（i=3,j=0）应为 0.33（D 的邻居是 A,E,G），漏掉
  m1[3][0] = { display: "0", bugId: "miss" };
  // D 行被改了 self+miss 后行和也错了（0.25+0.33+0.33=0.91），但我们重点标 self/miss
  // 把 D 的 E、G 调成 0.5/0.5，让没改的格子行和合理
  // 不调整，让 self bug 单独考核

  // 案例 2：不对称（B→E=0.33 但 E→B=0） + 负值（C→F=-0.20）+ 行和≠1（H 行）
  const m2 = buildPerfectMatrix();
  // 不对称 bug：E 行 B 列（i=4,j=1）应为 0.25，但被设成 0
  m2[4][1] = { display: "0", bugId: "asym" };
  // 负值 bug：C 行 F 列（i=2,j=5）= -0.20
  m2[2][5] = { display: "-0.20", bugId: "neg" };
  // 行和≠1：H 行（i=7）邻居 E/G/I 设成 0.5/0.3/0.3 = 1.1
  m2[7][4] = { display: "0.50" };
  m2[7][6] = { display: "0.30" };
  m2[7][8] = { display: "0.30" };

  // 案例 3：综合（自邻 + 假邻 + 漏邻 + 不对称）
  const m3 = buildPerfectMatrix();
  // 自邻：E (i=4,j=4)
  m3[4][4] = { display: "0.10", bugId: "self" };
  // 假邻：G→C (i=6,j=2)，对角不相邻
  m3[6][2] = { display: "0.40", bugId: "fake" };
  // 漏邻：F 行 E 列 (i=5,j=4) 应为邻居却为 0
  m3[5][4] = { display: "0", bugId: "miss" };
  // 不对称：B→A (i=1,j=0) 改为 0
  m3[1][0] = { display: "0", bugId: "asym" };

  return [
    {
      title: "案例 1 · 实习生小李的 W 矩阵",
      story: "9 个区域排成 3×3（A B C / D E F / G H I），按 Rook 邻接 + 行标准化构建 W。但有 3 处错误。",
      matrix: m1,
    },
    {
      title: "案例 2 · 对称性 + 行标准化",
      story: "这次的 W 矩阵藏着不对称、负值、行和不为 1 三种问题。注意：行和问题要点击行标签 (A-I) 来标记！",
      matrix: m2,
      rowBugs: { 7: "rowsum" }, // H 行：0.5 + 0.3 + 0.3 = 1.1
    },
    {
      title: "案例 3 · 综合排查",
      story: "实习生升级版 W 矩阵，错误更隐蔽。仔细比对真实邻接关系。",
      matrix: m3,
    },
  ];
})();

function BugHunt() {
  const award = useAppStore((s) => s.awardXp);
  const [caseIdx, setCaseIdx] = useState(0);
  // 玩家标注：cellKey "i,j" -> bugTypeId
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [openCell, setOpenCell] = useState<string | null>(null);
  const [hoverCell, setHoverCell] = useState<string | null>(null);

  const cs = BUG_CASES[caseIdx];

  // 真实答案：cellKey -> bugId（cell 用 "i,j"，行级用 "row:i"）
  const truth = useMemo(() => {
    const t: Record<string, string> = {};
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        const b = cs.matrix[i][j].bugId;
        if (b) t[`${i},${j}`] = b;
      }
    }
    if (cs.rowBugs) {
      Object.entries(cs.rowBugs).forEach(([i, b]) => {
        t[`row:${i}`] = b;
      });
    }
    return t;
  }, [cs]);

  // 行和（仅展示）
  const rowSums = useMemo(
    () =>
      cs.matrix.map((row) =>
        row.reduce((a, c) => a + (parseFloat(c.display) || 0), 0)
      ),
    [cs]
  );

  const markCell = (key: string, bugId: string) => {
    if (submitted) return;
    setMarks((prev) => ({ ...prev, [key]: bugId }));
    setOpenCell(null);
  };

  const clearMark = (key: string) => {
    if (submitted) return;
    setMarks((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setOpenCell(null);
  };

  const submit = () => {
    setSubmitted(true);
    let correctCells = 0;
    let correctLabels = 0;
    let wrongCells = 0;
    Object.entries(marks).forEach(([key, bid]) => {
      if (truth[key]) {
        correctCells++;
        if (truth[key] === bid) correctLabels++;
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
    setOpenCell(null);
  };

  const reset = () => {
    setMarks({});
    setSubmitted(false);
    setOpenCell(null);
  };

  return (
    <Card className="p-6 shadow-panel border-border/60">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="text-xs text-muted-foreground font-mono tracking-wider mb-1">
            案例 {caseIdx + 1} / {BUG_CASES.length} · 9×9 行标准化矩阵找茬
          </div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" /> {cs.title}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">{cs.story}</p>
          <p className="text-xs text-primary mt-1.5">
            👆 点击矩阵元素 wᵢⱼ 标注单元格问题；点击行标签 (A-I) 标注"行和≠1"问题。
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
        <div className="space-y-3">
          {/* 3×3 区域小地图 */}
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="text-[11px] text-muted-foreground mb-2 text-center">
              📍 9 个区域的真实空间布局（Rook 邻接：上下左右相邻）
            </div>
            <div className="grid grid-cols-3 gap-1.5 max-w-[200px] mx-auto">
              {REGIONS.map((name, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded border-2 flex items-center justify-center text-sm font-bold font-mono transition-all ${
                    hoverCell &&
                    (Number(hoverCell.split(",")[0]) === i ||
                      Number(hoverCell.split(",")[1]) === i)
                      ? "bg-primary text-primary-foreground border-primary scale-110"
                      : "bg-background border-border"
                  }`}
                >
                  {name}
                </div>
              ))}
            </div>
          </div>

          {/* 9×9 矩阵 */}
          <div className="rounded-lg border border-border bg-muted/20 p-3 overflow-auto">
            <div className="text-[11px] text-muted-foreground mb-2 text-center">
              空间权重矩阵 W (9×9) · 行 i = 当前区域，列 j = 邻居 → wᵢⱼ
            </div>
            <table className="border-collapse mx-auto font-mono text-[11px]">
              <thead>
                <tr>
                  <th className="w-7 h-7"></th>
                  <th className="w-7 h-7"></th>
                  {REGIONS.map((name, j) => (
                    <th
                      key={j}
                      className={`w-9 h-7 text-center font-bold ${
                        hoverCell && Number(hoverCell.split(",")[1]) === j
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      {name}
                    </th>
                  ))}
                  <th className="w-12 h-7 text-center text-muted-foreground pl-2">Σ</th>
                </tr>
              </thead>
              <tbody>
                {cs.matrix.map((row, i) => {
                  const sum = rowSums[i];
                  // 行和判定：容差 0.02（容许 0.33+0.33+0.33=0.99 这种浮点误差）
                  const sumOk = Math.abs(sum - 1) < 0.02 || sum === 0;
                  const rowKey = `row:${i}`;
                  const rowMark = marks[rowKey];
                  const rowTruth = truth[rowKey];
                  const rowMarkBug = rowMark ? BUG_TYPES.find((b) => b.id === rowMark) : null;
                  const rowTruthBug = rowTruth ? BUG_TYPES.find((b) => b.id === rowTruth) : null;

                  // 行标签的颜色逻辑（与单元格相似）
                  let rowBg = "text-muted-foreground";
                  if (hoverCell && Number(hoverCell.split(",")[0]) === i) rowBg = "text-primary";
                  let rowBorder = "border-transparent";
                  if (submitted) {
                    if (rowMark && rowTruth && rowMark === rowTruth)
                      rowBorder = "border-success bg-success/30";
                    else if (rowMark && rowTruth && rowMark !== rowTruth)
                      rowBorder = "border-warning bg-warning/30";
                    else if (rowMark && !rowTruth)
                      rowBorder = "border-destructive bg-destructive/30";
                    else if (!rowMark && rowTruth)
                      rowBorder = "border-warning border-dashed bg-warning/20";
                  } else if (rowMark) {
                    rowBorder = "border-primary bg-primary-soft";
                  }

                  return (
                    <tr key={i}>
                      <td className="p-0.5">
                        <Popover
                          open={openCell === rowKey}
                          onOpenChange={(o) => setOpenCell(o ? rowKey : null)}
                        >
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              disabled={submitted}
                              className={`relative w-7 h-9 rounded border ${rowBorder} text-center font-bold transition-all hover:scale-110 hover:z-10 disabled:hover:scale-100 ${rowBg}`}
                              title={`点击标注 ${REGIONS[i]} 行的"行和≠1"问题`}
                            >
                              {REGIONS[i]}
                              {rowMark && rowMarkBug && (
                                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[8px] flex items-center justify-center font-bold shadow">
                                  {rowMarkBug.emoji}
                                </span>
                              )}
                              {submitted && !rowMark && rowTruthBug && (
                                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-warning text-warning-foreground text-[8px] flex items-center justify-center font-bold shadow">
                                  {rowTruthBug.emoji}
                                </span>
                              )}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-2" side="left">
                            <div className="text-[11px] text-muted-foreground mb-2 px-1">
                              <span className="font-mono font-bold text-foreground">
                                {REGIONS[i]} 行 · Σⱼ w[{REGIONS[i]},j] = {smartSum(sum)}
                              </span>
                              <div className="mt-0.5">
                                {sumOk
                                  ? `✅ 行和已正确归一${sum === 0 ? "（孤岛行）" : ""}`
                                  : `❌ 行和 ${smartSum(sum)} ≠ 1，违反行标准化`}
                              </div>
                            </div>
                            <div className="space-y-1">
                              {/* 只允许行级标签：rowsum */}
                              {BUG_TYPES.filter((b) => b.id === "rowsum").map((b) => (
                                <button
                                  key={b.id}
                                  type="button"
                                  onClick={() => markCell(rowKey, b.id)}
                                  className={`w-full text-left rounded p-1.5 text-xs transition-colors flex items-start gap-2 ${
                                    rowMark === b.id
                                      ? "bg-primary text-primary-foreground"
                                      : "hover:bg-muted"
                                  }`}
                                >
                                  <span className="text-base leading-none">{b.emoji}</span>
                                  <div className="flex-1">
                                    <div className="font-semibold">{b.short}</div>
                                    <div
                                      className={`text-[10px] leading-tight mt-0.5 ${
                                        rowMark === b.id
                                          ? "text-primary-foreground/80"
                                          : "text-muted-foreground"
                                      }`}
                                    >
                                      {b.label}
                                    </div>
                                  </div>
                                </button>
                              ))}
                              {rowMark && (
                                <button
                                  type="button"
                                  onClick={() => clearMark(rowKey)}
                                  className="w-full text-left rounded p-1.5 text-[11px] text-muted-foreground hover:bg-muted border-t border-border mt-1 pt-2"
                                >
                                  ✕ 清除此行标记
                                </button>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </td>
                      <td className="w-3 text-muted-foreground text-center">→</td>
                      {row.map((c, j) => {
                        const key = `${i},${j}`;
                        const mark = marks[key];
                        const truthBug = truth[key];
                        const weight = parseFloat(c.display);
                        const isDiag = i === j;

                        let bg = "bg-background border-border";
                        if (isDiag) bg = "bg-muted/40 border-border";
                        if (weight < 0) bg = "bg-destructive/15 border-destructive/50";
                        else if (weight > 0) bg = "bg-accent/20 border-accent/50";

                        if (submitted) {
                          if (mark && truthBug && mark === truthBug)
                            bg = "bg-success/30 border-success";
                          else if (mark && truthBug && mark !== truthBug)
                            bg = "bg-warning/30 border-warning";
                          else if (mark && !truthBug)
                            bg = "bg-destructive/30 border-destructive";
                          else if (!mark && truthBug)
                            bg = "bg-warning/20 border-warning border-dashed";
                        } else if (mark) {
                          bg = "bg-primary-soft border-primary";
                        }

                        const markedBug = mark ? BUG_TYPES.find((b) => b.id === mark) : null;
                        const truthBugObj = truthBug
                          ? BUG_TYPES.find((b) => b.id === truthBug)
                          : null;

                        return (
                          <td key={j} className="p-0.5">
                            <Popover
                              open={openCell === key}
                              onOpenChange={(o) => setOpenCell(o ? key : null)}
                            >
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  disabled={submitted}
                                  onMouseEnter={() => setHoverCell(key)}
                                  onMouseLeave={() => setHoverCell(null)}
                                  className={`relative w-9 h-9 rounded border ${bg} flex items-center justify-center transition-all hover:scale-110 hover:z-10 disabled:hover:scale-100`}
                                  title={`w[${REGIONS[i]},${REGIONS[j]}] = ${c.display}`}
                                >
                                  <span className="text-[10px] font-semibold text-foreground">
                                    {c.display === "0" ? "·" : c.display}
                                  </span>
                                  {mark && markedBug && (
                                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[8px] flex items-center justify-center font-bold shadow">
                                      {markedBug.emoji}
                                    </span>
                                  )}
                                  {submitted && !mark && truthBugObj && (
                                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-warning text-warning-foreground text-[8px] flex items-center justify-center font-bold shadow">
                                      {truthBugObj.emoji}
                                    </span>
                                  )}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-72 p-2" side="top">
                                <div className="text-[11px] text-muted-foreground mb-2 px-1">
                                  <span className="font-mono font-bold text-foreground">
                                    w[{REGIONS[i]} → {REGIONS[j]}] = {c.display}
                                  </span>
                                  <div className="mt-0.5">
                                    {i === j
                                      ? "⚠️ 这是对角线元素（自己→自己）"
                                      : TRUE_NEIGHBORS[i].includes(j)
                                      ? `✅ ${REGIONS[i]} 和 ${REGIONS[j]} 在地图上确实相邻`
                                      : `❌ ${REGIONS[i]} 和 ${REGIONS[j]} 在地图上不相邻`}
                                  </div>
                                </div>
                                <div className="space-y-1 max-h-72 overflow-y-auto">
                                  {BUG_TYPES.map((b) => (
                                    <button
                                      key={b.id}
                                      type="button"
                                      onClick={() => markCell(key, b.id)}
                                      className={`w-full text-left rounded p-1.5 text-xs transition-colors flex items-start gap-2 ${
                                        mark === b.id
                                          ? "bg-primary text-primary-foreground"
                                          : "hover:bg-muted"
                                      }`}
                                    >
                                      <span className="text-base leading-none">{b.emoji}</span>
                                      <div className="flex-1">
                                        <div className="font-semibold">{b.short}</div>
                                        <div
                                          className={`text-[10px] leading-tight mt-0.5 ${
                                            mark === b.id
                                              ? "text-primary-foreground/80"
                                              : "text-muted-foreground"
                                          }`}
                                        >
                                          {b.label}
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                                  {mark && (
                                    <button
                                      type="button"
                                      onClick={() => clearMark(key)}
                                      className="w-full text-left rounded p-1.5 text-[11px] text-muted-foreground hover:bg-muted border-t border-border mt-1 pt-2"
                                    >
                                      ✕ 清除此格标记
                                    </button>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </td>
                        );
                      })}
                      {/* 行和 */}
                      <td className="pl-2">
                        <span
                          className={`text-[10px] font-bold ${
                            sumOk ? "text-success" : "text-destructive"
                          }`}
                        >
                          {smartSum(sum)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-3 flex flex-wrap gap-3 justify-center text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-accent/20 border border-accent/50" /> 正权重
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-destructive/15 border border-destructive/50" /> 负权重
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-muted/40 border border-border" /> 对角线
              </span>
              {submitted && (
                <>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-success/30 border border-success" /> 完美
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-warning/30 border border-warning" /> 标签错/遗漏
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-destructive/30 border border-destructive" /> 错标
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {/* 进度面板 */}
          <div className="rounded-md border-2 border-primary/40 bg-primary-soft/40 p-3">
            <div className="text-xs text-muted-foreground mb-1">已标注</div>
            <div className="text-2xl font-bold font-mono text-primary">
              {Object.keys(marks).length}{" "}
              <span className="text-sm text-muted-foreground">个元素</span>
            </div>
          </div>

          {/* 标签图例 */}
          <div className="rounded-md border border-border bg-background p-2.5 space-y-1.5">
            <div className="text-[11px] font-semibold text-muted-foreground mb-1">
              📚 问题类型速查
            </div>
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
            <div className="rounded-md border border-border bg-background p-2.5 space-y-2 max-h-[260px] overflow-y-auto">
              <div className="text-[11px] font-semibold">📖 答案解析</div>
              {Object.entries(truth).map(([key, bid]) => {
                const isRow = key.startsWith("row:");
                const b = BUG_TYPES.find((x) => x.id === bid)!;
                const userMark = marks[key];
                const status =
                  userMark === bid
                    ? { txt: "✓ 完美", cls: "text-success" }
                    : userMark
                    ? { txt: "△ 标错类型", cls: "text-warning" }
                    : { txt: "✗ 遗漏", cls: "text-destructive" };
                let label: string;
                if (isRow) {
                  const i = Number(key.slice(4));
                  label = `${REGIONS[i]} 行 (Σ=${smartSum(rowSums[i])})`;
                } else {
                  const [i, j] = key.split(",").map(Number);
                  label = `w[${REGIONS[i]},${REGIONS[j]}]`;
                }
                return (
                  <div key={key} className="text-[11px] border-l-2 border-border pl-2">
                    <div className="flex justify-between items-center">
                      <span className="font-mono">
                        {label} {b.emoji} {b.short}
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
              好的行标准化 W 满足：对角线为 0、与真实邻接一致、对称、非负、每行非零元之和 = 1。
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}


