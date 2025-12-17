import Image from "next/image";

export default function Loading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="flex flex-col items-center gap-5">
        <div className="rounded-3xl border bg-background/60 p-6 backdrop-blur-xl">
          <Image
            src="/brand/logo.png"
            alt="Pop N Drop"
            width={220}
            height={220}
            priority
            className="animate-[pop_700ms_ease-out]"
          />
        </div>
        <div className="text-sm opacity-70">Loading</div>

        <style>{`
          @keyframes pop {
            0% { transform: scale(0.85); opacity: 0; }
            60% { transform: scale(1.06); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}
