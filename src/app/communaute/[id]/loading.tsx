export default function ChargementConversation() {
  return (
    <div className="flex h-[100dvh] min-w-0 flex-1 animate-pulse flex-col" style={{ background: "rgb(var(--bg-rgb))" }}>
      <div className="flex items-center gap-3 border-b px-4 py-3"
        style={{ borderColor: "rgba(var(--text-3-rgb), .12)" }}>
        <div className="h-8 w-8 rounded-full" style={{ background: "rgba(var(--text-3-rgb), .14)" }} />
        <div className="flex-1">
          <div className="h-3.5 w-28 rounded-full" style={{ background: "rgba(var(--text-3-rgb), .15)" }} />
          <div className="mt-2 h-2.5 w-20 rounded-full" style={{ background: "rgba(var(--text-3-rgb), .09)" }} />
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-end gap-3 px-4 py-5">
        <div className="h-12 w-[58%] rounded-2xl" style={{ background: "rgba(var(--text-3-rgb), .09)" }} />
        <div className="ml-auto h-16 w-[70%] rounded-2xl" style={{ background: "rgba(var(--tint-violet-rgb), .45)" }} />
        <div className="h-11 w-[46%] rounded-2xl" style={{ background: "rgba(var(--text-3-rgb), .09)" }} />
      </div>
      <div className="mx-3 mb-3 h-12 rounded-2xl" style={{ background: "rgba(var(--text-3-rgb), .1)" }} />
    </div>
  );
}
