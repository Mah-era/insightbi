import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/authStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { authAPI, workspaceAPI } from '@/services/api';
import { toast } from '@/hooks/useToast';

export function LoginPage() {
  // User tab state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // Admin tab state
  const [adminEmail, setAdminEmail] = useState('admin@insightbi.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPw, setShowAdminPw] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  const { setAuth } = useAuthStore();
  const { setWorkspaces, setActiveWorkspace } = useWorkspaceStore();
  const navigate = useNavigate();

  const doLogin = async (loginEmail: string, loginPassword: string, setL: (b: boolean) => void) => {
    setL(true);
    try {
      const res = await authAPI.login({ email: loginEmail, password: loginPassword });
      const { user, token } = res.data.data;
      setAuth(user, token);

      const wsRes = await workspaceAPI.list();
      const workspaces = wsRes.data.data;
      setWorkspaces(workspaces);
      if (workspaces.length > 0) setActiveWorkspace(workspaces[0]);

      toast({ title: 'Welcome back!', description: `Signed in as ${user.name}`, variant: 'default' });
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed';
      toast({ title: 'Sign in failed', description: msg, variant: 'destructive' });
    } finally {
      setL(false);
    }
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doLogin(email, password, setLoading);
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminEmail !== 'admin@insightbi.com') {
      toast({ title: 'Admin access restricted', description: 'Only admin@insightbi.com can use this tab.', variant: 'destructive' });
      return;
    }
    doLogin(adminEmail, adminPassword, setAdminLoading);
  };

  const leftPanel = (
    <div className="hidden lg:flex flex-col w-1/2 bg-sidebar p-12 justify-between">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-sidebar-foreground font-bold text-xl">InsightBI</span>
      </div>
      <div>
        <blockquote className="text-sidebar-foreground/80 text-lg font-medium leading-relaxed mb-6">
          "InsightBI transforms how sales data must be analyzed, saving time by replacing spreadsheet juggling with real-time dashboards in a single day."
        </blockquote>
        <p className="text-sidebar-foreground/50 text-sm">— Mahera Tasfee, founder, CEO of InsightBI</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[['10K+', 'Datasets'], ['50K+', 'Reports'], ['2K+', 'Teams']].map(([n, l]) => (
          <div key={l} className="bg-sidebar-accent rounded-xl p-4">
            <p className="text-2xl font-bold text-sidebar-foreground">{n}</p>
            <p className="text-xs text-sidebar-foreground/50">{l}</p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {leftPanel}

      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">InsightBI</span>
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="w-full mb-6">
              <TabsTrigger value="signin" className="flex-1">Sign In</TabsTrigger>
              <TabsTrigger value="admin" className="flex-1">Admin</TabsTrigger>
            </TabsList>

            {/* --- User Sign In Tab --- */}
            <TabsContent value="signin">
              <Card className="border-0 shadow-none">
                <CardHeader className="px-0">
                  <CardTitle className="text-2xl">Sign in</CardTitle>
                  <CardDescription>Enter your credentials to access your workspace</CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                  <form onSubmit={handleUserSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        autoComplete="email"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Password</Label>
                      <div className="relative">
                        <Input
                          type={showPw ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          autoComplete="current-password"
                          required
                          className="pr-10"
                        />
                        <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" loading={loading}>Sign In</Button>
                  </form>

                  <div className="mt-4 p-3 bg-muted rounded-lg text-xs text-muted-foreground">
                    <p className="font-medium mb-2 text-foreground">Demo account — click to fill:</p>
                    <button
                      type="button"
                      onClick={() => { setEmail('demo@insightbi.com'); setPassword('Demo@123456'); }}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-muted-foreground/10 transition-colors border border-transparent hover:border-border"
                    >
                      <span className="font-medium text-foreground">Demo User:</span> demo@insightbi.com · Demo@123456
                    </button>
                    <p className="mt-2 text-[10px] text-muted-foreground/70">Or enter your own credentials above and sign in.</p>
                  </div>

                  <p className="text-sm text-center mt-5 text-muted-foreground">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-primary hover:underline font-medium">Create one</Link>
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* --- Admin Tab --- */}
            <TabsContent value="admin">
              <Card className="border-0 shadow-none">
                <CardHeader className="px-0">
                  <CardTitle className="text-2xl">Admin Access</CardTitle>
                  <CardDescription>Restricted to admin@insightbi.com only</CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                  <form onSubmit={handleAdminSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Admin Email</Label>
                      <Input
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        autoComplete="off"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Password</Label>
                      <div className="relative">
                        <Input
                          type={showAdminPw ? 'text' : 'password'}
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="••••••••"
                          autoComplete="off"
                          required
                          className="pr-10"
                        />
                        <button type="button" onClick={() => setShowAdminPw(!showAdminPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showAdminPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" loading={adminLoading}>Sign In as Admin</Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
