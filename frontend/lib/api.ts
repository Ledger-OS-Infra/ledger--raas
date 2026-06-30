const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "")

function currentOrigin() {
  if (typeof window !== "undefined") {
    return window.location.origin
  }
  return "http://localhost:3000"
}

function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>) {
  const baseUrl = API_BASE_URL || currentOrigin()
  const url = new URL(path.startsWith("/") ? path : `/${path}`, baseUrl)

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })
  }

  return url.toString()
}

type ApiFetchInit = RequestInit & {
  query?: Record<string, string | number | boolean | undefined>
}

async function apiFetch<T>(path: string, init?: ApiFetchInit): Promise<T> {
  const response = await fetch(buildUrl(path, init?.query), {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`API request failed [${response.status}] ${response.statusText}: ${body}`)
  }

  const json = (await response.json()) as { data: T }
  return json.data
}

export type CustomerStatus = "ACTIVE" | "INACTIVE"

export interface VirtualAccount {
  id: string
  customer_id: string
  nomba_account_ref: string
  account_number: string
  bank_name: string
  bank_code: string | null
  is_active: boolean
  created_at: string
}

export interface CustomerWithVirtualAccount {
  id: string
  business_id: string
  full_name: string
  email: string | null
  phone: string | null
  status: CustomerStatus
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  virtual_account: VirtualAccount
}

export interface CreateCustomerRequest {
  businessId: string
  fullName: string
  email?: string | null
  phone?: string | null
  metadata?: Record<string, unknown>
}

export interface UpdateCustomerRequest {
  fullName?: string
  email?: string | null
  phone?: string | null
  status?: CustomerStatus
  metadata?: Record<string, unknown>
}

export const customersApi = {
  listByBusiness(businessId: string) {
    return apiFetch<CustomerWithVirtualAccount[]>("/customers", {
      method: "GET",
      query: {
        business_id: businessId,
      },
    })
  },

  getById(id: string) {
    return apiFetch<CustomerWithVirtualAccount>(`/customers/${encodeURIComponent(id)}`)
  },

  createCustomer(input: CreateCustomerRequest) {
    return apiFetch<CustomerWithVirtualAccount>("/customers", {
      method: "POST",
      body: JSON.stringify({
        business_id: input.businessId,
        full_name: input.fullName,
        email: input.email,
        phone: input.phone,
        metadata: input.metadata,
      }),
    })
  },

  updateCustomer(id: string, input: UpdateCustomerRequest) {
    return apiFetch<CustomerWithVirtualAccount>(`/customers/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({
        full_name: input.fullName,
        email: input.email,
        phone: input.phone,
        status: input.status,
        metadata: input.metadata,
      }),
    })
  },
}

export interface BusinessMetrics {
  customerCount: number
  totalOutstanding: number
  overdueAmount: number
}

export interface CustomerBalance {
  id: string
  full_name: string
  outstanding: number
  last_payment: string
}

export interface AgingSummary {
  obligations: Array<{ id: string; amount: number; due_date: string; status: string }>
  summary: Record<string, number>
}

export const reportingApi = {
  getBusinessMetrics(businessId: string) {
    return apiFetch<BusinessMetrics>(`/reporting/business/${encodeURIComponent(businessId)}/metrics`)
  },

  listBusinessCustomers(businessId: string) {
    return apiFetch<CustomerBalance[]>(`/reporting/business/${encodeURIComponent(businessId)}/customers`)
  },

  listAging(businessId: string) {
    return apiFetch<AgingSummary>(`/reporting/business/${encodeURIComponent(businessId)}/aging`)
  },

  getObligationPayments(obligationId: string) {
    return apiFetch<Array<{ id: string; amount: number; paid_at: string }>>(
      `/reporting/obligations/${encodeURIComponent(obligationId)}/payments`,
    )
  },
}
