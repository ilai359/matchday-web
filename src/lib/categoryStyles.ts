import { UpdateCategory } from "../data/updates";

export const categories: (UpdateCategory | "All")[] = [
  "All",
  "Club",
  "Injury",
  "Transfer",
  "Press",
  "Fixture",
  "Match",
];

type CategoryStyle = {
  color: string;
  background: string;
  gradient: string;
  icon: string;
};

type CategoryStylesMap = { [key: string]: CategoryStyle };

export const categoryStyles: CategoryStylesMap = {
  Club: {
    color: "#475569",
    background: "#E2E8F0",
    gradient: "linear-gradient(135deg, #64748B, #334155)",
    icon: "🏟️",
  },
  Injury: {
    color: "#DC2626",
    background: "#FEE2E2",
    gradient: "linear-gradient(135deg, #EF4444, #B91C1C)",
    icon: "🏥",
  },
  Transfer: {
    color: "#059669",
    background: "#D1FAE5",
    gradient: "linear-gradient(135deg, #10B981, #047857)",
    icon: "✍️",
  },
  Press: {
    color: "#7C3AED",
    background: "#EDE9FE",
    gradient: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
    icon: "🎙️",
  },
  Fixture: {
    color: "#2563EB",
    background: "#DBEAFE",
    gradient: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
    icon: "📅",
  },
  Match: {
    color: "#EA580C",
    background: "#FFEDD5",
    gradient: "linear-gradient(135deg, #F97316, #C2410C)",
    icon: "⚽",
  },
};