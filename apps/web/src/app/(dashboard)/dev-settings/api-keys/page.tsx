"use client";

import AddApiKey from "./add-api-key";
import ApiList from "./api-list";
import { H2 } from "@usesend/ui";

export default function ApiKeysPage() {
  return (
    <div>
      <div className="flex justify-between items-center">
        <H2>API keys</H2>
        <AddApiKey />
      </div>
      <ApiList />
    </div>
  );
}
