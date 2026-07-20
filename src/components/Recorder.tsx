import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useSelector } from "@xstate/react";
import { inputActor, playerActor } from "#/machines/actors/app";
import type { PinLocation } from "#/machines/actors/input";
import { uploadPin } from "#/server/functions";
import { UploadDrop } from "./Uploader";

/* Pure rendering over the input machine — all behavior lives in
   machines/actors/input.ts. No effects: subscriptions go through
   useSelector, and window/canvas work uses React 19 ref-callback
   cleanups. */

const send = inputActor.send;

function drawTrace(canvas: HTMLCanvasElement, trace: number[]) {
  const c = canvas.getContext("2d");
  if (!c) return;
  const { width, height } = canvas;
  c.clearRect(0, 0, width, height);
  c.fillStyle = "#3a2a1c";
  const barW = width / 72;
  trace.forEach((v, i) => {
    const h = Math.max(2, v * height * 2.4);
    c.fillRect(i * barW, (height - h) / 2, barW * 0.6, h);
  });
}

export function Recorder() {
  const router = useRouter();
  const mode = useSelector(inputActor, (s) => s.value as string);
  const seconds = useSelector(inputActor, (s) => s.context.seconds);
  const audioUrl = useSelector(inputActor, (s) => s.context.audioUrl);
  const location = useSelector(inputActor, (s) => s.context.location);
  const saveFailed = useSelector(inputActor, (s) => s.context.saveFailed);
  const previewing = useSelector(
    playerActor,
    (s) => s.matches("playing") && s.context.key === "preview",
  );
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState(false);

  const useMyLocation = () => {
    setLocating(true);
    setGeoError(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        send({
          type: "PICK",
          lng: pos.coords.longitude,
          lat: pos.coords.latitude,
        });
      },
      () => {
        setLocating(false);
        setGeoError(true);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const confirmSave = () =>
    send({
      type: "CONFIRM",
      save: async (blob: Blob, loc: PinLocation) => {
        const form = new FormData();
        form.append("audio", blob, "recording");
        form.append("lng", String(loc.lng));
        form.append("lat", String(loc.lat));
        await uploadPin({ data: form });
        await router.invalidate(); // reload pins → new cassette appears
      },
    });

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  /* ---------- idle: the quiet invitation ---------- */
  if (mode === "idle") {
    return (
      <button
        onClick={() => send({ type: "OPEN" })}
        className="absolute right-4 bottom-4 -rotate-1 cursor-pointer rounded-sm border-2 border-shell-deep/70 bg-paper px-4 py-2 transition-transform duration-200 ease-out-quart hover:rotate-0 hover:scale-[1.03] sm:top-6 sm:right-6 sm:bottom-auto"
      >
        <span className="font-hand text-xl leading-none text-inkbrown">
          + add a sound
        </span>
      </button>
    );
  }

  /* ---------- placing: get out of the way, let the map speak ---------- */
  if (mode === "placing") {
    return (
      <div className="fixed inset-x-0 bottom-0 max-h-[80vh] w-full animate-[slide-in_0.25s_var(--ease-out-quart)] overflow-y-auto rounded-t-2xl border-2 border-shell-deep/70 bg-paper sm:absolute sm:inset-x-auto sm:top-6 sm:right-6 sm:bottom-auto sm:max-h-none sm:w-80 sm:rounded-sm sm:rounded-t-sm sm:rotate-[-0.6deg]">
        <header className="flex items-center justify-between rounded-t-2xl bg-shell px-3 py-1.5 sm:rounded-t-sm">
          <span className="font-mono text-[10px] tracking-widest text-paper">
            ● NEW ENTRY — SIDE A
          </span>
          <button
            onClick={() => send({ type: "CANCEL" })}
            aria-label="cancel"
            className="cursor-pointer font-mono text-xs leading-none text-paper/70 transition-colors hover:text-paper"
          >
            ✕
          </button>
        </header>

        <div className="p-4">
          <p className="font-hand text-2xl leading-tight text-inkbrown">
            where did you hear it?
          </p>

          {!location ? (
            <div className="mt-3 space-y-2">
              <div className="flex w-full items-center gap-3 rounded-sm border-2 border-shell-deep/60 px-4 py-3 text-left">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-paper-dim">
                  <span className="size-2.5 rounded-full border-2 border-shell" />
                </span>
                <span>
                  <span className="block font-mono text-[11px] uppercase tracking-widest text-inkbrown">
                    tap the map
                  </span>
                  <span className="block font-mono text-[10px] text-shell">
                    click anywhere to drop the pin there
                  </span>
                </span>
              </div>

              <button
                onClick={useMyLocation}
                disabled={locating}
                className="flex w-full cursor-pointer items-center gap-3 rounded-sm border-2 border-shell-deep/60 bg-paper px-4 py-3 text-left transition-colors hover:bg-paper-dim disabled:cursor-wait disabled:opacity-60"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-inkbrown">
                  <span className="size-2.5 rounded-full bg-paper" />
                </span>
                <span>
                  <span className="block font-mono text-[11px] uppercase tracking-widest text-inkbrown">
                    {locating ? "finding you…" : "use my location"}
                  </span>
                  <span className="block font-mono text-[10px] text-shell">
                    drop a pin right where you are
                  </span>
                </span>
              </button>
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-between rounded-sm border-2 border-shell-deep/60 px-4 py-3">
              <span className="font-mono text-[10px] text-shell">
                {location.lat.toFixed(4)}°N {location.lng.toFixed(4)}°E
              </span>
              <button
                onClick={confirmSave}
                className="cursor-pointer rounded-sm bg-inkbrown px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-paper transition-colors hover:bg-shell"
              >
                right here →
              </button>
            </div>
          )}

          {geoError && (
            <p className="mt-2 font-mono text-[11px] text-rec" role="alert">
              couldn't get your location — tap the map instead.
            </p>
          )}
          {saveFailed && (
            <p className="mt-2 font-mono text-[11px] text-rec" role="alert">
              couldn't reach the archive — your take is safe, try again.
            </p>
          )}
        </div>
      </div>
    );
  }

  /* ---------- everything else: the paper J-card panel ---------- */
  return (
    <section
      aria-label="add a sound"
      ref={(el) => {
        if (!el) return;
        // Esc backs out of the whole flow (ref cleanup, not an effect)
        const onKey = (e: KeyboardEvent) => {
          if (e.key === "Escape") send({ type: "CANCEL" });
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
      }}
      className="fixed inset-x-0 bottom-0 z-10 max-h-[85vh] w-full animate-[slide-in_0.25s_var(--ease-out-quart)] overflow-y-auto rounded-t-2xl border-2 border-shell-deep/70 bg-paper sm:absolute sm:inset-x-auto sm:top-6 sm:right-6 sm:bottom-auto sm:z-auto sm:max-h-none sm:w-80 sm:rounded-sm sm:rotate-[-0.6deg]"
    >
      {/* label strip, borrowed from the cassette itself */}
      <header className="flex items-center justify-between rounded-t-2xl bg-shell px-3 py-1.5 sm:rounded-t-sm">
        <span className="font-mono text-[10px] tracking-widest text-paper">
          {mode === "recording" ? (
            <span>
              <span className="mr-1 inline-block animate-[rec-blink_1.2s_steps(1)_infinite] text-[#ff9a9a]">
                ●
              </span>
              REC {mm}:{ss}
            </span>
          ) : (
            "● NEW ENTRY — SIDE A"
          )}
        </span>
        <button
          onClick={() => send({ type: "CANCEL" })}
          aria-label="cancel"
          className="cursor-pointer font-mono text-xs leading-none text-paper/70 transition-colors hover:text-paper"
        >
          ✕
        </button>
      </header>

      <div className="p-4">
        {mode === "choosing" && (
          <div className="space-y-3">
            <p className="font-hand text-2xl leading-tight text-inkbrown">
              what does your place sound like?
            </p>
            <button
              onClick={() => {
                playerActor.send({ type: "STOP" }); // don't record over playing audio
                send({ type: "RECORD" });
              }}
              className="flex w-full cursor-pointer items-center gap-3 rounded-sm border-2 border-shell-deep/60 bg-paper px-4 py-3 text-left transition-colors hover:bg-paper-dim"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-rec">
                <span className="size-2.5 rounded-full bg-paper" />
              </span>
              <span>
                <span className="block font-mono text-[11px] uppercase tracking-widest text-inkbrown">
                  record here
                </span>
                <span className="block font-mono text-[10px] text-shell">
                  use this device's microphone
                </span>
              </span>
            </button>
            <UploadDrop
              onPicked={(_url, file) => send({ type: "PICKED", file })}
            />
          </div>
        )}

        {mode === "recording" && (
          <div className="space-y-4">
            <canvas
              ref={(canvas) => {
                if (!canvas) return;
                const sub = inputActor.subscribe((snap) =>
                  drawTrace(canvas, snap.context.trace),
                );
                return () => sub.unsubscribe();
              }}
              width={272}
              height={56}
              className="w-full rounded-sm bg-paper-dim/70"
              aria-label="live recording level"
            />
            <p className="text-center font-hand text-2xl text-inkbrown">
              listening…
            </p>
            <button
              onClick={() => send({ type: "STOP" })}
              className="mx-auto flex size-14 cursor-pointer items-center justify-center rounded-full border-2 border-rec-deep bg-rec transition-transform duration-150 hover:scale-105"
              aria-label="stop recording"
            >
              <span className="size-4 rounded-[2px] bg-paper" />
            </button>
          </div>
        )}

        {mode === "micDenied" && (
          <div className="space-y-3">
            <p className="font-hand text-2xl leading-tight text-inkbrown">
              the microphone said no
            </p>
            <p className="font-mono text-[11px] text-rec" role="alert">
              check browser permissions, or upload a file instead.
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => send({ type: "RETRY" })}
                className="cursor-pointer rounded-sm bg-inkbrown px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-paper transition-colors hover:bg-shell"
              >
                try again
              </button>
              <button
                onClick={() => send({ type: "BACK" })}
                className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-shell underline-offset-2 hover:underline"
              >
                ← upload instead
              </button>
            </div>
          </div>
        )}

        {mode === "reviewing" && audioUrl && (
          <div className="space-y-4">
            <p className="font-hand text-2xl leading-tight text-inkbrown">
              have a listen back
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  playerActor.send({
                    type: "PLAY",
                    key: "preview",
                    url: audioUrl,
                  })
                }
                aria-label={previewing ? "pause" : "play"}
                className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-shell-deep/60 bg-inkbrown transition-colors hover:bg-shell"
              >
                {previewing ? (
                  <span className="flex gap-1">
                    <span className="h-3.5 w-1 bg-paper" />
                    <span className="h-3.5 w-1 bg-paper" />
                  </span>
                ) : (
                  <span className="ml-0.5 border-y-[7px] border-l-11 border-y-transparent border-l-paper" />
                )}
              </button>
              <span className="font-mono text-[10px] uppercase tracking-widest text-shell">
                {previewing ? "playing…" : "tap to play your take"}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-shell/30 pt-3">
              <button
                onClick={() => {
                  playerActor.send({ type: "STOP" });
                  send({ type: "RETAKE" });
                }}
                className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-shell underline-offset-2 hover:underline"
              >
                ← retake
              </button>
              <button
                onClick={() => {
                  playerActor.send({ type: "STOP" });
                  send({ type: "ACCEPT" });
                }}
                className="cursor-pointer rounded-sm bg-inkbrown px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-paper transition-colors hover:bg-shell"
              >
                sounds right →
              </button>
            </div>
          </div>
        )}

        {mode === "saving" && (
          <div className="py-4 text-center">
            <p className="font-hand text-2xl text-inkbrown">pinning…</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-shell">
              filing your recording in the archive
            </p>
          </div>
        )}

        {mode === "saved" && (
          <div className="py-2 text-center">
            <p className="font-hand text-3xl text-inkbrown">it's on the map</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-shell">
              thank you for listening closely
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
