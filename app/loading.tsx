export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <section className="surface-panel rounded-[34px] p-6 sm:p-8">
        <div className="skeleton-sheen h-4 w-44 rounded-full bg-mist" />
        <div className="skeleton-sheen mt-6 h-10 max-w-2xl rounded-full bg-mist" />
        <div className="skeleton-sheen mt-4 h-5 max-w-xl rounded-full bg-mist" />
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="surface-panel skeleton-sheen h-44 rounded-[28px]"
          />
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="surface-panel skeleton-sheen h-80 rounded-[34px]" />
        <div className="surface-panel skeleton-sheen h-80 rounded-[34px]" />
      </section>
    </div>
  );
}
