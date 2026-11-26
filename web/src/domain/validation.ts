// 입력 검증. 근거: 상세설계 5.6 ProofValidator, 비즈니스 정책서 BP-SUB-001·BP-CHAL-002.
// 검증 결과는 문제 목록으로 돌려준다(빈 배열이면 통과). 사용자 문구는 해요체로 쓴다.

import { CHALLENGE_LIMITS, PROOF_LIMITS } from "./constants";

export type ProofType = "text" | "photo" | "link" | "check";

export type ProofPayload = {
  body?: string;
  linkUrl?: string;
  photoPaths?: string[];
  photoSizesBytes?: number[];
};

export type Problem = { field: string; message: string };

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** 인증 형식별 검증 (Strategy). BP-SUB-001. */
export function validateProof(type: ProofType, p: ProofPayload): Problem[] {
  const problems: Problem[] = [];
  const bodyLen = (p.body ?? "").trim().length;

  if (type === "text") {
    if (bodyLen < PROOF_LIMITS.textBody.min || bodyLen > PROOF_LIMITS.textBody.max) {
      problems.push({ field: "body", message: "10자 이상 2,000자 이하로 써 주세요" });
    }
  }
  if (type === "photo") {
    const count = p.photoPaths?.length ?? 0;
    if (count < PROOF_LIMITS.photoCount.min || count > PROOF_LIMITS.photoCount.max) {
      problems.push({ field: "photos", message: "사진은 1장에서 3장까지 올려 주세요" });
    }
    if ((p.photoSizesBytes ?? []).some((s) => s > PROOF_LIMITS.photoMaxBytes)) {
      problems.push({ field: "photos", message: "사진 한 장은 10MB까지 올릴 수 있어요" });
    }
    if (bodyLen > PROOF_LIMITS.noteMax) {
      problems.push({ field: "body", message: "설명은 500자 이하로 써 주세요" });
    }
  }
  if (type === "link") {
    if (!p.linkUrl || !isHttpUrl(p.linkUrl)) {
      problems.push({ field: "linkUrl", message: "http 또는 https 주소를 넣어 주세요" });
    }
    if (bodyLen > PROOF_LIMITS.noteMax) {
      problems.push({ field: "body", message: "설명은 500자 이하로 써 주세요" });
    }
  }
  if (type === "check") {
    if (bodyLen > PROOF_LIMITS.checkNoteMax) {
      problems.push({ field: "body", message: "한마디는 200자 이하로 써 주세요" });
    }
  }
  return problems;
}

/** 영상 링크는 YouTube 또는 Vimeo 주소만 허용 (BP-CHAL-002, 상세설계 5.5). */
export function isAllowedVideoUrl(url: string): boolean {
  return (
    /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}/.test(url) ||
    /^(https?:\/\/)?(www\.)?vimeo\.com\/\d+$/.test(url)
  );
}

/** 챌린지 기간·정원·완주 조건 범위 검증 (BP-CHAL-002). */
export function validateChallengeRules(input: {
  durationDays: number;
  capacity: number;
  completionRate: number;
}): Problem[] {
  const problems: Problem[] = [];
  const { durationDays, capacity, completionRate } = input;
  const d = CHALLENGE_LIMITS.durationDays;
  const c = CHALLENGE_LIMITS.capacity;
  const r = CHALLENGE_LIMITS.completionRate;
  if (durationDays < d.min || durationDays > d.max) problems.push({ field: "durationDays", message: "기간은 7일에서 60일 사이로 정해 주세요" });
  if (capacity < c.min || capacity > c.max) problems.push({ field: "capacity", message: "정원은 1명에서 300명 사이로 정해 주세요" });
  if (completionRate < r.min || completionRate > r.max || completionRate % r.step !== 0) {
    problems.push({ field: "completionRate", message: "완주 조건은 50%에서 100%까지 10% 단위로 정해 주세요" });
  }
  return problems;
}
