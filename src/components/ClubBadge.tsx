import Image from "next/image";
import { clubInitials } from "../lib/clubHelpers";

type ClubBadgeProps = {
  name: string;
  crest?: string;
  color?: string;
  size?: number;
};

export default function ClubBadge({ name, crest, color, size = 48 }: ClubBadgeProps) {
  if (crest) {
    return (
      // Two nested boxes on purpose, not one: Safari/WebKit (the browser
      // behind iOS PWAs) has a known bug where overflow-hidden + rounded
      // corners fail to actually clip a child if box-shadow lives on
      // that same element - the shadow's own corner shows through as a
      // flat edge, exactly the "still square" crest corners reported
      // after two earlier fixes that both looked correct in the code.
      // The outer box owns the shadow and the rounded shape; the inner
      // box (no shadow) owns the clipping, so each one only does the
      // part Safari can actually combine reliably.
      <div
        className="shrink-0 rounded-2xl shadow-sm"
        style={{ width: size, height: size }}
      >
        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-white p-2">
          <Image
            src={crest}
            alt={name}
            width={size - 16}
            height={size - 16}
            className="h-full w-full object-contain"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-2xl text-white font-black shadow-sm"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.3,
        background: `linear-gradient(135deg, ${color ?? "#94A3B8"}, #111827)`,
      }}
    >
      {clubInitials(name)}
    </div>
  );
}
