type SubjectDefaults = {
  displayName?: string;
  slug?: string;
  bio?: string | null;
  status?: string;
};

export function SubjectFields({ defaults = {} }: { defaults?: SubjectDefaults }) {
  return (
    <>
      <label>
        Nombre visible
        <input
          name="displayName"
          required
          minLength={2}
          maxLength={120}
          defaultValue={defaults.displayName}
        />
      </label>
      <label>
        Slug
        <input
          name="slug"
          maxLength={120}
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          defaultValue={defaults.slug}
          placeholder="Se genera desde el nombre"
        />
      </label>
      <label>
        Estado
        <select name="status" defaultValue={defaults.status ?? "DRAFT"}>
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

export function dateInputValue(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}
