import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  CalendarDays,
  Check,
  MapPin,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  ShoppingBag,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { z } from "zod";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Stat,
  Table,
  TableSkeleton,
} from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { clients, usd, type Client } from "@/lib/demo-data";
import { usePersistentList } from "@/lib/use-persistent-list";
import { toast } from "sonner";
import { logError } from "@/lib/logger";

export const Route = createFileRoute("/app/clients")({
  head: () => ({
    meta: [
      { title: "Clients — TradeHub" },
      {
        name: "description",
        content: "Manage client accounts, relationship history, and lifetime value.",
      },
    ],
  }),
  component: ClientsPage,
});

const clientSchema = z.object({
  name: z.string().trim().min(1, "Enter a client name."),
  city: z.string().trim().min(1, "Enter a city."),
  orders: z.string().trim().regex(/^\d+$/, "Enter a whole number of orders.").transform(Number),
  lifetimeUsd: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount (up to 2 decimal places).")
    .transform(Number),
  lastOrder: z.string().trim().min(1, "Enter the last order date."),
  tier: z.enum(["Bronze", "Silver", "Gold"]),
  risk: z.enum(["Low", "Medium", "High"]),
});

type ClientFormInput = z.input<typeof clientSchema>;
type ClientFilter = "All clients" | "Gold" | "Silver" | "Bronze" | "High risk";

const blankClient: ClientFormInput = {
  name: "",
  city: "",
  orders: "",
  lifetimeUsd: "",
  lastOrder: "",
  tier: "Bronze",
  risk: "Low",
};

const filterOptions: ClientFilter[] = ["All clients", "Gold", "Silver", "Bronze", "High risk"];

