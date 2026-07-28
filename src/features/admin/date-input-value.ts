export function dateInputValue(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}
