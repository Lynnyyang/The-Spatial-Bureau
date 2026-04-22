import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/app";
import { Award, Lock } from "lucide-react";

const ALL_BADGES = [
  { id: "first", name: "首次出动", desc: "完成首个案件", icon: "🎯" },
  { id: "neighbors", name: "邻居识别专家", desc: "正确判断 5 次邻居规则", icon: "🔗" },
  { id: "weights", name: "权重矩阵工程师", desc: "修复 3 个错误矩阵", icon: "🧮" },
  { id: "moran", name: "Moran 检验分析师", desc: "通过显著性挑战", icon: "📊" },
  { id: "lisa", name: "LISA 热点捕手", desc: "锁定全部 HH 区域", icon: "🔥" },
  { id: "city", name: "城市空间推理大师", desc: "完成全部主线", icon: "🏙️" },
];

export default function Achievements() {
  const { badges, cases } = useAppStore();
  const completed = (Object.values(cases) as Array<{ completed: boolean }>).filter((c) => c.completed).length;
  const has = (id: string) => badges.includes(id) || (id === "first" && completed >= 1) || (id === "city" && completed >= 6);

  return (
    <div className="max-w-[1100px] mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Award className="h-6 w-6 text-primary" /> 成就与徽章</h1>
        <p className="text-sm text-muted-foreground mt-1">完成挑战、解锁徽章，构建你的空间分析画像。</p>
      </header>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ALL_BADGES.map((b) => {
          const got = has(b.id);
          return (
            <Card key={b.id} className={`p-5 border-border/60 ${got ? "shadow-panel" : "opacity-60"}`}>
              <div className="flex items-start justify-between">
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center text-2xl ${got ? "bg-primary-soft" : "bg-muted"}`}>
                  {got ? b.icon : <Lock className="h-5 w-5 text-muted-foreground" />}
                </div>
                <Badge variant={got ? "default" : "outline"}>{got ? "已解锁" : "未解锁"}</Badge>
              </div>
              <div className="font-semibold mt-3">{b.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{b.desc}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
