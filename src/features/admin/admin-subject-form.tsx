"use client";

import Link from "next/link";
import {
  type FormEvent,
  type ReactNode,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import type { SubjectFormState } from "./subject-form";

type FormAction = (
  state: SubjectFormState,
  formData: FormData,
) => Promise<SubjectFormState>;

type Props = {
  action: FormAction;
  cancelHref: string;
  children: ReactNode;
  submitLabel: string;
  storageKey?: string;
};

export function AdminSubjectForm({
  action,
  cancelHref,
  children,
  submitLabel,
  storageKey,
}: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const [valid, setValid] = useState(false);

  function updateValidity() {
    setValid(formRef.current?.checkValidity() ?? false);
  }

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    if (storageKey) {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const values = JSON.parse(saved) as Record<string, string>;
        for (const [name, value] of Object.entries(values)) {
          const field = form.elements.namedItem(name);
          if (
            field instanceof HTMLInputElement ||
            field instanceof HTMLSelectElement ||
            field instanceof HTMLTextAreaElement
          ) {
            field.value = value;
            field.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }
        sessionStorage.removeItem(storageKey);
      }
    }
    updateValidity();
  }, [storageKey]);

  function handleInput() {
    updateValidity();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!event.currentTarget.checkValidity()) {
      event.preventDefault();
      event.currentTarget.reportValidity();
    }
  }

  function saveDraft() {
    const form = formRef.current;
    if (!form || !storageKey) return;
    const values: Record<string, string> = {};
    new FormData(form).forEach((value, key) => {
      if (typeof value === "string") values[key] = value;
    });
    sessionStorage.setItem(storageKey, JSON.stringify(values));
  }

  return (
    <>
      {state.error ? (
        <p className="admin-form-error" role="alert">
          {state.error}
        </p>
      ) : null}
      <form
        ref={formRef}
        action={formAction}
        className="admin-editor"
        onInput={handleInput}
        onSubmit={handleSubmit}
      >
        {children}
        <div className="admin-form-actions">
          <Link href={cancelHref}>Cancelar</Link>
          <button type="submit" disabled={!valid || pending}>
            {pending ? "Guardando…" : submitLabel}
          </button>
        </div>
        {storageKey ? (
          <Link
            className="admin-create-related"
            href="/admin/organizaciones/nueva?returnTo=/admin/competencias/nueva"
            onClick={saveDraft}
          >
            + Crear nueva organización
          </Link>
        ) : null}
      </form>
    </>
  );
}
