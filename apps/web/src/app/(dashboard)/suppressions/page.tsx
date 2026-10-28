"use client";

import { useState } from "react";
import AddSuppressionDialog from "./add-suppression";
import BulkAddSuppressionsDialog from "./bulk-add-suppressions";
import SuppressionList from "./suppression-list";
import { Button } from "@usesend/ui/src/button";
import { Plus, Upload } from "lucide-react";
import { H1 } from "@usesend/ui";

export default function SuppressionsPage() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkAddDialog, setShowBulkAddDialog] = useState(false);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
        <div>
          <H1>Exclusions</H1>
          <p className="mt-1 text-sm text-muted-foreground">
            Addresses here never receive email from this team. Hard bounces and complaints are added automatically.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBulkAddDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Bulk add
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add address
          </Button>
        </div>
      </div>

      {/* Suppression List */}
      <SuppressionList />

      {/* Dialogs */}
      <AddSuppressionDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />

      <BulkAddSuppressionsDialog
        open={showBulkAddDialog}
        onOpenChange={setShowBulkAddDialog}
      />
    </div>
  );
}
