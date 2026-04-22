import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GridCity } from "@/components/GridCity";
import { generateClustered, generateRandom, shuffleValues, buildNeighbors, moranI } from "@/lib/spatial";
import { useAppStore } from "@/store/app";
import { CheckCircle2, XCircle, Shuffle, Sparkles, Waves } from "lucide-react";
import { toast } from "sonner";

export default function DependencyLab() {
  const award = useAppStore((s) => s.awardXp);

  // Challenge 1: pick the spatially dependent map
  const [seed, setSeed] = useState(7);
  const maps = useMemo(() => {
    const clustered = generateClustered(seed, 2);
    return [
      { id: 0, label: "样本 A", values: shuffleValues(clustered, seed + 1), kind: "random" as const },
      { id: 1, label: "样本 B", values: clustered, kind: "clustered" as const },
      { id: 2, label: "样本 C", values: generateRandom(seed + 2), kind: "random" as const },
    ].sort(() => 0.5 - ((seed * 31) % 7) / 7); // shuffle order pseudo-stably
  }, [seed]);

  const [chosen, setChosen] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const W = useMemo(() => buildNeighbors({ rule: "queen" }), []);
  const morans = useMemo(() => maps.map((m) => moranI(m.values, W)), [maps, W]);

  const choose = (id: number) => {
    if (revealed) return;
    setChosen(id);
    setRevealed(true);
    const idx = maps.findIndex((m) => m.id === id);
    const correct = maps[idx].kind === "clustered";
    if (correct) {
      award(20);
      toast.success("正确！该地图存在显著空间依赖性。Moran's I = " + morans[idx].toFixed(3));
    } else {
      toast.error("再想想：随机分布的 Moran's I 应接近 0。");
    }
  };

  const next = () => {
    setSeed((s) => s + 1);
    setChosen(null);
    setRevealed(false);
  };

  // Challenge 2: ripple click
  const [rippleVals, setRippleVals] = useState(() => generateClustered(99, 1));
  const ripple = (i: number) => {
    setRippleVals((vals) => {
      const out = [...vals];
      const r = Math.floor(i / 8), c = i % 8;
      out[i] = Math.min(100, out[i] + 25);
      for (let k = 0; k < 64; k++) {
        const rr = Math.floor(k / 8), cc = k % 8;
        const d = Math.hypot(rr - r, cc - c);
        if (d > 0 && d <= 2) out[k] = Math.min(100, out[k] + Math.round(15 / d));
      }
      return out;
    });
  };
  const rippleI = useMemo(() => moranI(rippleVals, W), [rippleVals, W]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Badge variant="secondary" className="mb-2">模块一</Badge>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Waves className="h-6 w-6 text-primary" /> 空间依赖性感知实验室</h1>
          <p className="text-sm text-muted-foreground mt-1">从感性认识开始：相邻区域为何不应被视为独立？</p>
        </div>
      </header>

      {/* Challenge 1 */}
      <Card className="p-6 shadow-panel border-border/60">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs text-muted-foreground font-mono tracking-wider mb-1">挑战 1 / 2</div>
            <h2 className="text-lg font-semibold">找出最可能存在空间依赖的地图</h2>
          </div>
          <Button variant="outline" size="sm" onClick={next}><Shuffle className="h-3.5 w-3.5 mr-1" />换一组</Button>
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
                    ? isCorrect ? "border-success bg-success/5" : isChosen ? "border-destructive bg-destructive/5" : "border-border opacity-60"
                    : "border-border hover:border-primary"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{m.label}</span>
                  {revealed && (isCorrect
                    ? <CheckCircle2 className="h-4 w-4 text-success" />
                    : isChosen ? <XCircle className="h-4 w-4 text-destructive" /> : null)}
                </div>
                <GridCity values={m.values} size={260} />
                {revealed && (
                  <div className="mt-2 text-xs text-muted-foreground font-mono">
                    Moran's I = <span className="text-foreground font-semibold">{morans[idx].toFixed(3)}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {revealed && (
          <div className="mt-4 p-3 rounded-md bg-primary-soft text-sm text-primary">
            <Sparkles className="h-4 w-4 inline mr-1" />
            正确答案是 Moran's I 最高的样本。随机分布的 Moran's I 接近期望值 −1/(n−1) ≈ −0.016。
          </div>
        )}
      </Card>

      {/* Challenge 2 */}
      <Card className="p-6 shadow-panel border-border/60">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="text-xs text-muted-foreground font-mono tracking-wider mb-1">挑战 2 / 2</div>
            <h2 className="text-lg font-semibold">空间影响波纹</h2>
            <p className="text-xs text-muted-foreground mt-1">点击任意区域，观察相邻单元如何被影响。</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">实时 Moran's I</div>
            <div className="text-2xl font-bold font-mono text-primary">{rippleI.toFixed(3)}</div>
          </div>
        </div>
        <div className="grid md:grid-cols-[1fr_280px] gap-6 items-start">
          <GridCity values={rippleVals} size={460} onCellClick={ripple} />
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              空间依赖意味着：一个区域的变化会波及邻近区域。每点击一次，观察 Moran's I 是否上升。
            </p>
            <Button variant="outline" size="sm" onClick={() => setRippleVals(generateClustered(Math.random() * 100, 1))}>
              重置波纹场
            </Button>
            <div className="rounded-md border border-border p-3 text-xs leading-relaxed text-muted-foreground">
              💡 当 I &gt; 0 时表示正空间自相关（聚集）；I &lt; 0 表示负相关（棋盘分布）；I ≈ 0 接近随机。
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
