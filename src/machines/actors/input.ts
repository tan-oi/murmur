import { assign, fromCallback, fromPromise, sendTo, setup } from "xstate";

/* ── mic plumbing: getUserMedia + MediaRecorder + level analyser ──────
   Runs only while the machine is in `recording`. Parent sends "STOP" to
   finish a take; leaving the state stops the actor and the returned
   cleanup releases the mic/AudioContext no matter how we exit. */

type MicEvent =
  | { type: "MIC.LEVEL"; rms: number; seconds: number }
  | { type: "MIC.DONE"; blob: Blob }
  | { type: "MIC.ERROR" };

const micActor = fromCallback<{ type: "STOP" }, unknown, MicEvent>(
  ({ sendBack, receive }) => {
    let rec: MediaRecorder | null = null;
    let stream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    let raf = 0;
    let cancelled = false;
    const chunks: Blob[] = [];

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        rec = new MediaRecorder(s);
        rec.ondataavailable = (e) => chunks.push(e.data);
        rec.onstop = () =>
          sendBack({
            type: "MIC.DONE",
            blob: new Blob(chunks, { type: rec!.mimeType }),
          });
        rec.start();

        audioCtx = new AudioContext();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        audioCtx.createMediaStreamSource(s).connect(analyser);
        const buf = new Uint8Array(analyser.fftSize);
        const started = performance.now();
        const loop = () => {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (const v of buf) sum += (v - 128) ** 2;
          sendBack({
            type: "MIC.LEVEL",
            rms: Math.sqrt(sum / buf.length) / 128,
            seconds: Math.floor((performance.now() - started) / 1000),
          });
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      })
      .catch(() => sendBack({ type: "MIC.ERROR" }));

    receive((event) => {
      if (event.type === "STOP") {
        cancelAnimationFrame(raf);
        if (rec?.state === "recording") rec.stop(); // fires onstop → MIC.DONE
      }
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (rec?.state === "recording") rec.stop();
      stream?.getTracks().forEach((t) => t.stop());
      audioCtx?.close().catch(() => {});
    };
  },
);

/* ── the input machine: the whole add-a-pin flow ─────────────────────
   idle → choosing → recording → reviewing → placing → saving → saved */

export type PinLocation = { lng: number; lat: number };

type SaveFn = (blob: Blob, location: PinLocation) => Promise<void>;

/* ── save plumbing: runs the upload the UI handed us via CONFIRM ────── */
const saveActor = fromPromise(
  async ({
    input,
  }: {
    input: { blob: Blob; location: PinLocation; save: SaveFn };
  }) => input.save(input.blob, input.location),
);

type Ctx = {
  blob: Blob | null;
  audioUrl: string | null; // object URL for preview
  seconds: number;
  trace: number[]; // last ~72 rms values for the level display
  location: PinLocation | null;
  saveFailed: boolean;
};

type Ev =
  | MicEvent
  | { type: "OPEN" }
  | { type: "RECORD" }
  | { type: "STOP" }
  | { type: "PICKED"; file: File } // upload path
  | { type: "RETRY" }
  | { type: "BACK" }
  | { type: "RETAKE" }
  | { type: "ACCEPT" }
  | { type: "PICK"; lng: number; lat: number }
  | { type: "CONFIRM"; save: SaveFn }
  | { type: "CANCEL" };

const fresh: Ctx = {
  blob: null,
  audioUrl: null,
  seconds: 0,
  trace: [],
  location: null,
  saveFailed: false,
};

export const inputMachine = setup({
  types: { context: {} as Ctx, events: {} as Ev },
  actors: {
    mic: micActor,
    save: saveActor,
  },
  guards: {
    hasLocation: ({ context }) => context.location !== null,
  },
}).createMachine({
  id: "input",
  initial: "idle",
  context: fresh,
  states: {
    idle: {
      entry: assign(({ context }) => {
        if (context.audioUrl) URL.revokeObjectURL(context.audioUrl);
        return fresh;
      }),
      on: { OPEN: { target: "choosing" } },
    },

    choosing: {
      on: {
        RECORD: { target: "recording" },
        PICKED: {
          target: "reviewing",
          actions: assign(({ event }) => ({
            blob: event.file,
            audioUrl: URL.createObjectURL(event.file),
          })),
        },
      },
    },

    recording: {
      invoke: { id: "mic", src: "mic" },
      on: {
        "MIC.LEVEL": {
          actions: assign(({ context, event }) => ({
            seconds: event.seconds,
            trace: [...context.trace.slice(-71), event.rms],
          })),
        },
        "MIC.DONE": {
          target: "reviewing",
          actions: assign(({ event }) => ({
            blob: event.blob,
            audioUrl: URL.createObjectURL(event.blob),
          })),
        },
        "MIC.ERROR": { target: "micDenied" },
        STOP: { actions: sendTo("mic", { type: "STOP" }) },
      },
    },

    micDenied: {
      on: {
        RETRY: { target: "recording" },
        BACK: { target: "choosing" },
      },
    },

    reviewing: {
      on: {
        RETAKE: {
          target: "choosing",
          actions: assign(({ context }) => {
            if (context.audioUrl) URL.revokeObjectURL(context.audioUrl);
            return { blob: null, audioUrl: null, seconds: 0, trace: [] };
          }),
        },
        ACCEPT: { target: "placing" },
      },
    },

    placing: {
      on: {
        PICK: {
          actions: assign(({ event }) => ({
            location: { lng: event.lng, lat: event.lat },
          })),
        },
        CONFIRM: { target: "saving", guard: "hasLocation" },
      },
    },

    saving: {
      invoke: {
        src: "save",
        input: ({ context, event }) => {
          if (event.type !== "CONFIRM")
            throw new Error("saving requires CONFIRM");
          return {
            blob: context.blob!,
            location: context.location!,
            save: event.save,
          };
        },
        onDone: { target: "saved" },
        onError: {
          target: "placing",
          actions: assign({ saveFailed: true }),
        },
      },
    },

    saved: {
      after: { 2200: { target: "idle" } },
    },
  },
  on: { CANCEL: { target: ".idle" } },
});
