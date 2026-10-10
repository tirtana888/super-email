import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "~/env";
import { logger } from "~/server/logger/log";
import {
  processXenditInvoicePaid,
  type XenditWebhookPayload,
} from "~/server/billing/xendit";

export async function POST(req: Request) {
  try {
    const headerList = await headers();
    const callbackToken = headerList.get("x-callback-token");

    // Validasi token webhook jika disetel di env
    if (env.XENDIT_CALLBACK_TOKEN) {
      if (callbackToken !== env.XENDIT_CALLBACK_TOKEN) {
        logger.warn(
          { callbackToken },
          "[Xendit Webhook] Callback token tidak cocok",
        );
        return new NextResponse("Unauthorized", { status: 401 });
      }
    }

    const body = (await req.json()) as XenditWebhookPayload;

    logger.info(
      { invoiceId: body.id, status: body.status },
      "[Xendit Webhook] Menerima event webhook",
    );

    if (body.status === "PAID") {
      await processXenditInvoicePaid(body);
    }

    return NextResponse.json({ success: true, status: body.status });
  } catch (error) {
    logger.error({ error }, "[Xendit Webhook] Error saat memproses webhook");
    return new NextResponse(
      error instanceof Error ? error.message : "Internal Server Error",
      { status: 500 },
    );
  }
}
