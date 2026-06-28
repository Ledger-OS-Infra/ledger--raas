import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { AppError } from "../lib/AppError";
import { pool } from "../db/pool";
import {
  businessExists,
  getCustomerById,
  insertCustomer,
  insertCustomerWallet,
  insertVirtualAccount,
  type CustomerWithVirtualAccount,
  type CreateCustomerInput,
} from "../db/customers";
import type { NombaClient } from "../nomba/client";
import { createNombaClientFromEnv } from "../nomba/client";
import { NombaApiError } from "../nomba/errors";
import type { VirtualAccount } from "../nomba/types";

export interface CreateCustomerRequest {
  businessId: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  metadata?: Record<string, unknown>;
}

function nombaAccountRefForCustomer(customerId: string): string {
  return `lc_${customerId.replace(/-/g, "")}`;
}

function mapNombaVirtualAccount(
  nombaAccount: VirtualAccount,
): {
  nombaAccountRef: string;
  accountNumber: string;
  bankName: string;
} {
  const accountNumber = nombaAccount.bankAccountNumber?.trim();
  const bankName = nombaAccount.bankName?.trim();

  if (!accountNumber || !bankName) {
    throw new AppError(
      "Nomba did not return complete virtual account bank details",
      502,
      "NOMBA_INCOMPLETE_VA_RESPONSE",
    );
  }

  return {
    nombaAccountRef: nombaAccount.accountRef,
    accountNumber,
    bankName,
  };
}

function mapNombaError(error: unknown): AppError {
  if (error instanceof NombaApiError) {
    const statusCode =
      error instanceof NombaApiError && error.status >= 400 && error.status < 500
        ? 502
        : 502;

    return new AppError(
      error.description ?? error.message,
      statusCode,
      "NOMBA_API_ERROR",
    );
  }

  if (error instanceof AppError) {
    return error;
  }

  throw error;
}

export class CustomerService {
  constructor(private readonly nomba: NombaClient) {}

  async createCustomer(
    input: CreateCustomerRequest,
  ): Promise<CustomerWithVirtualAccount> {
    if (!(await businessExists(input.businessId))) {
      throw new AppError("Business not found", 404, "BUSINESS_NOT_FOUND");
    }

    const customerId = randomUUID();
    const accountRef = nombaAccountRefForCustomer(customerId);

    let nombaAccount: VirtualAccount;
    try {
      nombaAccount = await this.nomba.createCustomerVirtualAccount({
        accountRef,
        accountName: input.fullName,
      });
    } catch (error) {
      throw mapNombaError(error);
    }

    const vaDetails = mapNombaVirtualAccount(nombaAccount);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const customerInput: CreateCustomerInput = {
        id: customerId,
        businessId: input.businessId,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        metadata: input.metadata,
      };

      await insertCustomer(customerInput, client);
      await insertVirtualAccount(
        {
          id: randomUUID(),
          customerId,
          nombaAccountRef: vaDetails.nombaAccountRef,
          accountNumber: vaDetails.accountNumber,
          bankName: vaDetails.bankName,
        },
        client,
      );
      await insertCustomerWallet(customerId, client);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    const created = await getCustomerById(customerId);
    if (!created) {
      throw new AppError(
        "Customer was created but could not be loaded",
        500,
        "CUSTOMER_LOAD_FAILED",
      );
    }

    return created;
  }
}

let defaultService: CustomerService | null = null;

export function getCustomerService(): CustomerService {
  if (!defaultService) {
    defaultService = new CustomerService(createNombaClientFromEnv());
  }
  return defaultService;
}

/** Test hook — inject mocks without touching module-level singleton in tests. */
export function createCustomerService(nomba: NombaClient): CustomerService {
  return new CustomerService(nomba);
}
