import { assign, setup } from "xstate";

type Ctx = {
  key: string | null;
  audio: HTMLAudioElement | null;
  time: number;
  duration: number;
};

type Ev =
  | { type: "PLAY"; key: string; url: string }
  | { type: "STOP" }
  | { type: "TIME"; time: number; duration: number }
  | { type: "ENDED" };

const silence: Ctx = { key: null, audio: null, time: 0, duration: 0 };

export const playerMachine = setup({
  types: { context: {} as Ctx, events: {} as Ev },
  guards: {
    sameKey: ({ context, event }) =>
      event.type === "PLAY" && event.key === context.key,
  },
  actions: {
    stopDeck: assign(({ context }) => {
      context.audio?.pause();
      return silence;
    }),
    startDeck: assign(({ event, self }) => {
      if (event.type !== "PLAY") return {};
      const audio = new Audio(event.url);
      // the element reports back in as events — never touches context itself
      audio.ontimeupdate = () =>
        self.send({
          type: "TIME",
          time: audio.currentTime,
          duration: audio.duration || 0,
        });
      audio.onended = () => self.send({ type: "ENDED" });
      audio.play();
      return { key: event.key, audio, time: 0, duration: 0 };
    }),
    syncTime: assign(({ event }) =>
      event.type === "TIME"
        ? { time: event.time, duration: event.duration }
        : {}
    ),
  },
}).createMachine({
  id: "player",
  initial: "silent",
  context: silence,
  states: {
    silent: {
      on: { PLAY: { target: "playing", actions: "startDeck" } },
    },
    playing: {
      on: {
        PLAY: [
          { guard: "sameKey", target: "silent", actions: "stopDeck" }, // tap again = stop
          {
            target: "playing",
            reenter: true,
            actions: ["stopDeck", "startDeck"], // switch tracks
          },
        ],
        STOP: { target: "silent", actions: "stopDeck" },
        TIME: { actions: "syncTime" },
        ENDED: { target: "silent", actions: assign(() => silence) },
      },
    },
  },
});
