import { Document, Page, PDFDownloadLink, StyleSheet, Text, View } from '@react-pdf/renderer';
import { FileDown } from 'lucide-react';
import type { FamilySnapshot } from '../../types/family';
import { activePeople, getEventsForPerson, getFullName, getYears } from '../../utils/family';

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
    marginBottom: 22,
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
});

function FamilyTreeDocument({ snapshot }: { snapshot: FamilySnapshot }) {
  const people = activePeople(snapshot);
  const exportDate = new Date().toLocaleDateString('ru-RU');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Генеалогическое древо семьи</Text>
        <Text style={styles.subtitle}>
          Экспорт от {exportDate}. Людей: {people.length}. Поколений: {new Set(people.map((person) => person.generation)).size}.
        </Text>
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
                  <Text style={styles.muted}>
                    {[event.date, event.location].filter(Boolean).join(' · ')}
                  </Text>
                  {event.description ? <Text>{event.description}</Text> : null}
                </View>
              ))
            )}
          </Page>
        );
      })}
    </Document>
  );
}

export function PdfExportButton({ snapshot }: { snapshot: FamilySnapshot }) {
  const fileName = `Family_Tree_${new Date().toISOString().slice(0, 10)}.pdf`;

  return (
    <PDFDownloadLink document={<FamilyTreeDocument snapshot={snapshot} />} fileName={fileName} className="toolbar-button">
      <FileDown size={16} />
      <span>Экспорт PDF</span>
    </PDFDownloadLink>
  );
}
