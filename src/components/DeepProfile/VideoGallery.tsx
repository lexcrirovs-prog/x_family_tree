import { useMediaUrl } from '../../hooks/useMediaUrl';

export function VideoGallery({ videoIds }: { videoIds: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {videoIds.map((id) => <VideoCard key={id} id={id} />)}
    </div>
  );
}

function VideoCard({ id }: { id: string }) {
  const url = useMediaUrl(id);
  return (
    <video
      src={url}
      controls
      className="aspect-video w-full rounded-lg border"
      style={{ borderColor: 'var(--color-border)' }}
    />
  );
}
