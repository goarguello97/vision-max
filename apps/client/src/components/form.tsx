import {
  CheckCircleIcon,
  CheckIcon,
  CircleIcon,
  EyeIcon,
  EyeSlashIcon,
  InfoIcon,
  WarningCircleIcon,
  XIcon,
} from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { useId, useState, type ComponentProps, type ReactNode } from 'react';

// Piezas de formulario compartidas por las pantallas de auth (y luego perfil).
// Label arriba, error abajo, aria-invalid + aria-describedby (spec 01, §4.3).

const controlClass =
  'h-12 w-full rounded-lg border border-line bg-ink/70 px-3.5 text-fg placeholder:text-muted/60 ' +
  'outline-none transition-[border-color,box-shadow] duration-200 ' +
  'focus:border-accent focus:ring-3 focus:ring-accent/25 ' +
  'aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/25 ' +
  'disabled:opacity-60';

type InputProps = Omit<ComponentProps<'input'>, 'id'> & {
  label: string;
  error?: ReactNode;
  hint?: ReactNode;
  // Contenido fijo a la izquierda (ej. "@") y a la derecha (ej. estado del chequeo de ID).
  prefix?: ReactNode;
  suffix?: ReactNode;
  labelAside?: ReactNode;
};

export function TextField({ label, error, hint, prefix, suffix, labelAside, className, ...input }: InputProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-fg">
          {label}
        </label>
        {labelAside}
      </div>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted">{prefix}</span>
        )}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${controlClass} ${prefix ? 'pl-8' : ''} ${suffix ? 'pr-12' : ''}`}
          {...input}
        />
        {suffix && <span className="absolute inset-y-0 right-0 flex items-center pr-1.5">{suffix}</span>}
      </div>
      {hint && (
        <div id={hintId} className="mt-2">
          {hint}
        </div>
      )}
      <FieldError id={errorId} error={error} />
    </div>
  );
}

function FieldError({ id, error }: { id: string; error?: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {error && (
        <motion.p
          id={id}
          key="error"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.18 }}
          className="overflow-hidden"
        >
          <span className="flex items-start gap-1.5 pt-2 text-sm text-danger">
            <WarningCircleIcon aria-hidden className="mt-0.5 size-4 shrink-0" weight="bold" />
            <span>{error}</span>
          </span>
        </motion.p>
      )}
    </AnimatePresence>
  );
}

export function PasswordField(props: Omit<InputProps, 'type' | 'suffix'>) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      suffix={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="flex size-9 items-center justify-center rounded-md text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
        >
          {visible ? <EyeSlashIcon className="size-5" /> : <EyeIcon className="size-5" />}
        </button>
      }
    />
  );
}

// Checklist informativo de la política de contraseña (se tilda en vivo, §4.4).
export function PasswordChecklist({
  checks,
  showFailures,
}: {
  checks: { length: boolean; letter: boolean; number: boolean };
  showFailures: boolean;
}) {
  const items = [
    { ok: checks.length, label: '8+ caracteres' },
    { ok: checks.letter, label: 'una letra' },
    { ok: checks.number, label: 'un número' },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Requisitos de la contraseña">
      {items.map(({ ok, label }) => (
        <li key={label} className={`flex items-center gap-1.5 ${ok ? 'text-success' : showFailures ? 'text-danger' : 'text-muted'}`}>
          {ok ? (
            <CheckIcon aria-hidden className="size-3.5" weight="bold" />
          ) : showFailures ? (
            <XIcon aria-hidden className="size-3.5" weight="bold" />
          ) : (
            <CircleIcon aria-hidden className="size-3.5" />
          )}
          <span>
            {label}
            <span className="sr-only">{ok ? ': cumplido' : ': pendiente'}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function SubmitButton({
  loading,
  loadingLabel,
  children,
  className = '',
  ...button
}: ComponentProps<'button'> & { loading?: boolean; loadingLabel?: string }) {
  return (
    <button
      type="submit"
      aria-busy={loading || undefined}
      className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 font-semibold text-on-accent transition-[background-color,transform] duration-150 hover:bg-accent-strong active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${className}`}
      {...button}
    >
      {loading && <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-on-accent/30 border-t-on-accent" />}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}

const alertStyles = {
  error: { box: 'border-danger/40 bg-danger/10 text-fg', icon: <WarningCircleIcon aria-hidden className="size-5 shrink-0 text-danger" weight="fill" /> },
  success: { box: 'border-success/40 bg-success/10 text-fg', icon: <CheckCircleIcon aria-hidden className="size-5 shrink-0 text-success" weight="fill" /> },
  info: { box: 'border-line bg-raised/60 text-muted', icon: <InfoIcon aria-hidden className="size-5 shrink-0 text-muted" /> },
};

export function FormAlert({
  tone,
  children,
  onDismiss,
}: {
  tone: keyof typeof alertStyles;
  children: ReactNode;
  onDismiss?: () => void;
}) {
  const style = alertStyles[tone];
  return (
    <motion.div
      role={tone === 'error' ? 'alert' : 'status'}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm leading-relaxed ${style.box}`}
    >
      {style.icon}
      <div className="flex-1">{children}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar aviso"
          className="-m-1 rounded-md p-1 text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
        >
          <XIcon className="size-4" />
        </button>
      )}
    </motion.div>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-4 text-sm text-muted" aria-hidden>
      <span className="h-px flex-1 bg-line" />o<span className="h-px flex-1 bg-line" />
    </div>
  );
}
