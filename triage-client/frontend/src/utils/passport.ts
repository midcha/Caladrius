export type ExtractedPatientName = {
  firstName?: string;
  lastName?: string;
  fullName: string;
};

export function extractPatientName(passportJson: unknown): ExtractedPatientName | undefined {
  if (!passportJson || typeof passportJson !== "object") {
    return undefined;
  }

  const patientNode = (passportJson as { patient?: unknown }).patient;
  if (!patientNode || typeof patientNode !== "object") {
    return undefined;
  }

  const { firstName, lastName } = patientNode as {
    firstName?: unknown;
    lastName?: unknown;
  };

  const first = typeof firstName === "string" ? firstName.trim() : undefined;
  const last = typeof lastName === "string" ? lastName.trim() : undefined;

  if (!first && !last) {
    return undefined;
  }

  const fullName = [first, last].filter(Boolean).join(" ");
  return {
    firstName: first,
    lastName: last,
    fullName,
  };
}
