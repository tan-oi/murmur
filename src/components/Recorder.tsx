import { useEffect, useRef, useState } from "react";
import { UploadDrop } from "./Uploader";

type Mode =
  | "idle"
  | "choose"
  | "record"
  | "review"
  | "place"
  | "details"
  | "saved";

export type DraftLocation = { lng: number; lat: number };

export function Recorder({
  draft,
  onPlacingChange,
  onCancel,
  onSave,
}: {
  draft: DraftLocation | null;
  onPlacingChange: (placing: boolean) => void;
  onCancel: () => void;
  onSave: (entry: { blob: Blob }) => Promise<void>;
}) {
  const [mode, setMode] = useState<Mode>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [micError, setMicError] = useState(false);
  const [title, setTitle] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const blobRef = useRef<Blob | null>(null);

  // recording machinery lives in refs — none of it should re-render the panel
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const traceRef = useRef<number[]>([]);
  const previewRef = useRef<HTMLAudioElement | null>(null);

  const placing = mode === "place";
  useEffect(() => {
    onPlacingChange(placing);
  }, [placing, onPlacingChange]);

  const stopMachinery = () => {
    cancelAnimationFrame(rafRef.current);
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close().catch(() => {});
    mediaRef.current = null;
    streamRef.current = null;
    ctxRef.current = null;
    traceRef.current = [];
  };

  const stopPreview = () => {
    previewRef.current?.pause();
    previewRef.current = null;
    setPreviewing(false);
  };

  const reset = () => {
    stopMachinery();
    stopPreview();
    setMode("idle");
    setSeconds(0);
    setMicError(false);
    setTitle("");
    setAudioUrl(null);
    blobRef.current = null;
    setSaveError(false);
    onCancel();
  };

  // Esc backs out of the whole flow
  useEffect(() => {
    if (mode === "idle") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") reset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => stopMachinery, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      streamRef.current = stream;

      const rec = new MediaRecorder(stream);
      mediaRef.current = rec;
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: rec.mimeType });
        blobRef.current = blob;
        setAudioUrl(URL.createObjectURL(blob));
        setMode("review");
      };
      rec.start();

      // live level trace
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      const started = performance.now();

      const draw = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += (v - 128) ** 2;
        const rms = Math.sqrt(sum / buf.length) / 128;
        const trace = traceRef.current;
        trace.push(rms);
        if (trace.length > 72) trace.shift();
        setSeconds(Math.floor((performance.now() - started) / 1000));

        const canvas = canvasRef.current;
        const c = canvas?.getContext("2d");
        if (canvas && c) {
          const { width, height } = canvas;
          c.clearRect(0, 0, width, height);
          c.fillStyle = "#3a2a1c";
          const barW = width / 72;
          trace.forEach((v, i) => {
            const h = Math.max(2, v * height * 2.4);
            c.fillRect(i * barW, (height - h) / 2, barW * 0.6, h);
          });
        }
        rafRef.current = requestAnimationFrame(draw);
      };
      rafRef.current = requestAnimationFrame(draw);

      setSeconds(0);
      setMode("record");
    } catch {
      setMicError(true);
    }
  };

  const finishRecording = () => {
    cancelAnimationFrame(rafRef.current);
    mediaRef.current?.stop(); // onstop advances to review
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close().catch(() => {});
  };

  const togglePreview = () => {
    if (previewing) {
      stopPreview();
      return;
    }
    if (!audioUrl) return;
    const a = new Audio(audioUrl);
    previewRef.current = a;
    a.onended = () => setPreviewing(false);
    a.play();
    setPreviewing(true);
  };

  const save = async () => {
    if (!blobRef.current || !title.trim() || saving) return;
    stopPreview();
    setSaving(true);
    setSaveError(false);
    try {
      await onSave({ blob: blobRef.current });
      setMode("saved");
      setTimeout(() => {
        setMode("idle");
        setTitle("");
        setAudioUrl(null);
        blobRef.current = null;
        setSeconds(0);
      }, 2200);
    } catch {
      setSaveError(true); // take stays intact — user can retry
    } finally {
      setSaving(false);
    }
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  /* ---------- idle: the quiet invitation ---------- */
  if (mode === "idle") {
    return (
      <button
        onClick={() => setMode("choose")}
        className="absolute top-6 right-6 -rotate-1 cursor-pointer rounded-sm border-2 border-shell-deep/70 bg-paper px-4 py-2 transition-transform duration-200 ease-[var(--ease-out-quart)] hover:rotate-0 hover:scale-[1.03]"
      >
        <span className="font-hand text-xl leading-none text-inkbrown">
          + add a sound
        </span>
      </button>
    );
  }

  /* ---------- place: get out of the way, let the map speak ---------- */
  if (mode === "place") {
    return (
      <div className="absolute top-6 right-6 w-72 animate-[slide-in_0.25s_var(--ease-out-quart)] rounded-sm border-2 border-shell-deep/70 bg-paper p-4 -rotate-[0.6deg]">
        <p className="font-hand text-2xl leading-tight text-inkbrown">
          where did you hear it?
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-shell">
          tap the map to drop the pin
        </p>
        {draft && (
          <div className="mt-3 flex items-center justify-between border-t border-shell/30 pt-3">
            <span className="font-mono text-[10px] text-shell">
              {draft.lat.toFixed(4)}°N {draft.lng.toFixed(4)}°E
            </span>
            <button
              onClick={() => setMode("details")}
              className="cursor-pointer rounded-sm bg-inkbrown px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-paper transition-colors hover:bg-shell"
            >
              right here →
            </button>
          </div>
        )}
        <CancelLink onClick={reset} />
      </div>
    );
  }

  /* ---------- everything else: the paper J-card panel ---------- */
  return (
    <section
      aria-label="add a sound"
      className="absolute top-6 right-6 w-80 animate-[slide-in_0.25s_var(--ease-out-quart)] rounded-sm border-2 border-shell-deep/70 bg-paper -rotate-[0.6deg]"
    >
      {/* label strip, borrowed from the cassette itself */}
      <header className="flex items-center justify-between rounded-t-[1px] bg-shell px-3 py-1.5">
        <span className="font-mono text-[10px] tracking-widest text-paper">
          {mode === "record" ? (
            <span className="text-[#f1ead8]">
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
          onClick={reset}
          aria-label="cancel"
          className="cursor-pointer font-mono text-xs leading-none text-paper/70 transition-colors hover:text-paper"
        >
          ✕
        </button>
      </header>

      <div className="p-4">
        {mode === "choose" && (
          <div className="space-y-3">
            <p className="font-hand text-2xl leading-tight text-inkbrown">
              what does your place sound like?
            </p>
            <button
              onClick={startRecording}
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
              onPicked={(url, file) => {
                blobRef.current = file;
                setAudioUrl(url);
                setMode("review");
              }}
            />
            {micError && (
              <p className="font-mono text-[11px] text-rec" role="alert">
                couldn't reach the microphone — check permissions, or upload a
                file instead.
              </p>
            )}
          </div>
        )}

        {mode === "record" && (
          <div className="space-y-4">
            <canvas
              ref={canvasRef}
              width={272}
              height={56}
              className="w-full rounded-sm bg-paper-dim/70"
              aria-label="live recording level"
            />
            <p className="text-center font-hand text-2xl text-inkbrown">
              listening…
            </p>
            <button
              onClick={finishRecording}
              className="mx-auto flex size-14 cursor-pointer items-center justify-center rounded-full border-2 border-rec-deep bg-rec transition-transform duration-150 hover:scale-105"
              aria-label="stop recording"
            >
              <span className="size-4 rounded-[2px] bg-paper" />
            </button>
          </div>
        )}

        {mode === "review" && audioUrl && (
          <div className="space-y-4">
            <p className="font-hand text-2xl leading-tight text-inkbrown">
              have a listen back
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={togglePreview}
                aria-label={previewing ? "pause" : "play"}
                className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-shell-deep/60 bg-inkbrown transition-colors hover:bg-shell"
              >
                {previewing ? (
                  <span className="flex gap-1">
                    <span className="h-3.5 w-1 bg-paper" />
                    <span className="h-3.5 w-1 bg-paper" />
                  </span>
                ) : (
                  <span className="ml-0.5 border-y-[7px] border-l-[11px] border-y-transparent border-l-paper" />
                )}
              </button>
              <span className="font-mono text-[10px] uppercase tracking-widest text-shell">
                {previewing ? "playing…" : "tap to play your take"}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-shell/30 pt-3">
              <button
                onClick={() => {
                  stopPreview();
                  setAudioUrl(null);
                  setMode("choose");
                }}
                className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-shell underline-offset-2 hover:underline"
              >
                ← retake
              </button>
              <button
                onClick={() => {
                  stopPreview();
                  setMode("place");
                }}
                className="cursor-pointer rounded-sm bg-inkbrown px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-paper transition-colors hover:bg-shell"
              >
                sounds right →
              </button>
            </div>
          </div>
        )}

        {mode === "details" && (
          <div className="space-y-4">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-widest text-shell">
                name this sound
              </span>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
                placeholder="tram bells at dusk"
                maxLength={40}
                className="mt-1 w-full border-b-2 border-shell/40 bg-transparent pb-1 font-hand text-2xl text-inkbrown outline-none placeholder:text-shell/50 focus:border-inkbrown"
              />
            </label>
            {draft && (
              <p className="font-mono text-[10px] text-shell">
                {draft.lat.toFixed(4)}°N {draft.lng.toFixed(4)}°E ·{" "}
                {new Date().toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            )}
            <div className="flex items-center justify-between border-t border-shell/30 pt-3">
              <button
                onClick={() => setMode("place")}
                className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-shell underline-offset-2 hover:underline"
              >
                ← move pin
              </button>
              <button
                onClick={save}
                disabled={!title.trim() || saving}
                className="cursor-pointer rounded-sm bg-inkbrown px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest text-paper transition-colors hover:bg-shell disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? "pinning…" : "pin it"}
              </button>
            </div>
            {saveError && (
              <p className="font-mono text-[11px] text-rec" role="alert">
                couldn't reach the archive — your take is safe, try again.
              </p>
            )}
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

function CancelLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-3 cursor-pointer font-mono text-[10px] uppercase tracking-widest text-shell underline-offset-2 hover:underline"
    >
      cancel
    </button>
  );
}
