import { useState, useRef, useMemo } from 'react';
import { Modal } from '../Modal';
import { useStore } from '../../store/store';
import { useMediaUrl } from '../../hooks/useMediaUrl';

export function PhotoViewer({ mediaId, onClose }: { mediaId: string | null; onClose: () => void }) {
  const media = useStore((s) => (mediaId ? s.media[mediaId] : undefined));
  const url = useMediaUrl(mediaId ?? undefined);
  const updateMedia = useStore((s) => s.updateMedia);
  const addTag = useStore((s) => s.addPhotoTag);
  const deleteTag = useStore((s) => s.deletePhotoTag);
  const people = useStore((s) => s.people);
  const importantPeople = useStore((s) => s.importantPeople);

  const [tagging, setTagging] = useState(false);
  const [drag, setDrag] = useState<null | { startX: number; startY: number; x: number; y: number }>(null);
  const [draftTag, setDraftTag] = useState<null | { x: number; y: number; w: number; h: number }>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const peopleList = useMemo(() => [
    ...Object.values(people).filter((p) => !p.isDeleted).map((p) => ({ id: p.id, kind: 'person' as const, name: `${p.firstName} ${p.lastName}` })),
    ...Object.values(importantPeople).filter((p) => !p.isDeleted).map((p) => ({ id: p.id, kind: 'importantPerson' as const, name: `${p.firstName} ${p.lastName}` })),
  ], [people, importantPeople]);

  if (!mediaId || !media) return null;

  const onMouseDown = (e: React.MouseEvent) => {
    if (!tagging || !containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setDrag({ startX: x, startY: y, x, y });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag || !containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setDrag({ ...drag, x, y });
  };
  const onMouseUp = () => {
    if (!drag) return;
    const x = Math.min(drag.startX, drag.x);
    const y = Math.min(drag.startY, drag.y);
    const w = Math.abs(drag.x - drag.startX);
    const h = Math.abs(drag.y - drag.startY);
    if (w > 2 && h > 2) setDraftTag({ x, y, w, h });
    setDrag(null);
  };

  const submitDraft = (linkedPersonId: string | undefined, kind: 'person' | 'importantPerson' | undefined, customName: string, description: string) => {
    if (!draftTag) return;
    addTag(mediaId, {
      x: draftTag.x, y: draftTag.y, width: draftTag.w, height: draftTag.h,
      linkedPersonId, linkedPersonType: kind,
      customName: customName || undefined,
      description: description || undefined,
    });
    setDraftTag(null);
  };

  return (
    <Modal open={!!mediaId} onClose={onClose} wide title={media.caption || 'Фотография'}>
      <div className="mb-3 flex items-center gap-2 text-sm">
        <button
          className="rounded-lg border px-3 py-1.5"
          style={{
            borderColor: 'var(--color-border)',
            background: tagging ? 'var(--color-accent)' : 'transparent',
            color: tagging ? '#fff' : 'inherit',
          }}
          onClick={() => setTagging((v) => !v)}
        >{tagging ? '✓ Режим тегирования' : '✎ Тегировать'}</button>
        <input
          className="flex-1"
          placeholder="Подпись"
          value={media.caption ?? ''}
          onChange={(e) => updateMedia(mediaId, { caption: e.target.value })}
        />
        <input
          className="w-24"
          type="number"
          placeholder="Год"
          value={media.yearTaken ?? ''}
          onChange={(e) => updateMedia(mediaId, { yearTaken: e.target.value ? Number(e.target.value) : undefined })}
        />
      </div>

      <div
        ref={containerRef}
        className="relative select-none overflow-hidden rounded-xl border"
        style={{ borderColor: 'var(--color-border)', cursor: tagging ? 'crosshair' : 'default' }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={() => setDrag(null)}
      >
        <img src={url} alt="" className="block max-h-[60vh] w-full object-contain" />
        <svg className="absolute inset-0 h-full w-full">
          {media.tags.map((t) => {
            const linked = t.linkedPersonId
              ? (t.linkedPersonType === 'importantPerson' ? importantPeople[t.linkedPersonId] : people[t.linkedPersonId])
              : null;
            const name = linked ? `${linked.firstName} ${linked.lastName}` : t.customName ?? '?';
            const href = t.linkedPersonId
              ? (t.linkedPersonType === 'importantPerson' ? `/important-person/${t.linkedPersonId}` : `/person/${t.linkedPersonId}`)
              : null;
            const Tag = (
              <g>
                <rect
                  x={`${t.x}%`} y={`${t.y}%`} width={`${t.width}%`} height={`${t.height}%`}
                  fill="rgba(124,156,255,0.08)" stroke="rgba(124,156,255,0.7)" strokeWidth={1.5}
                  rx={4}
                />
                <foreignObject x={`${t.x}%`} y={`${t.y + t.height}%`} width="200" height="40">
                  <div style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '2px 6px', borderRadius: 6, fontSize: 11, display: 'inline-block' }}>
                    {name}
                  </div>
                </foreignObject>
              </g>
            );
            return (
              <g
                key={t.id}
                style={{ cursor: href ? 'pointer' : 'default' }}
                onClick={() => { if (href) { window.location.assign(href); onClose(); } }}
                onContextMenu={(e) => { e.preventDefault(); if (confirm(`Удалить тег "${name}"?`)) deleteTag(mediaId, t.id); }}
              >
                {Tag}
              </g>
            );
          })}
          {drag && (
            <rect
              x={`${Math.min(drag.startX, drag.x)}%`}
              y={`${Math.min(drag.startY, drag.y)}%`}
              width={`${Math.abs(drag.x - drag.startX)}%`}
              height={`${Math.abs(drag.y - drag.startY)}%`}
              fill="rgba(124,156,255,0.2)" stroke="rgba(124,156,255,1)" strokeWidth={1.5}
            />
          )}
        </svg>
      </div>

      {draftTag && <DraftTagForm peopleList={peopleList} onCancel={() => setDraftTag(null)} onSubmit={submitDraft} />}
    </Modal>
  );
}

