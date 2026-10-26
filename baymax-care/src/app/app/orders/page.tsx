import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  AlertCircle,
  ClipboardList,
  Package,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import {
  Breadcrumbs,
  DisclosurePanel,
  InlineEmpty,
  Panel,
  PanelBody,
  Stack,
  TwoColumn,
} from "@/components/ui/app-ui";
import {
  InlineNotice,
  PageHeader,
  SectionHeading,
  Stat,
  StatusBadge,
  UnavailableBadge,
} from "@/components/ui/primitives";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { getDb } from "@/db";
import { medications, medicineOrders, orderItems, prescriptions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getAccessibleMembers } from "@/lib/authorization";
import { pharmacyConfigured } from "@/lib/config";
import { formatDate, formatDateTime, todayInZone } from "@/lib/utils";
import { createMedicineOrderAction } from "@/app/actions/orders";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Pharmacy orders" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string }>;
}) {
  const user = await requireUser("/app/orders");
  const params = await searchParams;
  const accessible = await getAccessibleMembers(user.id);
  const selectedMemberId =
    params.member && accessible.some((row) => row.member.id === params.member) ? params.member : "";
  const memberIds = accessible.map((row) => row.member.id);
  const scopeIds = memberIds.length > 0 ? memberIds : ["00000000-0000-0000-0000-000000000000"];
  const today = todayInZone(user.timezone);
  const db = await getDb();

  const [orders, eligiblePrescriptions, activeMedications] = await Promise.all([
    db
      .select()
      .from(medicineOrders)
      .where(
        and(
          eq(medicineOrders.userId, user.id),
          inArray(medicineOrders.memberId, selectedMemberId ? [selectedMemberId] : scopeIds),
        ),
      )
      .orderBy(desc(medicineOrders.createdAt))
      .limit(80),
    db
      .select()
      .from(prescriptions)
      .where(
        and(
          inArray(prescriptions.memberId, selectedMemberId ? [selectedMemberId] : scopeIds),
          inArray(prescriptions.status, ["UNVERIFIED", "VERIFIED"]),
          sql`(${prescriptions.validUntil} is null or ${prescriptions.validUntil} >= ${today})`,
        ),
      )
      .orderBy(desc(prescriptions.issuedAt)),
    db
      .select()
      .from(medications)
      .where(
        and(
          inArray(medications.memberId, selectedMemberId ? [selectedMemberId] : scopeIds),
          eq(medications.active, true),
        ),
      )
      .orderBy(desc(medications.name)),
  ]);

  const orderIds = orders.map((order) => order.id);
  const items = orderIds.length
    ? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
    : [];
  const itemsByOrder = new Map<string, typeof items>();
  for (const item of items) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }

  const members = accessible.map((row) => ({
    id: row.member.id,
    name: row.member.name,
    relationship: row.member.relationship,
    isSelf: row.member.isSelf,
  }));
  const memberById = new Map(accessible.map((row) => [row.member.id, row]));
  const managed = accessible.filter(
    (row) => row.access.canManage || row.access.canManageMedications,
  );
  const managedIds = new Set(managed.map((row) => row.member.id));
  const medicationsByPrescription = new Map<string, typeof activeMedications>();
  for (const medication of activeMedications) {
    const list = medicationsByPrescription.get(medication.prescriptionId) ?? [];
    list.push(medication);
    medicationsByPrescription.set(medication.prescriptionId, list);
  }
  const orderable = eligiblePrescriptions.filter(
    (prescription) =>
      managedIds.has(prescription.memberId) &&
      (medicationsByPrescription.get(prescription.id)?.length ?? 0) > 0,
  );

  const configured = pharmacyConfigured();
  const activeOrders = orders.filter(
    (order) => !["DELIVERED", "CANCELLED", "FAILED"].includes(order.status),
  ).length;

  return (
    <div>
      <PageHeader
        breadcrumb={<Breadcrumbs items={[{ label: "Care", href: "/app" }, { label: "Pharmacy orders" }]} />}
        title="Pharmacy orders"
        description="Orders are only sent to a configured pharmacy partner. Without a partner, ordering stays disabled and no order is invented."
        action={
          <Link className="btn btn-secondary" href="/app/prescriptions">
            <ClipboardList size={15} aria-hidden="true" /> Prescriptions
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Orders" value={orders.length} icon={Package} />
        <Stat label="Active" value={activeOrders} detail="Not delivered, cancelled, or failed." icon={Truck} accent="info" />
        <Stat
          label="Pharmacy partner"
          value={configured ? "Configured" : "Not configured"}
          detail={configured ? "Server credentials present." : "Ordering is disabled."}
          icon={ShoppingBag}
          accent={configured ? "aqua" : "warn"}
        />
        <Stat
          label="Orderable prescriptions"
          value={configured ? orderable.length : 0}
          detail="Only active medicines tied to a prescription."
          icon={ShieldCheck}
        />
      </div>

      {!configured ? (
        <InlineNotice tone="warning" className="mb-5" title="Pharmacy ordering is unavailable">
          No pharmacy partner is configured on this server, so ordering is disabled. Existing orders are
          shown honestly with their provider status. To enable ordering, configure{" "}
          <code className="rounded bg-black/5 px-1">PHARMACY_PROVIDER</code>,{" "}
          <code className="rounded bg-black/5 px-1">PHARMACY_API_BASE_URL</code>, and{" "}
          <code className="rounded bg-black/5 px-1">PHARMACY_API_KEY</code>. There is no built-in
          catalogue, price list, or delivery promise.
        </InlineNotice>
      ) : null}

      <TwoColumn>
        <Stack>
          <Panel>
            <PanelBody>
              <SectionHeading
                title="Your orders"
                description="Status messages come from the pharmacy partner. No delivery estimate is shown unless the partner supplied one."
              />
              {orders.length === 0 ? (
                <InlineEmpty
                  title="No pharmacy orders"
                  description={
                    configured
                      ? "When a prescription and medicine schedule are available, an order can be sent to the configured partner."
                      : "Ordering is disabled because no pharmacy partner is configured."
                  }
                />
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => {
                    const member = memberById.get(order.memberId);
                    const orderLines = itemsByOrder.get(order.id) ?? [];
                    return (
                      <article key={order.id} className="rounded-lg border border-line bg-white p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h3 className="text-sm font-semibold text-ink">
                                Order {order.providerOrderId ? `#${order.providerOrderId}` : order.id.slice(0, 8)}
                              </h3>
                              <StatusBadge status={order.status} />
                            </div>
                            <p className="mt-1 text-[0.7rem] text-muted">
                              {member?.member.name ?? "Family member"} · placed{" "}
                              {formatDateTime(order.createdAt, user.timezone)}
                              {order.deliveryEstimate ? ` · ${order.deliveryEstimate}` : ""}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-ink">
                              {order.totalAmount
                                ? `${order.currency} ${Number(order.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                                : "Total unavailable"}
                            </p>
                            <p className="text-[0.62rem] text-muted">
                              {order.totalAmount ? "Provided by pharmacy" : "No price supplied by provider"}
                            </p>
                          </div>
                        </div>
                        <ul className="mt-2 space-y-1 border-t border-line pt-2">
                          {orderLines.map((item) => (
                            <li key={item.id} className="flex justify-between gap-3 text-[0.74rem]">
                              <span className="text-[#52666e]">
                                {item.name} {item.strength}
                              </span>
                              <span className="text-muted">× {item.quantity}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 text-[0.64rem] text-muted">
                          Delivery address is encrypted at rest and is not shown here. Provider: {order.provider}.
                        </p>
                      </article>
                    );
                  })}
                </div>
              )}
            </PanelBody>
          </Panel>

          {configured ? (
            <Panel>
              <PanelBody>
                <SectionHeading
                  title="Start an order"
                  description="Choose a prescription with active medicine schedules, select the medicines, and provide a delivery address. The partner decides price and availability."
                />
                {orderable.length === 0 ? (
                  <InlineEmpty
                    title="Nothing orderable yet"
                    description="An order needs an active medicine schedule tied to a non-expired prescription, plus medication permission for the profile."
                  />
                ) : (
                  <div className="space-y-3">
                    {orderable.map((prescription) => {
                      const member = memberById.get(prescription.memberId);
                      const prescriptionMeds = medicationsByPrescription.get(prescription.id) ?? [];
                      return (
                        <DisclosurePanel
                          key={prescription.id}
                          summary={`${member?.member.name ?? "Member"} · ${prescription.prescriberName}`}
                          description={`Issued ${formatDate(prescription.issuedAt)} · ${prescription.status.toLowerCase()} · ${prescriptionMeds.length} active medicine${prescriptionMeds.length === 1 ? "" : "s"}`}
                        >
                          <ActionForm action={createMedicineOrderAction} submitLabel="Send order to pharmacy">
                            <input type="hidden" name="memberId" value={prescription.memberId} />
                            <input type="hidden" name="prescriptionId" value={prescription.id} />
                            <fieldset className="rounded-lg border border-line bg-[#fbfdfd] p-3">
                              <legend className="px-1 text-xs font-semibold text-[#3e515a]">
                                Medicines in this order
                              </legend>
                              <div className="space-y-2">
                                {prescriptionMeds.map((medication) => (
                                  <div key={medication.id} className="flex flex-wrap items-center gap-2">
                                    <label className="check-row min-w-0 flex-1">
                                      <input type="checkbox" name="medicationId" value={medication.id} />
                                      <span className="check-copy">
                                        {medication.name} {medication.strength} · {medication.prescribedDose}
                                      </span>
                                    </label>
                                    <label className="inline-flex items-center gap-1 text-[0.68rem] text-muted">
                                      Qty
                                      <input
                                        className="input min-h-8 w-16 py-1 text-xs"
                                        type="number"
                                        name={`quantity_${medication.id}`}
                                        min={1}
                                        max={10}
                                        defaultValue={1}
                                      />
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </fieldset>
                            <FormField label="Delivery address" name="deliveryAddress">
                              <textarea
                                className="textarea"
                                id="field-deliveryAddress"
                                name="deliveryAddress"
                                rows={3}
                                minLength={12}
                                maxLength={1000}
                                required
                                placeholder="Full address with landmark, city, state, and postal code"
                              />
                            </FormField>
                            <InlineNotice tone="warning">
                              The pharmacy partner must be licensed for your location and may reject or
                              change the order. This app does not promise availability, price, or delivery.
                            </InlineNotice>
                          </ActionForm>
                        </DisclosurePanel>
                      );
                    })}
                  </div>
                )}
              </PanelBody>
            </Panel>
          ) : (
            <Panel>
              <PanelBody>
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#8c5a16]" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-ink">No order can be created</p>
                    <p className="mt-1 text-[0.78rem] leading-5 text-[#52666e]">
                      A pharmacy integration requires a commercial agreement, a licensed provider, and
                      server-side credentials. Until those exist, this page will not create a draft or a
                      simulated order.
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <UnavailableBadge />
                  <Link className="btn btn-secondary btn-sm" href="/app/settings">
                    View integration status
                  </Link>
                </div>
              </PanelBody>
            </Panel>
          )}
        </Stack>

        <Stack>
          <Panel>
            <PanelBody>
              <SectionHeading title="How ordering stays honest" />
              <ul className="space-y-2.5 text-[0.78rem] leading-5 text-[#52666e]">
                <li>
                  <span className="font-semibold text-ink">No catalogue.</span> The app does not invent
                  products, prices, stock, or delivery windows.
                </li>
                <li>
                  <span className="font-semibold text-ink">Prescription required.</span> Orders can only
                  use active medicines tied to a recorded prescription.
                </li>
                <li>
                  <span className="font-semibold text-ink">Partner decides.</span> Availability, price,
                  substitution, and delivery are controlled by the licensed pharmacy.
                </li>
                <li>
                  <span className="font-semibold text-ink">Private address.</span> The delivery address
                  is encrypted at rest and sent only to the configured partner.
                </li>
              </ul>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelBody>
              <SectionHeading title="Order status" />
              <dl className="space-y-2 text-[0.72rem] text-[#52666e]">
                <div className="flex justify-between gap-2"><dt>Awaiting provider</dt><dd><StatusBadge status="AWAITING_PROVIDER" /></dd></div>
                <div className="flex justify-between gap-2"><dt>Confirmed</dt><dd><StatusBadge status="CONFIRMED" /></dd></div>
                <div className="flex justify-between gap-2"><dt>Dispatched</dt><dd><StatusBadge status="DISPATCHED" /></dd></div>
                <div className="flex justify-between gap-2"><dt>Delivered</dt><dd><StatusBadge status="DELIVERED" /></dd></div>
              </dl>
              <p className="mt-2 text-[0.66rem] text-muted">
                Statuses are updated by the pharmacy webhook or by actions recorded in this app. A
                &quot;confirmed&quot; status is not a guarantee of delivery.
              </p>
            </PanelBody>
          </Panel>

          <Panel className="border-[#e7b9be] bg-[#fffafa]">
            <PanelBody>
              <SectionHeading title="Medicine safety" />
              <p className="text-[0.78rem] leading-5 text-[#6b3b42]">
                Do not order medicine for someone else without authority. If a medicine arrives damaged,
                looks different, or causes a reaction, contact the pharmacy and a clinician immediately.
              </p>
            </PanelBody>
          </Panel>
        </Stack>
      </TwoColumn>
    </div>
  );
}
