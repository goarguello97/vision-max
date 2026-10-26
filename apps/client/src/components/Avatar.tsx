import { useState } from 'react';

const sizes = {
  sm: 'size-7 text-[11px] md:size-8 md:text-xs', // header: 28 px mobile, 32 px desktop (§4.2)
  lg: 'size-11 text-sm',
};

// Foto de avatar o, si no hay (o falla al cargar), las iniciales de Nombre + Apellido.
export function Avatar({
  src,
  firstName,
  lastName,
  size = 'sm',
}: {
  src?: string | null;
  firstName: string;
  lastName: string;
  size?: keyof typeof sizes;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const fullName = `${firstName} ${lastName}`.trim();
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const box = `${sizes[size]} shrink-0 rounded-full`;

  if (src && failed !== src) {
    return <img src={src} alt={fullName} onError={() => setFailed(src)} className={`${box} bg-raised object-cover`} />;
  }
  return (
    <span
      role="img"
      aria-label={fullName}
      className={`${box} inline-flex items-center justify-center bg-accent/15 font-semibold tracking-wide text-accent ring-1 ring-accent/30 ring-inset`}
    >
      {initials}
    </span>
  );
}
