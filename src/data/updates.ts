export type UpdateCategory =
  | "Club"
  | "Injury"
  | "Transfer"
  | "Press"
  | "Match";

export type Update = {
  id: string;
  clubId: string;
  category: UpdateCategory;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
};
