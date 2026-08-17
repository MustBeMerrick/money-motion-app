"use client";

import { useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { setBucketArchived } from "@/app/actions";

export function ArchiveButton({ id, archived }: { id: string; archived: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      title={archived ? "Restore" : "Archive"}
      disabled={pending}
      onClick={() => startTransition(() => setBucketArchived(id, !archived))}
      className={`btn px-2 py-1 text-xs ${pending ? "opacity-50" : ""}`}
    >
      {archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
    </button>
  );
}
