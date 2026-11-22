/**
 * Which breadcrumb items stay visible on phones. Pure.
 * Phones show only linked ancestors (never the current page), and drop the first ancestor
 * ("Home") when there is a closer one.
 */
export interface CrumbLike {
  path?: string | null;
}

export function phoneCrumbs(crumbs: readonly CrumbLike[]): { onPhone: boolean[]; firstOnPhone: number } {
  const ancestors = crumbs
    .map((c, i) => ({ c, i }))
    .slice(0, -1)
    .filter(({ c }) => !!c.path)
    .map(({ i }) => i);
  const shown = new Set(ancestors.length > 1 ? ancestors.slice(1) : ancestors);
  const onPhone = crumbs.map((_, i) => shown.has(i));
  return { onPhone, firstOnPhone: onPhone.indexOf(true) };
}
