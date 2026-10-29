"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deletePayee } from "@/app/actions";
import { useScheduleRefresh } from "@/lib/refresh-context";

// Two-tap delete: the first tap arms it, the second confirms. Deleting keeps
// the payee's past transactions but they lose its name.
export function DeletePayeeButton({ id, name }: { id: string; name: string }) {
  const scheduleRefresh = useScheduleRefresh();
  const [armed, setArmed] = useState(false);
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      title={armed ? `Confirm: delete ${name}` : `Delete ${name}`}
      disabled={pending}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          return;
        }
        setPending(true);
        void deletePayee(id)
          .then(scheduleRefresh)
          .finally(() => {
            setPending(false);
            setArmed(false);
          });
      }}
      onBlur={() => setArmed(false)}
      className={`btn btn-danger shrink-0 px-2 py-1 text-xs ${pending ? "opacity-50" : ""}`}
    >
      {armed ? "Delete?" : <Trash2 size={13} />}
    </button>
  );
}
