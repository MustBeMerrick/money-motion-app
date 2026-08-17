"use client";

import { useTransition } from "react";
import { Minus, Plus } from "lucide-react";
import { adjustBucketPrincipal } from "@/app/actions";
import { Money } from "@/components/ui";

const STEP_CENTS = 100;

export function BucketCurrentStepper({ bucketId, cents }: { bucketId: string; cents: number }) {
  const [pending, startTransition] = useTransition();

  function adjust(delta: number) {
    startTransition(() => adjustBucketPrincipal(bucketId, delta));
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${pending ? "opacity-50" : ""}`}>
      <button
        type="button"
        aria-label="Decrease by $1"
        disabled={pending}
        onClick={() => adjust(-STEP_CENTS)}
        className="btn cursor-pointer px-1 py-0.5"
      >
        <Minus size={11} />
      </button>
      <Money cents={cents} />
      <button
        type="button"
        aria-label="Increase by $1"
        disabled={pending}
        onClick={() => adjust(STEP_CENTS)}
        className="btn cursor-pointer px-1 py-0.5"
      >
        <Plus size={11} />
      </button>
    </span>
  );
}
