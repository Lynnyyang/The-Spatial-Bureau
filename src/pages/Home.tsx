import { Link } from "react-router-dom";
import { useAppStore, CASE_META, type CaseId } from "@/store/app";
import { GridCity } from "@/components/GridCity";
import { generateClustered } from "@/lib/spatial";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, ShieldAlert, Compass, Network, Grid3x3,
  Activity, GraduationCap, Radar, AlertTriangle,
} from "lucide-react";

const previewValues = generateClustered(11, 2);

const moduleCards = [
  { to: "/lab/dependency", icon: Compass, title: "依赖性实验室", desc: "感知空间非随机分布", color: "hsl(var(--hl))" },
  { to: "/lab/neighbors", icon: Network, title: "邻居中心", desc: "rook/queen/距离/KNN", color: "hsl(var(--hh))" },
  { to: "/lab/weights", icon: Grid3x3, title: "权重矩阵工坊", desc: "构建并修复 W 矩阵", color: "hsl(var(--primary))" },
  { to: "/lab/autocorrelation", icon: Activity, title: "自相关作战室", desc: "Moran's I & LISA", color: "hsl(var(--lh))" },
];

export default function Home() {
  const { cases, certificateLevel, badges, xp } = useAppStore();
  const completed = (Object.values(cases) as Array<{ completed: boolean }>).filter((c) => c.completed).length;
  const total = Object.keys(cases).length;
  const progress = (completed / total) * 100;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* HERO */}
      <Card className="overflow-hidden border-0 shadow-panel">
        <div className="grid md:grid-cols-[1.1fr_1fr] gap-0">
          <div className="p-6 sm:p-8 lg:p-10 bg-gradient-hero text-primary-foreground relative">
            <div className="absolute inset-0 grid-bg opacity-10" />
            <div className="relative">
              <Badge className="bg-white/15 text-white border-white/20 hover:bg-white/20 mb-4">
                <ShieldAlert className="h-3 w-3 mr-1" /> 新域市 · 空间预警系统 v2.4
              </Badge>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 text-balance">
                空间探案局
                <span className="block text-base sm:text-lg font-normal opacity-90 mt-2 tracking-wide">
                  Spatial Detective · 沉浸式空间统计学习
                </span>
              </h1>
              <p className="text-sm sm:text-base opacity-90 max-w-md mb-6 text-balance">
                作为空间调查员，你将通过五大案件破解城市异常，掌握空间依赖、邻居关系、权重矩阵与自相关检验。
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" variant="secondary" className="shadow-lg">
                  <Link to="/cases">进入空间探案局 <ArrowRight className="ml-1 h-4 w-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="bg-white/10 text-white border-white/30 hover:bg-white/20 hover:text-white">
                  <Link to="/training">前往训练营</Link>
                </Button>
              </div>
              <div className="mt-8 grid grid-cols-3 gap-4 max-w-sm">
                <Stat label="已完成" value={`${completed}/${total}`} />
                <Stat label="经验值" value={xp.toString()} />
                <Stat label="徽章" value={badges.length.toString()} />
              </div>
            </div>
          </div>
          <div className="p-6 bg-card flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-mono tracking-wider text-muted-foreground">实时态势 · LIVE FEED</div>
              <Badge variant="outline" className="text-[10px] border-warning/40 text-warning-foreground">
                <AlertTriangle className="h-3 w-3 mr-1 text-warning" /> 3 起异常
              </Badge>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <GridCity values={previewValues} size={420} />
            </div>
            <div className="mt-3 grid grid-cols-5 gap-1 text-[10px] text-muted-foreground">
              {[0, 25, 50, 75, 100].map((v) => (
                <div key={v} className="flex items-center gap-1">
                  <div className="h-2 w-full rounded-sm" style={{ background: `hsl(${[210, 210, 212, 212, 218][v / 25]} ${[60, 70, 78, 85, 88][v / 25]}% ${[96, 82, 62, 45, 28][v / 25]}%)` }} />
                  {v}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* progress + certificate */}
      <Card className="p-5 shadow-panel border-border/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium mb-1">主线进度</div>
            <div className="text-xs text-muted-foreground">完成全部案件可解锁数字证书</div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="capitalize">
              <GraduationCap className="h-3 w-3 mr-1" /> {certificateLevel === "none" ? "未颁发" : certificateLevel}
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link to="/certificate">查看证书</Link>
            </Button>
          </div>
        </div>
        <Progress value={progress} className="mt-4 h-2" />
      </Card>

      {/* Modules */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <h2 className="text-xl font-semibold">核心实验室</h2>
          <Link to="/cases" className="text-xs text-primary hover:underline">查看全部案件 →</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {moduleCards.map((m) => (
            <Link key={m.to} to={m.to} className="group">
              <Card className="p-5 h-full hover:shadow-panel transition-all hover:-translate-y-0.5 border-border/60">
                <div className="h-9 w-9 rounded-md flex items-center justify-center mb-3" style={{ background: `${m.color.replace("hsl", "hsla").replace(")", " / 0.12)")}` }}>
                  <m.icon className="h-4 w-4" style={{ color: m.color }} />
                </div>
                <div className="font-medium mb-1">{m.title}</div>
                <div className="text-xs text-muted-foreground">{m.desc}</div>
                <div className="mt-3 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  进入 →
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Cases preview */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <h2 className="text-xl font-semibold">主线案件</h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Radar className="h-3 w-3" /> 6 起待破解
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(Object.entries(CASE_META) as Array<[CaseId, typeof CASE_META[CaseId]]>).map(([id, meta]) => {
            const c = cases[id];
            return (
              <Link key={id} to={`/case/${id}`}>
                <Card className="p-5 h-full hover:shadow-panel transition-all border-border/60 group">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" style={{ color: meta.color }}>{meta.tag}</Badge>
                    {c.completed ? (
                      <Badge className="bg-success text-success-foreground hover:bg-success">已结案 · {c.score}</Badge>
                    ) : c.started ? (
                      <Badge variant="outline" className="border-warning/40">进行中</Badge>
                    ) : (
                      <Badge variant="outline">待接案</Badge>
                    )}
                  </div>
                  <div className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">{meta.title}</div>
                  <div className="text-sm text-muted-foreground">{meta.subtitle}</div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs opacity-75">{label}</div>
      <div className="text-lg font-semibold font-mono">{value}</div>
    </div>
  );
}
