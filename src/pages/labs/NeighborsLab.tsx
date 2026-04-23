import { useEffect, useMemo, useState } from "react";
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
  type NeighborRule,
} from "@/lib/spatial";
import { useAppStore } from "@/store/app";
import {
  Network,
  Info,
  Target,
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
  Lightbulb,
  Activity,
  Home,
  ShieldAlert,
  Bus,
  TreePine,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

const RULES: { id: NeighborRule; label: string; desc: string }[] = [
  { id: "rook", label: "Rook 共边", desc: "上下左右四向邻接" },
  { id: "queen", label: "Queen 共边或共点", desc: "包含对角线（八向）" },
  { id: "knn", label: "K-近邻", desc: "最近的 k 个区域" },
  { id: "distance", label: "距离阈值", desc: "在阈值半径内的区域" },
];

export default function NeighborsLab() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <header>
        <Badge variant="secondary" className="mb-2">模块二</Badge>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Network className="h-6 w-6 text-primary" /> 空间邻居判定中心
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          不同规则下"谁是邻居"完全不同。三种玩法帮你建立直觉、检验掌握、面对真实情境做出选择。
        </p>
      </header>

      <Tabs defaultValue="explore" className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="explore">🧭 自由探索</TabsTrigger>
          <TabsTrigger value="pick">🎯 圈出邻居</TabsTrigger>
          <TabsTrigger value="match">🧩 规则匹配</TabsTrigger>
        </TabsList>

        <TabsContent value="explore" className="mt-4">
          <ExploreMode />
        </TabsContent>
        <TabsContent value="pick" className="mt-4">
          <PickChallenge />
        </TabsContent>
        <TabsContent value="match" className="mt-4">
          <MatchChallenge />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============ 模式一：自由探索 ============
function ExploreMode() {
  const [rule, setRule] = useState<NeighborRule>("queen");
  const [k, setK] = useState(4);
  const [threshold, setThreshold] = useState(1.5);
  const [selected, setSelected] = useState<number | null>(27);
  const [compareRule, setCompareRule] = useState<NeighborRule | null>(null);

  const cfg = { rule, k, threshold };
  const W = useMemo(() => buildNeighbors(cfg), [rule, k, threshold]);
  const Wcmp = useMemo(
    () => (compareRule ? buildNeighbors({ rule: compareRule, k, threshold }) : null),
    [compareRule, k, threshold]
  );
  const values = useMemo(() => generateClustered(31, 2), []);
  const neighbors = selected !== null ? neighborsOf(W, selected) : [];
  const neighborsCmp = selected !== null && Wcmp ? neighborsOf(Wcmp, selected) : [];

  const totalNeighbors = W.reduce((a, row) => a + row.reduce((s, b) => s + (b > 0 ? 1 : 0), 0), 0);
  const avgNeighbors = (totalNeighbors / TOTAL).toFixed(1);
  const islands = W.reduce((a, row) => a + (row.every((b) => b === 0) ? 1 : 0), 0);

  const edges: Array<[number, number]> =
    selected !== null ? neighbors.map((j) => [selected, j] as [number, number]) : [];

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <Card className="p-6 shadow-panel border-border/60">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-sm">
            选中区域：
            <span className="font-semibold text-primary">
              {selected !== null ? `#${selected}` : "未选择"}
            </span>
            {selected !== null && (
              <span className="text-muted-foreground ml-2">邻居数：{neighbors.length}</span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
            清除选择
          </Button>
        </div>
        <GridCity
          values={values}
          size={560}
          selected={selected}
          highlight={neighbors}
          edges={edges}
          onCellClick={setSelected}
        />
        {compareRule && selected !== null && (
          <div className="mt-3 text-xs text-muted-foreground p-2 rounded bg-muted/40 border border-border">
            对比【{RULES.find((r) => r.id === compareRule)?.label}】下：邻居数 {neighborsCmp.length}，
            差异 {Math.abs(neighborsCmp.length - neighbors.length)} 个
          </div>
        )}
      </Card>

      <div className="space-y-4">
        <Card className="p-5 shadow-panel border-border/60">
          <div className="text-xs font-mono tracking-wider text-muted-foreground mb-2">邻居规则</div>
          <div className="grid grid-cols-2 gap-2">
            {RULES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRule(r.id)}
                className={`text-left rounded-md border p-3 text-sm transition-all ${
                  rule === r.id
                    ? "border-primary bg-primary-soft text-primary shadow-glow"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="font-medium">{r.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{r.desc}</div>
              </button>
            ))}
          </div>
        </Card>

        {(rule === "knn" || compareRule === "knn") && (
          <Card className="p-5 shadow-panel border-border/60">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">k 值</div>
              <div className="text-sm font-mono text-primary">{k}</div>
            </div>
            <Slider min={1} max={12} step={1} value={[k]} onValueChange={(v) => setK(v[0])} />
          </Card>
        )}

        {(rule === "distance" || compareRule === "distance") && (
          <Card className="p-5 shadow-panel border-border/60">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">距离阈值</div>
              <div className="text-sm font-mono text-primary">{threshold.toFixed(1)}</div>
            </div>
            <Slider
              min={1}
              max={4}
              step={0.1}
              value={[threshold]}
              onValueChange={(v) => setThreshold(v[0])}
            />
            <div className="text-xs text-muted-foreground mt-2">
              {threshold < 1.2
                ? "⚠️ 阈值过小：可能产生孤岛单元"
                : threshold > 3
                ? "⚠️ 阈值过大：邻接关系过密"
                : "✓ 合理范围"}
            </div>
          </Card>
        )}

        <Card className="p-5 shadow-panel border-border/60">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-mono tracking-wider text-muted-foreground">对比另一规则</div>
            {compareRule && (
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setCompareRule(null)}>
                关闭
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {RULES.filter((r) => r.id !== rule).map((r) => (
              <button
                key={r.id}
                onClick={() => setCompareRule(compareRule === r.id ? null : r.id)}
                className={`rounded border px-2 py-1.5 text-xs transition-all ${
                  compareRule === r.id
                    ? "border-accent bg-accent/10 text-accent-foreground"
                    : "border-border hover:border-accent/50"
                }`}
              >
                vs {r.label}
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-panel border-border/60">
          <div className="text-xs font-mono tracking-wider text-muted-foreground mb-2">实时统计</div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">平均邻居</div>
              <div className="text-lg font-bold font-mono">{avgNeighbors}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">连接数</div>
              <div className="text-lg font-bold font-mono">{totalNeighbors}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">孤岛</div>
              <div className={`text-lg font-bold font-mono ${islands > 0 ? "text-warning" : ""}`}>
                {islands}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ============ 模式二：圈出邻居挑战 ============
type PickQ = {
  rule: NeighborRule;
  k?: number;
  threshold?: number;
  center: number;
  prompt: string;
};

const PICK_QUESTIONS: PickQ[] = [
  { rule: "rook", center: 27, prompt: "Rook 邻接：圈出 #27 的所有邻居（上下左右共边）" },
  { rule: "queen", center: 18, prompt: "Queen 邻接：圈出 #18 的所有邻居（含对角共点）" },
  { rule: "rook", center: 0, prompt: "Rook 邻接：圈出角落 #0 的所有邻居（注意边界）" },
  { rule: "queen", center: 7, prompt: "Queen 邻接：圈出角落 #7 的所有邻居" },
  { rule: "knn", k: 4, center: 27, prompt: "K=4 近邻：圈出距离 #27 最近的 4 个区域" },
  { rule: "distance", threshold: 1.5, center: 36, prompt: "距离阈值 1.5：圈出 #36 半径 1.5 内的区域" },
  { rule: "distance", threshold: 2.0, center: 28, prompt: "距离阈值 2.0：圈出 #28 半径 2.0 内的区域" },
];

function PickChallenge() {
  const award = useAppStore((s) => s.awardXp);
  const [qIdx, setQIdx] = useState(0);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);

  const q = PICK_QUESTIONS[qIdx];
  const values = useMemo(() => generateClustered(7 + qIdx, 2), [qIdx]);
  const W = useMemo(
    () => buildNeighbors({ rule: q.rule, k: q.k, threshold: q.threshold }),
    [q]
  );
  const truth = useMemo(() => new Set(neighborsOf(W, q.center)), [W, q.center]);

  const togglePick = (i: number) => {
    if (submitted || i === q.center) return;
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const submit = () => {
    setSubmitted(true);
    let correct = 0;
    let wrong = 0;
    truth.forEach((i) => {
      if (picked.has(i)) correct++;
    });
    picked.forEach((i) => {
      if (!truth.has(i)) wrong++;
    });
    const missed = truth.size - correct;
    const total = truth.size;
    const accuracy = total === 0 ? 0 : Math.max(0, (correct - wrong) / total);
    const pts = Math.round(accuracy * 30);
    setScore((s) => s + pts);
    award(pts);
    if (correct === total && wrong === 0) {
      setStreak((s) => s + 1);
      toast.success(`完美！+${pts} XP · 连胜 ${streak + 1}`);
    } else {
      setStreak(0);
      toast.message(`+${pts} XP · 命中 ${correct}/${total}，多选 ${wrong}，漏选 ${missed}`);
    }
  };

  const next = () => {
    setQIdx((i) => (i + 1) % PICK_QUESTIONS.length);
    setPicked(new Set());
    setSubmitted(false);
  };

  // 颜色：未提交时显示用户选择；提交后显示对错
  const colorOf = (i: number) => {
    if (i === q.center) return "hsl(var(--primary))";
    if (!submitted) {
      return picked.has(i) ? "hsl(var(--accent))" : "";
    }
    const isTruth = truth.has(i);
    const isPicked = picked.has(i);
    if (isTruth && isPicked) return "hsl(var(--success))";
    if (isTruth && !isPicked) return "hsl(var(--warning))";
    if (!isTruth && isPicked) return "hsl(var(--destructive))";
    return "";
  };

  return (
    <Card className="p-6 shadow-panel border-border/60">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="text-xs text-muted-foreground font-mono tracking-wider mb-1">
            第 {qIdx + 1} / {PICK_QUESTIONS.length} 题 · 圈邻居挑战
          </div>
          <h2 className="text-lg font-semibold">{q.prompt}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            紫色为目标区域。点击其他格子加入/移出选择，最后提交查看判分。
          </p>
        </div>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Trophy className="h-3 w-3 text-warning" /> 连胜 {streak}
            </Badge>
          )}
          <Badge variant="secondary">累计 {score} XP</Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-6 items-start">
        <div>
          <GridCity
            values={values}
            size={520}
            selected={q.center}
            highlight={submitted ? [...truth, ...picked, q.center] : [q.center, ...picked]}
            colorOf={colorOf}
            onCellClick={togglePick}
          />
          {submitted && (
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-success inline-block" /> 正确选中
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-warning inline-block" /> 漏选
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-destructive inline-block" /> 多选
              </span>
            </div>
          )}
        </div>

        <div className="space-y-3 text-sm">
          <div className="rounded-md border border-border p-3 bg-background">
            <div className="text-xs text-muted-foreground mb-2">当前规则</div>
            <div className="font-semibold">{RULES.find((r) => r.id === q.rule)?.label}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {RULES.find((r) => r.id === q.rule)?.desc}
              {q.k != null && ` · k=${q.k}`}
              {q.threshold != null && ` · 阈值=${q.threshold}`}
            </div>
          </div>

          <div className="rounded-md border border-border p-3 bg-background">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">已选</span>
              <span className="font-mono font-semibold">{picked.size} 格</span>
            </div>
            {submitted && (
              <div className="flex justify-between text-xs mt-1">
                <span className="text-muted-foreground">正确答案</span>
                <span className="font-mono font-semibold text-success">{truth.size} 格</span>
              </div>
            )}
          </div>

          {!submitted ? (
            <>
              <Button onClick={submit} disabled={picked.size === 0} className="w-full">
                <Target className="h-3.5 w-3.5 mr-1" /> 提交答案
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setPicked(new Set())} className="w-full">
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> 清空选择
              </Button>
            </>
          ) : (
            <Button onClick={next} className="w-full">
              下一题
            </Button>
          )}

          <div className="rounded-md bg-primary-soft p-3 text-xs leading-relaxed text-primary">
            <Lightbulb className="h-3.5 w-3.5 inline mr-1" />
            <strong>提示：</strong>
            {q.rule === "rook" && "Rook 像国际象棋的车——只走横竖。角落只有 2 个邻居，边上 3 个，内部 4 个。"}
            {q.rule === "queen" && "Queen 像国际象棋的后——横竖+斜线。角落 3 个邻居，边上 5 个，内部 8 个。"}
            {q.rule === "knn" &&
              `K-近邻按欧氏距离排序取最近 ${q.k} 个，与方位无关。距离相同时可能存在并列。`}
            {q.rule === "distance" &&
              `欧氏距离 ≤ ${q.threshold} 即视为邻居。注意对角距离 ≈ 1.41，恰好邻接的两步距离 = 2。`}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ============ 模式三：规则匹配挑战 ============
type Scenario = {
  id: string;
  icon: typeof Activity;
  title: string;
  story: string;
  options: NeighborRule[];
  correct: NeighborRule;
  explain: string;
};

const SCENARIOS: Scenario[] = [
  {
    id: "epi",
    icon: Activity,
    title: "疫情快速蔓延",
    story: "某呼吸道传染病在密集街区扩散，主要靠面对面接触；只要两个街区有共同边界或对角接触都可能传播。",
    options: ["rook", "queen", "knn", "distance"],
    correct: "queen",
    explain: "传染病强调任何接触都算扩散通道，因此 Queen（共边或共点）最能刻画接触关系；Rook 会漏掉对角接触。",
  },
  {
    id: "price",
    icon: Home,
    title: "房价空间联动",
    story: "新域市分析师发现房价存在"参考效应"：买家通常对比附近最相似的若干个小区。每个小区被参考的对象数量基本一致。",
    options: ["rook", "queen", "knn", "distance"],
    correct: "knn",
    explain: "KNN 保证每个区域都有相同数量的邻居，正好契合"对比固定个数最相似/最近小区"的心理决策模式。",
  },
  {
    id: "crime",
    icon: ShieldAlert,
    title: "城市治安巡防",
    story: "警务分析师只关心步行 10 分钟内（约 1.5 公里）的相邻街区是否同时高发案件，与街区数量无关。",
    options: ["queen", "knn", "distance"],
    correct: "distance",
    explain: "决策依据是绝对距离半径，因此距离阈值（distance band）最贴合——超过半径的就不视为邻居。",
  },
  {
    id: "transit",
    icon: Bus,
    title: "通勤拥堵传导",
    story: "拥堵沿道路网络传导，直接相连的路段才会互相影响，斜对角的街区如果没有道路连通则不应视为邻居。",
    options: ["rook", "queen", "distance"],
    correct: "rook",
    explain: "在网格化路网中，Rook（共边）最接近"沿道路相连"的拓扑关系；Queen 会错误地把无路径的对角街区算作邻居。",
  },
  {
    id: "park",
    icon: TreePine,
    title: "稀疏郊区绿地",
    story: "郊区公园分布稀疏，研究者希望确保每个公园至少有 3 个可比较的邻居，避免出现孤岛单元。",
    options: ["rook", "queen", "knn", "distance"],
    correct: "knn",
    explain: "KNN 强制每个单元有 k 个邻居，从根本上避免孤岛；距离阈值在稀疏区容易让某些单元一个邻居都没有。",
  },
];

function MatchChallenge() {
  const award = useAppStore((s) => s.awardXp);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<NeighborRule | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [history, setHistory] = useState<boolean[]>([]);

  const sc = SCENARIOS[idx];
  const Icon = sc.icon;

  const submit = () => {
    if (!picked) return;
    setSubmitted(true);
    const correct = picked === sc.correct;
    const pts = correct ? 25 : 5;
    setScore((s) => s + pts);
    setHistory((h) => [...h, correct]);
    award(pts);
    if (correct) toast.success(`+${pts} XP · 选择正确！`);
    else toast.error(`+${pts} XP · 再想想"${RULES.find((r) => r.id === sc.correct)?.label}"为何更合适`);
  };

  const next = () => {
    setIdx((i) => (i + 1) % SCENARIOS.length);
    setPicked(null);
    setSubmitted(false);
  };

  const accuracy =
    history.length === 0 ? 0 : Math.round((history.filter(Boolean).length / history.length) * 100);

  return (
    <Card className="p-6 shadow-panel border-border/60">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="text-xs text-muted-foreground font-mono tracking-wider mb-1">
            情境 {idx + 1} / {SCENARIOS.length} · 规则匹配
          </div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" /> {sc.title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">正确率 {accuracy}%</Badge>
          <Badge variant="secondary">累计 {score} XP</Badge>
        </div>
      </div>

      <div className="rounded-md border border-border p-4 bg-muted/30 mb-4">
        <p className="text-sm leading-relaxed">{sc.story}</p>
      </div>

      <div className="text-xs text-muted-foreground mb-2">
        哪种邻居规则最适合这个研究问题？
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {sc.options.map((rId) => {
          const r = RULES.find((x) => x.id === rId)!;
          const isPicked = picked === rId;
          const isCorrect = rId === sc.correct;
          let cls = "border-border hover:border-primary/50";
          if (submitted) {
            if (isCorrect) cls = "border-success bg-success/10";
            else if (isPicked) cls = "border-destructive bg-destructive/10";
            else cls = "border-border opacity-60";
          } else if (isPicked) {
            cls = "border-primary bg-primary-soft";
          }
          return (
            <button
              key={rId}
              onClick={() => !submitted && setPicked(rId)}
              disabled={submitted}
              className={`text-left rounded-md border-2 p-3 transition-all ${cls}`}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">{r.label}</div>
                {submitted && isCorrect && <CheckCircle2 className="h-4 w-4 text-success" />}
                {submitted && isPicked && !isCorrect && (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{r.desc}</div>
            </button>
          );
        })}
      </div>

      {submitted && (
        <div className="mt-4 rounded-md bg-primary-soft p-4 text-sm text-primary leading-relaxed">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold mb-1">
                参考答案：{RULES.find((r) => r.id === sc.correct)?.label}
              </div>
              {sc.explain}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        {!submitted ? (
          <Button onClick={submit} disabled={!picked}>
            <Target className="h-3.5 w-3.5 mr-1" /> 提交选择
          </Button>
        ) : (
          <Button onClick={next}>下一情境</Button>
        )}
      </div>
    </Card>
  );
}
