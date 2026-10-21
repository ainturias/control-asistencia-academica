/** Fondo decorativo suave (círculos difuminados) compartido por los paneles de admin y estudiante. */
export function AppBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-canvas print:hidden">
      <div className="absolute -top-48 -right-32 size-[560px] rounded-full bg-brand-soft blur-3xl" />
      <div className="absolute top-1/3 -right-40 size-[420px] rounded-full bg-violet-soft/70 blur-3xl" />
      <div className="absolute -bottom-56 left-1/4 size-[520px] rounded-full bg-teal-soft/60 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 size-[420px] rounded-full bg-brand-soft/70 blur-2xl" />
      <div className="absolute top-24 left-1/3 size-72 rounded-full bg-surface/60 blur-3xl" />
    </div>
  )
}
