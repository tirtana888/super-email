"use client";

import { useState } from "react";
import { Button } from "@usesend/ui/src/button";
import { Input } from "@usesend/ui/src/input";
import { Label } from "@usesend/ui/src/label";
import { Textarea } from "@usesend/ui/src/textarea";
import { Switch } from "@usesend/ui/src/switch";
import { Badge } from "@usesend/ui/src/badge";
import Spinner from "@usesend/ui/src/spinner";
import { toast } from "@usesend/ui/src/toaster";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@usesend/ui/src/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@usesend/ui/src/table";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { api } from "~/trpc/react";

const LIMIT_FIELDS = [
  { key: "emailQuota", label: "Kuota Email / bln" },
  { key: "emailsPerDay", label: "Email / hari" },
  { key: "domainLimit", label: "Limit Domain" },
  { key: "teamMemberLimit", label: "Limit Member" },
  { key: "contactBookLimit", label: "Limit Contact Book" },
  { key: "webhookLimit", label: "Limit Webhook" },
] as const;

function formatLimit(value: number, unit: string) {
  return value === -1
    ? "Tanpa batas"
    : `${value.toLocaleString("id-ID")} ${unit}`;
}

interface PlanFormData {
  id?: string;
  name: string;
  slug: string;
  description: string;
  priceIdr: number;
  intervalMonths: number;
  emailQuota: number;
  emailsPerDay: number;
  domainLimit: number;
  teamMemberLimit: number;
  contactBookLimit: number;
  webhookLimit: number;
  isDefault?: boolean;
  featuresText: string;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
}

const initialForm: PlanFormData = {
  name: "",
  slug: "",
  description: "",
  priceIdr: 99000,
  intervalMonths: 1,
  emailQuota: 10000,
  emailsPerDay: 334,
  domainLimit: 1,
  teamMemberLimit: 3,
  contactBookLimit: -1,
  webhookLimit: -1,
  featuresText: "Dukungan Email 24/7\nDedicated Tracking Domain\nStatistik Real-time",
  isPopular: false,
  isActive: true,
  sortOrder: 0,
};

