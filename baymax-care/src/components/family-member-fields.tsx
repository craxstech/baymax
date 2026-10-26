import { FormField } from "@/components/ui/action-form";

export type FamilyMemberFieldValues = {
  name: string;
  relationship: string;
  dateOfBirth: string | null;
  sex: string | null;
  preferredLanguage: string;
  phone: string | null;
  email: string | null;
  bloodGroup: string | null;
};

export function FamilyMemberFields({
  member,
  idPrefix = "",
}: {
  member?: FamilyMemberFieldValues;
  idPrefix?: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField label="Full name" name="name">
        <input
          id={`${idPrefix}field-name`}
          name="name"
          className="input"
          required
          minLength={2}
          maxLength={100}
          defaultValue={member?.name ?? ""}
          autoComplete="name"
        />
      </FormField>
      <FormField label="Relationship to you" name="relationship">
        <input
          id={`${idPrefix}field-relationship`}
          name="relationship"
          className="input"
          required
          maxLength={40}
          placeholder="e.g. Daughter, Father, Self"
          defaultValue={member?.relationship ?? ""}
        />
      </FormField>
      <FormField label="Date of birth" name="dateOfBirth" optional>
        <input
          id={`${idPrefix}field-dateOfBirth`}
          name="dateOfBirth"
          type="date"
          className="input"
          max={new Date().toISOString().slice(0, 10)}
          defaultValue={member?.dateOfBirth ?? ""}
        />
      </FormField>
      <FormField label="Sex" name="sex" optional>
        <select
          id={`${idPrefix}field-sex`}
          name="sex"
          className="select"
          defaultValue={member?.sex ?? ""}
        >
          <option value="">Prefer not to say</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="intersex">Intersex</option>
          <option value="not_specified">Not specified</option>
        </select>
      </FormField>
      <FormField label="Preferred language" name="preferredLanguage">
        <input
          id={`${idPrefix}field-preferredLanguage`}
          name="preferredLanguage"
          className="input"
          maxLength={60}
          defaultValue={member?.preferredLanguage ?? "English"}
        />
      </FormField>
      <FormField label="Blood group" name="bloodGroup" optional>
        <select
          id={`${idPrefix}field-bloodGroup`}
          name="bloodGroup"
          className="select"
          defaultValue={member?.bloodGroup ?? ""}
        >
          <option value="">Unknown</option>
          {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
      </FormField>
      <FormField
        label="Phone"
        name="phone"
        optional
        hint="Used only for your records and alert delivery when configured."
      >
        <input
          id={`${idPrefix}field-phone`}
          name="phone"
          type="tel"
          className="input"
          maxLength={24}
          defaultValue={member?.phone ?? ""}
          autoComplete="tel"
        />
      </FormField>
      <FormField label="Email" name="email" optional>
        <input
          id={`${idPrefix}field-email`}
          name="email"
          type="email"
          className="input"
          maxLength={254}
          defaultValue={member?.email ?? ""}
          autoComplete="email"
        />
      </FormField>
    </div>
  );
}
