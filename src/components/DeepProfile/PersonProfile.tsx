import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileDown, Pencil, Plus, TreePine } from 'lucide-react';
import { useFamilyStore } from '../../store/familyStore';
import { getEventsForPerson, getFullName, getYears } from '../../utils/family';
import { Breadcrumbs } from '../layout/Breadcrumbs';
import { LifeTimeline } from './LifeTimeline';
import { RelationsBlock } from './RelationsBlock';
import { MediaUploader } from '../Media/MediaUploader';
import { PhotoTagger } from '../Media/PhotoTagger';

export function PersonProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const snapshot = useFamilyStore((state) => state.snapshot());
  const selectPerson = useFamilyStore((state) => state.selectPerson);
  const setFocusedPerson = useFamilyStore((state) => state.setFocusedPerson);
  const addLifeEvent = useFamilyStore((state) => state.addLifeEvent);
  const person = id ? snapshot.people[id] : undefined;

  if (!person) {
    return (
      <main className="profile-page">
        <Breadcrumbs items={[{ label: 'Профиль не найден' }]} />
        <div className="empty-state">
          Профиль не найден. <Link to="/">Вернуться к дереву</Link>
        </div>
      </main>
    );
  }

  const events = getEventsForPerson(snapshot, person.id);
  const photoItems = person.photoIds.map((mediaId) => snapshot.media[mediaId]).filter(Boolean);

  return (
    <main className="profile-page">
      <Breadcrumbs items={[{ label: getFullName(person) }]} />
      <header className="profile-header">
        <button type="button" className="icon-link" onClick={() => navigate(-1)} title="Назад">
          <ArrowLeft size={18} />
        </button>
        <div className="profile-avatar">{person.firstName[0]}{person.lastName[0]}</div>
        <div>
          <h1>{getFullName(person)}</h1>
          <p>{person.maidenName ? `урожд. ${person.maidenName} · ` : ''}{getYears(person)}</p>
          {person.bio && <span>{person.bio}</span>}
        </div>
        <div className="profile-actions">
          <button type="button" onClick={() => { selectPerson(person.id); navigate('/'); }}>
            <Pencil size={16} />
            Редактировать
          </button>
          <button
            type="button"
            onClick={() => {
              selectPerson(person.id);
              setFocusedPerson(person.id);
              navigate('/');
            }}
          >
            <TreePine size={16} />
            Показать на дереве
          </button>
          <button type="button">
            <FileDown size={16} />
            Экспорт профиля в PDF
          </button>
        </div>
      </header>

      <div className="profile-grid">
        <section className="profile-main">
          <div className="section-header">
            <div>
              <h2>Хронология жизни</h2>
              <p>События сортируются по датам и могут ссылаться на людей, пары и важные контакты.</p>
            </div>
            <button type="button" onClick={() => addLifeEvent({ ownerType: 'person', ownerId: person.id })}>
              <Plus size={16} />
              Добавить событие
            </button>
          </div>
          <LifeTimeline events={events} snapshot={snapshot} />

          <div className="section-header">
            <div>
              <h2>Галерея фото</h2>
              <p>Фото и видео хранятся в IndexedDB, а в metadata остаются только mediaId.</p>
            </div>
            <MediaUploader ownerId={person.id} />
          </div>
          <div className="media-grid">
            {photoItems.length === 0 ? (
              <div className="empty-state">Фотографии пока не добавлены.</div>
            ) : (
              photoItems.map((media) => <PhotoTagger key={media.id} media={media} />)
            )}
          </div>
        </section>
        <RelationsBlock snapshot={snapshot} person={person} />
      </div>
    </main>
  );
}

