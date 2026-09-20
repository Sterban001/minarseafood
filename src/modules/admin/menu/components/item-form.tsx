import { ActionForm } from "@/modules/admin/components/action-form";
import type { MenuCategory, MenuItem } from "@/shared/types/database";
import { Field, Input, Select, Textarea } from "@/shared/ui/form";
import { SubmitButton } from "@/shared/ui/submit-button";

import { saveMenuItem } from "../actions";

/** Shared by "add a dish" and "edit this dish" — the only difference is the id. */
export function ItemForm({
  categories,
  item,
  defaultCategoryId,
}: {
  categories: Pick<MenuCategory, "id" | "name">[];
  item?: MenuItem;
  defaultCategoryId?: string;
}) {
  const key = item?.id ?? "new";

  return (
    <ActionForm action={saveMenuItem} announceSuccess className="space-y-3">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      {item?.image_url ? (
        <input type="hidden" name="imageUrl" value={item.image_url} />
      ) : null}

      <Field label="Dish name" htmlFor={`name-${key}`} required>
        <Input
          id={`name-${key}`}
          name="name"
          defaultValue={item?.name ?? ""}
          placeholder="Butter Pepper Garlic Crab"
          required
          minLength={2}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Price (₹)" htmlFor={`price-${key}`} required>
          <Input
            id={`price-${key}`}
            name="price"
            type="number"
            min={0}
            step="1"
            inputMode="decimal"
            defaultValue={item?.price ?? ""}
            required
          />
        </Field>
        <Field label="Section" htmlFor={`category-${key}`} required>
          <Select
            id={`category-${key}`}
            name="categoryId"
            defaultValue={item?.category_id ?? defaultCategoryId ?? ""}
            required
          >
            <option value="">Choose…</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Description"
        htmlFor={`description-${key}`}
        hint="Shown on the website menu. Leave blank to keep it plain."
      >
        <Textarea
          id={`description-${key}`}
          name="description"
          rows={2}
          defaultValue={item?.description ?? ""}
          placeholder="Our signature — full crab, cracked to order"
        />
      </Field>

      <Field
        label="Photo"
        htmlFor={`image-${key}`}
        hint={
          item?.image_url
            ? "Choosing a new file replaces the current photo."
            : "Optional. JPEG, PNG, WebP or AVIF, up to 5 MB."
        }
      >
        <Input
          id={`image-${key}`}
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-medium"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Sort order" htmlFor={`sort-${key}`} hint="Lower shows first.">
          <Input
            id={`sort-${key}`}
            name="sortOrder"
            type="number"
            defaultValue={item?.sort_order ?? 0}
            inputMode="numeric"
          />
        </Field>

        <div className="space-y-2 pt-6">
          <Checkbox
            name="isAvailable"
            id={`available-${key}`}
            label="Available"
            defaultChecked={item?.is_available ?? true}
          />
          <Checkbox
            name="isFeatured"
            id={`featured-${key}`}
            label="Show on the website"
            defaultChecked={item?.is_featured ?? false}
          />
        </div>
      </div>

      <SubmitButton size="md" className="w-full">
        {item ? "Save changes" : "Add to the menu"}
      </SubmitButton>
    </ActionForm>
  );
}

function Checkbox({
  id,
  name,
  label,
  defaultChecked,
}: {
  id: string;
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm text-slate-700">
      <input
        id={id}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="size-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
      />
      {label}
    </label>
  );
}
