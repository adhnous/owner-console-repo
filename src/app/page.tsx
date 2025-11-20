import Link from 'next/link';

export default function Home() {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="card p-6 md:p-8 bg-gradient-to-r from-[#111827] via-[#020617] to-[#0f172a] text-white overflow-hidden relative">
        <div className="absolute inset-y-0 right-0 opacity-20 pointer-events-none hidden md:block">
          <div className="h-full w-64 bg-[radial-gradient(circle_at_top,_#f97316,_transparent_60%),_radial-gradient(circle_at_bottom,_#22c55e,_transparent_55%)]" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
            Khidmaty • Owner Console
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            Moderate services and sales with confidence
          </h1>
          <p className="mt-3 text-sm text-slate-200 md:text-base">
            Review new listings, keep the marketplace clean, and quickly approve or hide
            services and sale items across Khidmaty.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/services"
              className="btn btn-primary bg-orange-500 hover:bg-orange-600 text-white"
            >
              Review services
            </Link>
            <Link
              href="/sales"
              className="btn btn-secondary bg-white/10 border border-white/30 text-slate-100 hover:bg-white/15"
            >
              Review sale items
            </Link>
          </div>
        </div>
      </div>

      {/* Quick sections */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/services" className="card p-4 hover:no-underline">
          <h2 className="text-sm font-semibold text-gray-900">Services moderation</h2>
          <p className="mt-1 text-xs text-gray-600">
            Approve, reject, or return services to pending. See provider info and contact
            details at a glance.
          </p>
        </Link>

        <Link href="/sales" className="card p-4 hover:no-underline">
          <h2 className="text-sm font-semibold text-gray-900">Sales moderation</h2>
          <p className="mt-1 text-xs text-gray-600">
            Check sale items, prices, and photos, then mark them as approved, sold, or
            hidden.
          </p>
        </Link>

        <Link href="/settings/featured-videos" className="card p-4 hover:no-underline">
          <h2 className="text-sm font-semibold text-gray-900">Homepage content</h2>
          <p className="mt-1 text-xs text-gray-600">
            Curate featured videos and key content that appears on the Khidmaty landing page.
          </p>
        </Link>

        <Link href="/student-bank/admin" className="card p-4 hover:no-underline">
          <h2 className="text-sm font-semibold text-gray-900">Student resources</h2>
          <p className="mt-1 text-xs text-gray-600">
            Review, edit, or delete items in the Student Resource Bank.
          </p>
        </Link>
      </div>
    </div>
  );
}
