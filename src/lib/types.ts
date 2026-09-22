export type UserRow = {
  id: string;
  nickname: string;
  profileMarkImageUrl: string | null;
  level: number;
  exp: number;
  points: number;
  isDealerVerified: boolean;
  createdAt: string;
};

export type PostRow = {
  id: string;
  boardType: string;
  authorId: string | null;
  authorNickname: string | null;
  title: string;
  content: string;
  upvoteCount: number;
  downvoteCount: number;
  authorIp: string | null;
  createdAt: string;
};

export type CommentRow = {
  id: string;
  postId: string | null;
  postTitle: string | null;
  authorId: string | null;
  authorNickname: string | null;
  content: string;
  isAttendanceCheck: boolean;
  createdAt: string;
};

export type LevelRow = {
  level: number;
  requiredExp: number;
  markPurchasePoints: number;
};

export type SchemaSnapshot = {
  users: UserRow[];
  posts: PostRow[];
  comments: CommentRow[];
  levels: LevelRow[];
  counts: {
    users: number;
    posts: number;
    comments: number;
    attendance: number;
    levels: number;
  };
};
