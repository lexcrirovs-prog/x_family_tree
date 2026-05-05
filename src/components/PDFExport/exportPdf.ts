import { pdf, Document, Page, Text, View, StyleSheet, Link, Image, Svg, Rect } from '@react-pdf/renderer';
import { createElement as h } from 'react';
import { toPng } from 'html-to-image';
import { useStore } from '../../store/store';
import { storage } from '../../storage/StorageAdapter';

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', fontSize: 11, color: '#1a1a22', lineHeight: 1.45 },
  title: { fontSize: 28, marginBottom: 8 },
  h1: { fontSize: 20, marginTop: 16, marginBottom: 6 },
  h2: { fontSize: 14, marginTop: 12, marginBottom: 4, fontFamily: 'Helvetica-Bold' },
  muted: { color: '#6a6a78' },
  link: { color: '#4a6cf7', textDecoration: 'none' },
  card: { padding: 8, borderWidth: 0.5, borderColor: '#cccccc', marginBottom: 6, borderRadius: 4 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  galleryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  photoBox: { width: 130, marginBottom: 6 },
  photoCaption: { fontSize: 9, color: '#6a6a78', marginTop: 2 },
});

type ImageMap = Map<string, string>; // mediaId -> data URL

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

async function loadImages(mediaIds: string[]): Promise<ImageMap> {
  const map = new Map<string, string>();
  await Promise.all(
    mediaIds.map(async (id) => {
      const item = await storage.getMedia(id);
      if (item && item.blob.type.startsWith('image')) {
        try { map.set(id, await blobToDataUrl(item.blob)); } catch { /* skip */ }
      }
    })
  );
  return map;
}

async function snapshotTree(): Promise<string | null> {
  const el = document.querySelector('.react-flow') as HTMLElement | null
    ?? document.querySelector('main') as HTMLElement | null;
  if (!el) return null;
  try {
    return await toPng(el, { cacheBust: true, pixelRatio: 1.5, backgroundColor: '#0f0f12' });
  } catch (e) {
    console.warn('Tree snapshot failed', e);
    return null;
  }
}

