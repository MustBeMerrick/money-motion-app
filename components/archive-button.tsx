"use client";

import { useState } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { setBucketArchived } from "@/app/actions";
import { useScheduleRefresh } from "@/lib/refresh-context";

export function ArchiveButton({ id, archived }: { id: string; archived: boolean }) {
  const scheduleRefresh = useScheduleRefresh();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      title={archived ? "Restore" : "Archive"}
      disabled={pending}
      onClick={() => {
        setPending(true);
        void setBucketArchived(id, !archived)
          .then(scheduleRefresh)
          .finally(() => setPending(false));
      }}
      className={`btn px-2 py-1 text-xs ${pending ? "opacity-50" : ""}`}
    >
      {archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
    </button>
  );
}
