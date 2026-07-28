"use client";

import { useState } from "react";

import { normalizeSlug } from "./subject-form";

type SubjectDefaults = {
  displayName?: string;
  slug?: string;
  bio?: string | null;
  status?: string;
};

export function SubjectFields({ defaults = {} }: { defaults?: SubjectDefaults }) {
  const [slug, setSlug] = useState(defaults.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(defaults.slug));

  return (
    <>
      <label>
        Nombre visible <span className="admin-required" aria-hidden="true">*</span>
        <input
          name="displayName"
          required
          minLength={2}
          maxLength={120}
          defaultValue={defaults.displayName}
          onChange={(event) => {
            if (!slugEdited) setSlug(normalizeSlug(event.target.value));
          }}
        />
      </label>
      <label>
        Slug <span className="admin-required" aria-hidden="true">*</span>
        <input
          name="slug"
          required
          maxLength={120}
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          value={slug}
          onChange={(event) => {
            setSlug(event.target.value);
            setSlugEdited(Boolean(event.target.value));
          }}
          placeholder="Se genera desde el nombre"
        />
        <small>Minúsculas, números y guiones. Se completa desde el nombre hasta que lo edites.</small>
      </label>
      <label>
        Estado <span className="admin-required" aria-hidden="true">*</span>
        <select name="status" required defaultValue={defaults.status ?? "DRAFT"}>
          <option value="DRAFT">Borrador</option>
          <option value="ACTIVE">Activo</option>
          <option value="ARCHIVED">Archivado</option>
        </select>
      </label>
      <label className="admin-field-wide">
        Descripción
        <textarea name="bio" maxLength={2000} defaultValue={defaults.bio ?? ""} />
      </label>
    </>
  );
}

export function FormFeedback({ error }: { error?: string }) {
  return error ? (
    <p className="admin-form-error" role="alert">
      {error}
    </p>
  ) : null;
}
