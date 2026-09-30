import type { CatalogAttribute } from '@/lib/product-catalog-settings-store';
import type { categorySchemaDiff, Specification } from '@/lib/category-schema';

/** Quiet, explicit field-level changes; warning colour is reserved for actual missing values. */
export function CategorySchemaChanges({ diff, attributes, specifications = [] }: {
  diff: ReturnType<typeof categorySchemaDiff>;
  attributes: CatalogAttribute[];
  specifications?: Specification[];
}) {
  const sections: Array<[string, string[]]> = [
    ['Fields added', diff.added],
    ['No longer applicable — values kept', diff.removed],
    ['Now required', diff.required],
    ['Now optional', diff.optional],
  ];
  if (!sections.some(([, keys]) => keys.length)) return <p className="text-sm text-muted-foreground">The attribute fields and requirements stay the same.</p>;
  return <dl className="divide-y rounded-lg border">
    {sections.filter(([, keys]) => keys.length).map(([label, keys]) => <div key={label} className="grid gap-2 p-4 sm:grid-cols-[180px_minmax(0,1fr)]">
      <dt className="text-sm font-medium">{label}</dt>
      <dd className="space-y-1 text-sm">{keys.map(key => {
        const attribute = attributes.find(item => item.key === key);
        const value = specifications.find(spec => spec.attributeKey === key || (!spec.attributeKey && attribute && spec.name.trim().toLowerCase() === attribute.name.toLowerCase()))?.value;
        return <p key={key} className="break-words">{attribute?.name ?? key}{value ? <span className="text-muted-foreground">: {value}</span> : null}</p>;
      })}</dd>
    </div>)}
  </dl>;
}
