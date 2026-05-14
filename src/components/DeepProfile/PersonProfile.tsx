import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileDown, Images, Pencil, Plus, Star, TreePine } from 'lucide-react';
import { useFamilyStore } from '../../store/familyStore';
import { getEventsForPerson, getFullName, getYears } from '../../utils/family';
import { Breadcrumbs } from '../layout/Breadcrumbs';
import { LifeTimeline } from './LifeTimeline';
import { RelationsBlock } from './RelationsBlock';
import { MediaUploader } from '../Media/MediaUploader';
import { PhotoTagger } from '../Media/PhotoTagger';
import { AudioUploader } from '../Media/AudioUploader';
import { AudioStories } from '../Media/AudioStories';

export function PersonProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const snapshot = useFamilyStore((state) => state.snapshot());
  const selectPerson = useFamilyStore((state) => state.selectPerson);
  const setFocusedPerson = useFamilyStore((state) => state.setFocusedPerson);
  const addLifeEvent = useFamilyStore((state) => state.addLifeEvent);
  const updatePerson = useFamilyStore((state) => state.updatePerson);
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
          <p>
            {person.gender === 'female' && person.maidenName
              ? `урожд. ${person.maidenName} · `
              : ''}
            {getYears(person)}
          </p>
          {person.bio && <span>{person.bio}</span>}
        </div>
        <div className="profile-actions">
          <button type="button" onClick={() => navigate(`/person/${person.id}/gallery`)}>
            <Images size={16} />
            Галерея по вехам
          </button>
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
          <button
            type="button"
            onClick={() => window.print()}
            title="Открыть системный диалог печати (или сохранить как PDF)"
          >
            <FileDown size={16} />
            Печать / PDF
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
              <p>Фото и видео хранятся в Supabase Storage, метаданные — в Postgres.</p>
            </div>
            <MediaUploader ownerId={person.id} />
          </div>
          <div className="media-grid">
            {photoItems.length === 0 ? (
              <div className="empty-state">Фотографии пока не добавлены.</div>
            ) : (
              photoItems.map((media) => (
                <div key={media.id} className="photo-with-primary">
                  <PhotoTagger media={media} />
                  <button
                    type="button"
                    className={
                      person.primaryPhotoId === media.id
                        ? 'set-primary-btn set-primary-btn-active'
                        : 'set-primary-btn'
                    }
                    onClick={() =>
                      updatePerson(person.id, {
                        primaryPhotoId:
                          person.primaryPhotoId === media.id ? undefined : media.id,
                      })
                    }
                    title={
                      person.primaryPhotoId === media.id
                        ? 'Это главное фото'
                        : 'Сделать главным фото'
                    }
                  >
                    <Star size={14} />
                    {person.primaryPhotoId === media.id ? 'Главное фото' : 'Сделать главным'}
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="section-header">
            <div>
              <h2>Аудио-истории</h2>
              <p>Голосовые рассказы, интервью, песни — добавляйте записи из жизни.</p>
            </div>
            <AudioUploader ownerId={person.id} />
          </div>
          <AudioStories ownerId={person.id} />
        </section>
        <RelationsBlock snapshot={snapshot} person={person} />
      </div>
    </main>
  );
}

