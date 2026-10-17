"use client";

import { useState } from "react";
import { Button } from "@usesend/ui/src/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@usesend/ui/src/card";
import { Badge } from "@usesend/ui/src/badge";
import Spinner from "@usesend/ui/src/spinner";
import { toast } from "@usesend/ui/src/toaster";
import { CheckCircle2, QrCode } from "lucide-react";
import { api } from "~/trpc/react";
import { describePlanLimits, formatIdr } from "~/lib/plan-format";

export function DynamicPricingCards() {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const { data: plans, isLoading } = api.billing.getAvailablePlans.useQuery();
  const { data: overview } = api.billing.getPlanOverview.useQuery();
  const currentPlanId = overview?.plan?.id ?? null;
  const checkoutMutation = api.billing.createXenditCheckoutSession.useMutation({
    onSuccess: (url) => {
      if (url) {
        window.location.href = url;
      }
    },
    onError: (err) => {
      toast.error(err.message || "Gagal memproses pembayaran");
      setSelectedPlanId(null);
    },
  });

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    checkoutMutation.mutate({ planId });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Spinner />
      </div>
    );
  }

  if (!plans || plans.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold tracking-tight">Pilih Paket Langganan</h3>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Tingkatkan kuota pengiriman email dan fitur tim Anda. Pembayaran instan via QRIS dan Virtual Account Bank.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        {plans.map((plan) => {
          const isCurrent = currentPlanId === plan.id;
          const isProcessing = selectedPlanId === plan.id && checkoutMutation.isPending;

          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col justify-between border-2 transition-all ${
                plan.isPopular
                  ? "border-primary shadow-md"
                  : "border-border hover:border-muted-foreground/40"
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground font-semibold px-3 py-0.5 text-xs">
                    Paling Populer
                  </Badge>
                </div>
              )}

              <CardHeader className="pt-6">
                <CardTitle className="flex justify-between items-baseline">
                  <span className="text-lg font-bold">{plan.name}</span>
                </CardTitle>
                <div className="mt-3">
                  <span className="text-3xl font-extrabold tracking-tight">
                    {plan.isDefault ? "Gratis" : formatIdr(plan.priceIdr)}
                  </span>
                  {plan.isDefault ? null : (
                    <span className="text-xs text-muted-foreground ml-1">
                      / {plan.intervalMonths === 1 ? "bulan" : `${plan.intervalMonths} bulan`}
                    </span>
                  )}
                </div>
                {plan.description && (
                  <p className="text-xs text-muted-foreground mt-2">{plan.description}</p>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-xs">
                  {describePlanLimits({
                    emailsPerMonth: plan.emailQuota,
                    emailsPerDay: plan.emailsPerDay,
                    domains: plan.domainLimit,
                    teamMembers: plan.teamMemberLimit,
                    contactBooks: plan.contactBookLimit,
                    webhooks: plan.webhookLimit,
                  }).map((row) => (
                    <div key={row.label} className="flex justify-between">
                      <span className="text-muted-foreground">{row.label}:</span>
                      <span className="font-semibold">{row.value}</span>
                    </div>
                  ))}
                </div>

                <ul className="space-y-2 pt-2 text-xs">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-4 border-t">
                <Button
                  className="w-full flex items-center justify-center gap-2"
                  variant={plan.isPopular ? "default" : "outline"}
                  disabled={
                    plan.isDefault || checkoutMutation.isPending
                  }
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {isProcessing ? (
                    <Spinner className="h-4 w-4" />
                  ) : plan.isDefault ? (
                    isCurrent
                      ? "Paket Aktif Saat Ini"
                      : "Otomatis saat paket berakhir"
                  ) : isCurrent ? (
                    <>
                      <QrCode className="h-4 w-4" /> Perpanjang Paket
                    </>
                  ) : (
                    <>
                      <QrCode className="h-4 w-4" /> Bayar via QRIS / VA
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
