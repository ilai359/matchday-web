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
      <div
        className="flex shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm p-2"
        style={{ width: size, height: size }}
      >
        <Image
          src={crest}
          alt={name}
          width={size - 16}
          height={size - 16}
          className="object-contain"
        />
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