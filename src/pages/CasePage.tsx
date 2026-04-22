import { useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { CASE_META, useAppStore, type CaseId } from "@/store/app";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GridCity } from "@/components/GridCity";
import {
  buildNeighbors, generateClustered, lisa, moranPermutation,
  quadrantColor, rowStandardize, type NeighborRule, type Quadrant,
} from "@/lib/spatial";
import { ArrowLeft, ArrowRight, CheckCircle2, FileSearch, Sparkles } from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  "接收任务", "初步观察", "定义邻居", "构建权重", "执行检验", "解释结果", "提交报告",
];

const CASE_SEEDS: Record<CaseId, number> = { heat: 11, epidemic: 23, housing: 54, crime: 71, traffic: 88, final: 99 };

export default function CasePage() {
  const { id } = useParams<{ id: CaseId }>();
  const navigate = useNavigate();
  const caseId = (id || "heat") as CaseId;
  const meta = CASE_META[caseId];

  const { startCase, completeCase, awardXp } = useAppStore();
  const [step, setStep] = useState(0);
  const [rule, setRule] = useState<NeighborRule>("queen");
  const [hypothesis, setHypothesis] = useState<"yes" | "no" | null>(null);

  const values = useMemo(() => generateClustered(CASE_SEEDS[caseId], 2), [caseId]);
  const Wraw = useMemo(() => buildNeighbors({ rule, k: 4, threshold: 1.5 }), [rule]);
  const W = useMemo(() => rowStandardize(Wraw), [Wraw]);
  const perm = useMemo(() => moranPermutation(values, W, 99, 17), [values, W]);
  const lisaRes = useMemo(() => lisa(values, Wraw, 99, 19), [values, Wraw]);

  const ensureStarted = () => { if (step === 0) startCase(caseId); };

  const next = () => { ensureStarted(); setStep((s) => Math.min(STEPS.length - 1, s + 1)); };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = () => {
    let score = 60;
    if (perm.pseudoP <= 0.05) score += 15;
    if (rule === "queen") score += 10;
    if (hypothesis === "yes" && perm.I > 0) score += 15;
    if (hypothesis === "no" && perm.I <= 0) score += 15;
    score = Math.min(100, score);
    completeCase(caseId, score, [`${meta.tag} 专家`]);
    awardXp(20);
    toast.success(`案件结案！得分 ${score}`);
    navigate("/cases");
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/cases" className="text-muted-foreground hover:text-primary inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> 案件档案
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">{meta.title}</span>
      </div>

      <Card className="p-6 bg-gradient-hero text-primary-foreground shadow-panel border-0 overflow-hidden relative">
        <div className="absolute inset-0 grid-bg opacity-10" />
        <div className="relative">
          <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 mb-3">{meta.tag}</Badge>
          <h1 className="text-3xl font-bold mb-1">{meta.title}</h1>
          <p className="opacity-90 text-sm">{meta.subtitle}</p>
        </div>
      </Card>

      {/* Stepper */}
      <Card className="p-4 shadow-panel border-border/60">
        <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5 mb-3" />
        <div className="grid grid-cols-7 gap-1 text-[10px] sm:text-xs">
          {STEPS.map((s, i) => (
            <div key={s} className={`text-center py-1 px-1 rounded ${i === step ? "bg-primary text-primary-foreground font-medium" : i < step ? "text-success" : "text-muted-foreground"}`}>
              {i < step ? "✓ " : ""}{s}
            </div>
          ))}
        </div>
      </Card>

      {/* Step body */}
      <Card className="p-6 shadow-panel border-border/60 min-h-[400px]">
        {step === 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">📡 任务简报</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              新域市{meta.title}事件已上报至空间探案局。你需要应用空间统计方法，判断该现象是否真实存在空间集聚，定位关键区域，并提出政策建议。
            </p>
            <div className="mt-4 p-3 rounded-md bg-primary-soft text-sm text-primary">
              💡 接下来你将依次经历：观察 → 定义邻居 → 构建权重 → 检验 → 解释 → 提交报告。
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">🔍 初步观察</h2>
            <GridCity values={values} size={460} />
            <div className="space-y-2">
              <p className="text-sm font-medium">你的初步假设：该指标是否存在空间依赖？</p>
              <div className="flex gap-2">
                <Button variant={hypothesis === "yes" ? "default" : "outline"} onClick={() => setHypothesis("yes")}>是，存在聚集</Button>
                <Button variant={hypothesis === "no" ? "default" : "outline"} onClick={() => setHypothesis("no")}>否，分布随机</Button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">🔗 定义空间邻居</h2>
            <p className="text-sm text-muted-foreground">不同邻居规则会改变后续结论。</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["rook", "queen", "knn", "distance"] as NeighborRule[]).map((r) => (
                <button key={r} onClick={() => setRule(r)} className={`rounded-md border py-2.5 text-sm transition-all ${rule === r ? "border-primary bg-primary-soft text-primary shadow-glow" : "border-border hover:border-primary/50"}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">🧮 构建权重矩阵</h2>
            <p className="text-sm text-muted-foreground">基于 {rule} 规则自动构建 64×64 行标准化矩阵 W。</p>
            <Card className="p-4 bg-muted/40">
              <div className="text-xs font-mono">规则: {rule} · 平均邻居 {(Wraw.flat().filter((v) => v > 0).length / 64).toFixed(1)} · 行标准化: 是</div>
            </Card>
            <p className="text-sm">前往 <Link to="/lab/weights" className="text-primary hover:underline">权重矩阵工坊</Link> 进行更精细的可视化操作。</p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">🧪 执行 Moran's I 检验</h2>
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-4"><div className="text-xs text-muted-foreground">Moran's I</div><div className="text-2xl font-bold font-mono text-primary">{perm.I.toFixed(3)}</div></Card>
              <Card className="p-4"><div className="text-xs text-muted-foreground">期望值</div><div className="text-2xl font-bold font-mono">{perm.expectedI.toFixed(3)}</div></Card>
              <Card className="p-4"><div className="text-xs text-muted-foreground">p 值</div><div className={`text-2xl font-bold font-mono ${perm.pseudoP <= 0.05 ? "text-success" : "text-warning-foreground"}`}>{perm.pseudoP.toFixed(3)}</div></Card>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">🗺️ 局部异常解释 (LISA)</h2>
            <GridCity values={values} size={420} colorOf={(i) => quadrantColor(lisaRes[i].pseudoP <= 0.05 ? lisaRes[i].quadrant : ("NS" as Quadrant))} />
            <div className="grid grid-cols-5 gap-1 text-[10px]">
              {(["HH", "LL", "HL", "LH", "NS"] as Quadrant[]).map((q) => (
                <div key={q} className="flex items-center gap-1">
                  <div className="h-2.5 w-2.5 rounded-sm" style={{ background: quadrantColor(q) }} /> {q}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2"><FileSearch className="h-5 w-5" /> 提交结案报告</h2>
            <Card className="p-4 bg-muted/40">
              <ul className="text-sm space-y-1.5">
                <li>· 邻接规则：<span className="font-mono">{rule}</span></li>
                <li>· 全局 Moran's I：<span className="font-mono">{perm.I.toFixed(3)}</span> (p = {perm.pseudoP.toFixed(3)})</li>
                <li>· 显著性：<span className={perm.pseudoP <= 0.05 ? "text-success" : "text-warning-foreground"}>{perm.pseudoP <= 0.05 ? "显著" : "不显著"}</span></li>
                <li>· 你的假设：{hypothesis === "yes" ? "存在聚集" : hypothesis === "no" ? "随机" : "未填写"}</li>
              </ul>
            </Card>
            <Button onClick={finish} size="lg" className="w-full"><CheckCircle2 className="h-4 w-4 mr-1" /> 提交报告并获得评级</Button>
          </div>
        )}
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={back} disabled={step === 0}><ArrowLeft className="h-4 w-4 mr-1" /> 上一步</Button>
        {step < STEPS.length - 1 && (
          <Button onClick={next}>
            下一步 <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
