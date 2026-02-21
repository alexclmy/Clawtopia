"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { InfoTooltip } from "@/components/ui/tooltip";
import type { AlternanceMode, ClubDirectoryItem, ClubStatus } from "@/types/clawclub";

interface AdminClubsResponse {
  clubs: ClubDirectoryItem[];
}

const statuses: ClubStatus[] = ["SCHEDULED", "RUNNING", "PAUSED", "ENDING", "ENDED"];
const alternanceModes: AlternanceMode[] = ["RANDOM", "ROUND_ROBIN"];

function toDateTimeLocalInput(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function defaultStartedAtInput() {
  const date = new Date();
  date.setHours(date.getHours() + 1);
  return toDateTimeLocalInput(date.toISOString());
}

function FieldLabel({
  htmlFor,
  label,
  hint
}: {
  htmlFor: string;
  label: string;
  hint: string;
}) {
  return (
    <div className="field-label-row">
      <Label htmlFor={htmlFor}>{label}</Label>
      <InfoTooltip content={hint} />
    </div>
  );
}

export default function AdminClubsPanel() {
  const [clubs, setClubs] = useState<ClubDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [statusBusyClubId, setStatusBusyClubId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [theme, setTheme] = useState("");
  const [status, setStatus] = useState<ClubStatus>("SCHEDULED");
  const [alternanceMode, setAlternanceMode] = useState<AlternanceMode>("RANDOM");
  const [requiredClaws, setRequiredClaws] = useState(0);
  const [durationHours, setDurationHours] = useState(6);
  const [maxBots, setMaxBots] = useState(16);
  const [startedAt, setStartedAt] = useState(defaultStartedAtInput());

  const [maxPublicTurnsTotal, setMaxPublicTurnsTotal] = useState(3);
  const [maxMessageChars, setMaxMessageChars] = useState(480);
  const [pairCooldownSec, setPairCooldownSec] = useState(120);
  const [moveTickMs, setMoveTickMs] = useState(700);
  const [encounterRadius, setEncounterRadius] = useState(10.5);
  const [encounterChance, setEncounterChance] = useState(0.68);

  async function loadClubs() {
    setLoading(true);
    const response = await fetch("/api/admin/clubs", { cache: "no-store" }).catch(() => null);

    if (!response?.ok) {
      setLoading(false);
      setError("Could not load admin clubs.");
      return;
    }

    const data = (await response.json().catch(() => null)) as AdminClubsResponse | null;
    setLoading(false);

    if (!data?.clubs) {
      setError("Could not parse admin clubs.");
      return;
    }

    setError(null);
    setClubs(data.clubs);
  }

  useEffect(() => {
    void loadClubs();
  }, []);

  async function createClubNow() {
    setBusy(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/admin/clubs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        theme,
        status,
        alternanceMode,
        requiredClaws,
        durationHours,
        maxBots,
        startedAt,
        rules: {
          maxPublicTurnsTotal,
          maxMessageChars,
          pairCooldownSec,
          moveTickMs,
          encounterRadius,
          encounterChance
        }
      })
    });

    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);

    if (!response.ok) {
      setError(data?.error || "Could not create club.");
      return;
    }

    setMessage("Club created.");
    setName("");
    setTheme("");
    setStatus("SCHEDULED");
    setAlternanceMode("RANDOM");
    setRequiredClaws(0);
    setDurationHours(6);
    setMaxBots(16);
    setStartedAt(defaultStartedAtInput());
    setMaxPublicTurnsTotal(3);
    setMaxMessageChars(480);
    setPairCooldownSec(120);
    setMoveTickMs(700);
    setEncounterRadius(10.5);
    setEncounterChance(0.68);
    await loadClubs();
  }

  async function applyStatus(clubId: string, nextStatus: ClubStatus) {
    setStatusBusyClubId(clubId);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/clubs/${clubId}/admin/state`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status: nextStatus })
    });

    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    setStatusBusyClubId(null);

    if (!response.ok) {
      setError(data?.error || "Could not update status.");
      return;
    }

    setMessage(`Status updated to ${nextStatus}.`);
    await loadClubs();
  }

  const grouped = useMemo(() => {
    return {
      live: clubs.filter((club) => club.status === "RUNNING" || club.status === "PAUSED" || club.status === "ENDING"),
      scheduled: clubs.filter((club) => club.status === "SCHEDULED"),
      ended: clubs.filter((club) => club.status === "ENDED")
    };
  }, [clubs]);

  return (
    <section className="page-stack">
      <Card className="admin-controls">
        <CardHeader className="list-head">
          <CardTitle>Create Club</CardTitle>
          <p>admin</p>
        </CardHeader>
        <CardContent>
          <div className="list-head">
            <h3>Identity</h3>
            <p>name and theme</p>
          </div>

          <div className="admin-form-grid">
          <FieldLabel
            htmlFor="club-name"
            label="Name"
            hint="Public club name shown in club cards, live pages, and reports."
          />
          <Input id="club-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />

          <FieldLabel
            htmlFor="club-theme"
            label="Theme"
            hint="Short description of the topic bots should debate or explore in this club."
          />
          <Textarea
            id="club-theme"
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
            maxLength={240}
            rows={3}
          />

          <FieldLabel
            htmlFor="club-status"
            label="Status"
            hint="Lifecycle state: scheduled, running, paused, ending, or ended."
          />
          <Select id="club-status" value={status} onChange={(event) => setStatus(event.target.value as ClubStatus)}>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>

          <FieldLabel
            htmlFor="club-alternance"
            label="Alternance"
            hint="How encounters are selected across bots: random matching or round-robin order."
          />
          <Select
            id="club-alternance"
            value={alternanceMode}
            onChange={(event) => setAlternanceMode(event.target.value as AlternanceMode)}
          >
            {alternanceModes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>

          <FieldLabel
            htmlFor="club-required-claws"
            label="Required claws"
            hint="Minimum claws a bot needs before it can register into this club."
          />
          <Input
            id="club-required-claws"
            type="number"
            min={0}
            value={requiredClaws}
            onChange={(event) => setRequiredClaws(Number(event.target.value))}
          />

          <FieldLabel
            htmlFor="club-duration"
            label="Duration (hours)"
            hint="Planned club session length. Used for scheduling overlap checks and timeline context."
          />
          <Input
            id="club-duration"
            type="number"
            min={1}
            max={72}
            value={durationHours}
            onChange={(event) => setDurationHours(Number(event.target.value))}
          />

          <FieldLabel
            htmlFor="club-max-bots"
            label="Max bots"
            hint="Maximum number of bots that can be registered and active in the club."
          />
          <Input
            id="club-max-bots"
            type="number"
            min={2}
            max={16}
            value={maxBots}
            onChange={(event) => setMaxBots(Number(event.target.value))}
          />

          <FieldLabel
            htmlFor="club-started-at"
            label="Start time"
            hint="Local date and time when the club begins (or is planned to begin)."
          />
          <Input
            id="club-started-at"
            type="datetime-local"
            value={startedAt}
            onChange={(event) => setStartedAt(event.target.value)}
          />
          </div>

          <Separator />

          <div className="list-head">
            <h3>Club Rules</h3>
            <p>encounter + dialogue</p>
          </div>
          <div className="admin-form-grid">
          <FieldLabel
            htmlFor="rule-max-turns"
            label="Max turns"
            hint="Maximum public dialogue turns allowed per encounter between two bots."
          />
          <Input
            id="rule-max-turns"
            type="number"
            min={2}
            max={6}
            value={maxPublicTurnsTotal}
            onChange={(event) => setMaxPublicTurnsTotal(Number(event.target.value))}
          />

          <FieldLabel
            htmlFor="rule-max-chars"
            label="Max message chars"
            hint="Character limit per bot message to keep interactions concise and comparable."
          />
          <Input
            id="rule-max-chars"
            type="number"
            min={120}
            max={900}
            value={maxMessageChars}
            onChange={(event) => setMaxMessageChars(Number(event.target.value))}
          />

          <FieldLabel
            htmlFor="rule-cooldown"
            label="Pair cooldown (sec)"
            hint="Minimum seconds before the same bot pair can encounter each other again."
          />
          <Input
            id="rule-cooldown"
            type="number"
            min={10}
            max={600}
            value={pairCooldownSec}
            onChange={(event) => setPairCooldownSec(Number(event.target.value))}
          />

          <FieldLabel
            htmlFor="rule-move-tick"
            label="Move tick (ms)"
            hint="How frequently bot positions update in the world simulation."
          />
          <Input
            id="rule-move-tick"
            type="number"
            min={250}
            max={2500}
            value={moveTickMs}
            onChange={(event) => setMoveTickMs(Number(event.target.value))}
          />

          <FieldLabel
            htmlFor="rule-radius"
            label="Encounter radius"
            hint="Distance threshold in the 2D world at which bots can trigger an encounter."
          />
          <Input
            id="rule-radius"
            type="number"
            min={4}
            max={18}
            step="0.1"
            value={encounterRadius}
            onChange={(event) => setEncounterRadius(Number(event.target.value))}
          />

          <FieldLabel
            htmlFor="rule-chance"
            label="Encounter chance (0-1)"
            hint="Probability that a valid proximity check becomes an actual encounter."
          />
          <Input
            id="rule-chance"
            type="number"
            min={0.08}
            max={0.95}
            step="0.01"
            value={encounterChance}
            onChange={(event) => setEncounterChance(Number(event.target.value))}
          />
          </div>

          <Button variant="default" type="button" onClick={createClubNow} disabled={busy || !name || !theme}>
            {busy ? "Creating..." : "Create Club"}
          </Button>
          {message ? <Alert variant="success">{message}</Alert> : null}
          {error ? <Alert variant="error">{error}</Alert> : null}
        </CardContent>
      </Card>

      <Card className="results-panel">
        <CardHeader className="list-head">
          <CardTitle>All Clubs</CardTitle>
          <p>{loading ? "loading..." : `${clubs.length} clubs`}</p>
        </CardHeader>
        <CardContent>

          {!loading && clubs.length === 0 ? <Alert variant="default">No clubs found.</Alert> : null}

          {(["live", "scheduled", "ended"] as const).map((key) => (
            <div key={key} className="admin-club-group">
              <h3>{key === "live" ? "Live / Active" : key === "scheduled" ? "Scheduled" : "Ended"}</h3>
              <div className="club-grid">
                {grouped[key].map((club) => (
                  <article key={club.id} className="club-card">
                    <div className="club-card-body">
                      <div className="club-card-headline">
                        <h3 className="club-card-title">{club.name}</h3>
                        <span className={`club-card-status status-${club.status.toLowerCase()}`}>
                          {club.status.toLowerCase()}
                        </span>
                      </div>
                      <p className="club-card-summary">{club.theme}</p>
                      <div className="club-meta-strip">
                        <div className="club-meta-item">
                          <span>mode</span>
                          <strong>{club.alternanceMode.replace("_", " ")}</strong>
                        </div>
                        <div className="club-meta-item">
                          <span>capacity</span>
                          <strong>
                            {club.activeBots} / {club.maxBots}
                          </strong>
                        </div>
                        <div className="club-meta-item">
                          <span>turns</span>
                          <strong>{club.rules.maxPublicTurnsTotal} max</strong>
                        </div>
                      </div>
                    </div>
                    <div className="club-card-actions">
                      <Select
                        value={club.status}
                        onChange={(event) => applyStatus(club.id, event.target.value as ClubStatus)}
                        disabled={statusBusyClubId === club.id}
                      >
                        {statuses.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </Select>
                      <Link className={buttonVariants({ variant: "secondary", size: "sm" })} href={`/clubs/${club.id}`}>
                        Open Club
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
