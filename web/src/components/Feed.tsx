"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Post } from "@/lib/data";
import { createPostAction, deletePostAction, editPostAction, toggleLikeAction } from "@/server/actions";
import { useConfirm } from "./ConfirmDialog";
import { Avatar } from "./ui";
import { safeAction, TAP_FAIL } from "@/lib/safe-action";

const FILTERS = ["전체", "인증", "질문", "공지"] as const;

const kindStyle: Record<Post["kind"], string> = {
  공지: "bg-grey-0 text-grey-97",
  인증: "border border-accent-soft text-accent-soft",
  질문: "bg-grey-70 text-grey-0",
  자유: "bg-grey-80 text-grey-20",
};

type Editor = { mode: "new" } | { mode: "edit"; post: Post };

export function Feed({ challengeId, viewerName, posts }: { challengeId: string; viewerName: string; posts: Post[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("전체");
  const [editor, setEditor] = useState<Editor | null>(null);
  const list = posts
    .filter((p) => filter === "전체" || p.kind === filter)
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));

  return (
    <div>
      {/* 글쓰기 진입: 입력창 모양 카드를 누르면 작성 창이 떠요 */}
      <div className="flex items-center gap-3 rounded-md bg-grey-90 px-4 py-3">
        <Avatar name={viewerName || "나"} size={36} />
        <button
          type="button"
          onClick={() => setEditor({ mode: "new" })}
          className="h-10 flex-1 rounded-pill bg-grey-97 px-4 text-left text-[14px] text-grey-40 hover:bg-grey-80"
        >
          궁금한 점이나 오늘 이야기를 남겨 보세요
        </button>
        <button
          type="button"
          onClick={() => setEditor({ mode: "new" })}
          className="hidden h-10 rounded-sm bg-blue-50 px-4 text-[14px] font-bold sm:block"
        >
          글쓰기
        </button>
      </div>

      <div role="group" aria-label="글 종류" className="mt-5 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`h-[34px] rounded-chip px-3 text-[14px] ${
              filter === f ? "bg-grey-0 font-bold text-grey-97" : "bg-grey-80 text-grey-20 hover:bg-grey-70"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <ul className="mt-4 space-y-3">
        {list.map((p) => (
          <li key={p.id}>
            <PostCard p={p} onEdit={() => setEditor({ mode: "edit", post: p })} />
          </li>
        ))}
      </ul>
      {list.length === 0 && (
        <p className="mt-10 text-center text-[14px] text-grey-40">아직 {filter} 글이 없어요. 첫 글을 남겨 볼까요?</p>
      )}

      {editor && (
        <PostEditor
          key={editor.mode === "edit" ? editor.post.id : "new"}
          challengeId={challengeId}
          editing={editor.mode === "edit" ? editor.post : undefined}
          onDone={(posted) => {
            setEditor(null);
            if (posted) setFilter("전체");
          }}
        />
      )}
    </div>
  );
}

