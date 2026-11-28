import Image from "next/image";
import Link from "next/link";

export interface BrandWordmarkProps {
  href?: string;
  height?: number;
  priority?: boolean;
}

export function BrandWordmark({
  href = "/",
  height = 28,
  priority = false
}: BrandWordmarkProps) {
  const width = Math.round((478 / 94) * height);
  const image = (
    <Image
      src="/images/wordmark.png"
      alt="Adivo Comic"
      width={width}
      height={height}
      priority={priority}
      className="h-auto w-auto select-none object-contain"
    />
  );

  if (!href) {
    return image;
  }

  return (
    <Link
      href={href}
      aria-label="Adivo Comic Home"
      className="inline-flex items-center rounded-lg py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {image}
    </Link>
  );
}
