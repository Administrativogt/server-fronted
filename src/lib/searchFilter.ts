/**
 * Filtro de búsqueda para <Select showSearch> con listas de personas.
 *
 * - Ignora tildes y mayúsculas ("jose" encuentra "José").
 * - Cada palabra escrita debe aparecer en la etiqueta, en cualquier orden
 *   ("perez ana" encuentra "Ana Pérez").
 *
 * Uso: <Select showSearch filterOption={userSearchFilter} options={...} />
 */
export const normalizeText = (s: unknown): string =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export function userSearchFilter(
  input: string,
  option?: { label?: unknown; value?: unknown },
): boolean {
  const haystack = normalizeText(option?.label);
  const tokens = normalizeText(input).split(" ").filter(Boolean);
  if (!tokens.length) return true;
  return tokens.every((t) => haystack.includes(t));
}
