import { useRef, useState } from "react";

export function UploadDrop({
  onPicked,
}: {
  onPicked: (url: string, file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const take = (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      setError("that doesn't sound like audio — try a .mp3, .wav or .m4a");
      return;
    }
    setError(null);
    onPicked(URL.createObjectURL(file), file);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          take(e.dataTransfer.files?.[0]);
        }}
        className={`w-full cursor-pointer rounded-sm border-2 border-dashed px-4 py-8 text-center transition-colors duration-150 ${
          dragOver
            ? "border-rec bg-paper-dim"
            : "border-shell/50 hover:border-shell hover:bg-paper-dim/60"
        }`}
      >
        <span className="block font-hand text-2xl text-inkbrown">
          drop a recording here
        </span>
        <span className="mt-1 block font-mono text-[10px] uppercase tracking-widest text-shell">
          or click to browse — audio only
        </span>
      </button>
      {error && (
        <p className="mt-2 font-mono text-[11px] text-rec" role="alert">
          {error}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          take(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
