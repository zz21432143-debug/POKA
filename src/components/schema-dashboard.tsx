"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BOARD_DESCRIPTIONS,
  BOARD_LABELS,
  type BoardTypeKey,
} from "@/lib/boards";
import type { SchemaSnapshot } from "@/lib/types";

const COLUMN_DOCS = {
  users: [
    ["id", "회원 고유 ID (cuid)"],
    ["nickname", "닉네임 (유니크)"],
    ["profileMarkImageUrl", "장착 중인 프로필 마크 이미지"],
    ["equippedMarkId", "착용 마크(뱃지) ID — equipped_badge_id"],
    ["equippedFrameId", "착용 프레임 ID — equipped_frame_id (추후 상점)"],
    ["equippedEffectId", "착용 이펙트 ID — equipped_effect_id (추후 상점)"],
    ["level", "현재 레벨"],
    ["exp", "누적 경험치"],
    ["points", "보유 포인트"],
    ["isDealerVerified", "딜러 인증 여부"],
  ],
  posts: [
    ["boardType", "FREE / RULE_QA / SKETCH / HAND_REVIEW / ANONYMOUS_REVIEW / JOBS / PROMO / SCHEDULE / NOTICE 등"],
    ["authorId", "작성자. 익명 후기는 null"],
    ["title / content", "제목과 본문"],
    ["upvoteCount / downvoteCount", "추천·비추천 수"],
    ["authorIp", "작성자 IP (익명 후기 운영용)"],
    ["ratingManner/Service/Facility/Atmosphere", "익명 게시판 매장후기 4항목 별점 (1~5)"],
    ["pollVotes", "핸드리뷰 Fold/Check/Call/Raise 투표"],
  ],
  comments: [
    ["postId", "대상 게시글. 독립 출석 기록은 null 허용"],
    ["authorId", "작성자"],
    ["content", "댓글 또는 출석 메시지"],
    ["isAttendanceCheck", "출석체크 여부"],
  ],
  levels: [
    ["level", "레벨 번호 (PK)"],
    ["requiredExp", "해당 레벨 도달에 필요한 누적 EXP"],
    ["markPurchasePoints", "해당 레벨 마크 구매 포인트"],
  ],
} as const;

function boardLabel(type: string) {
  return BOARD_LABELS[type as BoardTypeKey] ?? type;
}

export function SchemaDashboard({ data }: { data: SchemaSnapshot }) {
  return (
    <div className="flex flex-col gap-8">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Users" value={data.counts.users} hint="회원" />
        <Stat label="Posts" value={data.counts.posts} hint="게시글" />
        <Stat label="Comments" value={data.counts.comments} hint="댓글+출석" />
        <Stat label="출석" value={data.counts.attendance} hint="isAttendanceCheck" />
        <Stat label="레벨 구간" value={data.counts.levels} hint="Level_Exp_Table" />
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        {(Object.keys(BOARD_LABELS) as BoardTypeKey[]).map((key) => (
          <Card key={key} size="sm">
            <CardHeader>
              <CardTitle className="text-sm">{BOARD_LABELS[key]}</CardTitle>
              <CardDescription>{BOARD_DESCRIPTIONS[key]}</CardDescription>
            </CardHeader>
            <CardContent>
              <code className="text-xs text-primary">{key}</code>
            </CardContent>
          </Card>
        ))}
      </section>

      <Tabs defaultValue="users">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="levels">Level_Exp_Table</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <ColumnDoc rows={COLUMN_DOCS.users} />
          <DataTable>
            <TableHeader>
              <TableRow>
                <TableHead>닉네임 / 마크</TableHead>
                <TableHead>레벨</TableHead>
                <TableHead>EXP</TableHead>
                <TableHead>포인트</TableHead>
                <TableHead>딜러 인증</TableHead>
                <TableHead>ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {user.profileMarkImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.profileMarkImageUrl}
                          alt={`${user.nickname} 마크`}
                          width={28}
                          height={28}
                          className="size-7"
                        />
                      ) : (
                        <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs">
                          —
                        </span>
                      )}
                      <span className="font-medium">{user.nickname}</span>
                    </div>
                  </TableCell>
                  <TableCell>Lv.{user.level}</TableCell>
                  <TableCell>{user.exp.toLocaleString()}</TableCell>
                  <TableCell>{user.points.toLocaleString()}</TableCell>
                  <TableCell>
                    {user.isDealerVerified ? (
                      <Badge>인증</Badge>
                    ) : (
                      <Badge variant="outline">미인증</Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[8rem] truncate font-mono text-xs text-muted-foreground">
                    {user.id}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTable>
        </TabsContent>

        <TabsContent value="posts" className="mt-4">
          <ColumnDoc rows={COLUMN_DOCS.posts} />
          <DataTable>
            <TableHeader>
              <TableRow>
                <TableHead>게시판</TableHead>
                <TableHead>제목</TableHead>
                <TableHead>작성자</TableHead>
                <TableHead>추천/비추</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <Badge variant="secondary">{boardLabel(post.boardType)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{post.title}</div>
                    <p className="mt-1 line-clamp-2 text-muted-foreground">{post.content}</p>
                  </TableCell>
                  <TableCell>
                    {post.authorNickname ?? (
                      <span className="text-muted-foreground">익명</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {post.upvoteCount} / {post.downvoteCount}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{post.authorIp ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTable>
        </TabsContent>

        <TabsContent value="comments" className="mt-4">
          <ColumnDoc rows={COLUMN_DOCS.comments} />
          <DataTable>
            <TableHeader>
              <TableRow>
                <TableHead>유형</TableHead>
                <TableHead>작성자</TableHead>
                <TableHead>내용</TableHead>
                <TableHead>게시글</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.comments.map((comment) => (
                <TableRow key={comment.id}>
                  <TableCell>
                    {comment.isAttendanceCheck ? (
                      <Badge>출석</Badge>
                    ) : (
                      <Badge variant="outline">댓글</Badge>
                    )}
                  </TableCell>
                  <TableCell>{comment.authorNickname ?? "익명"}</TableCell>
                  <TableCell>{comment.content}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {comment.postTitle ?? "독립 출석 기록"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTable>
        </TabsContent>

        <TabsContent value="levels" className="mt-4">
          <ColumnDoc rows={COLUMN_DOCS.levels} />
          <DataTable>
            <TableHeader>
              <TableRow>
                <TableHead>레벨</TableHead>
                <TableHead>필요 누적 EXP</TableHead>
                <TableHead>마크 구매 포인트</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.levels.map((row) => (
                <TableRow key={row.level}>
                  <TableCell>Lv.{row.level}</TableCell>
                  <TableCell>{row.requiredExp.toLocaleString()}</TableCell>
                  <TableCell>{row.markPurchasePoints.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTable>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{hint}</CardContent>
    </Card>
  );
}

function ColumnDoc({ rows }: { rows: readonly (readonly [string, string])[] }) {
  return (
    <ul className="mb-4 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
      {rows.map(([name, desc]) => (
        <li key={name}>
          <code className="text-primary">{name}</code> — {desc}
        </li>
      ))}
    </ul>
  );
}

function DataTable({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <Table>{children}</Table>
    </div>
  );
}
