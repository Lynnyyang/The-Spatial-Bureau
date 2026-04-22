import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { GridCity } from "@/components/GridCity";
import { buildNeighbors, generateClustered, neighborsOf, type NeighborRule } from "@/lib/spatial";
import { Network, Info } from "lucide-react";

const RULES: { id: NeighborRule; label: string; desc: string }[] = [
  { id: "rook", label: "Rook 共边", desc: "上下左右四向邻接" },
  { id: "queen", label: "Queen 共边或共点", desc: "包含对角线（八向）" },
  { id: "knn", label: "K-近邻", desc: "最近的 k 个区域" },
  { id: "distance", label: "距离阈值", desc: "在阈值半径内的区域" },
];

export default function NeighborsLab() {
  const [rule, setRule] = useState<NeighborRule>("queen");
  const [k, setK] = useState(4);
  const [threshold, setThreshold] = useState(1.5);
  const [selected, setSelected] = useState<number | null>(27);

  const cfg = { rule, k, threshold };
  const W = useMemo(() => buildNeighbors(cfg), [rule, k, threshold]);
  const values = useMemo(() => generateClustered(31, 2), []);
  const neighbors = selected !== null ? neighborsOf(W, selected) : [];

  const totalNeighbors = W.reduce((acc, row) => acc + row.reduce((a, b) => a + (b > 0 ? 1 : 0), 0), 0);
  const avgNeighbors = (totalNeighbors / 64).toFixed(1);

  const edges: Array<[number, number]> = selected !== null
    ? neighbors.map((j) => [selected, j] as [number, number])
    : [];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <header>
        <Badge variant="secondary" className="mb-2">模块二</Badge>
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Network className="h-6 w-6 text-primary" /> 空间邻居判定中心</h1>
        <p className="text-sm text-muted-foreground mt-1">不同规则下"谁是邻居"完全不同。点击地图查看任意区域的邻居链路。</p>
      </header>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <Card className="p-6 shadow-panel border-border/60">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="text-sm">
              选中区域：<span className="font-semibold text-primary">{selected !== null ? `#${selected}` : "未选择"}</span>
              {selected !== null && <span className="text-muted-foreground ml-2">邻居数：{neighbors.length}</span>}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>清除选择</Button>
          </div>
          <GridCity
            values={values}
            size={560}
            selected={selected}
            highlight={neighbors}
            edges={edges}
            onCellClick={setSelected}
          />
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
                    rule === r.id ? "border-primary bg-primary-soft text-primary shadow-glow" : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="font-medium">{r.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{r.desc}</div>
                </button>
              ))}
            </div>
          </Card>

          {rule === "knn" && (
            <Card className="p-5 shadow-panel border-border/60">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">k 值</div>
                <div className="text-sm font-mono text-primary">{k}</div>
              </div>
              <Slider min={1} max={12} step={1} value={[k]} onValueChange={(v) => setK(v[0])} />
            </Card>
          )}

          {rule === "distance" && (
            <Card className="p-5 shadow-panel border-border/60">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">距离阈值</div>
                <div className="text-sm font-mono text-primary">{threshold.toFixed(1)}</div>
              </div>
              <Slider min={1} max={4} step={0.1} value={[threshold]} onValueChange={(v) => setThreshold(v[0])} />
              <div className="text-xs text-muted-foreground mt-2">
                {threshold < 1.2 ? "⚠️ 阈值过小：可能产生孤岛单元" : threshold > 3 ? "⚠️ 阈值过大：邻接关系过密" : "✓ 合理范围"}
              </div>
            </Card>
          )}

          <Card className="p-5 shadow-panel border-border/60">
            <div className="text-xs font-mono tracking-wider text-muted-foreground mb-2">实时统计</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">平均邻居数</div>
                <div className="text-xl font-bold font-mono">{avgNeighbors}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">连接总数</div>
                <div className="text-xl font-bold font-mono">{totalNeighbors}</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-primary-soft border-primary/20">
            <div className="flex gap-2 text-xs text-primary">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>真实研究中需根据问题选择规则：疫情扩散更适合 queen 邻接；房价分析常用 KNN；通勤分析需网络邻接。</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
