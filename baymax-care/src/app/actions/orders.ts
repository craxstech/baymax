"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import {
  familyMembers,
  medicineOrders,
  medications,
  orderItems,
  prescriptions,
} from "@/db/schema";
import { requireVerifiedUser } from "@/lib/auth";
import { permissionMessage, requireMemberAccess } from "@/lib/authorization";
import { errorState, successState, type ActionState } from "@/lib/action-state";
import { createPharmacyOrder } from "@/lib/pharmacy";
import { pharmacyConfigured } from "@/lib/config";
import { encryptText } from "@/lib/security";
import { checkRateLimit, formatRateLimitMessage } from "@/lib/rate-limit";
import { recordAudit, recordIntegrationEvent } from "@/lib/audit";

export async function createMedicineOrderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireVerifiedUser("/app/orders");
  if (!pharmacyConfigured()) {
    return errorState(
      "No pharmacy partner is configured. Ordering is disabled and no order has been created.",
    );
  }

  const memberId = String(formData.get("memberId") ?? "");
  const prescriptionId = String(formData.get("prescriptionId") ?? "");
  const deliveryAddress = String(formData.get("deliveryAddress") ?? "").trim();
  const selectedMedicationIds = formData.getAll("medicationId").map(String);

  if (selectedMedicationIds.length === 0) {
    return errorState("Select at least one medication from the prescription.");
  }
  if (deliveryAddress.length < 12 || deliveryAddress.length > 1000) {
    return errorState("Enter a complete delivery address (at least 12 characters).");
  }

  try {
    await requireMemberAccess(user.id, memberId, "medications");
  } catch (error) {
    return errorState(permissionMessage(error));
  }

  const limit = await checkRateLimit("medicine-order", user.id, 5, 60 * 60_000);
  if (!limit.allowed) {
    return errorState(formatRateLimitMessage(limit.retryAfterSeconds));
  }

  const db = await getDb();
  const [prescription] = await db
    .select()
    .from(prescriptions)
    .where(
      and(
        eq(prescriptions.id, prescriptionId),
        eq(prescriptions.memberId, memberId),
      ),
    )
    .limit(1);
  if (!prescription) return errorState("That prescription could not be found.");
  if (prescription.status === "REJECTED" || prescription.status === "EXPIRED") {
    return errorState("This prescription is not eligible for ordering.");
  }

  const [member] = await db
    .select({
      name: familyMembers.name,
      dateOfBirth: familyMembers.dateOfBirth,
      phone: familyMembers.phone,
      language: familyMembers.preferredLanguage,
    })
    .from(familyMembers)
    .where(eq(familyMembers.id, memberId))
    .limit(1);
  if (!member) return errorState("That family member could not be found.");

  const eligible = await db
    .select()
    .from(medications)
    .where(
      and(
        eq(medications.prescriptionId, prescriptionId),
        eq(medications.memberId, memberId),
        eq(medications.active, true),
        inArray(medications.id, selectedMedicationIds),
      ),
    );
  if (eligible.length === 0) {
    return errorState("None of the selected medicines belong to this prescription.");
  }

  const items = eligible.map((medication) => {
    const quantity = Number(formData.get(`quantity_${medication.id}`) ?? 1);
    return {
      name: medication.name,
      strength: medication.strength,
      quantity: Number.isFinite(quantity)
        ? Math.max(1, Math.min(10, Math.round(quantity)))
        : 1,
    };
  });

  const idempotencyKey = crypto.randomUUID();
  const result = await createPharmacyOrder(
    {
      prescriptionId: prescription.id,
      member: {
        name: member.name,
        dateOfBirth: member.dateOfBirth,
        phone: member.phone,
        language: member.language,
      },
      prescriberName: prescription.prescriberName,
      issuedAt: prescription.issuedAt,
      items,
      deliveryAddress,
      currency: "INR",
    },
    idempotencyKey,
  );

  if (result.status !== "ok") {
    await recordIntegrationEvent({
      type: "PHARMACY",
      status: result.status === "unavailable" ? "UNAVAILABLE" : "FAILED",
      summary: "Pharmacy order did not complete.",
      detail: result.reason,
    });
    return errorState(result.reason);
  }

  let orderId = "";
  await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(medicineOrders)
      .values({
        memberId,
        prescriptionId,
        userId: user.id,
        provider: "configured",
        providerOrderId: result.data.id,
        status: result.data.status,
        totalAmount:
          result.data.totalAmount !== undefined && result.data.totalAmount !== null
            ? result.data.totalAmount.toFixed(2)
            : null,
        currency: result.data.currency ?? "INR",
        deliveryEstimate: result.data.deliveryEstimate ?? null,
        deliveryAddressEncrypted: encryptText(deliveryAddress),
        confirmedAt: result.data.status === "CONFIRMED" ? new Date() : null,
      })
      .returning({ id: medicineOrders.id });
    orderId = order.id;

    await tx.insert(orderItems).values(
      items.map((item) => ({
        orderId,
        name: item.name,
        strength: item.strength,
        quantity: item.quantity,
        unitPrice: null,
        providerProductId: null,
      })),
    );
  });

  await recordAudit({
    actorUserId: user.id,
    memberId,
    action: "order.created",
    entityType: "medicine_order",
    entityId: orderId,
    metadata: { itemCount: items.length, providerStatus: result.data.status },
  });
  await recordIntegrationEvent({
    type: "PHARMACY",
    status: "SUCCESS",
    summary: "Pharmacy partner accepted an order.",
  });

  revalidatePath("/app/orders");
  return successState(
    result.data.status === "CONFIRMED"
      ? "The pharmacy partner confirmed the order. Check the order status for updates."
      : `The pharmacy partner accepted the order with status ${result.data.status.replaceAll("_", " ")}.`,
  );
}
