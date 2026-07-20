import { useState } from "react";
import { useSelector } from "@xstate/react";
import { playerActor } from "#/machines/actors/app";
import { reportPin } from "#/server/functions";
import type { SoundPin } from "#/lib/pins";
import { Cassette } from "./Cassette";

const REPORT_REASONS = [
  "not this place",
  "poor quality",
  "offensive content",
];

/**
 * Native <dialog> — free focus trap, Esc-to-close, ::backdrop.
 * All sound goes through the player machine (the one deck); this
 * component only renders its context and sends PLAY/STOP.
 */
export function PlaybackDialog({
  pin,
  index,
  onClose,
}: {
  pin: SoundPin;
  index: number;
  onClose: () => void;
}) {
  const deckKey = `pin-${pin.id}`;
  const playing = useSelector(
    playerActor,
    (s) => s.matches("playing") && s.context.key === deckKey,
  );
  const time = useSelector(playerActor, (s) =>
    s.context.key === deckKey ? s.context.time : 0,
  );
  const duration = useSelector(playerActor, (s) =>
    s.context.key === deckKey ? s.context.duration : 0,
  );

  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);

  const sendReport = async (reason: string) => {
    setReporting(false);
    setReported(true);
    try {
      await reportPin({ data: { pinId: pin.id, reason } });
    } catch {
      // swallow — the listener already got their acknowledgement; worst
      // case a report is lost, which is not worth an error state here
    }
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const recorded = new Date(pin.createdAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <dialog
      ref={(el) => {
        if (el && !el.open) el.showModal();
      }}
      onClose={() => {
        playerActor.send({ type: "STOP" }); // closing the dialog quiets the deck
        onClose();
      }}
      onClick={(e) => {
        // click on the backdrop (the dialog element itself) closes
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className="m-auto w-[min(92vw,380px)] rounded-sm border-2 border-shell-deep/70 bg-paper p-0 backdrop:bg-shell-deep/50 open:animate-[slide-in_0.25s_var(--ease-out-quart)]"
    >
      {/* cassette label strip */}
      <header className="flex items-center justify-between bg-shell px-3 py-1.5">
        <span className="font-mono text-[10px] tracking-widest text-paper">
          ● FIELD NOTE — N° {String(index + 1).padStart(2, "0")}
        </span>
        <form method="dialog">
          <button
            aria-label="close"
            className="cursor-pointer font-mono text-xs leading-none text-paper/70 transition-colors hover:text-paper"
          >
            ✕
          </button>
        </form>
      </header>

      <div className="p-4">
        {/* specimen line */}
        <p className="font-mono text-[10px] uppercase tracking-widest text-shell">
          {pin.lat.toFixed(4)}°N {pin.lng.toFixed(4)}°E · {recorded}
        </p>

        {/* the cassette itself — tap to play/pause */}
        <div className="flex justify-center py-2">
          <button
            onClick={() =>
              playerActor.send({
                type: "PLAY",
                key: deckKey,
                url: pin.audioUrl,
              })
            }
            aria-label={playing ? "pause" : "play"}
            className="cursor-pointer transition-transform duration-150 ease-out-quart hover:scale-105"
          >
            <Cassette
              isPlaying={playing}
              label={String(index + 1).padStart(2, "0")}
              size={140}
            />
          </button>
        </div>
        <p className="text-center font-mono text-[10px] uppercase tracking-widest text-shell">
          {playing ? "now playing" : "tap to play"}
        </p>

        {/* transport */}
        <div className="mt-2">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={duration || 0}
            aria-valuenow={time}
            className="h-2 rounded-full bg-paper-dim"
          >
            <div
              className="h-full rounded-full bg-tape transition-[width] duration-200 ease-linear"
              style={{
                width: `${duration ? (time / duration) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[10px] text-shell">
            <span>{fmt(time)}</span>
            <span>{duration ? fmt(duration) : "--:--"}</span>
          </div>
        </div>

        {/* report — quiet, tucked at the bottom */}
        <div className="mt-5 border-t border-shell/30 pt-3">
          {reported ? (
            <p className="font-mono text-[10px] uppercase tracking-widest text-shell">
              noted. thank you for listening closely.
            </p>
          ) : reporting ? (
            <div className="flex flex-wrap items-center gap-2">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => sendReport(reason)}
                  className="cursor-pointer rounded-sm border border-shell/50 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-inkbrown transition-colors hover:bg-paper-dim"
                >
                  {reason}
                </button>
              ))}
              <button
                onClick={() => setReporting(false)}
                className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-shell underline-offset-2 hover:underline"
              >
                never mind
              </button>
            </div>
          ) : (
            <button
              onClick={() => setReporting(true)}
              className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-shell underline-offset-2 hover:underline"
            >
              something wrong with this recording?
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
