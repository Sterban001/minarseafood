import type { Metadata } from "next";
import { Eye, EyeOff, Pencil, Plus, Star, Trash2 } from "lucide-react";

import { ActionForm } from "@/modules/admin/components/action-form";
import { PageHeader } from "@/modules/admin/components/admin-shell";
import { Popover } from "@/modules/admin/components/popover";
import { requireManager } from "@/modules/admin/auth/session";
import {
  deleteCategory,
  deleteMenuItem,
  saveCategory,
  toggleAvailability,
  toggleFeatured,
} from "@/modules/admin/menu/actions";
import { ItemForm } from "@/modules/admin/menu/components/item-form";
import { createServerSupabase } from "@/shared/supabase/server";
import { formatMoney } from "@/shared/lib/money";
import type { MenuCategory, MenuItem } from "@/shared/types/database";
import { Field, Input } from "@/shared/ui/form";
import { SubmitButton } from "@/shared/ui/submit-button";
import { Badge, Card, CardHeader, EmptyState } from "@/shared/ui/surface";

export const metadata: Metadata = { title: "Menu" };

export default async function MenuAdminPage() {
  await requireManager();
  const supabase = await createServerSupabase();

  const [categoriesResult, itemsResult] = await Promise.all([
    supabase.from("menu_categories").select("*").order("sort_order").order("name"),
    supabase.from("menu_items").select("*").order("sort_order").order("name"),
  ]);

  if (categoriesResult.error) throw new Error(categoriesResult.error.message);
  if (itemsResult.error) throw new Error(itemsResult.error.message);

  const categories = categoriesResult.data ?? [];
  const items = itemsResult.data ?? [];

  const soldOut = items.filter((item) => !item.is_available).length;

  return (
    <>
      <PageHeader
        title="Menu"
        subtitle={`${items.length} dishes across ${categories.length} sections${
          soldOut ? ` · ${soldOut} marked sold out` : ""
        }`}
        actions={
          <>
            <Popover
              label={
                <>
                  <Plus className="size-4" aria-hidden />
                  Section
                </>
              }
              variant="outline"
              size="md"
              width="w-72"
            >
              <CategoryForm />
            </Popover>

            <Popover
              label={
                <>
                  <Plus className="size-4" aria-hidden />
                  Dish
                </>
              }
              variant="primary"
              size="md"
              width="w-80"
            >
              <ItemForm categories={categories} defaultCategoryId={categories[0]?.id} />
            </Popover>
          </>
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          title="No menu sections yet"
          description="Start with a section like Starters or Curries, then add dishes to it."
        />
      ) : (
        <div className="space-y-6">
          {categories.map((category) => (
            <CategoryBlock
              key={category.id}
              category={category}
              categories={categories}
              items={items.filter((item) => item.category_id === category.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function CategoryBlock({
  category,
  categories,
  items,
}: {
  category: MenuCategory;
  categories: MenuCategory[];
  items: MenuItem[];
}) {
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            {category.name}
            {category.is_active ? null : <Badge tone="warning">Hidden from website</Badge>}
          </span>
        }
        subtitle={`${items.length} ${items.length === 1 ? "dish" : "dishes"} · sort ${category.sort_order}`}
        action={
          <div className="flex gap-1.5">
            <Popover
              label={<Pencil className="size-3.5" aria-hidden />}
              variant="ghost"
              width="w-72"
            >
              <CategoryForm category={category} />
            </Popover>
            <Popover
              label={<Trash2 className="size-3.5" aria-hidden />}
              variant="ghost"
              width="w-64"
            >
              <ActionForm action={deleteCategory} className="space-y-2">
                <input type="hidden" name="id" value={category.id} />
                <p className="text-xs text-slate-600">
                  Delete the “{category.name}” section? Only possible while it is empty.
                </p>
                <SubmitButton size="sm" variant="danger" className="w-full">
                  Delete section
                </SubmitButton>
              </ActionForm>
            </Popover>
          </div>
        }
      />

      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500">
          Nothing in this section yet.
        </p>
      ) : (
        <ul className="divide-y divide-slate-200">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">{item.name}</span>
                  {item.is_featured ? (
                    <Star
                      className="size-3.5 fill-spice-400 text-spice-500"
                      aria-label="Shown on the website"
                    />
                  ) : null}
                  {item.is_available ? null : <Badge tone="danger">Sold out</Badge>}
                </span>
                {item.description ? (
                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                    {item.description}
                  </span>
                ) : null}
              </span>

              <span className="w-20 text-right font-semibold text-slate-900 tabular-nums">
                {formatMoney(item.price)}
              </span>

              <span className="flex gap-1.5">
                <ActionForm action={toggleAvailability}>
                  <input type="hidden" name="id" value={item.id} />
                  <input
                    type="hidden"
                    name="available"
                    value={item.is_available ? "false" : "true"}
                  />
                  <SubmitButton
                    variant="ghost"
                    size="sm"
                    className="px-2"
                    aria-label={item.is_available ? "Mark sold out" : "Mark available"}
                    pendingLabel="…"
                  >
                    {item.is_available ? (
                      <Eye className="size-3.5" aria-hidden />
                    ) : (
                      <EyeOff className="size-3.5" aria-hidden />
                    )}
                  </SubmitButton>
                </ActionForm>

                <ActionForm action={toggleFeatured}>
                  <input type="hidden" name="id" value={item.id} />
                  <input
                    type="hidden"
                    name="featured"
                    value={item.is_featured ? "false" : "true"}
                  />
                  <SubmitButton
                    variant="ghost"
                    size="sm"
                    className="px-2"
                    aria-label={
                      item.is_featured
                        ? "Remove from the website"
                        : "Feature on the website"
                    }
                    pendingLabel="…"
                  >
                    <Star
                      className={
                        item.is_featured
                          ? "size-3.5 fill-spice-400 text-spice-500"
                          : "size-3.5"
                      }
                      aria-hidden
                    />
                  </SubmitButton>
                </ActionForm>

                <Popover
                  label={<Pencil className="size-3.5" aria-hidden />}
                  variant="ghost"
                  width="w-80"
                >
                  <ItemForm categories={categories} item={item} />
                </Popover>

                <Popover
                  label={<Trash2 className="size-3.5" aria-hidden />}
                  variant="ghost"
                  width="w-64"
                >
                  <ActionForm action={deleteMenuItem} className="space-y-2">
                    <input type="hidden" name="id" value={item.id} />
                    <p className="text-xs text-slate-600">
                      Delete {item.name}? Past bills keep their own copy of the name and
                      price, so reports stay correct.
                    </p>
                    <SubmitButton size="sm" variant="danger" className="w-full">
                      Delete dish
                    </SubmitButton>
                  </ActionForm>
                </Popover>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function CategoryForm({ category }: { category?: MenuCategory }) {
  const key = category?.id ?? "new";

  return (
    <ActionForm action={saveCategory} announceSuccess className="space-y-3">
      {category ? <input type="hidden" name="id" value={category.id} /> : null}

      <Field label="Section name" htmlFor={`cat-name-${key}`} required>
        <Input
          id={`cat-name-${key}`}
          name="name"
          defaultValue={category?.name ?? ""}
          placeholder="Crab Specials"
          required
          minLength={2}
        />
      </Field>

      <Field label="Sort order" htmlFor={`cat-sort-${key}`} hint="Lower shows first.">
        <Input
          id={`cat-sort-${key}`}
          name="sortOrder"
          type="number"
          defaultValue={category?.sort_order ?? 0}
          inputMode="numeric"
        />
      </Field>

      <label
        htmlFor={`cat-active-${key}`}
        className="flex items-center gap-2 text-sm text-slate-700"
      >
        <input
          id={`cat-active-${key}`}
          name="isActive"
          type="checkbox"
          defaultChecked={category?.is_active ?? true}
          className="size-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
        />
        Show this section on the website
      </label>

      <SubmitButton size="md" className="w-full">
        {category ? "Save section" : "Add section"}
      </SubmitButton>
    </ActionForm>
  );
}