function PostCard({ p, onEdit }: { p: Post; onEdit: () => void }) {
  const router = useRouter();
  const [liked, setLiked] = useState(!!p.likedByMe);
  const [likes, setLikes] = useState(p.likes);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const canManage = !!p.mine && (p.kind === "질문" || p.kind === "자유");
  const [confirmDialog, ask] = useConfirm();

  function toggle() {
    setError("");
    // 예시 글은 서버에 없어서 화면에서만 바꿔요
    if (p.id.startsWith("seed-")) {
      setLikes((n) => n + (liked ? -1 : 1));
      setLiked(!liked);
      return;
    }
    start(async () => {
      const r = await safeAction(toggleLikeAction(p.id), TAP_FAIL);
      if (r.ok) {
        setLiked(r.value.liked);
        setLikes(r.value.count);
      } else setError(r.message);
    });
  }

  async function remove() {
    if (!(await ask({ title: "이 글을 삭제할까요?", body: "삭제한 글은 되돌릴 수 없어요.", confirm: "삭제하기", danger: true }))) return;
    start(async () => {
      const r = await safeAction(deletePostAction(p.id), TAP_FAIL);
      if (r.ok) router.refresh();
      else setError(r.message);
    });
  }

  return (
    <article className={`rounded-md p-4 sm:p-5 ${p.pinned ? "bg-grey-80" : "bg-grey-90"} ${pending ? "opacity-60" : ""}`}>
      <header className="flex items-center gap-3">
        <Avatar name={p.author} size={36} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[14px] font-bold">
            {p.author}
            {p.role && <span className="text-[12px] font-normal text-accent-soft">강사</span>}
          </p>
          <p className="text-[12px] text-grey-40">
            {p.time}
            {p.edited && " · 수정됨"}
          </p>
        </div>
        <span className={`inline-flex h-[22px] items-center rounded-sm px-2 text-[12px] font-bold ${kindStyle[p.kind]}`}>
          {p.pinned ? "📌 공지" : p.kind}
          {p.day ? ` · Day ${p.day}` : ""}
        </span>
        {canManage && <PostMenu onEdit={onEdit} onDelete={remove} />}
      </header>
      {p.title && <h3 className="mt-3 text-[16px] font-bold">{p.title}</h3>}
      {p.code && (
        <pre className="mt-3 overflow-x-auto rounded-sm bg-grey-97 px-3 py-2.5 font-mono text-[13px] leading-relaxed text-grey-20">
          <code>{p.code}</code>
        </pre>
      )}
      <div className={`${p.title ? "mt-1.5" : "mt-3"} text-[14px] leading-[1.7] whitespace-pre-wrap text-grey-20`}>{p.body}</div>
      {p.firstComment && (
        <div className="mt-3 rounded-sm bg-grey-97/60 px-3 py-2.5 text-[13px]">
          <span className="font-bold">{p.firstComment.author}</span>{" "}
          <span className="text-grey-30">{p.firstComment.body}</span>
        </div>
      )}
      <footer className="mt-3 flex gap-4 text-[13px] text-grey-40">
        <button
          type="button"
          aria-pressed={liked}
          disabled={pending}
          onClick={toggle}
          className={`inline-flex min-h-8 items-center gap-1.5 ${liked ? "font-bold text-accent-soft" : "hover:text-grey-20"}`}
        >
          <svg viewBox="0 0 24 24" className="size-4" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} aria-hidden>
            <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
          </svg>
          좋아요 <span className="tabular-nums">{likes}</span>
        </button>
        <span className="inline-flex items-center gap-1.5">
          댓글 <span className="tabular-nums">{p.comments}</span>
        </span>
      </footer>
      {error && (
        <p role="alert" className="mt-2 text-[12px] text-accent-soft">
          {error}
        </p>
      )}
      {confirmDialog}
    </article>
  );
}

/** 내 글의 더보기(⋯) 메뉴: 수정 / 삭제 */
function PostMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = "block w-full px-4 py-2.5 text-left text-[14px] hover:bg-grey-70";
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="글 메뉴"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid size-8 place-items-center rounded-full text-grey-30 hover:bg-grey-80 hover:text-grey-0"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-1 w-32 overflow-hidden rounded-sm bg-grey-80 py-1 shadow-lg">
          <button
            role="menuitem"
            type="button"
            className={item}
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            수정하기
          </button>
          <button
            role="menuitem"
            type="button"
            className={`${item} text-accent-soft`}
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            삭제하기
          </button>
        </div>
      )}
    </div>
  );
}

