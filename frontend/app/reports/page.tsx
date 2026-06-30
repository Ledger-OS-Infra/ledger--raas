'use client'

import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ButtonCustom } from '@/components/ui/button-custom'
import { formatCurrency } from '@/lib/currency'
import { mockCustomers, mockObligations } from '@/lib/mock-data'
import { MdDownload, MdFileDownload } from 'react-icons/md'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function ReportsPage() {
  // Calculate inflow by month for the last 6 months
  const today = new Date()
  const monthlyInflow: { month: string; amount: number }[] = []

  // Sample inflow data for visualization
  const sampleInflowData = [
    { months: 5, amount: 420000 },  // January
    { months: 4, amount: 580000 },  // February
    { months: 3, amount: 390000 },  // March
    { months: 2, amount: 650000 },  // April
    { months: 1, amount: 510000 },  // May
    { months: 0, amount: 720000 },  // June
  ]

  sampleInflowData.forEach(({ months, amount }) => {
    const date = new Date(today.getFullYear(), today.getMonth() - months, 1)
    const monthName = date.toLocaleDateString('en-NG', {
      month: 'short',
    })
    monthlyInflow.push({ month: monthName, amount })
  })

  monthlyInflow.reverse()

  // Calculate aging buckets
  const agingBuckets = {
    '0-30': { count: 0, amount: 0 },
    '31-60': { count: 0, amount: 0 },
    '61-90': { count: 0, amount: 0 },
    '90+': { count: 0, amount: 0 },
  }

  mockObligations
    .filter((o) => o.status !== 'paid')
    .forEach((o) => {
      const daysOverdue = Math.floor(
        (today.getTime() - o.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      let bucket: keyof typeof agingBuckets = '0-30'
      if (daysOverdue >= 31 && daysOverdue < 61) bucket = '31-60'
      if (daysOverdue >= 61 && daysOverdue < 91) bucket = '61-90'
      if (daysOverdue >= 91) bucket = '90+'

      agingBuckets[bucket].count += 1
      agingBuckets[bucket].amount += o.amount
    })

  const maxAmount = Math.max(...Object.values(agingBuckets).map((b) => b.amount))

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Financial analytics and reconciliation reports"
      >
        <ButtonCustom variant="outline" size="sm">
          <MdFileDownload className="h-4 w-4 mr-2" />
          Export CSV
        </ButtonCustom>
      </PageHeader>

      <div className="px-8 py-6 space-y-6">
        {/* Monthly Inflow Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Inflow, last 6 months</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyInflow} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="month" 
                  stroke="var(--muted-foreground)"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="var(--muted-foreground)"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--foreground)',
                  }}
                  cursor={false}
                  wrapperStyle={{ outline: 'none' }}
                />
                <Bar 
                  dataKey="amount" 
                  fill="var(--gold)" 
                  radius={[8, 8, 0, 0]}
                  isAnimationActive={true}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Aging Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Outstanding by Age</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(
                  [
                    { label: '0-30 days', key: '0-30' },
                    { label: '31-60 days', key: '31-60' },
                    { label: '61-90 days', key: '61-90' },
                    { label: '90+ days', key: '90+' },
                  ] as const
                ).map(({ label, key }) => {
                  const bucket = agingBuckets[key]
                  const percentage =
                    maxAmount > 0 ? (bucket.amount / maxAmount) * 100 : 0

                  return (
                    <div key={key}>
                      <div className="flex justify-between mb-1">
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-sm">
                          <span className="font-mono">
                            {formatCurrency(bucket.amount)}
                          </span>
                          <span className="text-muted-foreground ml-2">
                            ({bucket.count} items)
                          </span>
                        </p>
                      </div>
                      <div className="h-2 bg-muted rounded overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            key === '0-30'
                              ? 'bg-green-500'
                              : key === '31-60'
                                ? 'bg-yellow-500'
                                : key === '61-90'
                                  ? 'bg-orange-500'
                                  : 'bg-red-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Statements Download */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Statements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between p-3 rounded border border-border hover:bg-muted/50 transition-colors"
                  >
                    <p className="text-sm font-medium">{customer.name}</p>
                    <ButtonCustom variant="ghost" size="sm">
                      <MdDownload className="h-4 w-4" />
                    </ButtonCustom>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
