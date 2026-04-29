import { Badge } from "@/components/ui/badge";

interface ScoreBadgeProps {
  score: number;
  percentage?: boolean;
}

export function ScoreBadge({ score, percentage = false }: ScoreBadgeProps) {
  const displayScore = percentage ? `${Math.round(score)}%` : Math.round(score);
  
  if (score >= 80) {
    return <Badge className="bg-green-500 hover:bg-green-600 text-white">{displayScore}</Badge>;
  } else if (score >= 60) {
    return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">{displayScore}</Badge>;
  } else {
    return <Badge className="bg-red-500 hover:bg-red-600 text-white">{displayScore}</Badge>;
  }
}
