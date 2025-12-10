import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Plus,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  Car,
  Gem,
  Bitcoin,
  CreditCard,
  Home,
  PiggyBank,
  Briefcase,
  Edit,
  Trash2,
  RefreshCw,
  History,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Types
interface FinancialAccount {
  id: string;
  name: string;
  type: string;
  institution: string | null;
  currentBalance: number;
  currency: string;
  isAsset: boolean;
  isActive: boolean;
  icon: string | null;
  color: string | null;
  notes: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

interface NetWorth {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  byType: Record<string, number>;
}

interface AccountSnapshot {
  id: string;
  accountId: string;
  balance: number;
  note: string | null;
  createdAt: string;
}

// Account type configuration
const accountTypeConfig: Record<string, { label: string; icon: React.ElementType; isAsset: boolean }> = {
  // Assets
  checking: { label: "Checking Account", icon: Wallet, isAsset: true },
  savings: { label: "Savings Account", icon: PiggyBank, isAsset: true },
  investment: { label: "Investment Account", icon: TrendingUp, isAsset: true },
  retirement: { label: "Retirement Account", icon: Briefcase, isAsset: true },
  crypto: { label: "Cryptocurrency", icon: Bitcoin, isAsset: true },
  property: { label: "Property", icon: Home, isAsset: true },
  vehicle: { label: "Vehicle", icon: Car, isAsset: true },
  jewelry: { label: "Jewelry/Precious Metals", icon: Gem, isAsset: true },
  collectible: { label: "Collectible", icon: Gem, isAsset: true },
  other_asset: { label: "Other Asset", icon: DollarSign, isAsset: true },
  // Liabilities
  credit_card: { label: "Credit Card", icon: CreditCard, isAsset: false },
  loan: { label: "Loan", icon: Building2, isAsset: false },
  mortgage: { label: "Mortgage", icon: Home, isAsset: false },
  other_debt: { label: "Other Debt", icon: CreditCard, isAsset: false },
};

// Format currency
const formatCurrency = (amount: number, currency: string = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function Finance() {
  const { toast } = useToast();
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);
  const [selectedAccountForBalance, setSelectedAccountForBalance] = useState<FinancialAccount | null>(null);
  const [selectedAccountForHistory, setSelectedAccountForHistory] = useState<FinancialAccount | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const [accountFormData, setAccountFormData] = useState({
    name: "",
    type: "checking" as string,
    institution: "",
    currentBalance: 0,
    currency: "USD",
    isAsset: true,
    isActive: true,
    notes: "",
  });

  const [balanceFormData, setBalanceFormData] = useState({
    balance: 0,
    note: "",
  });

  // Queries
  const { data: accounts = [], isLoading: accountsLoading } = useQuery<FinancialAccount[]>({
    queryKey: ["/api/finance/accounts"],
  });

  const { data: netWorth, isLoading: netWorthLoading } = useQuery<NetWorth>({
    queryKey: ["/api/finance/net-worth"],
  });

  const { data: accountHistory = [] } = useQuery<AccountSnapshot[]>({
    queryKey: ["/api/finance/accounts", selectedAccountForHistory?.id, "history"],
    enabled: !!selectedAccountForHistory,
    queryFn: async () => {
      const response = await fetch(`/api/finance/accounts/${selectedAccountForHistory!.id}/history`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch history");
      return response.json();
    },
  });

  // Mutations
  const createAccountMutation = useMutation({
    mutationFn: async (data: typeof accountFormData) => {
      return apiRequest("POST", "/api/finance/accounts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/net-worth"] });
      toast({ title: "Account created", description: "Financial account has been added." });
      closeAccountModal();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof accountFormData> }) => {
      return apiRequest("PATCH", `/api/finance/accounts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/net-worth"] });
      toast({ title: "Account updated", description: "Financial account has been updated." });
      closeAccountModal();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/finance/accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/net-worth"] });
      toast({ title: "Account deleted", description: "Financial account has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateBalanceMutation = useMutation({
    mutationFn: async ({ id, balance, note }: { id: string; balance: number; note?: string }) => {
      return apiRequest("POST", `/api/finance/accounts/${id}/balance`, { balance, note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/net-worth"] });
      toast({ title: "Balance updated", description: "Account balance has been updated." });
      closeBalanceModal();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Filter accounts
  const activeAccounts = accounts.filter((a) => showInactive || a.isActive);
  const assetAccounts = activeAccounts.filter((a) => a.isAsset);
  const liabilityAccounts = activeAccounts.filter((a) => !a.isAsset);

  // Modal handlers
  const openAccountModal = (account?: FinancialAccount) => {
    if (account) {
      setEditingAccount(account);
      setAccountFormData({
        name: account.name,
        type: account.type,
        institution: account.institution || "",
        currentBalance: account.currentBalance,
        currency: account.currency,
        isAsset: account.isAsset,
        isActive: account.isActive,
        notes: account.notes || "",
      });
    } else {
      setEditingAccount(null);
      setAccountFormData({
        name: "",
        type: "checking",
        institution: "",
        currentBalance: 0,
        currency: "USD",
        isAsset: true,
        isActive: true,
        notes: "",
      });
    }
    setIsAccountModalOpen(true);
  };

  const closeAccountModal = () => {
    setIsAccountModalOpen(false);
    setEditingAccount(null);
  };

  const openBalanceModal = (account: FinancialAccount) => {
    setSelectedAccountForBalance(account);
    setBalanceFormData({
      balance: account.currentBalance,
      note: "",
    });
    setIsBalanceModalOpen(true);
  };

  const closeBalanceModal = () => {
    setIsBalanceModalOpen(false);
    setSelectedAccountForBalance(null);
  };

  const openHistoryModal = (account: FinancialAccount) => {
    setSelectedAccountForHistory(account);
    setIsHistoryModalOpen(true);
  };

  const closeHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setSelectedAccountForHistory(null);
  };

  const handleAccountSubmit = () => {
    if (!accountFormData.name.trim()) {
      toast({ title: "Error", description: "Account name is required", variant: "destructive" });
      return;
    }

    // Set isAsset based on account type
    const typeConfig = accountTypeConfig[accountFormData.type];
    const data = {
      ...accountFormData,
      isAsset: typeConfig?.isAsset ?? true,
    };

    if (editingAccount) {
      updateAccountMutation.mutate({ id: editingAccount.id, data });
    } else {
      createAccountMutation.mutate(data);
    }
  };

  const handleBalanceSubmit = () => {
    if (!selectedAccountForBalance) return;
    updateBalanceMutation.mutate({
      id: selectedAccountForBalance.id,
      balance: balanceFormData.balance,
      note: balanceFormData.note || undefined,
    });
  };

  // Loading state
  if (accountsLoading || netWorthLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8" />
            Finance
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your net worth and financial accounts
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Switch
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
            <Label htmlFor="show-inactive" className="text-sm">Show inactive</Label>
          </div>
          <Button onClick={() => openAccountModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </div>
      </div>

      {/* Net Worth Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
              Total Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="text-2xl font-bold text-green-700 dark:text-green-300">
                {formatCurrency(netWorth?.totalAssets || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">
              Total Liabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
              <span className="text-2xl font-bold text-red-700 dark:text-red-300">
                {formatCurrency(netWorth?.totalLiabilities || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Net Worth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {formatCurrency(netWorth?.netWorth || 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Assets
            <Badge variant="secondary" className="ml-2">
              {assetAccounts.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            Bank accounts, investments, property, and valuables
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assetAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No asset accounts yet. Add your first account to start tracking.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {assetAccounts.map((account) => {
                const config = accountTypeConfig[account.type];
                const Icon = config?.icon || DollarSign;

                return (
                  <div
                    key={account.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-colors hover:bg-accent ${
                      !account.isActive ? "opacity-50" : ""
                    }`}
                  >
                    <div
                      className="p-2 rounded-full"
                      style={{ backgroundColor: account.color || "#10b981" + "20" }}
                    >
                      <Icon className="h-5 w-5" style={{ color: account.color || "#10b981" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{account.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {config?.label || account.type}
                        </Badge>
                        {account.institution && <span>{account.institution}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(account.currentBalance, account.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Updated {format(new Date(account.updatedAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openBalanceModal(account)}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Update Balance
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openHistoryModal(account)}>
                          <History className="h-4 w-4 mr-2" />
                          View History
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openAccountModal(account)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Account
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteAccountMutation.mutate(account.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Liabilities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-600" />
            Liabilities
            <Badge variant="secondary" className="ml-2">
              {liabilityAccounts.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            Credit cards, loans, mortgages, and other debts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {liabilityAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No liabilities tracked. Great if you're debt-free!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {liabilityAccounts.map((account) => {
                const config = accountTypeConfig[account.type];
                const Icon = config?.icon || CreditCard;

                return (
                  <div
                    key={account.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-colors hover:bg-accent ${
                      !account.isActive ? "opacity-50" : ""
                    }`}
                  >
                    <div
                      className="p-2 rounded-full"
                      style={{ backgroundColor: account.color || "#ef4444" + "20" }}
                    >
                      <Icon className="h-5 w-5" style={{ color: account.color || "#ef4444" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{account.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {config?.label || account.type}
                        </Badge>
                        {account.institution && <span>{account.institution}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600 dark:text-red-400">
                        -{formatCurrency(account.currentBalance, account.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Updated {format(new Date(account.updatedAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openBalanceModal(account)}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Update Balance
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openHistoryModal(account)}>
                          <History className="h-4 w-4 mr-2" />
                          View History
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openAccountModal(account)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Account
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteAccountMutation.mutate(account.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Account Modal */}
      <Dialog open={isAccountModalOpen} onOpenChange={setIsAccountModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAccount ? "Edit Account" : "Add Financial Account"}</DialogTitle>
            <DialogDescription>
              {editingAccount ? "Update account details" : "Add a new account to track"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Account Name *</Label>
              <Input
                id="name"
                value={accountFormData.name}
                onChange={(e) => setAccountFormData({ ...accountFormData, name: e.target.value })}
                placeholder="e.g., Chase Checking, Rolex Submariner"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Account Type *</Label>
              <Select
                value={accountFormData.type}
                onValueChange={(v) => setAccountFormData({ ...accountFormData, type: v })}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Checking Account</SelectItem>
                  <SelectItem value="savings">Savings Account</SelectItem>
                  <SelectItem value="investment">Investment Account</SelectItem>
                  <SelectItem value="retirement">Retirement Account</SelectItem>
                  <SelectItem value="crypto">Cryptocurrency</SelectItem>
                  <SelectItem value="property">Property</SelectItem>
                  <SelectItem value="vehicle">Vehicle</SelectItem>
                  <SelectItem value="jewelry">Jewelry/Precious Metals</SelectItem>
                  <SelectItem value="collectible">Collectible</SelectItem>
                  <SelectItem value="other_asset">Other Asset</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="loan">Loan</SelectItem>
                  <SelectItem value="mortgage">Mortgage</SelectItem>
                  <SelectItem value="other_debt">Other Debt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="institution">Institution (optional)</Label>
              <Input
                id="institution"
                value={accountFormData.institution}
                onChange={(e) => setAccountFormData({ ...accountFormData, institution: e.target.value })}
                placeholder="e.g., Chase, Vanguard, N/A for physical assets"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="balance">Current Balance</Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  value={accountFormData.currentBalance}
                  onChange={(e) => setAccountFormData({ ...accountFormData, currentBalance: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={accountFormData.currency}
                  onValueChange={(v) => setAccountFormData({ ...accountFormData, currency: v })}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="AED">AED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={accountFormData.isActive}
                onCheckedChange={(checked) => setAccountFormData({ ...accountFormData, isActive: checked })}
              />
              <Label htmlFor="isActive">Active account</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={accountFormData.notes}
                onChange={(e) => setAccountFormData({ ...accountFormData, notes: e.target.value })}
                placeholder="Any additional details..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAccountModal}>
              Cancel
            </Button>
            <Button
              onClick={handleAccountSubmit}
              disabled={createAccountMutation.isPending || updateAccountMutation.isPending}
            >
              {editingAccount ? "Save Changes" : "Add Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Balance Modal */}
      <Dialog open={isBalanceModalOpen} onOpenChange={setIsBalanceModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Balance</DialogTitle>
            <DialogDescription>
              {selectedAccountForBalance?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newBalance">New Balance</Label>
              <Input
                id="newBalance"
                type="number"
                step="0.01"
                value={balanceFormData.balance}
                onChange={(e) => setBalanceFormData({ ...balanceFormData, balance: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="balanceNote">Note (optional)</Label>
              <Input
                id="balanceNote"
                value={balanceFormData.note}
                onChange={(e) => setBalanceFormData({ ...balanceFormData, note: e.target.value })}
                placeholder="e.g., Monthly update, revaluation"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeBalanceModal}>
              Cancel
            </Button>
            <Button onClick={handleBalanceSubmit} disabled={updateBalanceMutation.isPending}>
              Update Balance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Balance History Modal */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Balance History</DialogTitle>
            <DialogDescription>
              {selectedAccountForHistory?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {accountHistory.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No history available</p>
            ) : (
              <div className="space-y-2">
                {accountHistory.map((snapshot) => (
                  <div key={snapshot.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {formatCurrency(snapshot.balance, selectedAccountForHistory?.currency)}
                      </p>
                      {snapshot.note && (
                        <p className="text-sm text-muted-foreground">{snapshot.note}</p>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(snapshot.createdAt), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeHistoryModal}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
