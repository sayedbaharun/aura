import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Lock,
  Shield,
  ShieldCheck,
  ShieldOff,
  Key,
  Smartphone,
  Copy,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Clock,
  MapPin,
} from "lucide-react";

interface TwoFactorStatus {
  enabled: boolean;
  backupCodesRemaining?: number;
  hasRecoveryKey?: boolean;
}

interface AuditLogEntry {
  id: number;
  action: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

interface TwoFactorSetupData {
  secret: string;
  qrCode: string;
  backupCodes: string[];
  recoveryKey: string;
}

export default function SecuritySettings() {
  const { toast } = useToast();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // 2FA state
  const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null);
  const [verifyToken, setVerifyToken] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [regeneratedCodes, setRegeneratedCodes] = useState<string[] | null>(null);
  const [regeneratePassword, setRegeneratePassword] = useState("");
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

  // Fetch 2FA status
  const { data: twoFactorStatus, isLoading: loadingStatus } = useQuery<TwoFactorStatus>({
    queryKey: ["/api/auth/2fa/status"],
  });

  // Fetch security log
  const { data: securityLog, isLoading: loadingLog } = useQuery<{ logs: AuditLogEntry[] }>({
    queryKey: ["/api/auth/security-log"],
  });

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/auth/change-password", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  // 2FA setup mutation
  const setup2FAMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/2fa/setup");
      return await res.json();
    },
    onSuccess: (data) => {
      setSetupData(data);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to setup 2FA",
        variant: "destructive",
      });
    },
  });

  // 2FA enable mutation
  const enable2FAMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await apiRequest("POST", "/api/auth/2fa/enable", { token });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication is now active on your account.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/2fa/status"] });
      setSetupData(null);
      setVerifyToken("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
    },
  });

  // 2FA disable mutation
  const disable2FAMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest("POST", "/api/auth/2fa/disable", { password });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/2fa/status"] });
      setShowDisableDialog(false);
      setDisablePassword("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disable 2FA",
        variant: "destructive",
      });
    },
  });

  // Regenerate backup codes mutation
  const regenerateCodesMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest("POST", "/api/auth/2fa/regenerate-backup-codes", { password });
      return await res.json();
    },
    onSuccess: (data) => {
      setRegeneratedCodes(data.backupCodes);
      setShowRegenerateDialog(false);
      setRegeneratePassword("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/2fa/status"] });
      toast({
        title: "Backup codes regenerated",
        description: "Your old codes are now invalid. Save the new ones.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate codes",
        variant: "destructive",
      });
    },
  });

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length < 12) {
      toast({
        title: "Error",
        description: "Password must be at least 12 characters",
        variant: "destructive",
      });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  const formatAction = (action: string) => {
    const actionMap: Record<string, { label: string; variant: "default" | "destructive" | "secondary" }> = {
      login_success: { label: "Login", variant: "default" },
      login_failed: { label: "Failed Login", variant: "destructive" },
      logout: { label: "Logout", variant: "secondary" },
      password_changed: { label: "Password Changed", variant: "default" },
      "2fa_enabled": { label: "2FA Enabled", variant: "default" },
      "2fa_disabled": { label: "2FA Disabled", variant: "destructive" },
      "2fa_backup_used": { label: "Backup Code Used", variant: "secondary" },
      new_device_login: { label: "New Device", variant: "secondary" },
      new_ip_login: { label: "New IP", variant: "secondary" },
    };
    return actionMap[action] || { label: action, variant: "secondary" as const };
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  if (loadingStatus) {
    return (
      <div className="space-y-6">
        <div className="h-40 bg-muted animate-pulse rounded-lg" />
        <div className="h-60 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 12 characters"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>

          <Button
            onClick={handlePasswordChange}
            disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
          >
            {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
          </Button>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
            {twoFactorStatus?.enabled ? (
              <Badge variant="default" className="ml-2 bg-green-600">
                <ShieldCheck className="h-3 w-3 mr-1" /> Enabled
              </Badge>
            ) : (
              <Badge variant="secondary" className="ml-2">
                <ShieldOff className="h-3 w-3 mr-1" /> Disabled
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account with TOTP-based 2FA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!twoFactorStatus?.enabled && !setupData && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Recommended Security</AlertTitle>
                <AlertDescription>
                  Enable two-factor authentication to protect your account from unauthorized access.
                  You'll need an authenticator app like Google Authenticator, Authy, or 1Password.
                </AlertDescription>
              </Alert>
              <Button onClick={() => setup2FAMutation.mutate()} disabled={setup2FAMutation.isPending}>
                <Smartphone className="h-4 w-4 mr-2" />
                {setup2FAMutation.isPending ? "Setting up..." : "Setup 2FA"}
              </Button>
            </div>
          )}

          {/* 2FA Setup Flow */}
          {setupData && (
            <div className="space-y-6">
              <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                <Smartphone className="h-4 w-4 text-blue-600" />
                <AlertTitle>Step 1: Scan QR Code</AlertTitle>
                <AlertDescription>
                  Scan this QR code with your authenticator app
                </AlertDescription>
              </Alert>

              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img src={setupData.qrCode} alt="2FA QR Code" className="w-48 h-48" />
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p>Can't scan? Enter this code manually:</p>
                <code className="block mt-1 p-2 bg-muted rounded font-mono text-xs break-all">
                  {setupData.secret}
                </code>
              </div>

              <Separator />

              <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
                <Key className="h-4 w-4 text-amber-600" />
                <AlertTitle>Step 2: Save Recovery Key</AlertTitle>
                <AlertDescription>
                  This is your emergency recovery key. Save it in a secure location - it's your last resort if you lose access to your authenticator and backup codes.
                </AlertDescription>
              </Alert>

              <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between">
                  <code className="font-mono text-sm break-all">{setupData.recoveryKey}</code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(setupData.recoveryKey, "Recovery key")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              <Alert>
                <Key className="h-4 w-4" />
                <AlertTitle>Step 3: Save Backup Codes</AlertTitle>
                <AlertDescription>
                  These one-time codes can be used if you lose access to your authenticator app.
                  Each code can only be used once.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
                {setupData.backupCodes.map((code, i) => (
                  <code key={i} className="font-mono text-sm p-2 bg-background rounded text-center">
                    {code}
                  </code>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={() => copyToClipboard(setupData.backupCodes.join('\n'), "Backup codes")}
                className="w-full"
              >
                <Copy className="h-4 w-4 mr-2" /> Copy All Backup Codes
              </Button>

              <Separator />

              <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle>Step 4: Verify Setup</AlertTitle>
                <AlertDescription>
                  Enter a code from your authenticator app to complete setup
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Input
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="font-mono text-lg tracking-widest"
                />
                <Button
                  onClick={() => enable2FAMutation.mutate(verifyToken)}
                  disabled={enable2FAMutation.isPending || verifyToken.length < 6}
                >
                  {enable2FAMutation.isPending ? "Verifying..." : "Enable 2FA"}
                </Button>
              </div>

              <Button
                variant="ghost"
                onClick={() => {
                  setSetupData(null);
                  setVerifyToken("");
                }}
              >
                Cancel Setup
              </Button>
            </div>
          )}

          {/* 2FA Enabled State */}
          {twoFactorStatus?.enabled && !setupData && (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                <AlertTitle>Two-factor authentication is active</AlertTitle>
                <AlertDescription>
                  Your account is protected with an additional layer of security.
                  {twoFactorStatus.backupCodesRemaining !== undefined && (
                    <span className="block mt-1">
                      Backup codes remaining: <strong>{twoFactorStatus.backupCodesRemaining}</strong>
                    </span>
                  )}
                </AlertDescription>
              </Alert>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setShowRegenerateDialog(true)}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Regenerate Backup Codes
                </Button>
                <Button variant="destructive" onClick={() => setShowDisableDialog(true)}>
                  <ShieldOff className="h-4 w-4 mr-2" /> Disable 2FA
                </Button>
              </div>

              {/* Show regenerated codes */}
              {regeneratedCodes && (
                <div className="space-y-2">
                  <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
                    <Key className="h-4 w-4 text-amber-600" />
                    <AlertTitle>New Backup Codes</AlertTitle>
                    <AlertDescription>
                      Save these codes securely. Your old codes are now invalid.
                    </AlertDescription>
                  </Alert>
                  <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
                    {regeneratedCodes.map((code, i) => (
                      <code key={i} className="font-mono text-sm p-2 bg-background rounded text-center">
                        {code}
                      </code>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(regeneratedCodes.join('\n'), "Backup codes")}
                    className="w-full"
                  >
                    <Copy className="h-4 w-4 mr-2" /> Copy All Backup Codes
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setRegeneratedCodes(null)}
                    className="w-full"
                  >
                    Done
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Security Activity
          </CardTitle>
          <CardDescription>
            Recent login attempts and security events on your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingLog ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : securityLog?.logs && securityLog.logs.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {securityLog.logs.slice(0, 20).map((log) => {
                const actionInfo = formatAction(log.action);
                return (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={actionInfo.variant}>{actionInfo.label}</Badge>
                      <div className="text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{log.ipAddress || "Unknown IP"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(log.createdAt)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No recent security activity
            </p>
          )}
        </CardContent>
      </Card>

      {/* Disable 2FA Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              This will remove the extra security from your account. Enter your password to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="disablePassword">Password</Label>
              <Input
                id="disablePassword"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisableDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => disable2FAMutation.mutate(disablePassword)}
              disabled={disable2FAMutation.isPending || !disablePassword}
            >
              {disable2FAMutation.isPending ? "Disabling..." : "Disable 2FA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Backup Codes Dialog */}
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Backup Codes</DialogTitle>
            <DialogDescription>
              This will invalidate all your existing backup codes. Enter your password to generate new ones.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="regeneratePassword">Password</Label>
              <Input
                id="regeneratePassword"
                type="password"
                value={regeneratePassword}
                onChange={(e) => setRegeneratePassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegenerateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => regenerateCodesMutation.mutate(regeneratePassword)}
              disabled={regenerateCodesMutation.isPending || !regeneratePassword}
            >
              {regenerateCodesMutation.isPending ? "Generating..." : "Regenerate Codes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
