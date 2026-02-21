"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { ClubStatus } from "@/types/clawclub";

interface ClubAdminControlsProps {
  clubId: string;
  currentStatus: ClubStatus;
}

const statuses: ClubStatus[] = ["SCHEDULED", "RUNNING", "PAUSED", "ENDING", "ENDED"];

export default function ClubAdminControls({ clubId, currentStatus }: ClubAdminControlsProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ClubStatus>(currentStatus);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function applyStatus() {
    setBusy(true);
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/clubs/${clubId}/admin/state`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status })
    });

    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);

    if (!response.ok) {
      setError(data?.error || "Could not update club status.");
      return;
    }

    setMessage(`Club status updated to ${status}.`);
    router.refresh();
  }

  return (
    <section className="admin-controls">
      <div className="list-head">
        <h2>Admin Controls</h2>
        <p>current: {currentStatus}</p>
      </div>

      <div className="admin-row">
        <Select value={status} onChange={(event) => setStatus(event.target.value as ClubStatus)} disabled={busy}>
          {statuses.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <Button variant="secondary" type="button" disabled={busy} onClick={applyStatus}>
          {busy ? "Applying..." : "Apply Status"}
        </Button>
      </div>

      {message ? <Alert variant="success">{message}</Alert> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}
    </section>
  );
}