export async function exportPdf() {
  const s = useStore.getState();
  const peopleList = Object.values(s.people).filter((p) => !p.isDeleted);
  const importantList = Object.values(s.importantPeople).filter((p) => !p.isDeleted);
  const eventList = Object.values(s.events).filter((e) => !e.isDeleted);

  const familyName = peopleList[0]?.lastName || 'Семья';
  const today = new Date().toLocaleDateString('ru-RU');

  const allPhotoIds = new Set<string>();
  peopleList.forEach((p) => p.photoIds.forEach((id) => allPhotoIds.add(id)));
  importantList.forEach((p) => p.photoIds.forEach((id) => allPhotoIds.add(id)));
  eventList.forEach((e) => e.photoIds.forEach((id) => allPhotoIds.add(id)));

  const imageMap = await loadImages(Array.from(allPhotoIds));
  const treePng = await snapshotTree();

  const personLink = (id: string) => `#person-${id}`;

  const doc = h(Document, {},
    // ============ Title ============
    h(Page, { size: 'A4', style: styles.page },
      h(Text, { style: styles.title }, `Генеалогическое древо семьи ${familyName}`),
      h(Text, { style: styles.muted }, `Экспорт: ${today}`),
      h(View, { style: { marginTop: 24 } },
        h(Text, {}, `Людей: ${peopleList.length}`),
        h(Text, {}, `Важных людей: ${importantList.length}`),
        h(Text, {}, `Событий: ${eventList.length}`)
      ),
      h(View, { style: { marginTop: 30 } },
        h(Text, { style: styles.h1 }, 'Содержание'),
        ...peopleList.map((p) =>
          h(Link, { src: personLink(p.id), style: styles.link, key: p.id },
            h(Text, {}, `• ${p.firstName} ${p.lastName} (${p.birthYear ?? '?'} – ${p.deathYear ?? 'наст.'})`)
          )
        )
      )
    ),

    // ============ Tree snapshot ============
    treePng ? h(Page, { size: 'A4', orientation: 'landscape', style: styles.page },
      h(Text, { style: styles.h1 }, 'Визуализация дерева'),
      h(Image, { src: treePng, style: { width: '100%', maxHeight: 480, objectFit: 'contain' } } as never)
    ) : null,

    // ============ Per-person pages ============
    ...peopleList.map((p) => {
      const events = p.lifeEventIds.map((id) => s.events[id]).filter((e) => e && !e.isDeleted);
      const parents = p.parentCoupleId ? s.couples[p.parentCoupleId] : undefined;
      const father = parents ? s.people[parents.partnerAId] : undefined;
      const mother = parents ? s.people[parents.partnerBId] : undefined;
      const fullName = `${p.firstName} ${p.lastName}`.trim();
      const heroPhoto = p.photoIds[0] ? imageMap.get(p.photoIds[0]) : undefined;
      const linkedImportants = importantList.filter((ip) =>
        ip.linkedTo.some((l) => l.type === 'person' && l.id === p.id));

      // Photos with tags
      const photoMedia = p.photoIds
        .map((id) => s.media[id])
        .filter((m) => m && m.type === 'photo');

      return h(Page, { size: 'A4', style: styles.page, key: p.id, id: `person-${p.id}` },
        h(View, { style: { flexDirection: 'row', gap: 12 } },
          heroPhoto ? h(Image, { src: heroPhoto, style: { width: 90, height: 90, borderRadius: 6 } } as never) : null,
          h(View, { style: { flex: 1 } },
            h(Text, { style: styles.h1 }, fullName),
            h(Text, { style: styles.muted }, `${p.birthYear ?? '?'} – ${p.deathYear ?? 'наст.'}`),
            p.bio ? h(Text, { style: { marginTop: 8 } }, p.bio) : null,
          )
        ),

        h(Text, { style: styles.h2 }, 'Хронология'),
        events.length === 0
          ? h(Text, { style: styles.muted }, 'Событий нет')
          : h(View, {}, ...events.map((e) => {
              const eventPhotos = e.photoIds
                .map((id) => imageMap.get(id))
                .filter(Boolean) as string[];
              return h(View, { style: styles.card, key: e.id },
                h(Text, { style: { fontFamily: 'Helvetica-Bold' } }, e.title),
                h(Text, { style: styles.muted }, `${e.date ?? ''} ${e.location ?? ''}`),
                e.description ? h(Text, {}, e.description) : null,
                eventPhotos.length
                  ? h(View, { style: styles.galleryRow },
                      ...eventPhotos.slice(0, 3).map((src, i) =>
                        h(Image, { key: i, src, style: { width: 90, height: 70, borderRadius: 4 } } as never))
                    )
                  : null
              );
            })),

        h(Text, { style: styles.h2 }, 'Связи'),
        father ? h(Link, { src: personLink(father.id), style: styles.link },
          h(Text, {}, `Отец: ${father.firstName} ${father.lastName}`)) : null,
        mother ? h(Link, { src: personLink(mother.id), style: styles.link },
          h(Text, {}, `Мать: ${mother.firstName} ${mother.lastName}`)) : null,

        linkedImportants.length > 0 ? h(View, {},
          h(Text, { style: styles.h2 }, 'Важные люди'),
          ...linkedImportants.map((ip) =>
            h(Link, { src: `#important-${ip.id}`, style: styles.link, key: ip.id },
              h(Text, {}, `→ ${ip.firstName} ${ip.lastName} (${ip.relationshipType})`)
            )
          )
        ) : null,

        photoMedia.length > 0 ? h(View, {},
          h(Text, { style: styles.h2 }, 'Галерея'),
          h(View, { style: styles.galleryRow },
            ...photoMedia.map((m) => {
              const src = imageMap.get(m.id);
              if (!src) return null;
              const tagLines = m.tags
                .map((t) => {
                  const linked = t.linkedPersonId
                    ? (t.linkedPersonType === 'importantPerson'
                        ? s.importantPeople[t.linkedPersonId]
                        : s.people[t.linkedPersonId])
                    : null;
                  return linked ? `${linked.firstName} ${linked.lastName}` : t.customName;
                })
                .filter(Boolean) as string[];
              const W = 130, H = 90;
              return h(View, { key: m.id, style: styles.photoBox },
                h(View, { style: { position: 'relative', width: W, height: H } },
                  h(Image, { src, style: { width: W, height: H, borderRadius: 4 } } as never),
                  m.tags.length > 0
                    ? h(Svg, { style: { position: 'absolute', top: 0, left: 0, width: W, height: H } } as never,
                        ...m.tags.map((t, i) =>
                          h(Rect, {
                            key: i,
                            x: (t.x / 100) * W,
                            y: (t.y / 100) * H,
                            width: (t.width / 100) * W,
                            height: (t.height / 100) * H,
                            stroke: '#7c9cff',
                            strokeWidth: 1,
                            fillOpacity: 0,
                          } as never)
                        )
                      )
                    : null,
                ),
                m.caption ? h(Text, { style: styles.photoCaption }, m.caption) : null,
                tagLines.length > 0 ? h(Text, { style: styles.photoCaption }, `Отмечены: ${tagLines.join(', ')}`) : null
              );
            }).filter(Boolean) as never[]
          )
        ) : null
      );
    }),

    // ============ Important people ============
    importantList.length > 0 ? h(Page, { size: 'A4', style: styles.page },
      h(Text, { style: styles.h1 }, 'Важные люди семьи'),
      ...importantList.map((ip) =>
        h(View, { style: styles.card, key: ip.id, id: `important-${ip.id}` },
          h(Text, { style: { fontFamily: 'Helvetica-Bold' } }, `${ip.firstName} ${ip.lastName}`),
          h(Text, { style: styles.muted }, `${ip.relationshipType} · ${ip.birthYear ?? '?'} – ${ip.deathYear ?? 'наст.'}`),
          ip.importance ? h(Text, {}, ip.importance) : null,
          ip.bio ? h(Text, { style: { marginTop: 4 } }, ip.bio) : null,
          ip.linkedTo.length > 0
            ? h(View, { style: { marginTop: 4 } },
                ...ip.linkedTo.map((l, i) => {
                  if (l.type === 'person' && s.people[l.id]) {
                    const pp = s.people[l.id];
                    return h(Link, { src: personLink(l.id), style: styles.link, key: i },
                      h(Text, {}, `→ ${pp.firstName} ${pp.lastName}`));
                  }
                  return null;
                })
              )
            : null
        )
      )
    ) : null,

    // ============ Family chronology ============
    eventList.length > 0 ? h(Page, { size: 'A4', style: styles.page },
      h(Text, { style: styles.h1 }, 'Хронология семьи'),
      ...eventList
        .filter((e) => e.date)
        .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
        .map((e) =>
          h(View, { style: styles.card, key: e.id },
            h(Text, { style: { fontFamily: 'Helvetica-Bold' } }, `${e.date ?? '?'} · ${e.title}`),
            e.location ? h(Text, { style: styles.muted }, e.location) : null,
            e.description ? h(Text, {}, e.description) : null,
            e.ownerType === 'person' && s.people[e.ownerId]
              ? h(Link, { src: personLink(e.ownerId), style: styles.link },
                  h(Text, { style: { fontSize: 9 } }, `у: ${s.people[e.ownerId].firstName} ${s.people[e.ownerId].lastName}`)
                )
              : null
          )
        )
    ) : null,
  );

  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Family_Tree_${familyName}_${new Date().toISOString().slice(0, 10)}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
