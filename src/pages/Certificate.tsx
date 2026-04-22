import { useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAppStore, CASE_META } from "@/store/app";
import { GraduationCap, Download, Sparkles } from "lucide-react";
import { toast } from "sonner";

const LEVEL_LABEL: Record<string, { name: string; color: string }> = {
  none: { name: "未颁发", color: "hsl(var(--muted-foreground))" },
  bronze: { name: "铜级", color: "hsl(28 60% 45%)" },
  silver: { name: "银级", color: "hsl(215 18% 60%)" },
  gold: { name: "金级", color: "hsl(45 90% 50%)" },
  honor: { name: "荣誉级", color: "hsl(280 65% 50%)" },
};

export default function Certificate() {
  const { userName, setName, certificateLevel, cases, badges, xp } = useAppStore();
  const ref = useRef<HTMLDivElement>(null);
  const lvl = LEVEL_LABEL[certificateLevel];
  const completed = (Object.values(cases) as Array<{ completed: boolean; score: number }>).filter((c) => c.completed);
  const avg = completed.length ? Math.round(completed.reduce((a, c) => a + c.score, 0) / completed.length) : 0;
  const certNo = `SD-${String(Date.now()).slice(-8)}`;

  const handlePrint = () => {
    if (certificateLevel === "none") {
      toast.error("请先完成至少一个案件以解锁证书");
      return;
    }
    window.print();
  };

  return (
    <div className="max-w-[1100px] mx-auto space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><GraduationCap className="h-6 w-6 text-primary" /> 证书中心</h1>
          <p className="text-sm text-muted-foreground mt-1">完成主线案件并达到分数门槛即可解锁数字结业证书。</p>
        </div>
        <Button onClick={handlePrint} disabled={certificateLevel === "none"}>
          <Download className="h-4 w-4 mr-1" /> 下载 / 打印证书
        </Button>
      </header>

      <Card className="p-5 print:hidden border-border/60">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium whitespace-nowrap">证书署名</label>
          <Input value={userName} onChange={(e) => setName(e.target.value)} className="max-w-xs" />
          <Badge style={{ background: lvl.color, color: "white" }}>{lvl.name}</Badge>
        </div>
      </Card>

      {/* Certificate */}
      <div ref={ref} className="bg-card rounded-lg border-2 p-10 sm:p-14 shadow-panel relative overflow-hidden" style={{ borderColor: lvl.color }}>
        <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
        <div className="relative">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <div className="text-xs font-mono tracking-[0.3em] text-muted-foreground">SPATIAL DETECTIVE · 空间探案局</div>
              <div className="text-sm text-muted-foreground mt-1">SPATIAL ANALYSIS COMPETENCY CERTIFICATE</div>
            </div>
            <div className="h-14 w-14 rounded-full bg-gradient-hero flex items-center justify-center shadow-glow">
              <GraduationCap className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>

          <div className="mt-12 sm:mt-16 text-center">
            <div className="text-sm text-muted-foreground mb-2">兹证明</div>
            <div className="text-4xl sm:text-5xl font-bold tracking-tight" style={{ color: lvl.color }}>{userName}</div>
            <div className="text-sm text-muted-foreground mt-4 max-w-lg mx-auto leading-relaxed">
              已完成"空间探案局"全部空间统计核心训练，掌握空间依赖性、空间邻居关系、空间权重矩阵以及全局/局部空间自相关检验等核心能力。
            </div>
            <Badge className="mt-6 text-base px-4 py-1.5" style={{ background: lvl.color, color: "white" }}>
              <Sparkles className="h-4 w-4 mr-1" /> {lvl.name}证书
            </Badge>
          </div>

          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div><div className="text-2xl font-bold font-mono text-primary">{completed.length}/6</div><div className="text-xs text-muted-foreground mt-1">完成案件</div></div>
            <div><div className="text-2xl font-bold font-mono text-primary">{avg}</div><div className="text-xs text-muted-foreground mt-1">平均得分</div></div>
            <div><div className="text-2xl font-bold font-mono text-primary">{xp}</div><div className="text-xs text-muted-foreground mt-1">经验值</div></div>
            <div><div className="text-2xl font-bold font-mono text-primary">{badges.length}</div><div className="text-xs text-muted-foreground mt-1">徽章</div></div>
          </div>

          <div className="mt-10 flex items-end justify-between flex-wrap gap-4 text-xs">
            <div>
              <div className="text-muted-foreground">证书编号</div>
              <div className="font-mono font-semibold">{certNo}</div>
            </div>
            <div className="text-center">
              <div className="border-b border-foreground/30 pb-1 px-6 italic text-base">Spatial Detective</div>
              <div className="text-muted-foreground mt-1">发证机构</div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground">颁发日期</div>
              <div className="font-mono font-semibold">{new Date().toLocaleDateString("zh-CN")}</div>
            </div>
          </div>

          {/* mock badges */}
          {badges.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2 justify-center">
              {badges.slice(0, 8).map((b, i) => <Badge key={i} variant="secondary">{b}</Badge>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
