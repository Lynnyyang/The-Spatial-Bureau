import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { GridCity } from "@/components/GridCity";
import {
  generateClustered,
  generateRandom,
  shuffleValues,
  buildNeighbors,
  moranI,
  TOTAL,
  GRID_SIZE,
} from "@/lib/spatial";
import { useAppStore } from "@/store/app";
import {
  CheckCircle2,
  XCircle,
  Shuffle,
  Sparkles,
  Waves,
  Thermometer,
  Target,
  Zap,
  RotateCcw,
  Trophy,
  Flame,
  Snowflake,
} from "lucide-react";
import { toast } from "sonner";

// ============ 统一场景：城市温度 ============
const SCENARIO = {
  name: "城市温度",
  unit: "°C",
  description:
    "情境：盛夏午后，新域市气象局在 8×8 网格上采集了地表温度。热岛效应使工业区、商圈、密集建成区的温度向邻里街区扩散——这正是观察空间依赖性的绝佳样本。",
};

// ============ 主组件 ============
export default function DependencyLab() {
  const award = useAppStore((s) => s.awardXp);
  const W = useMemo(() => buildNeighbors({ rule: "queen" }), []);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Badge variant="secondary" className="mb-2">模块一</Badge>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Waves className="h-6 w-6 text-primary" /> 空间依赖性感知实验室
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            围绕「城市温度」这一统一情境，通过 5 项递进挑战亲手"摸到"空间依赖。
          </p>
        </div>
      </header>

      {/* 情境卡片 */}
      <Card className="p-4 shadow-panel border-border/60 flex items-start gap-3">
        <div className="rounded-md bg-primary-soft p-2 flex-shrink-0">
          <Thermometer className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="text-sm font-semibold mb-1">案件情境 · {SCENARIO.name}（{SCENARIO.unit}）</div>
          <p className="text-xs text-muted-foreground leading-relaxed">{SCENARIO.description}</p>
        </div>
      </Card>

      <Tabs defaultValue="spot" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="spot">🔍 找出聚集</TabsTrigger>
          <TabsTrigger value="ripple">💧 影响波纹</TabsTrigger>
          <TabsTrigger value="paint">🎨 绘制聚集</TabsTrigger>
          <TabsTrigger value="blur">🌫️ 平滑实验</TabsTrigger>
          <TabsTrigger value="guess">🎯 猜数挑战</TabsTrigger>
        </TabsList>

        <TabsContent value="spot" className="mt-4">
          <SpotChallenge W={W} award={award} />
        </TabsContent>
        <TabsContent value="ripple" className="mt-4">
          <RippleChallenge W={W} />
        </TabsContent>
        <TabsContent value="paint" className="mt-4">
          <PaintChallenge W={W} award={award} />
        </TabsContent>
        <TabsContent value="blur" className="mt-4">
          <BlurChallenge W={W} />
        </TabsContent>
        <TabsContent value="guess" className="mt-4">
          <GuessChallenge W={W} award={award} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============ 挑战 1：找出聚集 ============
function SpotChallenge({ W, award }: { W: number[][]; award: (n: number) => void }) {
  const [seed, setSeed] = useState(7);
  const [chosen, setChosen] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [streak, setStreak] = useState(0);

  const maps = useMemo(() => {
    const clustered = generateClustered(seed, 2);
    const arr = [
      { id: 0, label: "样本 A", values: shuffleValues(clustered, seed + 1), kind: "random" as const },
      { id: 1, label: "样本 B", values: clustered, kind: "clustered" as const },
      { id: 2, label: "样本 C", values: generateRandom(seed + 2), kind: "random" as const },
    ];
    // pseudo-stable shuffle
    const order = (seed * 31) % 6;
    const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    return perms[order].map((i) => arr[i]);
  }, [seed]);

  const morans = useMemo(() => maps.map((m) => moranI(m.values, W)), [maps, W]);

  const choose = (id: number) => {
    if (revealed) return;
    setChosen(id);
    setRevealed(true);
    const idx = maps.findIndex((m) => m.id === id);
    const correct = maps[idx].kind === "clustered";
    if (correct) {
      setStreak((s) => s + 1);
      const bonus = streak >= 2 ? 10 : 0;
      award(20 + bonus);
      toast.success(`正确！Moran's I = ${morans[idx].toFixed(3)}${bonus ? ` · 连胜 +${bonus}` : ""}`);
    } else {
      setStreak(0);
      toast.error("再想想：随机分布的 Moran's I 应接近 0。");
    }
  };

  const next = () => {
    setSeed((s) => s + 1);
    setChosen(null);
    setRevealed(false);
  };

  return (
    <Card className="p-6 shadow-panel border-border/60">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <div className="text-xs text-muted-foreground font-mono tracking-wider mb-1">挑战 1 / 5 · 视觉识别</div>
          <h2 className="text-lg font-semibold">哪一份温度地图最可能存在空间依赖？</h2>
          <p className="text-xs text-muted-foreground mt-1">工业区、商圈往往形成连片高温团块，而随机分布则不会。</p>
        </div>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Flame className="h-3 w-3 text-warning" /> 连胜 {streak}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={next}>
            <Shuffle className="h-3.5 w-3.5 mr-1" />换一组
          </Button>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {maps.map((m, idx) => {
          const isChosen = chosen === m.id;
          const isCorrect = m.kind === "clustered";
          return (
            <button
              key={m.id}
              onClick={() => choose(m.id)}
              className={`text-left rounded-lg border-2 p-3 transition-all hover:-translate-y-0.5 ${
                revealed
                  ? isCorrect
                    ? "border-success bg-success/5"
                    : isChosen
                    ? "border-destructive bg-destructive/5"
                    : "border-border opacity-60"
                  : "border-border hover:border-primary"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{m.label}</span>
                {revealed &&
                  (isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : isChosen ? (
                    <XCircle className="h-4 w-4 text-destructive" />
                  ) : null)}
              </div>
              <GridCity values={m.values} size={260} />
              {revealed && (
                <div className="mt-2 text-xs text-muted-foreground font-mono">
                  Moran's I ={" "}
                  <span className="text-foreground font-semibold">{morans[idx].toFixed(3)}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
      {revealed && (
        <div className="mt-4 p-3 rounded-md bg-primary-soft text-sm text-primary">
          <Sparkles className="h-4 w-4 inline mr-1" />
          正确答案是 Moran's I 最高的样本。随机分布期望值 ≈ −1/(n−1) ≈ −0.016，聚集分布通常 &gt; 0.3。
        </div>
      )}
    </Card>
  );
}

// ============ 挑战 2：影响波纹 ============
function RippleChallenge({ W }: { W: number[][] }) {
  const [vals, setVals] = useState(() => generateClustered(99, 1));
  const [strength, setStrength] = useState([25]);
  const [radius, setRadius] = useState([2]);
  const [history, setHistory] = useState<{ I: number; t: number }[]>([]);
  const [clicks, setClicks] = useState(0);

  const ripple = (i: number) => {
    setVals((v) => {
      const out = [...v];
      const r = Math.floor(i / GRID_SIZE),
        c = i % GRID_SIZE;
      out[i] = Math.min(100, out[i] + strength[0]);
      for (let k = 0; k < TOTAL; k++) {
        const rr = Math.floor(k / GRID_SIZE),
          cc = k % GRID_SIZE;
        const d = Math.hypot(rr - r, cc - c);
        if (d > 0 && d <= radius[0]) {
          out[k] = Math.min(100, out[k] + Math.round((strength[0] * 0.6) / d));
        }
      }
      return out;
    });
    setClicks((n) => n + 1);
  };

  const I = useMemo(() => moranI(vals, W), [vals, W]);

  useEffect(() => {
    setHistory((h) => [...h.slice(-29), { I, t: Date.now() }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vals]);

  const reset = () => {
    setVals(generateClustered(Math.floor(Math.random() * 1000), 1));
    setHistory([]);
    setClicks(0);
  };

  // sparkline path
  const spark = useMemo(() => {
    if (history.length < 2) return "";
    const w = 260,
      h = 50;
    const xs = history.map((_, i) => (i / (history.length - 1)) * w);
    const min = Math.min(...history.map((p) => p.I), -0.1);
    const max = Math.max(...history.map((p) => p.I), 0.5);
    const ys = history.map((p) => h - ((p.I - min) / (max - min || 1)) * h);
    return xs.map((x, i) => `${i ? "L" : "M"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  }, [history]);

  return (
    <Card className="p-6 shadow-panel border-border/60">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="text-xs text-muted-foreground font-mono tracking-wider mb-1">挑战 2 / 5 · 因果直觉</div>
          <h2 className="text-lg font-semibold">空间影响波纹 · 城市温度</h2>
          <p className="text-xs text-muted-foreground mt-1">
            点击任一街区，模拟一次"热源冲击"（如新建的工业园）向邻里扩散。观察 Moran's I 实时变化。
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">实时 Moran's I</div>
          <div className="text-3xl font-bold font-mono text-primary">{I.toFixed(3)}</div>
          <div className="text-xs text-muted-foreground mt-1">点击次数：{clicks}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_300px] gap-6 items-start">
        <GridCity values={vals} size={460} onCellClick={ripple} />
        <div className="space-y-4 text-sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono text-muted-foreground">冲击强度</label>
              <span className="text-xs font-semibold">+{strength[0]}</span>
            </div>
            <Slider value={strength} onValueChange={setStrength} min={5} max={60} step={5} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono text-muted-foreground">影响半径</label>
              <span className="text-xs font-semibold">{radius[0]} 格</span>
            </div>
            <Slider value={radius} onValueChange={setRadius} min={1} max={4} step={1} />
          </div>

          <div className="rounded-md border border-border p-3 bg-background">
            <div className="text-xs text-muted-foreground mb-1">Moran's I 趋势（最近 30 步）</div>
            <svg viewBox="0 0 260 50" className="w-full h-12">
              <line x1="0" y1="25" x2="260" y2="25" stroke="hsl(var(--border))" strokeDasharray="2 2" />
              {spark && <path d={spark} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.8" />}
            </svg>
          </div>

          <Button variant="outline" size="sm" onClick={reset} className="w-full">
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> 重置波纹场
          </Button>
          <div className="rounded-md bg-primary-soft p-3 text-xs leading-relaxed text-primary">
            💡 半径越大、强度越高，依赖性扩散越快。试试不同参数，I 通常会越来越大。
          </div>
        </div>
      </div>
    </Card>
  );
}

// ============ 挑战 3：绘制聚集（目标 I）============
function PaintChallenge({ W, award }: { W: number[][]; award: (n: number) => void }) {
  const [vals, setVals] = useState<number[]>(() => Array(TOTAL).fill(50));
  const [target] = useState(0.45);
  const [tolerance] = useState(0.05);
  const [brush, setBrush] = useState<"hot" | "cold">("hot");
  const [strokes, setStrokes] = useState(0);
  const [done, setDone] = useState(false);
  const isPainting = useRef(false);

  const paint = (i: number) => {
    setVals((v) => {
      const out = [...v];
      out[i] = brush === "hot" ? Math.min(100, out[i] + 20) : Math.max(0, out[i] - 20);
      return out;
    });
    setStrokes((s) => s + 1);
  };

  const I = useMemo(() => moranI(vals, W), [vals, W]);
  const diff = Math.abs(I - target);
  const closeEnough = diff <= tolerance;
  const progress = Math.max(0, Math.min(100, ((target - Math.max(I, -0.2)) / (target - -0.2)) * 100));
  const fillProgress = Math.max(0, Math.min(100, (I / target) * 100));

  useEffect(() => {
    if (closeEnough && !done) {
      setDone(true);
      const score = Math.max(20, 60 - strokes);
      award(score);
      toast.success(`达成目标！I = ${I.toFixed(3)} · 用了 ${strokes} 笔 · 获得 ${score} XP`);
    }
  }, [closeEnough, done, I, strokes, award]);

  const reset = () => {
    setVals(Array(TOTAL).fill(50));
    setStrokes(0);
    setDone(false);
  };

  return (
    <Card className="p-6 shadow-panel border-border/60">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="text-xs text-muted-foreground font-mono tracking-wider mb-1">挑战 3 / 5 · 主动构造</div>
          <h2 className="text-lg font-semibold">用画笔创造空间依赖</h2>
          <p className="text-xs text-muted-foreground mt-1">
            目标：让 Moran's I 达到 <span className="font-mono font-bold text-primary">{target.toFixed(2)} ± {tolerance}</span>。用笔刷涂抹，越少笔越好。
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">当前 I</div>
          <div className={`text-3xl font-bold font-mono ${closeEnough ? "text-success" : "text-primary"}`}>
            {I.toFixed(3)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">笔画：{strokes}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_280px] gap-6 items-start">
        <div
          onMouseDown={() => (isPainting.current = true)}
          onMouseUp={() => (isPainting.current = false)}
          onMouseLeave={() => (isPainting.current = false)}
        >
          <GridCity
            values={vals}
            size={460}
            onCellClick={paint}
            onCellHover={(i) => {
              if (i !== null && isPainting.current) paint(i);
            }}
          />
          <p className="text-xs text-muted-foreground mt-2 text-center">提示：按住鼠标可连续涂抹</p>
        </div>

        <div className="space-y-4 text-sm">
          <div className="flex gap-2">
            <button
              onClick={() => setBrush("hot")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md border-2 text-sm transition-all ${
                brush === "hot" ? "border-destructive bg-destructive/10 text-destructive" : "border-border"
              }`}
            >
              <Flame className="h-4 w-4" /> 高值笔 +20
            </button>
            <button
              onClick={() => setBrush("cold")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md border-2 text-sm transition-all ${
                brush === "cold" ? "border-primary bg-primary/10 text-primary" : "border-border"
              }`}
            >
              <Snowflake className="h-4 w-4" /> 低值笔 −20
            </button>
          </div>

          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>距离目标</span>
              <span className="font-mono">{diff.toFixed(3)}</span>
            </div>
            <Progress value={fillProgress} className="h-2" />
          </div>

          <div className="rounded-md bg-primary-soft p-3 text-xs leading-relaxed text-primary">
            🎨 想达成正空间自相关：把高值聚到一片、低值聚到另一片。零散涂抹只会让 I 趋近 0。
          </div>

          {done && (
            <div className="rounded-md bg-success/10 border border-success/30 p-3 text-xs text-success flex items-start gap-2">
              <Trophy className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>挑战完成！想挑战更高目标？点击重置再试。</div>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={reset} className="w-full">
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> 重置画布
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ============ 挑战 4：平滑实验 ============
function BlurChallenge({ scenario, W }: { scenario: Scenario; W: number[][] }) {
  const [seed, setSeed] = useState(42);
  const [blur, setBlur] = useState([0]);

  const base = useMemo(() => generateRandom(seed), [seed]);

  const smoothed = useMemo(() => {
    const b = blur[0];
    if (b === 0) return base;
    const out = new Array(TOTAL).fill(0);
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        let sum = 0,
          n = 0;
        for (let dr = -b; dr <= b; dr++) {
          for (let dc = -b; dc <= b; dc++) {
            const rr = r + dr,
              cc = c + dc;
            if (rr < 0 || rr >= GRID_SIZE || cc < 0 || cc >= GRID_SIZE) continue;
            sum += base[rr * GRID_SIZE + cc];
            n++;
          }
        }
        out[r * GRID_SIZE + c] = Math.round(sum / n);
      }
    }
    return out;
  }, [base, blur]);

  const I_orig = useMemo(() => moranI(base, W), [base, W]);
  const I_smooth = useMemo(() => moranI(smoothed, W), [smoothed, W]);

  return (
    <Card className="p-6 shadow-panel border-border/60">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="text-xs text-muted-foreground font-mono tracking-wider mb-1">挑战 4 / 5 · 机制理解</div>
          <h2 className="text-lg font-semibold">从随机到聚集：平滑过程的秘密</h2>
          <p className="text-xs text-muted-foreground mt-1">
            真实世界的{scenario.name}并非凭空聚集，而是因为"邻里之间相互影响"。拖动平滑半径，看随机如何被塑造成依赖。
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSeed((s) => s + 1)}>
          <Shuffle className="h-3.5 w-3.5 mr-1" /> 换种子
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">原始随机分布</span>
            <span className="text-xs font-mono text-muted-foreground">
              I = <span className="font-bold text-foreground">{I_orig.toFixed(3)}</span>
            </span>
          </div>
          <GridCity values={base} size={400} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              平滑后（半径 {blur[0]}）{blur[0] > 0 && <Zap className="h-3 w-3 inline text-warning ml-1" />}
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              I = <span className="font-bold text-primary">{I_smooth.toFixed(3)}</span>
            </span>
          </div>
          <GridCity values={smoothed} size={400} />
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono text-muted-foreground">平滑半径（邻里影响范围）</label>
          <span className="text-xs font-semibold">{blur[0]} 格</span>
        </div>
        <Slider value={blur} onValueChange={setBlur} min={0} max={4} step={1} />
        <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-1">
          <span>0 · 完全独立</span>
          <span>2 · 中等依赖</span>
          <span>4 · 强依赖</span>
        </div>
      </div>

      <div className="mt-4 p-3 rounded-md bg-primary-soft text-sm text-primary">
        <Sparkles className="h-4 w-4 inline mr-1" />
        关键洞察：当邻里影响半径增大，数据从 I≈0 演化到 I&gt;0.5。这就是为什么"独立同分布"假设在空间数据上常常不成立。
      </div>
    </Card>
  );
}

// ============ 挑战 5：猜数挑战 ============
function GuessChallenge({ scenario, W, award }: { scenario: Scenario; W: number[][]; award: (n: number) => void }) {
  const [seed, setSeed] = useState(123);
  const [vals, setVals] = useState(() => generateClustered(123, 2));
  const [hidden, setHidden] = useState<number>(() => Math.floor(Math.random() * TOTAL));
  const [guess, setGuess] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);

  const trueVal = vals[hidden];
  const neighbors = useMemo(() => {
    const ns: number[] = [];
    for (let j = 0; j < TOTAL; j++) if (W[hidden][j] > 0) ns.push(j);
    return ns;
  }, [W, hidden]);
  const neighborMean = useMemo(
    () => neighbors.reduce((a, j) => a + vals[j], 0) / (neighbors.length || 1),
    [neighbors, vals]
  );
  const globalMean = useMemo(() => vals.reduce((a, b) => a + b, 0) / TOTAL, [vals]);

  const submit = () => {
    if (guess === null) return;
    setSubmitted(true);
    const errNeighbor = Math.abs(guess - trueVal);
    const errGlobal = Math.abs(globalMean - trueVal);
    const errBlind = Math.abs(50 - trueVal);
    const better = errNeighbor < errGlobal && errNeighbor < errBlind;
    const pts = Math.max(0, 30 - Math.round(errNeighbor));
    setScore((s) => s + pts);
    award(pts);
    if (better) {
      toast.success(`+${pts} XP · 你的估计比"全局均值"和"瞎猜50"都准！`);
    } else {
      toast.message(`+${pts} XP · 误差 ${errNeighbor.toFixed(0)}`);
    }
  };

  const next = () => {
    const ns = seed + 1;
    setSeed(ns);
    setVals(generateClustered(ns, 2));
    setHidden(Math.floor(Math.random() * TOTAL));
    setGuess(null);
    setSubmitted(false);
    setRound((r) => r + 1);
  };

  return (
    <Card className="p-6 shadow-panel border-border/60">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="text-xs text-muted-foreground font-mono tracking-wider mb-1">挑战 5 / 5 · 实战推理</div>
          <h2 className="text-lg font-semibold">缺失值预测：邻居能告诉你多少？</h2>
          <p className="text-xs text-muted-foreground mt-1">
            高亮区域的{scenario.name}值被隐藏。利用周围邻居信息，估计它的数值。这就是"地理学第一定律"的实战。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">第 {round} 轮 · 累计 {score} XP</Badge>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_300px] gap-6 items-start">
        <GridCity
          values={vals}
          size={460}
          selected={hidden}
          highlight={[hidden, ...neighbors]}
          colorOf={(i) => {
            if (i === hidden && !submitted) return "hsl(var(--muted))";
            return "";
          }}
        />

        <div className="space-y-4 text-sm">
          <div className="rounded-md border border-border p-3 bg-background">
            <div className="text-xs text-muted-foreground mb-2">参考信息</div>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">邻居数量</span>
                <span className="font-semibold">{neighbors.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">邻居均值</span>
                <span className="font-semibold text-primary">{neighborMean.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">全局均值</span>
                <span className="font-semibold">{globalMean.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {!submitted ? (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono text-muted-foreground">你的估计值</label>
                  <span className="text-2xl font-bold font-mono text-primary">{guess ?? "—"}</span>
                </div>
                <Slider value={[guess ?? 50]} onValueChange={(v) => setGuess(v[0])} min={0} max={100} step={1} />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>
              <Button onClick={submit} disabled={guess === null} className="w-full">
                <Target className="h-3.5 w-3.5 mr-1" /> 提交估计
              </Button>
            </>
          ) : (
            <>
              <div className="rounded-md border border-border p-3 bg-background space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">真实值</span>
                  <span className="font-bold text-success">{trueVal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">你的估计</span>
                  <span className="font-bold">{guess}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">误差</span>
                  <span className="font-bold text-primary">{Math.abs((guess ?? 0) - trueVal)}</span>
                </div>
                <div className="border-t border-border my-1.5" />
                <div className="flex justify-between text-muted-foreground">
                  <span>若用邻居均值</span>
                  <span>误差 {Math.abs(neighborMean - trueVal).toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>若用全局均值</span>
                  <span>误差 {Math.abs(globalMean - trueVal).toFixed(1)}</span>
                </div>
              </div>
              <Button onClick={next} className="w-full">
                <Shuffle className="h-3.5 w-3.5 mr-1" /> 下一轮
              </Button>
            </>
          )}

          <div className="rounded-md bg-primary-soft p-3 text-xs leading-relaxed text-primary">
            🌍 <strong>Tobler 第一定律：</strong>"凡事都与其他事物相关，但近的事物比远的事物更相关。"
          </div>
        </div>
      </div>
    </Card>
  );
}
