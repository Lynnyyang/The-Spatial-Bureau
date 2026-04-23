import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { HexCity } from "@/components/HexCity";
import { MoranScatter } from "@/components/MoranScatter";
import {
  buildNeighbors, generateClustered, lisa, moranPermutation,
  quadrantColor, rowStandardize, type Quadrant,
} from "@/lib/spatial";
import { Activity, Play, Trophy, CheckCircle2, XCircle, ChevronRight, Target } from "lucide-react";
import { useAppStore } from "@/store/app";
import { toast } from "sonner";

type StepId = "global-sign" | "significance" | "find-hh" | "find-ll" | "find-outlier";
interface Step {
  id: StepId;
  title: string;
  prompt: string;
  hint: string;
  type: "choice" | "pick";
  options?: { label: string; value: string }[];
  validate: (ans: string | number, ctx: ChallengeCtx) => boolean;
  feedback: (ok: boolean, ctx: ChallengeCtx) => string;
}
interface ChallengeCtx {
  I: number;
  pseudoP: number;
  expectedI: number;
  hhSet: Set<number>;
  llSet: Set<number>;
  outlierSet: Set<number>;
}

const QUAD_INFO: Record<Quadrant, { label: string; desc: string }> = {
  HH: { label: "HH 热点", desc: "高值被高值包围" },
  LL: { label: "LL 冷点", desc: "低值被低值包围" },
  HL: { label: "HL 异常", desc: "高值被低值包围" },
  LH: { label: "LH 异常", desc: "低值被高值包围" },
  NS: { label: "不显著", desc: "无显著局部聚集" },
};

