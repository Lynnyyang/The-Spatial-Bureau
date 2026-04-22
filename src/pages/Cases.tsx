import { Link } from "react-router-dom";
import { CASE_META, useAppStore, type CaseId } from "@/store/app";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GridCity } from "@/components/GridCity";
import { generateClustered } from "@/lib/spatial";

export default function Cases() {
  const cases = useAppStore((s) => s.cases);
  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">案件档案馆</h1>
        <p className="text-sm text-muted-foreground mt-1">每一起案件对应一个核心知识模块。按顺序破解，或选择感兴趣的案件先行调查。</p>
      </header>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {(Object.entries(CASE_META) as Array<[CaseId, typeof CASE_META[CaseId]]>).map(([id, meta], idx) => {
          const c = cases[id];
          const seed = 5 + idx * 7;
          return (
            <Card key={id} className="overflow-hidden border-border/60 shadow-panel/50 hover:shadow-panel transition-all group">
              <div className="aspect-[16/10] bg-muted/40 flex items-center justify-center p-3 border-b border-border/60">
                <GridCity values={generateClustered(seed, 1 + (idx % 3))} size={300} />
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" style={{ color: meta.color }}>{meta.tag}</Badge>
                  {c.completed ? (
                    <Badge className="bg-success text-success-foreground hover:bg-success">{c.score} 分</Badge>
                  ) : c.started ? (
                    <Badge variant="outline">进行中</Badge>
                  ) : (
                    <Badge variant="outline">待接案</Badge>
                  )}
                </div>
                <div className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">案件 {idx + 1} · {meta.title}</div>
                <div className="text-sm text-muted-foreground mb-4 min-h-[40px]">{meta.subtitle}</div>
                <Button asChild className="w-full" size="sm">
                  <Link to={`/case/${id}`}>{c.completed ? "重审案件" : c.started ? "继续调查" : "接受任务"}</Link>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
