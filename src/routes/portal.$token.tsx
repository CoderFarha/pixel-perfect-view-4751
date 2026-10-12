import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, CheckCircle2, Circle, DollarSign, Package } from "lucide-react";
import { Card, EmptyState } from "@/components/kit";
import { BrandLogo } from "@/components/brand";
import { PaymentStatusPill } from "@/components/payments/shared";
import { clients, orders, payments, statusMeta, type Order } from "@/lib/demo-data";
import {
  formatTrackingDate,
  latestShipmentUpdate,
  latestShipmentUpdateForStatus,
  shipmentProgress,
  shipmentStages,
} from "@/lib/shipment-tracking";
import { usePersistentList } from "@/lib/use-persistent-list";

export const Route = createFileRoute("/portal/$token")({ component: ClientPortalPage });

function ClientPortalPage() {
  const { token } = Route.useParams();
  const [tab, setTab] = useState<"Overview" | "Orders" | "Payments">("Orders");
  const [expandedOrderCode, setExpandedOrderCode] = useState<string | null>(null);
  const orderCollection = usePersistentList<Order>("orders", orders);
  // Never fall back to a default client — that would leak data to unauthorized visitors.
  const client = clients.find(
    (item) => item.id === token || item.name.toLowerCase().replaceAll(" ", "-") === token,
  );
  const visiblePayments = payments.filter(
    (payment) => payment.direction === "IN" && payment.counterparty === client?.name,
  );
  const linkedOrders = orderCollection.records.filter((order) => order.client === client?.name);

  if (!client)
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center text-fg-muted" role="alert">
        <h1 className="text-2xl font-bold text-fg">404 — Client portal not found</h1>
        <p className="mt-2">This client link is no longer available.</p>
      </main>
    );

  return (
    <main className="min-h-screen bg-bg px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between border-b border-border pb-5">
          <a href="/" className="flex min-h-11 items-center gap-2 text-fg">
            <BrandLogo size={36} />
          </a>
          <span className="text-xs text-fg-subtle">Secure client portal</span>
        </header>
        <div className="py-8">
          <p className="text-[11px] uppercase tracking-wider text-accent">Client account</p>
          <h1 className="mt-2 text-2xl font-bold">{client.name}</h1>
          <p className="mt-1 text-sm text-fg-muted">{client.city}, Kenya</p>
        </div>
        <nav aria-label="Client portal" className="mb-5 flex gap-1 border-b border-border">
          {(["Overview", "Orders", "Payments"] as const).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => setTab(view)}
              className={`min-h-11 border-b-2 px-4 text-sm ${tab === view ? "border-primary text-fg" : "border-transparent text-fg-muted"}`}
            >
              {view}
            </button>
          ))}
        </nav>
        {tab === "Payments" ? (
          <>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">Payments</h2>
                <p className="mt-1 text-sm text-fg-subtle">
                  Payments received and awaiting confirmation
                </p>
              </div>
              <span className="text-xs text-fg-subtle">Amounts shown in KES</span>
            </div>
            <div className="space-y-3">
              {visiblePayments.map((payment) => (
                <Card key={payment.id} className="!p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-fg-subtle">{payment.code}</p>
                      <p className="mt-2 font-mono text-xl font-bold text-success">
                        KSh {payment.amount.toLocaleString("en-KE")}
                      </p>
                    </div>
                    <PaymentStatusPill status={payment.status} />
                  </div>
                  <div className="mt-4 grid gap-3 border-t border-border pt-3 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-fg-subtle">Method</p>
                      <p className="mt-1">{payment.method}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-fg-subtle">Date</p>
                      <p className="mt-1">{payment.date}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-fg-subtle">
                        Reference
                      </p>
                      <p className="mt-1 break-all font-mono text-xs">
                        {payment.reference || "Awaiting confirmation"}
                      </p>
                    </div>
                  </div>
                  {payment.orderCode ? (
                    <button
                      type="button"
                      className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm text-accent"
                      onClick={() => {
                        setTab("Orders");
                        setExpandedOrderCode(payment.orderCode ?? null);
                        window.history.replaceState(
                          {},
                          "",
                          `?tab=orders&order=${payment.orderCode}`,
                        );
                      }}
                    >
                      <ArrowUpRight size={15} /> Order {payment.orderCode}
                    </button>
                  ) : null}
                </Card>
              ))}
              {visiblePayments.length === 0 ? (
                <Card className="!p-0">
                  <EmptyState
                    description="Received payments will appear here after TradeHub records them."
                    icon={DollarSign}
                    title="No payment activity yet"
                  />
                </Card>
              ) : null}
            </div>
          </>
        ) : tab === "Orders" ? (
          <section aria-label="Tracked orders" className="space-y-3">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Your shipments</h2>
              <p className="mt-1 text-sm text-fg-subtle">Current progress and delivery updates</p>
            </div>
            {linkedOrders.map((order) => {
              const expanded = expandedOrderCode === order.code;
              const currentStage = shipmentProgress(order.status);
              const latest = latestShipmentUpdate(order.trackingUpdates);
              return (
                <Card key={order.id} className="min-w-0 !p-4">
                  <button
                    aria-expanded={expanded}
                    className="flex w-full min-w-0 items-start justify-between gap-3 text-left"
                    onClick={() => setExpandedOrderCode(expanded ? null : order.code)}
                    type="button"
                  >
                    <span className="min-w-0">
                      <span className="block break-all font-mono text-sm text-accent">
                        {order.code}
                      </span>
                      <span className="mt-1 block break-words text-sm font-medium">
                        {order.product}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-xs text-fg-muted">
                        {statusMeta[order.status]?.label ?? order.status}
                      </span>
                      <span className="mt-1 block text-xs text-fg-subtle">ETA {order.eta}</span>
                    </span>
                  </button>
                  <div
                    aria-label={`Shipment progress: ${statusMeta[order.status]?.label ?? order.status}`}
                    className="mt-4 grid grid-cols-8 gap-1"
                    role="img"
                  >
                    {shipmentStages.map((stage, index) => (
                      <span
                        key={stage.status}
                        className={`h-1.5 min-w-0 rounded-full ${index <= currentStage ? "bg-accent" : "bg-bg-elev-2"}`}
                        title={stage.label}
                      />
                    ))}
                  </div>
                  {latest ? (
                    <div className="mt-4 border-t border-border pt-3">
                      <p className="text-xs text-fg-subtle">
                        Latest update · {formatTrackingDate(latest.date)}
                      </p>
                      <p className="mt-1 break-words text-sm text-fg-muted">{latest.note}</p>
                      {latest.photos.length ? (
                        <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1">
                          {latest.photos.map((photo, index) => (
                            <a
                              href={photo}
                              key={`${latest.id}-${index}`}
                              rel="noreferrer"
                              target="_blank"
                            >
                              <img
                                alt={`${order.code} shipment photo ${index + 1}`}
                                className="h-16 w-16 rounded-md border border-border object-cover"
                                loading="lazy"
                                src={photo}
                              />
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-4 border-t border-border pt-3 text-sm text-fg-subtle">
                      Shipment updates will appear here.
                    </p>
                  )}
                  {order.carrier || order.trackingNumber ? (
                    <div className="mt-3 flex min-w-0 flex-wrap gap-x-5 gap-y-2 text-xs text-fg-subtle">
                      {order.carrier ? (
                        <span>
                          Carrier: <span className="text-fg-muted">{order.carrier}</span>
                        </span>
                      ) : null}
                      {order.trackingNumber ? (
                        <span>
                          Tracking:{" "}
                          <span className="break-all font-mono text-fg-muted">
                            {order.trackingNumber}
                          </span>
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  {expanded ? (
                    <ol className="mt-4 space-y-3 border-t border-border pt-4">
                      {shipmentStages.map((stage, index) => {
                        const stageUpdate = latestShipmentUpdateForStatus(
                          order.trackingUpdates,
                          stage.status,
                        );
                        return (
                          <li className="flex min-w-0 gap-2" key={stage.status}>
                            {index <= currentStage ? (
                              <CheckCircle2
                                aria-hidden="true"
                                className="mt-0.5 shrink-0 text-success"
                                size={15}
                              />
                            ) : (
                              <Circle
                                aria-hidden="true"
                                className="mt-0.5 shrink-0 text-fg-faint"
                                size={15}
                              />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{stage.label}</p>
                              <p className="break-words text-xs text-fg-subtle">
                                {stageUpdate
                                  ? `${formatTrackingDate(stageUpdate.date)} · ${stageUpdate.note}`
                                  : "No update recorded"}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  ) : null}
                </Card>
              );
            })}
            {linkedOrders.length === 0 ? (
              <Card className="!p-0">
                <EmptyState
                  description="Orders and shipment updates will appear here once they are linked to your account."
                  icon={Package}
                  title="No orders linked yet"
                />
              </Card>
            ) : null}
          </section>
        ) : (
          <Card>
            <h2 className="text-lg font-semibold">Account overview</h2>
            <p className="mt-2 text-sm text-fg-muted">
              {client.orders} orders managed with TradeHub.
            </p>
            <button
              type="button"
              onClick={() => setTab("Payments")}
              className="mt-4 inline-flex min-h-11 items-center text-sm text-accent"
            >
              View payment activity
            </button>
          </Card>
        )}
      </div>
    </main>
  );
}
