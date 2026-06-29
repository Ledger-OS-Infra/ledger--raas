import { Router, type Request, type Response } from "express";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { claimEvent } from "../idempotency/claimEvent";
import {
  verifyNombaWebhookSignature,
  type NombaWebhookPayload,
} from "../nomba/verifyWebhookSignature";

export const webhooksRouter = Router();

webhooksRouter.post(
  env.nombaWebhookPath,
  async (req: Request, res: Response) => {
    const signature = req.header("nomba-signature");
    const timestamp = req.header("nomba-timestamp");

    if (!signature || !timestamp) {
      res.status(401).json({ error: "Missing Nomba signature headers" });
      return;
    }

    const payload = req.body as NombaWebhookPayload;

    try {
      const valid = verifyNombaWebhookSignature(
        payload,
        signature,
        timestamp,
        env.nombaWebhookSecret,
      );

      if (!valid) {
        res.status(401).json({ error: "Invalid webhook signature" });
        return;
      }
    } catch {
      res.status(401).json({ error: "Invalid webhook signature" });
      return;
    }

    const transactionId = payload.data?.transaction?.transactionId;

    if (!transactionId) {
      logger.warn(
        { payload },
        "Webhook payload missing transactionId, cannot dedupe",
      );
      res.status(400).json({ error: "Missing transactionId" });
      return;
    }

    const isNew = await claimEvent(transactionId);

    if (!isNew) {
      res.status(200).json({ received: true, duplicate: true });
      return;
    }

    // TODO: enqueue reconciliation job (customer lookup + ledger write)
    // once #15 (BullMQ worker) and #3 (DB schema) are merged.
    // Logging full VA + customer detail here, not just IDs, since there's
    // nowhere to persist this yet, this is our only visibility into the
    // virtual account credit until #3 lands.
    logger.info(
      {
        event_type: payload.event_type,
        requestId: payload.requestId,
        transactionId,
        virtualAccount: {
          aliasAccountNumber: payload.data?.transaction?.aliasAccountNumber,
          aliasAccountName: payload.data?.transaction?.aliasAccountName,
          aliasAccountReference:
            payload.data?.transaction?.aliasAccountReference,
        },
        transactionAmount: payload.data?.transaction?.transactionAmount,
        sender: {
          senderName: payload.data?.customer?.senderName,
          bankName: payload.data?.customer?.bankName,
          accountNumber: payload.data?.customer?.accountNumber,
        },
      },
      "Nomba webhook received and claimed (no DB yet, logging VA details only)",
    );

    res.status(200).json({ received: true });
  },
);
