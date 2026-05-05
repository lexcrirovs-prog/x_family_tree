import { useState } from 'react';
import { Document, Image, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import { toPng } from 'html-to-image';
import { FileDown } from 'lucide-react';
import { indexedDBMediaAdapter } from '../../storage/IndexedDBAdapter';
import type { FamilySnapshot, MediaItem, PhotoTag } from '../../types/family';
import { activePeople, getEventsForPerson, getFullName, getYears } from '../../utils/family';

type MediaSources = Record<string, string>;

const styles = StyleSheet.create({
  page: {
    padding: 34,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1b1f27',
  },
  title: {
    fontSize: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 11,
    color: '#5b6472',
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 15,
    marginTop: 16,
    marginBottom: 8,
  },
  row: {
    borderBottom: '1 solid #d9dee7',
    paddingBottom: 7,
    marginBottom: 7,
  },
  name: {
    fontSize: 12,
    marginBottom: 2,
  },
  muted: {
    color: '#647084',
  },
  treeImage: {
    width: 520,
    maxHeight: 320,
    objectFit: 'contain',
    border: '1 solid #d9dee7',
    marginTop: 8,
    marginBottom: 12,
  },
  galleryGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoCard: {
    width: 245,
    border: '1 solid #d9dee7',
    padding: 7,
    marginBottom: 10,
  },
  photoFrame: {
    width: 229,
    height: 145,
    position: 'relative',
    backgroundColor: '#f1f4f8',
    marginBottom: 6,
  },
  photo: {
    width: 229,
    height: 145,
    objectFit: 'cover',
  },
  tagLabel: {
    fontSize: 8,
    color: '#5b6472',
    marginTop: 2,
  },
});

function tagLabel(snapshot: FamilySnapshot, tag: PhotoTag): string {
  if (tag.linkedPersonId && snapshot.people[tag.linkedPersonId]) return getFullName(snapshot.people[tag.linkedPersonId]);
  if (tag.linkedImportantPersonId && snapshot.importantPeople[tag.linkedImportantPersonId]) {
    return getFullName(snapshot.importantPeople[tag.linkedImportantPersonId]);
  }
  return tag.customName || tag.description || 'Отметка без имени';
}

function FamilyTreeDocument({
  snapshot,
  treeImage,
  mediaSources,
}: {
  snapshot: FamilySnapshot;
  treeImage?: string;
  mediaSources: MediaSources;
}) {
  const people = activePeople(snapshot);
  const exportDate = new Date().toLocaleDateString('ru-RU');
  const title = snapshot.title || 'Генеалогическое древо семьи';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          Экспорт от {exportDate}. Людей: {people.length}. Поколений: {new Set(people.map((person) => person.generation)).size}.
        </Text>
        <Text style={styles.sectionTitle}>Снимок текущего режима</Text>
        {treeImage ? <Image src={treeImage} style={styles.treeImage} /> : <Text style={styles.muted}>Снимок дерева не удалось создать.</Text>}
        <Text style={styles.sectionTitle}>Поимённый список</Text>
        {people.map((person) => (
          <View key={person.id} style={styles.row}>
            <Text style={styles.name}>{getFullName(person)}</Text>
            <Text style={styles.muted}>{getYears(person)}</Text>
            {person.bio ? <Text>{person.bio}</Text> : null}
          </View>
        ))}
      </Page>
      {people.map((person) => {
        const events = getEventsForPerson(snapshot, person.id);
        const photos = person.photoIds.map((id) => snapshot.media[id]).filter(Boolean);

        return (
          <Page key={person.id} size="A4" style={styles.page}>
            <Text style={styles.title}>{getFullName(person)}</Text>
            <Text style={styles.subtitle}>{getYears(person)}</Text>
            {person.bio ? <Text>{person.bio}</Text> : null}

            <Text style={styles.sectionTitle}>Хронология жизни</Text>
            {events.length === 0 ? (
              <Text style={styles.muted}>События пока не добавлены.</Text>
            ) : (
              events.map((event) => (
                <View key={event.id} style={styles.row}>
                  <Text style={styles.name}>{event.title}</Text>
                  <Text style={styles.muted}>{[event.date, event.location].filter(Boolean).join(' · ')}</Text>
                  {event.description ? <Text>{event.description}</Text> : null}
                </View>
              ))
            )}

            <Text style={styles.sectionTitle}>Галерея фото</Text>
            {photos.length === 0 ? (
              <Text style={styles.muted}>Фото пока не добавлены.</Text>
            ) : (
              <View style={styles.galleryGrid}>
                {photos.map((media) => (
                  <PdfPhotoCard key={media.id} media={media} snapshot={snapshot} src={mediaSources[media.id]} />
                ))}
              </View>
            )}
          </Page>
        );
      })}
    </Document>
  );
}

function PdfPhotoCard({ media, snapshot, src }: { media: MediaItem; snapshot: FamilySnapshot; src?: string }) {
  return (
    <View style={styles.photoCard}>
      <View style={styles.photoFrame}>
        {src ? <Image src={src} style={styles.photo} /> : <Text style={styles.muted}>Фото хранится в IndexedDB</Text>}
        {media.tags.map((tag) => (
          <View
            key={tag.id}
            style={{
              position: 'absolute',
              left: `${tag.x}%`,
              top: `${tag.y}%`,
              width: `${tag.width}%`,
              height: `${tag.height}%`,
              border: '1 solid #b96a1d',
              backgroundColor: 'rgba(185, 106, 29, 0.08)',
            }}
          />
        ))}
      </View>
      <Text style={styles.name}>{media.caption || 'Семейное фото'}</Text>
      {media.yearTaken ? <Text style={styles.muted}>{media.yearTaken}</Text> : null}
      {media.tags.length > 0 ? (
        media.tags.map((tag) => (
          <Text key={tag.id} style={styles.tagLabel}>
            Отметка: {tagLabel(snapshot, tag)}
          </Text>
        ))
      ) : (
        <Text style={styles.tagLabel}>Тегов нет</Text>
      )}
    </View>
  );
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function collectMediaSources(snapshot: FamilySnapshot): Promise<MediaSources> {
  const entries = await Promise.all(
    Object.values(snapshot.media)
      .filter((media) => media.type === 'photo')
      .map(async (media) => {
        const stored = await indexedDBMediaAdapter.getBlob(media.id);
        if (!stored) return undefined;
        return [media.id, await blobToDataUrl(stored.blob)] as const;
      }),
  );

  return Object.fromEntries(entries.filter(Boolean) as Array<readonly [string, string]>);
}

export function PdfExportButton({ snapshot }: { snapshot: FamilySnapshot }) {
  const [loading, setLoading] = useState(false);

  const exportPdf = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const treeElement = document.querySelector<HTMLElement>('[data-tree-export-root="true"]');
      const treeImage = treeElement
        ? await toPng(treeElement, {
            cacheBust: true,
            pixelRatio: 1.5,
            backgroundColor: '#1a1a1a',
          })
        : undefined;
      const mediaSources = await collectMediaSources(snapshot);
      const blob = await pdf(<FamilyTreeDocument snapshot={snapshot} treeImage={treeImage} mediaSources={mediaSources} />).toBlob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Family_Tree_${new Date().toISOString().slice(0, 10)}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" className="toolbar-button" onClick={exportPdf} disabled={loading}>
      <FileDown size={16} />
      <span>{loading ? 'Готовлю PDF' : 'Экспорт PDF'}</span>
    </button>
  );
}
