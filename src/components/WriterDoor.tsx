"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { MAX_NAME_LENGTH } from "@/core/writers/handle";
import type { Identity } from "@/editor/identity";
import { KeyCard } from "./KeyCard";
import { rememberIdentity, useIdentity } from "./editor/useIdentity";
import { createWriter, suggestName, verifyWriter, type WriterReply } from "./editor/writers";
import { writerHref } from "./format";
import controls from "./editor/controls.module.css";
import buttons from "./editor/WritingEditor.module.css";
import note from "./PaperNote.module.css";
import styles from "./WriterDoor.module.css";

/** Someone who has just come through the door: a returning writer, or one made a moment ago. */
type Arrival = { identity: Identity; isNew: boolean };

/**
 * The way to a writer's own page. The pen name this browser remembers is
 * checked with the paper and, if it holds, followed to its page. Otherwise
 * the writer signs in with a name and key, or takes a new name and is handed
 * its key. There is still no account: signing in only makes this browser
 * remember.
 */
export function WriterDoor() {
  const router = useRouter();
  const remembered = useIdentity();
  const hydrated = useHydrated();
  const [arrival, setArrival] = useState<Arrival | null>(null);
  /** A remembered pen name this paper would not accept: the writer signs in afresh. */
  const [refused, setRefused] = useState<Identity | null>(null);
  /** Why the remembered pen name could not be checked at all: offline, or too many tries. Not a refusal. */
  const [trouble, setTrouble] = useState<string | null>(null);
  const checking = remembered !== null && remembered !== refused && arrival === null && trouble === null;

  useEffect(() => {
    if (!checking || !remembered) return;
    let left = false;
    verifyWriter(remembered.name, remembered.key).then((reply) => {
      if (left) return;
      if (reply.ok) router.replace(writerHref(reply.identity.name));
      else if (reply.refused) setRefused(remembered);
      else setTrouble(reply.error);
    });
    return () => {
      left = true;
    };
  }, [checking, remembered, router]);

  const arrive = (identity: Identity, isNew: boolean) => {
    setArrival({ identity, isNew });
    rememberIdentity(identity);
    if (!isNew) router.replace(writerHref(identity.name));
  };

  if (arrival?.isNew) return <Welcome identity={arrival.identity} />;
  if (!hydrated || checking || arrival) return null;
  if (trouble) {
    return (
      <p className={styles.trouble} role="alert">
        {trouble}{" "}
        <button type="button" className={styles.switch} onClick={() => setTrouble(null)}>
          Try again
        </button>
      </p>
    );
  }
  return <Forms onArrive={arrive} />;
}

function Forms({ onArrive }: { onArrive: (identity: Identity, isNew: boolean) => void }) {
  // The link here reads "Sign in", so signing in comes first; a newcomer is one press from taking a name.
  const [registering, setRegistering] = useState(false);
  return (
    <>
      <h1 className={note.title}>{registering ? "Take a moniker" : "Sign in"}</h1>
      {registering ? (
        <RegisterForm onDone={(identity) => onArrive(identity, true)} />
      ) : (
        <SignInForm onDone={(identity) => onArrive(identity, false)} />
      )}
      <p className={styles.other}>
        <button type="button" className={styles.switch} onClick={() => setRegistering(!registering)}>
          {registering ? "Already have a moniker?" : "New here?"}
        </button>
      </p>
    </>
  );
}

function SignInForm({ onDone }: { onDone: (identity: Identity) => void }) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const { busy, error, submit } = useSubmit(() => verifyWriter(name, key), onDone);
  return (
    <form className={styles.form} onSubmit={submit}>
      <label className={styles.label} htmlFor="pen-name">
        Moniker
      </label>
      <input
        id="pen-name"
        className={controls.input}
        value={name}
        autoComplete="username"
        spellCheck={false}
        autoFocus
        onChange={(event) => setName(event.target.value)}
      />
      <label className={styles.label} htmlFor="pen-key">
        Credential
      </label>
      <input
        id="pen-key"
        className={controls.input}
        value={key}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => setKey(event.target.value)}
      />
      <Submit label="Sign in" busy={busy} disabled={!name.trim() || !key.trim()} error={error} />
    </form>
  );
}

/**
 * Taking a new name: the writer types one, or presses "Choose for me" and is
 * offered one to keep, change or replace. An offer is not a reservation.
 */
function RegisterForm({ onDone }: { onDone: (identity: Identity) => void }) {
  const [name, setName] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const { busy, error, submit } = useSubmit(() => createWriter(name), onDone);

  const offer = useCallback(() => {
    suggestName().then((suggestion) => {
      if (!suggestion) return;
      setName(suggestion);
      // Once React has put the suggestion in the field, leave the cursor blinking after it.
      requestAnimationFrame(() => {
        input.current?.focus();
        input.current?.setSelectionRange(suggestion.length, suggestion.length);
      });
    });
  }, []);

  return (
    <form className={styles.form} onSubmit={submit}>
      <label className={styles.label} htmlFor="new-pen-name">
        Moniker
      </label>
      <span className={styles.offer}>
        <input
          id="new-pen-name"
          ref={input}
          className={controls.input}
          value={name}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="off"
          spellCheck={false}
          autoFocus
          onChange={(event) => setName(event.target.value)}
        />
        <button type="button" className={controls.control} onClick={offer}>
          Choose for me
        </button>
      </span>
      <Submit label="Take this moniker" busy={busy} disabled={!name.trim()} error={error} />
    </form>
  );
}

function Submit(props: { label: string; busy: boolean; disabled: boolean; error: string | null }) {
  return (
    <>
      <button type="submit" className={`${buttons.primary} ${styles.submit}`} disabled={props.busy || props.disabled}>
        {props.label}
      </button>
      {props.error && (
        <p className={styles.error} role="alert">
          {props.error}
        </p>
      )}
    </>
  );
}

/** A new writer's one look at their key, before they go anywhere else. */
function Welcome({ identity }: { identity: Identity }) {
  return (
    <>
      <h1 className={note.title}>You are now {identity.name}</h1>
      <p>
        Keep this credential safe and secret. <strong>Credentials cannot be recovered.</strong>
      </p>
      <KeyCard identity={identity} />
      <p>
        <Link href="/write">Write your first piece</Link>
      </p>
    </>
  );
}

/** Sends a form to the paper once at a time, and keeps what it said if it refused. */
function useSubmit(send: () => Promise<WriterReply>, onDone: (identity: Identity) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const reply = await send();
    setBusy(false);
    if (reply.ok) onDone(reply.identity);
    else setError(reply.error);
  };
  return { busy, error, submit };
}

/** False on the server and while hydrating, when what the browser remembers cannot be read yet. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}
