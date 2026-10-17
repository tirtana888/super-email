"use client";

import { useRouter } from "next/navigation";
import { Button } from "@usesend/ui/src/button";
import { useUpgradeModalStore } from "~/store/upgradeModalStore";

export const UpgradeButton = () => {
  const router = useRouter();
  const {
    action: { closeModal },
  } = useUpgradeModalStore();

  const onClick = () => {
    closeModal();
    router.push("/settings/billing");
  };

  return (
    <Button onClick={onClick} className="mt-4">
      Lihat paket
    </Button>
  );
};
