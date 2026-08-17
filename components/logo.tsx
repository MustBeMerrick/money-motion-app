import Image from "next/image";

// The real brand assets, background keyed out to transparency so they sit on any
// surface. Source art lives in public/brand/ — do not regenerate these by hand.
const LOGO = { src: "/brand/moneymotion-logo.png", w: 293, h: 211 };
const MARK = { src: "/brand/moneymotion-mark.png", w: 210, h: 121 };

/** Just the arc-and-coin mark. `size` sets the width. */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <Image
      src={MARK.src}
      alt="MoneyMotion"
      width={MARK.w}
      height={MARK.h}
      priority
      style={{ width: size, height: "auto" }}
    />
  );
}

/** Full lockup: mark, MoneyMotion wordmark, and the tagline. */
export function Wordmark({ width = 150 }: { width?: number }) {
  return (
    <Image
      src={LOGO.src}
      alt="MoneyMotion — Simple. Smart. In Motion."
      width={LOGO.w}
      height={LOGO.h}
      priority
      style={{ width, height: "auto" }}
    />
  );
}
