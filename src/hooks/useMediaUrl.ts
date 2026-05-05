import { useEffect, useState } from 'react';
import { storage } from '../storage/StorageAdapter';

export function useMediaUrl(mediaId?: string) {
  const [url, setUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!mediaId) { setUrl(undefined); return; }
    let cancelled = false;
    storage.getMediaUrl(mediaId).then((u) => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [mediaId]);
  return url;
}
