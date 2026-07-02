import { Router } from "express";
import {
  createBillingRule,
  getBillingRuleById,
  listBillingRulesByCustomer,
} from "../db/billingRules";
import { AppError } from "../lib/AppError";
import {
  generateDueObligations,
  generateObligationsForRule,
} from "../lib/billing/generateObligations";
import { customerIdParams } from "../lib/params";
import {
  billingRuleIdParams,
  createBillingRuleBody,
  generateDueBody,
  generateRuleBody,
} from "../lib/schemas/billing";
import { validate } from "../middleware/validate";

export const billingRouter = Router();

billingRouter.post(
  "/customers/:id/billing-rules",
  validate({ params: customerIdParams, body: createBillingRuleBody }),
  async (req, res, next) => {
    try {
      const { id: customerId } = res.locals.params as { id: string };
      const body = req.body as {
        obligation_type: "INVOICE" | "SUBSCRIPTION" | "FEE" | "LEVY" | "CUSTOM";
        amount: number;
        frequency: "MONTHLY";
        day_of_month: number;
        start_date: string;
        metadata?: Record<string, unknown>;
      };

      const rule = await createBillingRule({
        customerId,
        obligationType: body.obligation_type,
        amount: body.amount,
        recurrence: body.frequency,
        dayOfMonth: body.day_of_month,
        startDate: body.start_date,
        metadata: body.metadata,
      });

      res.status(201).json({ data: rule });
    } catch (err) {
      next(err);
    }
  },
);

billingRouter.get(
  "/customers/:id/billing-rules",
  validate({ params: customerIdParams }),
  async (_req, res, next) => {
    try {
      const { id: customerId } = res.locals.params as { id: string };
      const rules = await listBillingRulesByCustomer(customerId);
      res.json({ data: rules });
    } catch (err) {
      next(err);
    }
  },
);

billingRouter.post(
  "/billing/jobs/generate-due",
  validate({ body: generateDueBody }),
  async (req, res, next) => {
    try {
      const body = (req.body ?? {}) as { as_of_date?: string };
      const summary = await generateDueObligations(body.as_of_date);
      res.json({ data: summary });
    } catch (err) {
      next(err);
    }
  },
);

billingRouter.post(
  "/billing-rules/:ruleId/generate",
  validate({ params: billingRuleIdParams, body: generateRuleBody }),
  async (req, res, next) => {
    try {
      const { ruleId } = res.locals.params as { ruleId: string };
      const body = (req.body ?? {}) as { as_of_date?: string };

      const rule = await getBillingRuleById(ruleId);
      if (!rule) {
        throw new AppError("Billing rule not found", 404, "BILLING_RULE_NOT_FOUND");
      }

      const results = await generateObligationsForRule(ruleId, body.as_of_date);
      res.json({ data: { rule_id: ruleId, results } });
    } catch (err) {
      next(err);
    }
  },
);