export default function AutocorrelationLab() {
  const [seed, setSeed] = useState(42);
  const [alpha, setAlpha] = useState(0.05);
  const [selected, setSelected] = useState<number | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [answered, setAnswered] = useState<Record<number, boolean>>({});
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const awardXp = useAppStore((s) => s.awardXp);

  const values = useMemo(() => generateClustered(seed, 2), [seed]);
  const W = useMemo(() => rowStandardize(buildNeighbors({ rule: "queen" })), []);
  const perm = useMemo(() => moranPermutation(values, W, 199, 7), [values, W]);
  const lisaRes = useMemo(() => lisa(values, buildNeighbors({ rule: "queen" }), 99, 13), [values]);
  const lisaThr = useMemo(
    () => lisaRes.map((r) => (r.pseudoP <= alpha ? r.quadrant : "NS")) as Quadrant[],
    [lisaRes, alpha]
  );

  const points = lisaRes.map((r) => ({ x: r.z, y: r.lagZ }));

  const ctx: ChallengeCtx = useMemo(() => ({
    I: perm.I,
    pseudoP: perm.pseudoP,
    expectedI: perm.expectedI,
    hhSet: new Set(lisaThr.map((q, i) => q === "HH" ? i : -1).filter((i) => i >= 0)),
    llSet: new Set(lisaThr.map((q, i) => q === "LL" ? i : -1).filter((i) => i >= 0)),
    outlierSet: new Set(lisaThr.map((q, i) => (q === "HL" || q === "LH") ? i : -1).filter((i) => i >= 0)),
  }), [perm, lisaThr]);

  const STEPS: Step[] = useMemo(() => [
    {
      id: "global-sign",
      title: "第一步 · 判断全局趋势",
      prompt: `观察全局 Moran's I = ${perm.I.toFixed(3)}，期望值 E[I] = ${perm.expectedI.toFixed(3)}。整座城市呈现什么空间格局？`,
      hint: "I > E[I] → 正自相关（聚集）；I < E[I] → 负自相关（分散）；I ≈ E[I] → 随机。",
      type: "choice",
      options: [
        { label: "正自相关 · 高低值各自聚集", value: "pos" },
        { label: "负自相关 · 高低值交替分散", value: "neg" },
        { label: "随机分布 · 无空间结构", value: "rand" },
      ],
      validate: (a, c) => {
        const diff = c.I - c.expectedI;
        if (a === "pos") return diff > 0.05;
        if (a === "neg") return diff < -0.05;
        return Math.abs(diff) <= 0.05;
      },
      feedback: (ok, c) =>
        ok ? `正确！I − E[I] = ${(c.I - c.expectedI).toFixed(3)}，方向判断准确。`
           : `再想想：当前 I − E[I] = ${(c.I - c.expectedI).toFixed(3)}。`,
    },
    {
      id: "significance",
      title: "第二步 · 检验显著性",
      prompt: `置换检验 p = ${perm.pseudoP.toFixed(3)}。在 α = 0.05 下，第一步的结论可信吗？`,
      hint: "p ≤ α 拒绝零假设（空间随机），认为聚集真实存在；p > α 则证据不足。",
      type: "choice",
      options: [
        { label: "显著 · 可以拒绝随机假设", value: "sig" },
        { label: "不显著 · 可能只是巧合", value: "ns" },
      ],
      validate: (a, c) => (a === "sig" ? c.pseudoP <= 0.05 : c.pseudoP > 0.05),
      feedback: (ok, c) =>
        ok ? `没错！p = ${c.pseudoP.toFixed(3)}。现在进入局部分析。`
           : `注意 p 与 α=0.05 的比较。`,
    },
    {
      id: "find-hh",
      title: "第三步 · 找一个 HH 热点",
      prompt: `点击地图，选出一个 LISA 显著的 "HH 热点"（高值被高值包围）。共 ${ctx.hhSet.size} 个候选。`,
      hint: "HH 在散点图右上象限：z > 0 且 Wz > 0，且 p ≤ α。地图上为红色。",
      type: "pick",
      validate: (a, c) => typeof a === "number" && c.hhSet.has(a),
      feedback: (ok) => (ok ? "命中 HH 热点！这是政策应优先关注的过热区。" : "选中的不是 HH，看看红色单元。"),
    },
    {
      id: "find-ll",
      title: "第四步 · 找一个 LL 冷点",
      prompt: `继续点击地图，选出一个 "LL 冷点"（低值被低值包围）。共 ${ctx.llSet.size} 个候选。`,
      hint: "LL 在散点图左下：z < 0 且 Wz < 0。地图上为蓝色。",
      type: "pick",
      validate: (a, c) => typeof a === "number" && c.llSet.has(a),
      feedback: (ok) => (ok ? "正确！冷点常代表资源洼地或边缘地带。" : "再看看蓝色单元。"),
    },
    {
      id: "find-outlier",
      title: "第五步 · 揪出空间异常 (HL / LH)",
      prompt: ctx.outlierSet.size > 0
        ? `异常点"鹤立鸡群"或"凤凰落鸡窝"——与邻居相反。请点击一个 HL 或 LH 单元。共 ${ctx.outlierSet.size} 个候选。`
        : `本组数据空间结构非常"干净"，没有出现显著的 HL/LH 异常点。点击下方按钮直接结业，或换一组数据再挑战。`,
      hint: "HL：高值落在低值海洋中（橙色）；LH：低值陷在高值丛林中（黄色）。若一个都没有，说明聚集非常规整。",
      type: "pick",
      validate: (a, c) => typeof a === "number" && c.outlierSet.has(a),
      feedback: (ok) => (ok ? "出色！异常点往往揭示局部特殊机制。" : "目标是 HL 或 LH 颜色的单元。"),
    },
  ], [perm, ctx]);

  const currentStep = STEPS[stepIdx];
  const isStepDone = !!answered[stepIdx];
  const allDone = STEPS.every((_, i) => answered[i]);

  const submitChoice = (val: string) => {
    const ok = currentStep.validate(val, ctx);
    setFeedback({ ok, msg: currentStep.feedback(ok, ctx) });
    if (ok && !answered[stepIdx]) {
      setAnswered((a) => ({ ...a, [stepIdx]: true }));
      awardXp(15);
      toast.success("+15 XP");
    }
  };

  const handleCellClick = (i: number) => {
    setSelected(i);
    if (currentStep.type === "pick" && !isStepDone) {
      const ok = currentStep.validate(i, ctx);
      setFeedback({ ok, msg: currentStep.feedback(ok, ctx) });
      if (ok) {
        setAnswered((a) => ({ ...a, [stepIdx]: true }));
        awardXp(20);
        toast.success("+20 XP");
      }
    }
  };

  const goNext = () => {
    if (stepIdx < STEPS.length - 1) {
      setStepIdx(stepIdx + 1);
      setFeedback(null);
    }
  };

  const restartChallenge = () => {
    setStepIdx(0);
    setAnswered({});
    setFeedback(null);
    setSelected(null);
    setSeed((s) => s + 1);
  };

  const histMax = 30;
  const histBins = useMemo(() => {
    const lo = Math.min(perm.I, ...perm.distribution) - 0.05;
    const hi = Math.max(perm.I, ...perm.distribution) + 0.05;
    const bins = Array(histMax).fill(0);
    perm.distribution.forEach((v) => {
      const idx = Math.min(histMax - 1, Math.floor(((v - lo) / (hi - lo)) * histMax));
      bins[idx]++;
    });
    const obsIdx = Math.min(histMax - 1, Math.floor(((perm.I - lo) / (hi - lo)) * histMax));
    return { bins, obsIdx, lo, hi };
  }, [perm]);

  const quadCounts = lisaThr.reduce(
    (acc, q) => ({ ...acc, [q]: (acc[q] || 0) + 1 }),
    {} as Record<Quadrant, number>
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Badge variant="secondary" className="mb-2">模块四</Badge>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Activity className="h-6 w-6 text-primary" /> 空间自相关检验作战室</h1>
          <p className="text-sm text-muted-foreground mt-1">全局 Moran's I 看整体；LISA 看局部热点。点击地图或散点联动查看。</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSeed((s) => s + 1)}>
          <Play className="h-3.5 w-3.5 mr-1" /> 换一组数据
        </Button>
      </header>


      {/* Challenge Panel */}
      <Card className="p-5 shadow-panel border-primary/40 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <div className="text-sm font-semibold">闯关式学习 · 全局 → 局部</div>
            <Badge variant="outline" className="font-mono text-[10px]">
              {Object.keys(answered).length}/{STEPS.length}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => { setStepIdx(i); setFeedback(null); }}
                className={`h-2 w-8 rounded-full transition-all ${
                  answered[i] ? "bg-success" : i === stepIdx ? "bg-primary" : "bg-muted"
                }`}
                title={s.title}
              />
            ))}
          </div>
        </div>

        {!allDone ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-semibold">{currentStep.title}</div>
                <div className="text-sm text-muted-foreground mt-1">{currentStep.prompt}</div>
                <div className="text-[11px] text-muted-foreground/80 mt-1 italic">提示：{currentStep.hint}</div>
              </div>
            </div>

            {currentStep.type === "choice" && (
              <div className="grid sm:grid-cols-3 gap-2">
                {currentStep.options!.map((o) => (
                  <Button
                    key={o.value}
                    variant="outline"
                    size="sm"
                    onClick={() => submitChoice(o.value)}
                    disabled={isStepDone}
                    className="justify-start text-left h-auto py-2 whitespace-normal"
                  >
                    {o.label}
                  </Button>
                ))}
              </div>
            )}

            {currentStep.type === "pick" && (
              <div className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
                👇 在下方 LISA 地图或散点图上点击你认为符合条件的区域。
              </div>
            )}

            {feedback && (
              <div className={`flex items-start gap-2 text-sm rounded-md px-3 py-2 ${
                feedback.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              }`}>
                {feedback.ok ? <CheckCircle2 className="h-4 w-4 mt-0.5" /> : <XCircle className="h-4 w-4 mt-0.5" />}
                <span>{feedback.msg}</span>
              </div>
            )}

            {isStepDone && stepIdx < STEPS.length - 1 && (
              <Button size="sm" onClick={goNext}>
                下一步 <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="font-semibold">五步全通关！</span>
              <span className="text-muted-foreground">你已掌握全局 Moran's I → 显著性 → LISA 四象限的完整链路。</span>
            </div>
            <Button size="sm" variant="outline" onClick={restartChallenge}>
              <Play className="h-3.5 w-3.5 mr-1" /> 换一组数据再战
            </Button>
          </div>
        )}
      </Card>

      {/* Global Moran */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5 shadow-panel border-border/60">
          <div className="text-xs font-mono tracking-wider text-muted-foreground mb-2">全局 Moran's I</div>
          <div className="text-4xl font-bold font-mono text-primary">{perm.I.toFixed(3)}</div>
          <div className="text-xs text-muted-foreground mt-1">期望 E[I] = {perm.expectedI.toFixed(3)}</div>
        </Card>
        <Card className="p-5 shadow-panel border-border/60">
          <div className="text-xs font-mono tracking-wider text-muted-foreground mb-2">置换检验 p 值</div>
          <div className={`text-4xl font-bold font-mono ${perm.pseudoP <= 0.05 ? "text-success" : "text-warning-foreground"}`}>
            {perm.pseudoP.toFixed(3)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{perm.pseudoP <= 0.05 ? "✓ 显著（α=0.05）" : "未达显著"}</div>
        </Card>
        <Card className="p-5 shadow-panel border-border/60">
          <div className="text-xs font-mono tracking-wider text-muted-foreground mb-2">置换分布</div>
          <svg viewBox="0 0 200 60" className="w-full">
            {histBins.bins.map((c, i) => (
              <rect
                key={i}
                x={i * (200 / histMax)}
                y={60 - (c / Math.max(...histBins.bins)) * 50}
                width={200 / histMax - 1}
                height={(c / Math.max(...histBins.bins)) * 50}
                fill={i === histBins.obsIdx ? "hsl(var(--hh))" : "hsl(var(--primary) / 0.4)"}
              />
            ))}
            <line
              x1={histBins.obsIdx * (200 / histMax) + (200 / histMax) / 2}
              y1="0" x2={histBins.obsIdx * (200 / histMax) + (200 / histMax) / 2} y2="60"
              stroke="hsl(var(--hh))" strokeDasharray="2 2" strokeWidth="1"
            />
          </svg>
          <div className="text-[10px] text-muted-foreground mt-1">红色条为观察值，与零分布比较显著性</div>
        </Card>
      </div>

      {/* Map + Scatter */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5 shadow-panel border-border/60">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">LISA 聚类地图</div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">显著性 α</span>
              <span className="font-mono text-primary">{alpha.toFixed(2)}</span>
            </div>
          </div>
          <Slider min={0.01} max={0.10} step={0.01} value={[alpha]} onValueChange={(v) => setAlpha(v[0])} className="mb-3" />
          <HexCity
            values={values}
            size={460}
            selected={selected}
            onCellClick={handleCellClick}
            colorOf={(i) => quadrantColor(lisaThr[i])}
          />
          <div className="mt-3 grid grid-cols-5 gap-1 text-[10px]">
            {(["HH", "LL", "HL", "LH", "NS"] as Quadrant[]).map((q) => (
              <div key={q} className="flex items-center gap-1">
                <div className="h-2.5 w-2.5 rounded-sm" style={{ background: quadrantColor(q) }} />
                <span>{q} ({quadCounts[q] || 0})</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-panel border-border/60">
          <div className="text-sm font-semibold mb-3">Moran 散点图（联动）</div>
          <MoranScatter
            values={points}
            size={420}
            selected={selected}
            onPointClick={handleCellClick}
            colorOf={(i) => quadrantColor(lisaThr[i])}
          />
          <div className="mt-3 p-3 rounded-md bg-muted/40 text-sm">
            {selected !== null ? (
              <div>
                <div className="text-xs text-muted-foreground mb-1">选中区域 #{selected}</div>
                <div className="font-medium" style={{ color: quadrantColor(lisaThr[selected]) }}>
                  {QUAD_INFO[lisaThr[selected]].label}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{QUAD_INFO[lisaThr[selected]].desc}</div>
                <div className="text-xs text-muted-foreground mt-2 font-mono">
                  z = {lisaRes[selected].z.toFixed(2)} · Wz = {lisaRes[selected].lagZ.toFixed(2)} · p = {lisaRes[selected].pseudoP.toFixed(3)}
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground text-xs">点击地图或散点中的区域，查看其局部空间自相关性。</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
