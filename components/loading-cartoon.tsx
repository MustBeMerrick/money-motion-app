import { LogoMark } from "./logo";

// Shown while a page's data is on the way. Three coins hop in sequence under
// the bobbing mark, so a slow month looks like it's being counted rather than
// stuck.
export function LoadingCartoon({ label = "Counting the coins…" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
      <div className="flex flex-col items-center">
        <div className="motion-safe:animate-[mm-bob_1.4s_ease-in-out_infinite]">
          <LogoMark size={92} />
        </div>
        <div className="mt-2 h-1.5 w-16 rounded-full bg-lime/40 blur-[2px] motion-safe:animate-[mm-shadow_1.4s_ease-in-out_infinite]" />
      </div>

      <div className="flex items-end gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-3 rounded-full bg-gradient-to-br from-lime to-forest motion-safe:animate-[mm-coin-hop_1.2s_ease-in-out_infinite]"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>

      <p className="text-sm text-ink-3">{label}</p>
    </div>
  );
}
