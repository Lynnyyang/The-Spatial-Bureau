import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Compass, Network, Grid3x3, Activity, ArrowRight } from "lucide-react";

const drills = [
  { to: "/lab/dependency", icon: Compass, title: "空间感知速训", desc: "5 分钟掌握随机 vs 聚集", level: "入门" },
  { to: "/lab/neighbors", icon: Network, title: "邻居规则对比", desc: "rook/queen/KNN/距离 同图对比", level: "入门" },
  { to: "/lab/weights", icon: Grid3x3, title: "权重矩阵工坊", desc: "构建 W 并观察 I 变化", level: "进阶" },
  { to: "/lab/autocorrelation", icon: Activity, title: "Moran's I 与 LISA", desc: "全局检验 + 局部聚类", level: "进阶" },
];

export default function Training() {
  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">训练营</h1>
        <p className="text-sm text-muted-foreground mt-1">无剧情压力的纯练习模式，巩固任意单一知识点。</p>
      </header>
      <div className="grid sm:grid-cols-2 gap-4">
        {drills.map((d) => (
          <Card key={d.to} className="p-6 hover:shadow-panel transition-all border-border/60 group">
            <div className="flex items-start justify-between mb-3">
              <div className="h-10 w-10 rounded-md bg-primary-soft flex items-center justify-center">
                <d.icon className="h-5 w-5 text-primary" />
              </div>
              <Badge variant="outline">{d.level}</Badge>
            </div>
            <div className="font-semibold mb-1">{d.title}</div>
            <div className="text-sm text-muted-foreground mb-4">{d.desc}</div>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to={d.to}>开始训练 <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
