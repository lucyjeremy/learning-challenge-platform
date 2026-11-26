import type { Metadata } from "next";
import { Leaderboard } from "@/components/Leaderboard";
import { currentUserId } from "@/server/actions";
import { leaderboardFor } from "@/server/store";

export const metadata: Metadata = { title: "리더보드" };

export default async function LeaderboardPage({ params }: PageProps<"/c/[id]/leaderboard">) {
  const { id } = await params;
  return <Leaderboard data={leaderboardFor(id, await currentUserId())} />;
}
