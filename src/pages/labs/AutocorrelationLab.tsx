import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { GridCity } from "@/components/GridCity";
import { MoranScatter } from "@/components/MoranScatter";
import {
  buildNeighbors, generateClustered, lisa, moranPermutation,
  quadrantColor, rowStandardize, type Quadrant,
} from "@/lib/spatial";
import { Activity, Play } from "lucide-react";

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

  const values = useMemo(() => generateClustered(seed, 2), [seed]);
  const W = useMemo(() => rowStandardize(buildNeighbors({ rule: "queen" })), []);
  const perm = useMemo(() => moranPermutation(values, W, 199, 7), [values, W]);
  const lisaRes = useMemo(() => lisa(values, buildNeighbors({ rule: "queen" }), 99, 13), [values]);
  const lisaThr = useMemo(
    () => lisaRes.map((r) => (r.pseudoP <= alpha ? r.quadrant : "NS")) as Quadrant[],
    [lisaRes, alpha]
  );

  const points = lisaRes.map((r) => ({ x: r.z, y: r.lagZ }));

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
          <GridCity
            values={values}
            size={460}
            selected={selected}
            onCellClick={setSelected}
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
            onPointClick={setSelected}
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