function ClientsPage() {
  const collection = usePersistentList<Client>("clients", clients);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ClientFilter>("All clients");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const form = useForm<ClientFormInput, unknown, z.output<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
    defaultValues: blankClient,
  });

  const clientsWithStats = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return collection.records.filter((client) => {
      const matchesSearch =
        !query ||
        [client.name, client.city, client.tier, client.risk, client.lastOrder]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query);
      const matchesFilter =
        filter === "All clients" ||
        (filter === "High risk" ? client.risk === "High" : client.tier === filter);
      return matchesSearch && matchesFilter;
    });
  }, [collection.records, filter, search]);

  const totalOrders = collection.records.reduce((sum, client) => sum + client.orders, 0);
  const portfolioValue = collection.records.reduce((sum, client) => sum + client.lifetimeUsd, 0);
  const highRiskClients = collection.records.filter((client) => client.risk === "High").length;

  const openCreate = () => {
    setEditingId(null);
    form.reset(blankClient);
    setDialogOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingId(client.id);
    form.reset({
      name: client.name,
      city: client.city,
      orders: String(client.orders),
      lifetimeUsd: String(client.lifetimeUsd),
      lastOrder: client.lastOrder,
      tier: client.tier,
      risk: client.risk,
    });
    setDialogOpen(true);
  };

  const saveClient = (values: z.output<typeof clientSchema>) => {
    const { name, city, orders, lifetimeUsd, lastOrder, tier, risk } = values;
    const record = { name, city, orders, lifetimeUsd, lastOrder, tier, risk };
    try {
      if (editingId) {
        collection.update(editingId, record);
        toast.success(`${name} updated.`);
      } else {
        collection.create(record);
        toast.success(`${name} added to clients.`);
      }
      setDialogOpen(false);
    } catch (error) {
      logError("clients.save_failed", error);
      toast.error("Couldn't save this client. Check browser storage and try again.");
    }
  };

  const deleteClient = (client: Client) => {
    try {
      collection.remove(client.id);
      setConfirmDelete(null);
      toast.success(`${client.name} removed.`);
    } catch (error) {
      logError("clients.remove_failed", error);
      toast.error("Couldn't remove this client. Check browser storage and try again.");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setFilter("All clients");
  };

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle="Manage client accounts and relationship history"
        actions={
          <Button onClick={openCreate} type="button">
            <Plus aria-hidden="true" size={16} />
            Add client
          </Button>
        }
      />

      <section
        aria-label="Client portfolio summary"
        className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Stat
          label="Total clients"
          value={String(collection.records.length)}
          tone="accent"
          icon={<Users size={18} />}
        />
        <Stat
          label="Orders placed"
          value={totalOrders.toLocaleString()}
          tone="primary"
          icon={<ShoppingBag size={18} />}
        />
        <Stat
          label="Lifetime value"
          value={usd(portfolioValue)}
          tone="success"
          icon={<Wallet size={18} />}
        />
        <Stat
          label="High-risk accounts"
          value={String(highRiskClients)}
          sub={highRiskClients ? "Review before next order" : "No accounts flagged"}
          tone={highRiskClients ? "warning" : "success"}
          icon={<ShieldAlert size={18} />}
        />
      </section>

      <Card className="mb-4 !p-3 sm:!p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-h-11 items-center gap-2 rounded-md border border-input px-3 lg:w-80">
            <Search aria-hidden="true" className="shrink-0 text-muted-foreground" size={16} />
            <Input
              aria-label="Search clients"
              className="border-0 px-0 shadow-none focus-visible:ring-0"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, city, tier..."
              value={search}
            />
          </div>
          <div aria-label="Filter clients" className="flex flex-wrap gap-2" role="group">
            {filterOptions.map((option) => {
              const count =
                option === "All clients"
                  ? collection.records.length
                  : option === "High risk"
                    ? highRiskClients
                    : collection.records.filter((client) => client.tier === option).length;
              const selected = filter === option;
              return (
                <Button
                  aria-pressed={selected}
                  className="min-h-9 px-3 py-1.5 text-xs"
                  key={option}
                  onClick={() => setFilter(option)}
                  type="button"
                  variant={selected ? "accent" : "glass"}
                >
                  {option} <span className="font-mono opacity-70">{count}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </Card>

      {!collection.hydrated ? (
        <Card className="!p-2">
          <TableSkeleton rows={5} />
        </Card>
      ) : clientsWithStats.length === 0 ? (
        <Card className="!p-0">
          <EmptyState
            action={
              collection.records.length === 0 ? (
                <Button onClick={openCreate} type="button">
                  <Plus size={16} /> Add client
                </Button>
              ) : (
                <Button onClick={clearFilters} type="button" variant="glass">
                  Clear filters
                </Button>
              )
            }
            description={
              collection.records.length === 0
                ? "Add your first client to start tracking orders and lifetime value."
                : "No clients match these filters. Try another search or clear the filters."
            }
            icon={Users}
            title={collection.records.length === 0 ? "No clients yet" : "No matching clients"}
          />
        </Card>
      ) : isMobile ? (
        <div aria-label="Client records" className="space-y-3">
          {clientsWithStats.map((client) => (
            <ClientCard
              client={client}
              confirmDelete={confirmDelete === client.id}
              key={client.id}
              onCancelDelete={() => setConfirmDelete(null)}
              onConfirmDelete={() => deleteClient(client)}
              onDelete={() => setConfirmDelete(client.id)}
              onEdit={() => openEdit(client)}
            />
          ))}
        </div>
      ) : (
        <Table
          head={[
            "Client",
            "City",
            "Orders",
            "Lifetime value",
            "Last order",
            "Tier",
            "Risk",
            "Actions",
          ]}
        >
          {clientsWithStats.map((client) => (
            <tr
              className="h-10 border-b border-border/60 last:border-0 hover:bg-bg-glass-hover"
              key={client.id}
            >
              <td className="px-5 py-3 font-medium text-fg">{client.name}</td>
              <td className="px-5 py-3">
                <span className="inline-flex items-center gap-1.5 text-fg-muted">
                  <MapPin aria-hidden="true" size={14} /> {client.city}
                </span>
              </td>
              <td className="px-5 py-3 font-mono">{client.orders}</td>
              <td className="px-5 py-3 font-mono">{usd(client.lifetimeUsd)}</td>
              <td className="px-5 py-3 text-fg-muted">{client.lastOrder}</td>
              <td className="px-5 py-3">
                <TierBadge tier={client.tier} />
              </td>
              <td className="px-5 py-3">
                <RiskBadge risk={client.risk} />
              </td>
              <td className="px-5 py-3 text-right">
                <ClientActions
                  client={client}
                  confirmDelete={confirmDelete === client.id}
                  onCancelDelete={() => setConfirmDelete(null)}
                  onConfirmDelete={() => deleteClient(client)}
                  onDelete={() => setConfirmDelete(client.id)}
                  onEdit={() => openEdit(client)}
                />
              </td>
            </tr>
          ))}
        </Table>
      )}

      <p aria-live="polite" className="mt-3 text-xs text-fg-subtle">
        Showing {clientsWithStats.length} of {collection.records.length} clients
      </p>

      <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit client" : "Add client"}</DialogTitle>
            <DialogDescription>
              Keep account details, order history, and risk information up to date.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" noValidate onSubmit={form.handleSubmit(saveClient)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField error={form.formState.errors.name?.message} label="Client name">
                <Input autoComplete="organization" {...form.register("name")} />
              </FormField>
              <FormField error={form.formState.errors.city?.message} label="City">
                <Input autoComplete="address-level2" {...form.register("city")} />
              </FormField>
              <FormField error={form.formState.errors.orders?.message} label="Orders">
                <Input min="0" step="1" type="number" {...form.register("orders")} />
              </FormField>
              <FormField
                error={form.formState.errors.lifetimeUsd?.message}
                label="Lifetime value (USD)"
              >
                <Input min="0" step="0.01" type="number" {...form.register("lifetimeUsd")} />
              </FormField>
              <FormField error={form.formState.errors.lastOrder?.message} label="Last order">
                <Input placeholder="e.g. 22 Sep 2026" {...form.register("lastOrder")} />
              </FormField>
              <FormField error={form.formState.errors.tier?.message} label="Client tier">
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...form.register("tier")}
                >
                  <option value="Bronze">Bronze</option>
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                </select>
              </FormField>
              <FormField error={form.formState.errors.risk?.message} label="Risk level">
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...form.register("risk")}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </FormField>
            </div>
            <DialogFooter className="border-t border-border pt-4">
              <Button onClick={() => setDialogOpen(false)} type="button" variant="glass">
                Cancel
              </Button>
              <Button type="submit">{editingId ? "Save changes" : "Create client"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FormField({
  children,
  error,
  label,
}: {
  children: React.ReactNode;
  error: string | undefined;
  label: string;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {error ? (
        <span className="block text-xs text-danger" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function TierBadge({ tier }: { tier: Client["tier"] }) {
  const tone = tier === "Gold" ? "warning" : tier === "Silver" ? "muted" : "primary";
  return <Badge tone={tone}>{tier}</Badge>;
}

function RiskBadge({ risk }: { risk: Client["risk"] }) {
  const tone = risk === "High" ? "danger" : risk === "Medium" ? "warning" : "success";
  return <Badge tone={tone}>{risk}</Badge>;
}

function ClientActions({
  client,
  confirmDelete,
  onCancelDelete,
  onConfirmDelete,
  onDelete,
  onEdit,
}: {
  client: Client;
  confirmDelete: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  if (confirmDelete) {
    return (
      <span className="inline-flex items-center gap-1">
        <Button
          aria-label={`Confirm delete ${client.name}`}
          className="px-2 py-1"
          onClick={onConfirmDelete}
          type="button"
          variant="ghost"
        >
          <Check size={15} />
        </Button>
        <Button
          aria-label={`Cancel delete ${client.name}`}
          className="px-2 py-1"
          onClick={onCancelDelete}
          type="button"
          variant="ghost"
        >
          <X size={15} />
        </Button>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <Button
        aria-label={`Edit ${client.name}`}
        className="px-2 py-1"
        onClick={onEdit}
        title="Edit client"
        type="button"
        variant="ghost"
      >
        <Pencil size={15} />
      </Button>
      <Button
        aria-label={`Delete ${client.name}`}
        className="px-2 py-1 text-danger"
        onClick={onDelete}
        title="Delete client"
        type="button"
        variant="ghost"
      >
        <Trash2 size={15} />
      </Button>
    </span>
  );
}

function ClientCard({
  client,
  confirmDelete,
  onCancelDelete,
  onConfirmDelete,
  onDelete,
  onEdit,
}: {
  client: Client;
  confirmDelete: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <Card>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-fg">{client.name}</h2>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-fg-muted">
            <MapPin aria-hidden="true" size={14} /> {client.city}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <TierBadge tier={client.tier} />
          <RiskBadge risk={client.risk} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
        <ClientDetail label="Orders" value={client.orders.toLocaleString()} />
        <ClientDetail label="Lifetime value" value={usd(client.lifetimeUsd)} />
        <ClientDetail
          label="Last order"
          value={client.lastOrder}
          icon={<CalendarDays size={13} />}
        />
      </div>
      <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3">
        {confirmDelete ? (
          <>
            <span className="mr-auto self-center text-xs text-danger">Remove this client?</span>
            <Button
              aria-label={`Cancel delete ${client.name}`}
              onClick={onCancelDelete}
              type="button"
              variant="glass"
            >
              Cancel
            </Button>
            <Button
              aria-label={`Confirm delete ${client.name}`}
              onClick={onConfirmDelete}
              type="button"
            >
              Remove
            </Button>
          </>
        ) : (
          <>
            <Button
              aria-label={`Delete ${client.name}`}
              onClick={onDelete}
              type="button"
              variant="glass"
            >
              <Trash2 size={15} /> Delete
            </Button>
            <Button
              aria-label={`Edit ${client.name}`}
              onClick={onEdit}
              type="button"
              variant="glass"
            >
              <Pencil size={15} /> Edit
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

function ClientDetail({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-fg-subtle">{label}</p>
      <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-fg">
        {icon} {value}
      </p>
    </div>
  );
}
