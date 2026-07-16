import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { SoundMap } from "#/components/SoundMap";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <ClientOnly fallback={<div className="p-8">Loading map...</div>}>
      <SoundMap />
    </ClientOnly>
  );
}
