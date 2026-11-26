import type { Metadata } from "next";
import { Feed } from "@/components/Feed";
import { posts as seedPosts, type Post } from "@/lib/data";
import { currentUserId } from "@/server/actions";
import { getUser, postsOf } from "@/server/store";

export const metadata: Metadata = { title: "피드" };

const timeFmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function FeedPage({ params }: PageProps<"/c/[id]/feed">) {
  const { id } = await params;
  const viewer = await currentUserId();
  // 사용자가 남긴 글은 저장소에서, 예시 글은 시드(python-21)에서 가져와요
  const stored: Post[] = postsOf(id)
    .slice()
    .reverse()
    .map((p) => {
      const author = getUser(p.authorId);
      return {
        id: p.id,
        kind: p.kind,
        author: author?.name ?? "알 수 없음",
        role: author?.role === "instructor" ? "강사" : undefined,
        day: p.dayNo,
        time: timeFmt.format(new Date(p.createdAt)),
        title: p.title,
        body: p.body,
        edited: !!p.editedAt,
        mine: !!viewer && p.authorId === viewer,
        likes: p.likes.length,
        comments: p.comments.length,
        pinned: p.pinned,
        likedByMe: viewer ? p.likes.includes(viewer) : false,
      };
    });
  const seed = id === "python-21" ? seedPosts.map((p) => ({ ...p, id: `seed-${p.id}` })) : [];
  return <Feed challengeId={id} viewerName={getUser(viewer)?.name ?? ""} posts={[...stored, ...seed]} />;
}
