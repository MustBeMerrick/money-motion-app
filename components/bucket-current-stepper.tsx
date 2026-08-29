"use client";

import { Minus, Plus } from "lucide-react";
import { adjustBucketPrincipal } from "@/app/actions";
import { Money } from "@/components/ui";
import { useServerValue } from "@/components/use-server-value";

const STEP_CENTS = 100;

export function BucketCurrentStepper({ bucketId, cents }: { bucketId: string; cents: number }) {
  // steps read off what is on screen, so a second tap before the server has
  // answered still moves by another dollar instead of re-sending the first
  const [shown, save, pending] = useServerValue(cents, `bucket ${bucketId} current`);

  function adjust(delta: number) {
    save(shown + delta, () => adjustBucketPrincipal(bucketId, delta));
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${pending ? "opacity-50" : ""}`}>
      <button
        type="button"
        aria-label="Decrease by $1"
        onClick={() => adjust(-STEP_CENTS)}
        className="btn cursor-pointer px-1 py-0.5"
      >
        <Minus size={11} />
      </button>
      <Money cents={shown} />
      <button
        type="button"
        aria-label="Increase by $1"
        onClick={() => adjust(STEP_CENTS)}
        className="btn cursor-pointer px-1 py-0.5"
      >
        <Plus size={11} />
      </button>
    </span>
  );
}
