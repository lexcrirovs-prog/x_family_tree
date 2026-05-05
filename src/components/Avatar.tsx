import { useMediaUrl } from '../hooks/useMediaUrl';

export function Avatar({ photoId, name, gender, size = 56 }: {
  photoId?: string; name: string; gender?: 'male' | 'female'; size?: number;
}) {
  const url = useMediaUrl(photoId);
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
  const bg = gender === 'female'
    ? 'linear-gradient(135deg, #ff9ec7 0%, #ffd3a5 100%)'
    : 'linear-gradient(135deg, #7c9cff 0%, #b18cff 100%)';
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full text-white font-medium overflow-hidden"
      style={{ width: size, height: size, background: url ? '#222' : bg, fontSize: size * 0.34 }}
      aria-label={name}
    >
      {url ? <img src={url} alt={name} className="h-full w-full object-cover" /> : initials || '?'}
    </div>
  );
}
