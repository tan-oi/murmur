import { createActor, setup, type ActorRefFrom } from "xstate";
import { inputMachine } from "./input";
import { playerMachine } from "./user";

/* Supervisor: no states of its own — it exists to keep the long-lived
   children alive (root-level invoke = "run while I'm alive") and give
   them system-wide names. */

const appMachine = setup({
  actors: { input: inputMachine, player: playerMachine },
}).createMachine({
  id: "app",
  invoke: [
    { src: "input", systemId: "input" },
    { src: "player", systemId: "player" },
  ],
});

/** boots on first import — the "app start" moment */
export const appActor = createActor(appMachine).start();

/** typed handles for components: useSelector(inputActor, s => ...) */
export const inputActor = appActor.system.get("input") as ActorRefFrom<
  typeof inputMachine
>;
export const playerActor = appActor.system.get("player") as ActorRefFrom<
  typeof playerMachine
>;
