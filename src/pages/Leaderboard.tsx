import { Card } from "@/components/ui/card";
import { useAppStore } from "@/store/app";
import { Trophy, Medal } from "lucide-react";

const FAKE = [
  { name: "城北分析师", xp: 1240 },
  { name: "热力捕手", xp: 980 },
  { name: "邻接侦探", xp: 870 },
  { name: "Moran 信徒", xp: 620 },
  { name: "新人调查员", xp: 410 },
];

export default function Leaderboard() {
  const { xp, userName } = useAppStore();
  const all = [...FAKE, { name: userName, xp }].sort((a, b) => b.xp - a.xp);
  return (
    <div className="max-w-[800px] mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Trophy className="h-6 w-6 text-warning" /> 排行榜</h1>
        <p className="text-sm text-muted-foreground mt-1">本周空间调查员经验值排行</p>
      </header>
      <Card className="divide-y divide-border shadow-panel border-border/60">
        {all.map((u, i) => {
          const isMe = u.name === userName;
          return (
            <div key={i} className={`flex items-center justify-between p-4 ${isMe ? "bg-primary-soft" : ""}`}>
              <div className="flex items-center gap-4">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold font-mono text-sm ${
                  i === 0 ? "bg-warning text-warning-foreground" :
                  i === 1 ? "bg-muted text-foreground" :
                  i === 2 ? "bg-orange-100 text-orange-700" : "bg-muted/50 text-muted-foreground"
                }`}>
                  {i < 3 ? <Medal className="h-4 w-4" /> : i + 1}
                </div>
                <div>
                  <div className="font-medium">{u.name}{isMe && <span className="ml-2 text-xs text-primary">（你）</span>}</div>
                </div>
              </div>
              <div className="font-mono font-bold">{u.xp} XP</div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
