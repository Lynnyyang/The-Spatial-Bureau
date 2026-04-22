import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GridCity } from "@/components/GridCity";
import { MatrixView } from "@/components/MatrixView";
import { buildNeighbors, generateClustered, moranI, neighborsOf, rowStandardize, type NeighborRule } from "@/lib/spatial";
import { Grid3x3, Wand2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const RULES: { id: NeighborRule; label: string }[] = [
  { id: "rook", label: "Rook" }, { id: "queen", label: "Queen" },
  { id: "knn", label: "KNN-4" }, { id: "distance", label: "距离 1.5" },
];

export default function WeightsLab() {
  const [rule, setRule] = useState<NeighborRule>("queen");
  const [standardize, setStandardize] = useState(true);
  const [decay, setDecay] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);

  const values = useMemo(() => generateClustered(54, 2), []);
  const Wraw = useMemo(
    () => buildNeighbors({ rule, k: 4, threshold: 1.5 }),
    [rule]
  );
  const W = useMemo(() => {
    // apply distance decay if rule == distance
    let M = Wraw.map((row) => row.map((v) => v));
    if (rule === "distance" && decay !== 1) {
      M = M.map((row, i) =>
        row.map((v, j) => {
          if (v === 0) return 0;
          const d = Math.hypot(Math.floor(i / 8) - Math.floor(j / 8), (i % 8) - (j % 8));
          return Math.pow(1 / d, decay);
        })
      );
    }
    return standardize ? rowStandardize(M) : M;
  }, [Wraw, standardize, decay, rule]);

  const I = useMemo(() => moranI(values, W), [values, W]);
  const neighbors = selected !== null ? neighborsOf(W, selected) : [];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <header>
        <Badge variant="secondary" className="mb-2">模块三</Badge>
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Grid3x3 className="h-6 w-6 text-primary" /> 空间权重矩阵工坊</h1>
        <p className="text-sm text-muted-foreground mt-1">点击地图区域，矩阵中对应行高亮；调整规则与参数，观察 Moran's I 如何变化。</p>
      </header>

      <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
        <Card className="p-5 shadow-panel border-border/60">
          <div className="text-xs font-mono tracking-wider text-muted-foreground mb-2">城市地图（点击查看邻居）</div>
          <GridCity
            values={values}
            size={500}
            selected={selected}
            highlight={neighbors}
            edges={selected !== null ? neighbors.map((j) => [selected, j] as [number, number]) : []}
            onCellClick={setSelected}
          />
        </Card>
        <Card className="p-5 shadow-panel border-border/60">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-mono tracking-wider text-muted-foreground">空间权重矩阵 W (64×64)</div>
            <Badge variant="outline" className="text-[10px] font-mono">{standardize ? "行标准化" : "二元"}</Badge>
          </div>
          <MatrixView W={W} size={500} rowHighlight={selected ?? undefined} />
        </Card>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <Card className="p-5 shadow-panel border-border/60">
          <div className="text-xs font-mono tracking-wider text-muted-foreground mb-3">权重构造规则</div>
          <div className="grid grid-cols-4 gap-2 mb-5">
            {RULES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRule(r.id)}
                className={`rounded-md border py-2 text-sm transition-all ${
                  rule === r.id ? "border-primary bg-primary-soft text-primary shadow-glow" : "border-border hover:border-primary/50"
                }`}
              >{r.label}</button>
            ))}
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="rs">行标准化</Label>
              <Switch id="rs" checked={standardize} onCheckedChange={setStandardize} />
            </div>
            {rule === "distance" && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>距离衰减幂 α</Label>
                  <span className="font-mono text-primary text-sm">{decay.toFixed(1)}</span>
                </div>
                <Slider min={0} max={3} step={0.1} value={[decay]} onValueChange={(v) => setDecay(v[0])} />
                <div className="text-xs text-muted-foreground mt-1">w_ij = 1 / d_ij^α，α=0 即二元邻接。</div>
              </div>
            )}
          </div>
        </Card>
        <Card className="p-5 shadow-panel border-border/60 bg-gradient-to-br from-primary-soft/50 to-card">
          <div className="text-xs font-mono tracking-wider text-muted-foreground mb-2">该矩阵下的全局指标</div>
          <div className="text-4xl font-bold font-mono text-primary mb-1">{I.toFixed(3)}</div>
          <div className="text-sm text-muted-foreground mb-4">Moran's I（基于当前 W）</div>
          <Button className="w-full" variant="outline" onClick={() => { setRule("queen"); setStandardize(true); setSelected(null); setDecay(1); }}>
            <Wand2 className="h-3.5 w-3.5 mr-1" /> 重置默认配置
          </Button>
          <div className="mt-4 text-xs text-muted-foreground leading-relaxed">
            💡 同一份数据，矩阵设定不同，Moran's I 可能截然不同——这正是"方法选择影响现实决策"的核心。
          </div>
        </Card>
      </div>
    </div>
  );
}