function DraftTagForm({
  peopleList, onCancel, onSubmit,
}: {
  peopleList: Array<{ id: string; kind: 'person' | 'importantPerson'; name: string }>;
  onCancel: () => void;
  onSubmit: (linkedPersonId: string | undefined, kind: 'person' | 'importantPerson' | undefined, customName: string, description: string) => void;
}) {
  const [pickedId, setPickedId] = useState('');
  const [customName, setCustomName] = useState('');
  const [description, setDescription] = useState('');
  const picked = peopleList.find((p) => p.id === pickedId);

  return (
    <div className="mt-3 rounded-xl border p-3" style={{ borderColor: 'var(--color-border)' }}>
      <div className="mb-2 text-sm opacity-70">Кто на фото?</div>
      <div className="grid grid-cols-2 gap-2">
        <select className="w-full" value={pickedId} onChange={(e) => setPickedId(e.target.value)}>
          <option value="">— или ввести имя ниже —</option>
          {peopleList.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.kind === 'person' ? 'семья' : 'важный'})</option>)}
        </select>
        <input placeholder="Кастомное имя" value={customName} onChange={(e) => setCustomName(e.target.value)} disabled={!!pickedId} />
      </div>
      <textarea
        rows={2} className="mt-2 w-full" placeholder="Описание (для кастомного имени)"
        value={description} onChange={(e) => setDescription(e.target.value)}
      />
      <div className="mt-2 flex justify-end gap-2 text-sm">
        <button className="rounded-lg border px-3 py-1.5" style={{ borderColor: 'var(--color-border)' }} onClick={onCancel}>Отмена</button>
        <button
          className="rounded-lg px-3 py-1.5 text-white"
          style={{ background: 'var(--color-accent)' }}
          onClick={() => onSubmit(picked?.id, picked?.kind, customName, description)}
        >Сохранить тег</button>
      </div>
    </div>
  );
}
