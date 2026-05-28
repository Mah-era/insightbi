import { Link } from 'react-router-dom';
import { Zap, BarChart3, Database, Share2, Shield, TrendingUp, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FEATURES = [
  { icon: Database, title: 'Data Import', desc: 'Upload CSV and Excel files, auto-detect column types, and preview your data instantly.' },
  { icon: BarChart3, title: 'Interactive Charts', desc: 'Build bar, line, pie, area, scatter, gauge charts and KPI cards with live data.' },
  { icon: TrendingUp, title: 'Drag & Drop Builder', desc: 'Arrange and resize widgets on a flexible canvas — no code required.' },
  { icon: Share2, title: 'Share & Collaborate', desc: 'Share dashboards with team members or generate public links with view/edit permissions.' },
  { icon: Shield, title: 'Role-Based Access', desc: 'Admin, Editor, and Viewer roles keep your data secure across workspaces.' },
  { icon: Zap, title: 'Data Transformation', desc: 'Clean, filter, sort, rename, and create calculated columns with step tracking.' },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Nav */}
      <nav className="border-b sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-lg">InsightBI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
            <Link to="/register"><Button size="sm">Get Started Free</Button></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-blue-50 text-blue-700 text-xs font-medium mb-6 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900">
          <Zap className="w-3 h-3" /> Professional Business Intelligence Platform
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-5 leading-tight">
          Turn Data Into<br />
          <span className="text-blue-600">Actionable Insights</span>
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-8">
          Import datasets, build interactive dashboards, create stunning visualizations,
          and share insights with your team — all in one platform.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/register">
            <Button size="lg" className="gap-2">
              Start Building <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline">
              Demo Login
            </Button>
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Demo: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">admin@insightbi.com</code> / <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">Admin@123456</code>
        </p>
      </section>

      {/* Dashboard preview mockup */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="rounded-2xl border bg-gray-50 dark:bg-gray-900 overflow-hidden shadow-2xl">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-white dark:bg-gray-900">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="ml-3 text-xs text-gray-400">InsightBI — Sales Performance Dashboard</span>
          </div>
          <div className="grid grid-cols-4 gap-3 p-4">
            {[{ label: 'Total Revenue', value: '$2.4M', change: '+12%', color: 'blue' },
              { label: 'Total Units', value: '5,840', change: '+8%', color: 'emerald' },
              { label: 'Avg Order', value: '$411', change: '+3%', color: 'violet' },
              { label: 'Customers', value: '1,248', change: '+18%', color: 'amber' }].map((kpi) => (
              <div key={kpi.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 border">
                <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpi.value}</p>
                <p className="text-xs text-emerald-500 mt-1">{kpi.change} vs last month</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 px-4 pb-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border p-4 h-32 flex items-center justify-center">
              <div className="flex items-end gap-2 h-16">
                {[60, 80, 45, 90, 70, 85, 55].map((h, i) => (
                  <div key={i} className="w-5 bg-blue-500 rounded-t-sm opacity-80" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border p-4 h-32 flex items-center justify-center">
              <div className="relative w-20 h-20">
                <svg viewBox="0 0 36 36" className="w-full h-full">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray="60 40" strokeDashoffset="25" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="25 75" strokeDashoffset="-35" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Sales</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">Everything You Need</h2>
        <div className="grid grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-6 rounded-xl border hover:border-blue-200 hover:shadow-md transition-all dark:hover:border-blue-900">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="bg-blue-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-blue-100 mb-8">Join teams already using InsightBI to make better data-driven decisions.</p>
          <Link to="/register">
            <Button size="lg" variant="secondary" className="gap-2">
              Create Free Account <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-sm">InsightBI</span>
          </div>
          <p className="text-xs text-gray-400">© 2025 InsightBI. Professional BI Platform.</p>
        </div>
      </footer>
    </div>
  );
}