export default function AdminPlansPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<PlanFormData>(initialForm);

  const utils = api.useUtils();
  const { data: plans, isLoading } = api.adminPlans.getAll.useQuery();

  const createMutation = api.adminPlans.create.useMutation({
    onSuccess: () => {
      toast.success("Paket baru berhasil dibuat.");
      setIsOpen(false);
      void utils.adminPlans.getAll.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Gagal membuat paket");
    },
  });

  const updateMutation = api.adminPlans.update.useMutation({
    onSuccess: () => {
      toast.success("Paket berhasil diperbarui.");
      setIsOpen(false);
      void utils.adminPlans.getAll.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Gagal memperbarui paket");
    },
  });

  const deleteMutation = api.adminPlans.delete.useMutation({
    onSuccess: () => {
      toast.success("Paket berhasil dihapus / dinonaktifkan.");
      void utils.adminPlans.getAll.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Gagal menghapus paket");
    },
  });

  const handleOpenAdd = () => {
    setFormData(initialForm);
    setIsOpen(true);
  };

  const handleOpenEdit = (plan: NonNullable<typeof plans>[number]) => {
    setFormData({
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description ?? "",
      priceIdr: plan.priceIdr,
      intervalMonths: plan.intervalMonths,
      emailQuota: plan.emailQuota,
      emailsPerDay: plan.emailsPerDay,
      domainLimit: plan.domainLimit,
      teamMemberLimit: plan.teamMemberLimit,
      contactBookLimit: plan.contactBookLimit,
      webhookLimit: plan.webhookLimit,
      isDefault: plan.isDefault,
      featuresText: plan.features.join("\n"),
      isPopular: plan.isPopular,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
    });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const features = formData.featuresText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      name: formData.name,
      slug: formData.slug.toLowerCase().trim(),
      description: formData.description || undefined,
      priceIdr: Number(formData.priceIdr),
      intervalMonths: Number(formData.intervalMonths),
      emailQuota: Number(formData.emailQuota),
      emailsPerDay: Number(formData.emailsPerDay),
      domainLimit: Number(formData.domainLimit),
      teamMemberLimit: Number(formData.teamMemberLimit),
      contactBookLimit: Number(formData.contactBookLimit),
      webhookLimit: Number(formData.webhookLimit),
      features,
      isPopular: formData.isPopular,
      isActive: formData.isActive,
      sortOrder: Number(formData.sortOrder),
    };

    if (formData.id) {
      updateMutation.mutate({ ...payload, id: formData.id });
    } else {
      createMutation.mutate(payload);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Manajemen Paket & Billing</h2>
          <p className="text-sm text-muted-foreground">
            Kelola paket langganan dinamis yang ditawarkan kepada pengguna dengan pembayaran Xendit.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Tambah Paket
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Spinner />
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Urutan</TableHead>
                <TableHead>Nama Paket</TableHead>
                <TableHead>Harga (IDR)</TableHead>
                <TableHead>Kuota Email</TableHead>
                <TableHead>Email / Hari</TableHead>
                <TableHead>Limit Domain</TableHead>
                <TableHead>Member Tim</TableHead>
                <TableHead>Tim Aktif</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans && plans.length > 0 ? (
                plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-mono text-xs">{plan.sortOrder}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium flex items-center gap-2">
                          {plan.name}
                          {plan.isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              Default
                            </Badge>
                          )}
                          {plan.isPopular && (
                            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/20">
                              Populer
                            </Badge>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {plan.slug}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(plan.priceIdr)}
                      <span className="text-xs font-normal text-muted-foreground">
                        {" "}
                        / {plan.intervalMonths} bln
                      </span>
                    </TableCell>
                    <TableCell>{formatLimit(plan.emailQuota, "email")}</TableCell>
                    <TableCell>{formatLimit(plan.emailsPerDay, "email")}</TableCell>
                    <TableCell>{formatLimit(plan.domainLimit, "domain")}</TableCell>
                    <TableCell>{formatLimit(plan.teamMemberLimit, "member")}</TableCell>
                    <TableCell>{plan._count?.teams ?? 0} tim</TableCell>
                    <TableCell>
                      {plan.isActive ? (
                        <Badge variant="default">Aktif</Badge>
                      ) : (
                        <Badge variant="secondary">Nonaktif</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(plan)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {!plan.isDefault && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => {
                              if (confirm(`Yakin ingin menghapus / menonaktifkan paket "${plan.name}"?`)) {
                                deleteMutation.mutate({ id: plan.id });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                    Belum ada paket yang dibuat. Klik tombol &quot;Tambah Paket&quot; untuk membuat paket pertama.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal Dialog Tambah / Edit */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formData.id ? "Edit Paket Billing" : "Tambah Paket Billing Baru"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="plan-name">Nama Paket</Label>
                <Input
                  id="plan-name"
                  placeholder="e.g. Starter, Pro"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      name,
                      slug: prev.id ? prev.slug : name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
                    }));
                  }}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="plan-slug">Slug (ID Unik)</Label>
                <Input
                  id="plan-slug"
                  placeholder="e.g. starter, pro"
                  value={formData.slug}
                  disabled={formData.isDefault}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="plan-price">Harga (IDR)</Label>
                <Input
                  id="plan-price"
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.priceIdr}
                  disabled={formData.isDefault}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      priceIdr: Number(e.target.value),
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="plan-interval">Durasi (Bulan)</Label>
                <Input
                  id="plan-interval"
                  type="number"
                  min="1"
                  value={formData.intervalMonths}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      intervalMonths: Number(e.target.value),
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {LIMIT_FIELDS.map(({ key, label }) => (
                <div className="space-y-1" key={key}>
                  <Label htmlFor={`plan-${key}`}>{label}</Label>
                  <Input
                    id={`plan-${key}`}
                    type="number"
                    min="-1"
                    value={formData[key]}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        [key]: Number(e.target.value),
                      }))
                    }
                    required
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Isi -1 untuk tanpa batas. Batas ini berlaku untuk semua tim yang memakai paket ini.
            </p>

            <div className="space-y-1">
              <Label htmlFor="plan-features">
                Fitur Paket (1 baris per poin fitur)
              </Label>
              <Textarea
                id="plan-features"
                rows={4}
                value={formData.featuresText}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    featuresText: e.target.value,
                  }))
                }
                placeholder="Contoh:&#10;Dukungan Email 24/7&#10;Dedicated Domain&#10;Statistik Real-time"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="plan-popular" className="text-sm font-medium">
                    Badge Populer
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Tandai sebagai rekomendasi
                  </p>
                </div>
                <Switch
                  id="plan-popular"
                  checked={formData.isPopular}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isPopular: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="plan-active" className="text-sm font-medium">
                    Status Aktif
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Dapat dibeli oleh pengguna
                  </p>
                </div>
                <Switch
                  id="plan-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isActive: checked }))
                  }
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Spinner />
                ) : formData.id ? (
                  "Simpan Perubahan"
                ) : (
                  "Buat Paket"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
