export function ToolSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="h-4 w-48 rounded bg-card" />
      <div className="mt-6 h-14 w-72 rounded-xl bg-card" />
      <div className="mt-4 h-5 w-full max-w-[32rem] rounded bg-card" />
      <div className="mt-10 h-14 rounded-xl bg-card" />
    </div>
  );
}
