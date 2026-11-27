import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Leaderboard } from "@/components/Leaderboard";
import { currentUserId } from "@/server/actions";
import { isInstructorOf, isMemberOf, leaderboardFor } from "@/server/store";

export const metadata: Metadata = { title: "리더보드" };

export default async function LeaderboardPage({ params }: PageProps<"/c/[id]/leaderboard">) {
  const { id } = await params;
  const uid = await currentUserId();
  // 레이아웃 검사만으로는 이 페이지 데이터가 응답에 실리는 걸 막지 못해서, 읽기 전에 다시 확인해요
  if (!isMemberOf(uid, id) && !isInstructorOf(uid, id)) redirect(`/c/${id}`);
  return <Leaderboard data={leaderboardFor(id, uid)} />;
}