/** 글쓰기·수정 창(모달). 새 글과 수정을 같은 화면에서 처리해요. */
function PostEditor({
  challengeId,
  editing,
  onDone,
}: {
  challengeId: string;
  editing?: Post;
  onDone: (posted: boolean) => void;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const initial = {
    kind: (editing?.kind === "자유" ? "자유" : "질문") as "질문" | "자유",
    title: editing?.title ?? "",
    body: editing?.body ?? "",
  };
  const [v, setV] = useState(initial);
  // 새 글 id를 창을 열 때 정해 두면, 응답을 못 받아 다시 눌러도 글이 한 번만 생겨요
  const [newId] = useState(() => crypto.randomUUID());
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [confirmDialog, ask] = useConfirm();
  const dirty = v.kind !== initial.kind || v.title !== initial.title || v.body !== initial.body;
  const canSubmit = v.title.trim().length > 0 && v.body.trim().length > 0 && !pending && (!editing || dirty);

  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    // showModal은 첫 입력 요소(게시판 선택)에 포커스를 줘서, 바로 쓸 수 있게 제목으로 옮겨요
    titleRef.current?.focus();
  }, []);

  async function close() {
    if (dirty && !(await ask({ title: "작성 중인 내용이 사라져요", body: "닫으면 지금까지 쓴 내용은 저장되지 않아요.", confirm: "나가기", cancel: "계속 쓰기", danger: true }))) return;
    onDone(false);
  }

  function submit() {
    if (!canSubmit) return;
    setError("");
    start(async () => {
      const input = { kind: v.kind, title: v.title.trim(), body: v.body.trim() };
      const r = editing ? await safeAction(editPostAction(editing.id, input)) : await safeAction(createPostAction(challengeId, input, newId));
      if (!r.ok) {
        setError(r.message);
        return;
      }
      onDone(!editing);
      router.refresh();
    });
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="editor-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      className="m-auto w-[min(640px,calc(100%-32px))] rounded-md bg-grey-90 p-0 text-grey-0 backdrop:bg-black/70"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
        }}
      >
        <header className="flex items-center justify-between border-b border-grey-80 px-5 py-4">
          <h2 id="editor-title" className="text-[16px] font-bold">
            {editing ? "글 수정" : "글쓰기"}
          </h2>
          <button type="button" aria-label="닫기" onClick={close} className="grid size-8 place-items-center rounded-full text-grey-30 hover:bg-grey-80">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="space-y-3 px-5 py-4">
          <div>
            <label htmlFor="post-kind" className="text-[13px] text-grey-30">
              게시판
            </label>
            <select
              id="post-kind"
              value={v.kind}
              onChange={(e) => setV({ ...v, kind: e.target.value as "질문" | "자유" })}
              className="mt-1 block h-10 w-40 rounded-sm bg-grey-97 px-3 text-[14px]"
            >
              <option value="질문">질문</option>
              <option value="자유">자유</option>
            </select>
          </div>
          <div>
            <label htmlFor="post-title" className="sr-only">
              제목
            </label>
            <input
              id="post-title"
              ref={titleRef}
              maxLength={60}
              value={v.title}
              onChange={(e) => setV({ ...v, title: e.target.value })}
              placeholder="제목을 입력하세요"
              className="h-11 w-full rounded-sm bg-grey-97 px-3 text-[15px] font-bold placeholder:font-normal placeholder:text-grey-50"
            />
          </div>
          <div>
            <label htmlFor="post-body" className="sr-only">
              내용
            </label>
            <textarea
              id="post-body"
              rows={8}
              maxLength={2000}
              value={v.body}
              onChange={(e) => setV({ ...v, body: e.target.value })}
              placeholder={
                v.kind === "질문" ? "막힌 부분과 시도해 본 방법을 같이 적어 주면 답을 빨리 받을 수 있어요" : "오늘 있었던 일을 나눠 주세요"
              }
              className="w-full resize-y rounded-sm bg-grey-97 p-3 text-[14px] leading-[1.7] placeholder:text-grey-50"
            />
            <p className="mt-1 text-right text-[12px] text-grey-40 tabular-nums">{v.body.length} / 2,000</p>
          </div>
          {error && (
            <p role="alert" className="text-[13px] text-accent-soft">
              {error}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-grey-80 px-5 py-3">
          <span className="hidden text-[12px] text-grey-40 sm:inline">Ctrl + Enter로 바로 올릴 수 있어요</span>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={close} className="h-10 rounded-sm px-4 text-[14px] text-grey-20 hover:bg-grey-80">
              취소
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="h-10 rounded-sm bg-blue-50 px-5 text-[14px] font-bold disabled:bg-grey-70 disabled:text-grey-40"
            >
              {pending ? "저장하는 중" : editing ? "저장하기" : "게시하기"}
            </button>
          </div>
        </footer>
      </form>
      {confirmDialog}
    </dialog>
  );
}
