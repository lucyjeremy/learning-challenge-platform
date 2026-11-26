import type { Metadata } from "next";
import { Leaderboard } from "@/components/Leaderboard";
import { leaderboard } from "@/lib/data";

export const metadata: Metadata = { title: "리더보드" };

export default function LeaderboardPage() {
  return <Leaderboard data={leaderboard} />;
}
