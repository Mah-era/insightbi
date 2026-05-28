import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { authAPI } from '@/services/api';
import { toast } from '@/hooks/useToast';

export function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [name, setName] = useState(user?.name || '');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [saving, setSaving] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await authAPI.updateProfile({ name });
      setUser(res.data.data);
      toast({ title: 'Profile updated!' });
    } catch {
      toast({ title: 'Update failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!currentPw || !newPw) return;
    setSaving(true);
    try {
      await authAPI.changePassword({ currentPassword: currentPw, newPassword: newPw });
      setCurrentPw(''); setNewPw('');
      toast({ title: 'Password changed!' });
    } catch (err: unknown) {
      toast({ title: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <Header title="Settings" />
      <div className="flex-1 p-6 max-w-2xl space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input value={user?.email || ''} disabled className="opacity-60" /></div>
            <div className="space-y-1.5"><Label>Role</Label><Input value={user?.role || ''} disabled className="opacity-60" /></div>
            <Button onClick={saveProfile} loading={saving} size="sm">Save Profile</Button>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Appearance</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Switch between light and dark theme</p>
              </div>
              <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
            </div>
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Change Password</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5"><Label>Current Password</Label><Input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>New Password</Label><Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} minLength={8} /></div>
            <Button onClick={changePassword} loading={saving} size="sm" disabled={!currentPw || !newPw}>Update Password</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
