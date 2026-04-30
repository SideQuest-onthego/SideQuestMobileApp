export function formatCategoryLabel(category?: string, type?: string) {
  const rawValue = category || type || "";

  if (!rawValue) {
    return "";
  }

  return rawValue
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
