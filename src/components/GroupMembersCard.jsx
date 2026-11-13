import { useEffect, useState } from 'react';
import { membersApi } from '../api';
import { ApiError } from '../lib/apiClient';
import { Icons } from './Icons';

const inputStyle = {
  border: '1px solid var(--border-default)',
  borderRadius: 8,
  padding: '9px 12px',
  backgroundColor: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  fontSize: '0.844rem',
  flex: '1 1 180px',
  minWidth: 0,
};

/**
 * Integrantes de un grupo para el profesor: lista, agrega y quita (MS1 por APIM).
 */
export default function GroupMembersCard({ groupId }) {
  const [state, setState] = useState({ groupId: null, members: [], error: null });
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState({ name: '', email: '', githubUser: '' });
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    let active = true;
    membersApi.list(groupId)
      .then((res) => {
        if (active) setState({ groupId, members: res?.members || [], error: null });
      })
      .catch((err) => {
        if (active) setState({ groupId, members: [], error: err.message || 'No se pudieron cargar los integrantes.' });
      });
    return () => { active = false; };
  }, [groupId, reloadKey]);

  const isLoading = state.groupId !== groupId;

  const handleAdd = async (e) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      await membersApi.add(groupId, {
        name: form.name.trim(),
        email: form.email.trim(),
        githubUser: form.githubUser.trim() || undefined,
      });
      setForm({ name: '', email: '', githubUser: '' });
      setReloadKey((k) => k + 1);
    } catch (err) {
      const code = err instanceof ApiError ? err.status : 400;
      setFormError(`Error HTTP ${code}: ${err.message || 'No se pudo agregar el integrante.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (member) => {
    if (!window.confirm(`¿Quitar a ${member.name} del grupo?`)) return;
    setRemovingId(member.id);
    try {
      await membersApi.remove(groupId, member.id);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setFormError(err.message || 'No se pudo quitar el integrante.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="evidence-panel-card">
      <div className="evidence-header">
        <h2 className="card-heading-title">Integrantes del grupo</h2>
        <span className="card-heading-subtitle">
          Los estudiantes entran con su correo de Google y ven el grupo donde están registrados.
        </span>
      </div>

      {isLoading ? (
        <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: '0.844rem' }}>Cargando integrantes...</div>
      ) : state.error ? (
        <div role="alert" style={{ padding: 16, color: 'var(--badge-alert-text)', fontSize: '0.844rem' }}>{state.error}</div>
      ) : state.members.length === 0 ? (
        <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: '0.844rem' }}>
          Este grupo todavía no tiene integrantes.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {state.members.map((member) => (
            <div
              key={member.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 14px',
                backgroundColor: 'var(--bg-sunken)',
                border: '1px solid var(--border-default)',
                borderRadius: 8,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: '0.844rem', fontWeight: 600, color: 'var(--text-primary)' }}>{member.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflowWrap: 'anywhere' }}>
                  {member.email}{member.githubUser ? ` · @${member.githubUser}` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(member)}
                disabled={removingId === member.id}
                className="btn-refresh-analysis"
                title={`Quitar a ${member.name}`}
              >
                <Icons.Trash />
                <span>{removingId === member.id ? 'Quitando...' : 'Quitar'}</span>
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAdd} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <input
          style={inputStyle}
          placeholder="Nombre completo"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          style={inputStyle}
          type="email"
          placeholder="correo@estudiantec.cr"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          style={inputStyle}
          placeholder="Usuario de GitHub (opcional)"
          value={form.githubUser}
          onChange={(e) => setForm({ ...form, githubUser: e.target.value })}
        />
        <button type="submit" className="btn-primary-action" disabled={isSubmitting} style={{ padding: '9px 18px', borderRadius: 8 }}>
          {isSubmitting ? 'Agregando...' : 'Agregar integrante'}
        </button>
      </form>
      {formError && (
        <p role="alert" style={{ margin: '8px 0 0', fontSize: '0.813rem', color: 'var(--badge-alert-text)' }}>{formError}</p>
      )}
    </div>
  );
}
