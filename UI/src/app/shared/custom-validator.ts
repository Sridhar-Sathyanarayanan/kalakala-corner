import { AbstractControl } from "@angular/forms";

export function phoneOrEmailValidator(group: AbstractControl) {
  const phone = group.get("phone")?.value?.trim();
  const email = group.get("email")?.value?.trim();
  if (!phone && !email) {
    return { phoneOrEmailRequired: true };
  }
  return null;
}
