"use client";

import { Minus, Plus } from "lucide-react";
import { adjustBucketRate } from "@/app/actions";
import { Money } from "@/components/ui";
import { useServerValue } from "@/components/use-server-value";

const STEP_CENTS = 100;

export function BucketRateStepper({ bucketId, cents }: { bucketId: string; cents: number }) {
  // steps read off what is on screen, so a second tap before the server has
  // answered still moves by another dollar instead of re-sending the first
  const [shown, save, pending] = useServerValue(cents);

  function adjust(delta: number) {
    save(shown + delta, () => adjustBucketRate(bucketId, delta));
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${pending ? "opacity-50" : ""}`}>
      <Money cents={shown} signed className="text-xs" />
      <span className="-my-0.5 flex flex-col gap-0.5">
        <button
          type="button"
          aria-label="Increase by $1"
          onClick={() => adjust(STEP_CENTS)}
          className="btn cursor-pointer px-1 py-0.5"
        >
          <Plus size={11} />
        </button>
        <button
          type="button"
          aria-label="Decrease by $1"
          onClick={() => adjust(-STEP_CENTS)}
          className="btn cursor-pointer px-1 py-0.5"
        >
          <Minus size={11} />
        </button>
      </span>
    </span>
  );
}
