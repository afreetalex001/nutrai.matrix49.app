'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import {
  Cpu,
  Plus,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Key,
  Trash2,
  Edit2,
  Power,
  PowerOff,
  Activity,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { motion, AnimatePresence } from 'framer-motion';

interface AiApiKey {
  id: string;
  providerId: string;
  apiKey: string;
  model: string;
  isActive: boolean;
  quotaLimit: number | null;
  quotaUsed: number;
  quotaResetAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AiProviderWithStats {
  id: string;
  name: string;
  displayName: string;
  baseUrl: string | null;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
  apiKeys: AiApiKey[];
  _count: { usageLogs: number };
  stats: {
    _count: { id: number };
    _sum: { tokensUsed: number | null };
    _avg: { responseTime: number | null };
  };
}

export default function AiProvidersPage() {
  const { token } = useAuthStore();
  const [providers, setProviders] = useState<AiProviderWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [addProviderOpen, setAddProviderOpen] = useState(false);
  const [addKeyOpen, setAddKeyOpen] = useState(false);
  const [editKeyOpen, setEditKeyOpen] = useState(false);
  const [deleteKeyOpen, setDeleteKeyOpen] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [selectedKey, setSelectedKey] = useState<AiApiKey | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [providerForm, setProviderForm] = useState({
    name: '',
    displayName: '',
    baseUrl: '',
    priority: 0,
    isActive: true,
  });
  const [keyForm, setKeyForm] = useState({
    providerId: '',
    apiKey: '',
    model: '',
    quotaLimit: '',
    isActive: true,
  });
  const [editKeyForm, setEditKeyForm] = useState({
    keyId: '',
    apiKey: '',
    model: '',
    quotaLimit: '',
    isActive: true,
  });

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/ai-providers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers);
      }
    } catch (error) {
      console.error('Error fetching AI providers:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleAddProvider = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/ai-providers', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(providerForm),
      });
      if (res.ok) {
        setAddProviderOpen(false);
        setProviderForm({
          name: '',
          displayName: '',
          baseUrl: '',
          priority: 0,
          isActive: true,
        });
        fetchProviders();
      } else {
        const data = await res.json();
        alert(data.error || 'حدث خطأ أثناء إضافة المزود');
      }
    } catch (error) {
      console.error('Error adding provider:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProvider = async (
    providerId: string,
    updates: Partial<AiProviderWithStats>
  ) => {
    try {
      const res = await fetch('/api/admin/ai-providers', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ providerId, ...updates }),
      });
      if (res.ok) {
        fetchProviders();
      }
    } catch (error) {
      console.error('Error updating provider:', error);
    }
  };

  const handleMovePriority = async (
    providerId: string,
    direction: 'up' | 'down'
  ) => {
    const sortedProviders = [...providers].sort(
      (a, b) => a.priority - b.priority
    );
    const idx = sortedProviders.findIndex((p) => p.id === providerId);
    if (
      (direction === 'up' && idx <= 0) ||
      (direction === 'down' && idx >= sortedProviders.length - 1)
    )
      return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const currentPriority = sortedProviders[idx].priority;
    const swapPriority = sortedProviders[swapIdx].priority;

    await handleUpdateProvider(providerId, { priority: swapPriority });
    await handleUpdateProvider(sortedProviders[swapIdx].id, {
      priority: currentPriority,
    });
  };

  const handleToggleProvider = async (
    providerId: string,
    currentStatus: boolean
  ) => {
    await handleUpdateProvider(providerId, { isActive: !currentStatus });
  };

  const handleAddKey = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/ai-keys', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          providerId: keyForm.providerId,
          apiKey: keyForm.apiKey,
          model: keyForm.model,
          quotaLimit: keyForm.quotaLimit ? parseInt(keyForm.quotaLimit) : null,
          isActive: keyForm.isActive,
        }),
      });
      if (res.ok) {
        setAddKeyOpen(false);
        setKeyForm({
          providerId: '',
          apiKey: '',
          model: '',
          quotaLimit: '',
          isActive: true,
        });
        fetchProviders();
      } else {
        const data = await res.json();
        alert(data.error || 'حدث خطأ أثناء إضافة المفتاح');
      }
    } catch (error) {
      console.error('Error adding API key:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEditKey = async () => {
    if (!selectedKey) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/ai-keys', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyId: editKeyForm.keyId,
          model: editKeyForm.model,
          quotaLimit: editKeyForm.quotaLimit
            ? parseInt(editKeyForm.quotaLimit)
            : null,
          isActive: editKeyForm.isActive,
        }),
      });
      if (res.ok) {
        setEditKeyOpen(false);
        fetchProviders();
      } else {
        const data = await res.json();
        alert(data.error || 'حدث خطأ أثناء تحديث المفتاح');
      }
    } catch (error) {
      console.error('Error updating API key:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKey = async () => {
    if (!selectedKey) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/ai-keys?keyId=${selectedKey.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        setDeleteKeyOpen(false);
        setSelectedKey(null);
        fetchProviders();
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleKey = async (key: AiApiKey) => {
    try {
      const res = await fetch('/api/admin/ai-keys', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyId: key.id,
          isActive: !key.isActive,
        }),
      });
      if (res.ok) {
        fetchProviders();
      }
    } catch (error) {
      console.error('Error toggling key:', error);
    }
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.substring(0, 8) + '••••••••';
  };

  const getProviderIcon = (name: string) => {
    const iconMap: Record<string, string> = {
      openai: '🤖',
      gemini: '💎',
      claude: '🧠',
      custom: '⚙️',
    };
    return iconMap[name] || '🔧';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-600/10">
            <Cpu className="size-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">مزودو الذكاء الاصطناعي</h1>
            <p className="text-sm text-muted-foreground">
              إدارة مزودي ومفاتيح الذكاء الاصطناعي
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProviders}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="size-3.5" />
            تحديث
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setKeyForm({
                providerId: providers[0]?.id || '',
                apiKey: '',
                model: '',
                quotaLimit: '',
                isActive: true,
              });
              setAddKeyOpen(true);
            }}
            className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700"
          >
            <Key className="size-3.5" />
            إضافة مفتاح
          </Button>
          <Button
            size="sm"
            onClick={() => setAddProviderOpen(true)}
            className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="size-3.5" />
            إضافة مزود
          </Button>
        </div>
      </div>

      {/* Provider Cards */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="space-y-3">
                  <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : providers.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <Cpu className="size-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                لا يوجد مزودو ذكاء اصطناعي مسجلون
              </p>
              <Button
                onClick={() => setAddProviderOpen(true)}
                className="mt-3 gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="size-4" />
                إضافة مزود جديد
              </Button>
            </CardContent>
          </Card>
        ) : (
          providers
            .sort((a, b) => a.priority - b.priority)
            .map((provider, index) => (
              <Collapsible
                key={provider.id}
                open={expandedProvider === provider.id}
                onOpenChange={(open) =>
                  setExpandedProvider(open ? provider.id : null)
                }
              >
                <Card
                  className={`border-0 shadow-sm overflow-hidden ${
                    !provider.isActive ? 'opacity-70' : ''
                  }`}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-3 cursor-pointer hover:bg-muted/20 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-100 text-lg">
                            {getProviderIcon(provider.name)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base">
                                {provider.displayName}
                              </CardTitle>
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                أولوية {provider.priority + 1}
                              </Badge>
                              {provider.isActive ? (
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">
                                  مفعل
                                </Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-[10px]">
                                  معطل
                                </Badge>
                              )}
                            </div>
                            <CardDescription className="text-xs mt-0.5">
                              {provider.name}
                              {provider.baseUrl && ` • ${provider.baseUrl}`}
                              {' • '}
                              {provider.apiKeys.length} مفتاح •{' '}
                              {provider.stats._count.id} طلب (٣٠ يوم)
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Priority Controls */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            disabled={index === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMovePriority(provider.id, 'up');
                            }}
                          >
                            <ArrowUp className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            disabled={index === providers.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMovePriority(provider.id, 'down');
                            }}
                          >
                            <ArrowDown className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleProvider(
                                provider.id,
                                provider.isActive
                              );
                            }}
                          >
                            {provider.isActive ? (
                              <PowerOff className="size-3.5 text-amber-600" />
                            ) : (
                              <Power className="size-3.5 text-emerald-600" />
                            )}
                          </Button>
                          {expandedProvider === provider.id ? (
                            <ChevronUp className="size-4 text-muted-foreground mr-1" />
                          ) : (
                            <ChevronDown className="size-4 text-muted-foreground mr-1" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <Separator className="mb-4" />

                      {/* Provider Stats */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center p-2.5 rounded-lg bg-muted/40">
                          <p className="text-lg font-bold text-emerald-700">
                            {provider.stats._count.id}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            طلبات (٣٠ يوم)
                          </p>
                        </div>
                        <div className="text-center p-2.5 rounded-lg bg-muted/40">
                          <p className="text-lg font-bold text-teal-700">
                            {provider.stats._sum.tokensUsed?.toLocaleString(
                              'ar-EG'
                            ) || 0}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            توكنز مستخدمة
                          </p>
                        </div>
                        <div className="text-center p-2.5 rounded-lg bg-muted/40">
                          <p className="text-lg font-bold text-cyan-700">
                            {provider.stats._avg.responseTime
                              ? `${Math.round(
                                  provider.stats._avg.responseTime
                                )}ms`
                              : '-'}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            متوسط الاستجابة
                          </p>
                        </div>
                      </div>

                      {/* API Keys */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold flex items-center gap-1.5">
                            <Key className="size-3.5 text-emerald-600" />
                            مفاتيح API
                          </h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-emerald-600 gap-1"
                            onClick={() => {
                              setKeyForm({
                                providerId: provider.id,
                                apiKey: '',
                                model: '',
                                quotaLimit: '',
                                isActive: true,
                              });
                              setAddKeyOpen(true);
                            }}
                          >
                            <Plus className="size-3" />
                            إضافة مفتاح
                          </Button>
                        </div>

                        {provider.apiKeys.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4 bg-muted/20 rounded-lg">
                            لا توجد مفاتيح API لهذا المزود
                          </p>
                        ) : (
                          provider.apiKeys.map((key) => (
                            <div
                              key={key.id}
                              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                key.isActive
                                  ? 'bg-background border-border'
                                  : 'bg-muted/30 border-muted opacity-70'
                              }`}
                            >
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge
                                    variant="outline"
                                    className="text-[11px] font-mono"
                                  >
                                    {key.model}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground font-mono">
                                    {maskKey(key.apiKey)}
                                  </span>
                                  {key.isActive ? (
                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">
                                      مفعل
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-[10px]">
                                      معطل
                                    </Badge>
                                  )}
                                  {key.lastError && (
                                    <Badge
                                      className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px] gap-0.5"
                                      title={key.lastError}
                                    >
                                      <AlertTriangle className="size-2.5" />
                                      خطأ
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                  {key.quotaLimit && (
                                    <span>
                                      الحصة: {key.quotaUsed.toLocaleString(
                                        'ar-EG'
                                      )}{' '}
                                      / {key.quotaLimit.toLocaleString('ar-EG')}
                                    </span>
                                  )}
                                  {key.quotaLimit && (
                                    <Progress
                                      value={
                                        (key.quotaUsed / key.quotaLimit) * 100
                                      }
                                      className={`h-1 w-20 ${
                                        key.quotaUsed / key.quotaLimit > 0.9
                                          ? '[&>div]:bg-red-500'
                                          : '[&>div]:bg-emerald-500'
                                      }`}
                                    />
                                  )}
                                </div>
                                {key.lastError && (
                                  <p className="text-[11px] text-amber-600 truncate max-w-md">
                                    ⚠️ {key.lastError}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Switch
                                  checked={key.isActive}
                                  onCheckedChange={() => handleToggleKey(key)}
                                  className="data-[state=checked]:bg-emerald-600"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7"
                                  onClick={() => {
                                    setSelectedKey(key);
                                    setEditKeyForm({
                                      keyId: key.id,
                                      apiKey: '',
                                      model: key.model,
                                      quotaLimit: key.quotaLimit?.toString() || '',
                                      isActive: key.isActive,
                                    });
                                    setEditKeyOpen(true);
                                  }}
                                >
                                  <Edit2 className="size-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    setSelectedKey(key);
                                    setDeleteKeyOpen(true);
                                  }}
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))
        )}
      </div>

      {/* Add Provider Dialog */}
      <Dialog open={addProviderOpen} onOpenChange={setAddProviderOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cpu className="size-4 text-emerald-600" />
              إضافة مزود ذكاء اصطناعي جديد
            </DialogTitle>
            <DialogDescription>
              أضف مزود AI جديد لاستخدامه في النظام
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">اسم المزود (بالإنجليزية)</Label>
              <Input
                placeholder="مثال: openai, gemini, claude"
                value={providerForm.name}
                onChange={(e) =>
                  setProviderForm({ ...providerForm, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">اسم العرض</Label>
              <Input
                placeholder="مثال: OpenAI, Google Gemini"
                value={providerForm.displayName}
                onChange={(e) =>
                  setProviderForm({
                    ...providerForm,
                    displayName: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">رابط API الأساسي (اختياري)</Label>
              <Input
                placeholder="https://api.openai.com"
                value={providerForm.baseUrl}
                onChange={(e) =>
                  setProviderForm({ ...providerForm, baseUrl: e.target.value })
                }
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">الأولوية</Label>
              <Input
                type="number"
                min="0"
                value={providerForm.priority}
                onChange={(e) =>
                  setProviderForm({
                    ...providerForm,
                    priority: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={providerForm.isActive}
                onCheckedChange={(checked) =>
                  setProviderForm({ ...providerForm, isActive: checked })
                }
                className="data-[state=checked]:bg-emerald-600"
              />
              <Label className="text-sm">مفعل</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddProviderOpen(false)}
              className="text-xs"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleAddProvider}
              disabled={
                saving || !providerForm.name || !providerForm.displayName
              }
              className="text-xs bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? 'جارٍ الحفظ...' : 'إضافة المزود'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add API Key Dialog */}
      <Dialog open={addKeyOpen} onOpenChange={setAddKeyOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="size-4 text-emerald-600" />
              إضافة مفتاح API جديد
            </DialogTitle>
            <DialogDescription>
              أضف مفتاح API جديد لأحد المزودين
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">المزود</Label>
              <Select
                value={keyForm.providerId}
                onValueChange={(value) =>
                  setKeyForm({ ...keyForm, providerId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المزود" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">مفتاح API</Label>
              <Input
                placeholder="sk-..."
                value={keyForm.apiKey}
                onChange={(e) =>
                  setKeyForm({ ...keyForm, apiKey: e.target.value })
                }
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">النموذج</Label>
              <Input
                placeholder="gpt-4o, gemini-pro, claude-3-sonnet"
                value={keyForm.model}
                onChange={(e) =>
                  setKeyForm({ ...keyForm, model: e.target.value })
                }
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">حد الحصة الشهرية (اختياري)</Label>
              <Input
                type="number"
                placeholder="مثال: 10000"
                value={keyForm.quotaLimit}
                onChange={(e) =>
                  setKeyForm({ ...keyForm, quotaLimit: e.target.value })
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={keyForm.isActive}
                onCheckedChange={(checked) =>
                  setKeyForm({ ...keyForm, isActive: checked })
                }
                className="data-[state=checked]:bg-emerald-600"
              />
              <Label className="text-sm">مفعل</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddKeyOpen(false)}
              className="text-xs"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleAddKey}
              disabled={
                saving ||
                !keyForm.providerId ||
                !keyForm.apiKey ||
                !keyForm.model
              }
              className="text-xs bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? 'جارٍ الحفظ...' : 'إضافة المفتاح'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit API Key Dialog */}
      <Dialog open={editKeyOpen} onOpenChange={setEditKeyOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="size-4 text-emerald-600" />
              تعديل مفتاح API
            </DialogTitle>
            <DialogDescription>
              تعديل إعدادات مفتاح API
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">النموذج</Label>
              <Input
                value={editKeyForm.model}
                onChange={(e) =>
                  setEditKeyForm({ ...editKeyForm, model: e.target.value })
                }
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">حد الحصة الشهرية</Label>
              <Input
                type="number"
                value={editKeyForm.quotaLimit}
                onChange={(e) =>
                  setEditKeyForm({
                    ...editKeyForm,
                    quotaLimit: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={editKeyForm.isActive}
                onCheckedChange={(checked) =>
                  setEditKeyForm({ ...editKeyForm, isActive: checked })
                }
                className="data-[state=checked]:bg-emerald-600"
              />
              <Label className="text-sm">مفعل</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditKeyOpen(false)}
              className="text-xs"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleEditKey}
              disabled={saving}
              className="text-xs bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete API Key Alert Dialog */}
      <AlertDialog open={deleteKeyOpen} onOpenChange={setDeleteKeyOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف مفتاح API</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف مفتاح API للنموذج &quot;{selectedKey?.model}
              &quot;؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteKey}
              disabled={saving}
              className="text-xs bg-red-600 hover:bg-red-700"
            >
              {saving ? 'جارٍ الحذف...' : 'حذف المفتاح'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
