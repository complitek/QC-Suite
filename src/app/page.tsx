export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500 rounded-2xl mb-4">
            <span className="text-slate-900 font-black text-2xl">C</span>
          </div>
          <h1 className="text-white text-3xl font-bold tracking-tight">Complitek</h1>
          <p className="text-slate-400 text-sm mt-1">Federal Construction QC Suite</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700">
          <h2 className="text-white text-xl font-semibold mb-6">Sign in to your account</h2>

          <form className="space-y-5">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Email address
              </label>
              <input
                type="email"
                placeholder="you@company.com"
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-base"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-base"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded accent-yellow-500" />
                <span className="text-slate-400 text-sm">Remember me</span>
              </label>
              <a href="#" className="text-yellow-500 text-sm hover:text-yellow-400">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-3 px-4 rounded-xl transition-colors text-base"
            >
              Sign In
            </button>
          </form>
        </div>

        {/* Agency badges */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <span className="text-slate-500 text-xs">Authorized for use with</span>
        </div>
        <div className="flex items-center justify-center gap-3 mt-2">
          {['NAVFAC', 'USACE', 'ANG'].map(agency => (
            <span key={agency} className="bg-slate-800 border border-slate-700 text-slate-400 text-xs px-3 py-1 rounded-full">
              {agency}
            </span>
          ))}
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          © 2025 Complitek · Federal Construction QC Suite
        </p>
      </div>
    </div>
  )
}
