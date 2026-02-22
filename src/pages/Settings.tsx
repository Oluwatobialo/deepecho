import { useState } from 'react';
import TopNav from '../components/TopNav';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Checkbox } from '../components/ui/checkbox';
import { User, Shield, Bell, Lock, Mail, Briefcase } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

type TabValue = 'profile' | 'security' | 'alerts';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabValue>('profile');
  
  // Profile settings
  const [fullName, setFullName] = useState('Dr. Sarah Mitchell');
  const [email, setEmail] = useState('sarah.mitchell@deecho.health');
  const [professionalTitle, setProfessionalTitle] = useState('Clinical Psychologist');
  
  // Security settings
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  
  // Alert settings
  const [emailHighRisk, setEmailHighRisk] = useState(true);
  const [desktopNotifications, setDesktopNotifications] = useState(false);

  const handleSaveProfile = () => {
    if (!fullName || !email || !professionalTitle) {
      toast.error('Please fill in all required fields');
      return;
    }
    toast.success('Profile updated successfully');
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    // Reset fields and show success
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast.success('Password changed successfully');
  };

  const handleSaveAlerts = () => {
    toast.success('Alert preferences saved');
  };

  const tabs = [
    { value: 'profile' as TabValue, label: 'Profile', icon: User },
    { value: 'security' as TabValue, label: 'Security', icon: Shield },
    { value: 'alerts' as TabValue, label: 'Alerts', icon: Bell },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--gray-25)' }}>
      <TopNav />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold" style={{ color: 'var(--gray-900)' }}>
            Settings
          </h1>
          <p className="mt-1" style={{ color: 'var(--gray-700)', fontSize: '14px' }}>
            Manage your account and preferences
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Vertical Tabs - Left Side */}
          <div className="w-full md:w-64 flex-shrink-0">
            <Card style={{ borderColor: 'var(--gray-200)' }}>
              <CardContent className="p-0">
                <nav className="space-y-1 p-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.value;
                    return (
                      <button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors"
                        style={{
                          backgroundColor: isActive ? 'var(--brand-600)' : 'transparent',
                          color: isActive ? 'white' : 'var(--gray-700)',
                          fontFamily: 'Inter',
                          fontSize: '14px',
                          fontWeight: isActive ? 500 : 400,
                        }}
                      >
                        <Icon className="w-5 h-5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Content Area - Right Side */}
          <div className="flex-1">
            {activeTab === 'profile' && (
              <Card style={{ borderColor: 'var(--gray-200)' }}>
                <CardHeader>
                  <CardTitle style={{ fontSize: '18px', fontFamily: 'Inter' }}>
                    Account Info
                  </CardTitle>
                  <p className="text-sm mt-1" style={{ color: 'var(--gray-700)' }}>
                    Update your personal information
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="flex items-center gap-2" style={{ fontSize: '14px' }}>
                      <User className="w-4 h-4" style={{ color: 'var(--gray-700)' }} />
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="p-3"
                      style={{ 
                        fontFamily: 'Inter',
                        fontSize: '14px',
                        borderRadius: '8px',
                        borderColor: 'var(--gray-200)'
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2" style={{ fontSize: '14px' }}>
                      <Mail className="w-4 h-4" style={{ color: 'var(--gray-700)' }} />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="p-3"
                      style={{ 
                        fontFamily: 'Inter',
                        fontSize: '14px',
                        borderRadius: '8px',
                        borderColor: 'var(--gray-200)'
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="professionalTitle" className="flex items-center gap-2" style={{ fontSize: '14px' }}>
                      <Briefcase className="w-4 h-4" style={{ color: 'var(--gray-700)' }} />
                      Professional Title
                    </Label>
                    <Input
                      id="professionalTitle"
                      value={professionalTitle}
                      onChange={(e) => setProfessionalTitle(e.target.value)}
                      placeholder="e.g., Clinical Psychologist"
                      className="p-3"
                      style={{ 
                        fontFamily: 'Inter',
                        fontSize: '14px',
                        borderRadius: '8px',
                        borderColor: 'var(--gray-200)'
                      }}
                    />
                  </div>

                  <div className="pt-4">
                    <Button 
                      onClick={handleSaveProfile}
                      className="font-medium"
                      style={{ 
                        backgroundColor: 'var(--brand-600)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '14px'
                      }}
                    >
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'security' && (
              <Card style={{ borderColor: 'var(--gray-200)' }}>
                <CardHeader>
                  <CardTitle style={{ fontSize: '18px', fontFamily: 'Inter' }}>
                    Security Hub
                  </CardTitle>
                  <p className="text-sm mt-1" style={{ color: 'var(--gray-700)' }}>
                    Manage your security settings
                  </p>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Change Password Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: 'var(--gray-200)' }}>
                      <Lock className="w-5 h-5" style={{ color: 'var(--brand-600)' }} />
                      <h3 className="font-semibold" style={{ fontSize: '16px', fontFamily: 'Inter' }}>
                        Change Password
                      </h3>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" style={{ fontSize: '14px' }}>
                        Current Password
                      </Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="p-3"
                        style={{ 
                          fontFamily: 'Inter',
                          fontSize: '14px',
                          borderRadius: '8px',
                          borderColor: 'var(--gray-200)'
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword" style={{ fontSize: '14px' }}>
                        New Password
                      </Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="p-3"
                        style={{ 
                          fontFamily: 'Inter',
                          fontSize: '14px',
                          borderRadius: '8px',
                          borderColor: 'var(--gray-200)'
                        }}
                      />
                      <p className="text-xs" style={{ color: 'var(--gray-700)' }}>
                        Must be at least 8 characters
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" style={{ fontSize: '14px' }}>
                        Confirm New Password
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="p-3"
                        style={{ 
                          fontFamily: 'Inter',
                          fontSize: '14px',
                          borderRadius: '8px',
                          borderColor: 'var(--gray-200)'
                        }}
                      />
                    </div>

                    <Button 
                      onClick={handleChangePassword}
                      className="font-medium"
                      style={{ 
                        backgroundColor: 'var(--brand-600)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '14px'
                      }}
                    >
                      Update Password
                    </Button>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: 'var(--gray-200)' }}>
                      <Shield className="w-5 h-5" style={{ color: 'var(--brand-600)' }} />
                      <h3 className="font-semibold" style={{ fontSize: '16px', fontFamily: 'Inter' }}>
                        Extra Login Security
                      </h3>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'var(--gray-50)' }}>
                      <div className="flex-1">
                        <p className="font-medium" style={{ fontSize: '14px', color: 'var(--gray-900)' }}>
                          Two-Factor Authentication (2FA)
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--gray-700)' }}>
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <Switch
                        checked={twoFactorEnabled}
                        onCheckedChange={setTwoFactorEnabled}
                        className={twoFactorEnabled ? '[&[data-state=checked]]:bg-[var(--brand-600)]' : ''}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'alerts' && (
              <Card style={{ borderColor: 'var(--gray-200)' }}>
                <CardHeader>
                  <CardTitle style={{ fontSize: '18px', fontFamily: 'Inter' }}>
                    Alert Settings
                  </CardTitle>
                  <p className="text-sm mt-1" style={{ color: 'var(--gray-700)' }}>
                    Customize your notification preferences
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 rounded-lg" style={{ backgroundColor: 'var(--gray-50)' }}>
                      <Checkbox
                        id="emailHighRisk"
                        checked={emailHighRisk}
                        onCheckedChange={(checked) => setEmailHighRisk(checked as boolean)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label 
                          htmlFor="emailHighRisk" 
                          className="cursor-pointer font-medium"
                          style={{ fontSize: '14px', color: 'var(--gray-900)' }}
                        >
                          Email me when a patient is High-Risk
                        </Label>
                        <p className="text-xs mt-1" style={{ color: 'var(--gray-700)' }}>
                          Receive immediate email notifications for patients flagged as high-risk
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 rounded-lg" style={{ backgroundColor: 'var(--gray-50)' }}>
                      <Checkbox
                        id="desktopNotifications"
                        checked={desktopNotifications}
                        onCheckedChange={(checked) => setDesktopNotifications(checked as boolean)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label 
                          htmlFor="desktopNotifications" 
                          className="cursor-pointer font-medium"
                          style={{ fontSize: '14px', color: 'var(--gray-900)' }}
                        >
                          Show desktop notifications for new entries
                        </Label>
                        <p className="text-xs mt-1" style={{ color: 'var(--gray-700)' }}>
                          Get real-time browser notifications when patients submit new journal entries
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button 
                      onClick={handleSaveAlerts}
                      className="font-medium"
                      style={{ 
                        backgroundColor: 'var(--brand-600)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '14px'
                      }}
                    >
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Privacy Disclaimer - Always visible at bottom */}
            <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--gray-50)', borderLeft: '4px solid var(--brand-600)' }}>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--gray-900)' }}>
                Privacy Disclaimer
              </p>
              <p className="text-xs" style={{ color: 'var(--gray-700)', lineHeight: '1.5' }}>
                All data is encrypted and handled according to privacy standards. DeepEcho is committed to protecting patient information and maintaining the highest level of data security in compliance with healthcare regulations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}