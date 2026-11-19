export default function Loading() {
  return (
    <main
      className="mx-auto max-w-3xl px-5 pb-24 pt-28 sm:px-8"
      aria-busy="true"
    >
      <div className="pb-8">
        <div className="h-9 w-36 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-4 w-full max-w-md animate-pulse rounded bg-muted" />
      </div>
      <div className="flex flex-col gap-3 border-y border-border py-4">
        <div className="h-9 w-full max-w-xs animate-pulse rounded-md bg-muted" />
        <div className="h-8 w-full animate-pulse rounded-full bg-muted" />
      </div>
      <div className="pt-10">
        <div className="aspect-[3/2] w-full animate-pulse rounded-xl bg-muted" />
        <div className="mt-6 h-3 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-8 w-4/5 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-4 w-full animate-pulse rounded bg-muted" />
      </div>
      <p role="status" className="sr-only">
        Loading articles…
      </p>
      <ol>
        {Array.from({ length: 4 }, (_, i) => (
          <li
            key={i}
            className="flex gap-4 border-b border-border py-8 sm:gap-6"
          >
            <div className="hidden aspect-[3/2] w-32 shrink-0 animate-pulse rounded-md bg-muted sm:block" />
            <div className="w-full space-y-2.5">
              <div className="h-3 w-28 animate-pulse rounded bg-muted" />
              <div className="h-6 w-4/5 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
