import { CheckIcon, XIcon } from '@phosphor-icons/react';
import { AUTH_MESSAGES } from '@vision-max/shared';
import type { ComponentProps } from 'react';
import { TextField } from '../../../components/form';
import { useUsernameCheck } from '../hooks';

type Props = Omit<ComponentProps<typeof TextField>, 'label' | 'prefix' | 'suffix' | 'hint'> & {
  value: string;
};

const reasonMessage = {
  taken: AUTH_MESSAGES.usernameTaken,
  reserved: AUTH_MESSAGES.usernameReserved,
  invalid: AUTH_MESSAGES.usernameFormat,
};

// Campo "ID" con "@" fijo y estado del chequeo en vivo (mockup 8.2). El error del form tiene prioridad.
export function UsernameField({ value, error, ...props }: Props) {
  const check = useUsernameCheck(value);
  const result = check.state === 'done' ? check.result : null;
  const liveError = result && !result.available ? reasonMessage[result.reason ?? 'invalid'] : null;
  const shownError = error ?? liveError ?? undefined;

  const status = shownError ? (
    <XIcon aria-hidden className="size-5 text-danger" weight="bold" />
  ) : check.state === 'checking' ? (
    <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-line border-t-muted" />
  ) : result?.available ? (
    <CheckIcon aria-hidden className="size-5 text-success" weight="bold" />
  ) : null;

  return (
    <TextField
      {...props}
      label="ID"
      error={shownError}
      prefix="@"
      suffix={status && <span className="flex size-9 items-center justify-center">{status}</span>}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      autoComplete="username"
      hint={
        <p className="text-sm text-muted" aria-live="polite">
          {!shownError && result?.available ? (
            <span className="text-success">Disponible</span>
          ) : (
            !shownError && 'Así te van a ver otros usuarios: /u/tu_id'
          )}
        </p>
      }
    />
  );
}
