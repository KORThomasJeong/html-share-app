import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Collections() {
  const [collections, setCollections] = useState([]);
  const [groups, setGroups] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(null); // collection object
  const [showFileModal, setShowFileModal] = useState(null); // collection object
  const [form, setForm] = useState({ slug:'', title:'', visibility:'private', isPublished:false, groupIds:[] });
  const [zipFile, setZipFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchCollections(); fetchGroups(); }, []);

  async function fetchCollections() {
    const r = await axios.get('/api/collections');
    setCollections(r.data);
  }
  async function fetchGroups() {
    try { const r = await axios.get('/api/groups'); setGroups(r.data); } catch {}
  }

  async function handleCreate(e) {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('slug', form.slug); fd.append('title', form.title);
      fd.append('visibility', form.visibility); fd.append('isPublished', form.isPublished);
      form.groupIds.forEach(id => fd.append('groupIds', id));
      if (zipFile) fd.append('zipFile', zipFile);
      await axios.post('/api/collections', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowCreateModal(false); setForm({ slug:'', title:'', visibility:'private', isPublished:false, groupIds:[] }); setZipFile(null);
      fetchCollections();
    } catch(e) { setError(e.response?.data?.message || e.message); }
    finally { setLoading(false); }
  }

  async function handleDelete(col) {
    if (!confirm(`"${col.title}" 컬렉션을 삭제할까요?`)) return;
    await axios.delete(`/api/collections/${col.id}`);
    fetchCollections();
  }

  async function handleSettingsSave(col, updates) {
    await axios.put(`/api/collections/${col.id}`, updates);
    setShowSettingsModal(null); fetchCollections();
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
        <h2>컬렉션</h2>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>+ 새 컬렉션</button>
      </div>
      <table className="table">
        <thead><tr><th>제목</th><th>Slug</th><th>소유자</th><th>공개범위</th><th>게시</th><th>작업</th></tr></thead>
        <tbody>
          {collections.map(col => (
            <tr key={col.id}>
              <td>{col.title}</td>
              <td><code>{col.slug}</code></td>
              <td>{col.owner?.username || '-'}</td>
              <td><span className={`badge badge-${col.visibility}`}>{col.visibility}</span></td>
              <td>{col.isPublished ? '✓' : '-'}</td>
              <td>
                <a href={`/c/${col.slug}/`} target="_blank" rel="noreferrer" className="btn btn-sm">보기</a>{' '}
                <button className="btn btn-sm" onClick={() => setShowFileModal(col)}>편집</button>{' '}
                <button className="btn btn-sm" onClick={() => setShowSettingsModal(col)}>설정</button>{' '}
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(col)}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth:'480px'}}>
            <h3>새 컬렉션</h3>
            {error && <p style={{color:'red'}}>{error}</p>}
            <form onSubmit={handleCreate}>
              <input required placeholder="Slug (영문 소문자, 숫자, 하이픈)" value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})} style={{width:'100%',marginBottom:'0.5rem'}} />
              <input required placeholder="제목" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} style={{width:'100%',marginBottom:'0.5rem'}} />
              <select value={form.visibility} onChange={e=>setForm({...form,visibility:e.target.value})} style={{width:'100%',marginBottom:'0.5rem'}}>
                <option value="private">비공개 (나만)</option>
                <option value="group">그룹 공개</option>
                <option value="public">전체 공개</option>
              </select>
              {form.visibility === 'group' && (
                <select multiple value={form.groupIds} onChange={e=>setForm({...form,groupIds:[...e.target.selectedOptions].map(o=>o.value)})} style={{width:'100%',marginBottom:'0.5rem',height:'80px'}}>
                  {groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              )}
              <label><input type="checkbox" checked={form.isPublished} onChange={e=>setForm({...form,isPublished:e.target.checked})} /> 게시</label>
              <div style={{marginTop:'0.5rem'}}>
                <label>ZIP 파일 (선택): <input type="file" accept=".zip" onChange={e=>setZipFile(e.target.files[0])} /></label>
              </div>
              <div style={{marginTop:'1rem',display:'flex',gap:'0.5rem',justifyContent:'flex-end'}}>
                <button type="button" className="btn" onClick={() => setShowCreateModal(false)}>취소</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? '업로드 중...' : '생성'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSettingsModal && <SettingsModal col={showSettingsModal} groups={groups} onSave={handleSettingsSave} onClose={() => setShowSettingsModal(null)} />}
      {showFileModal && <FileManagerModal col={showFileModal} onClose={() => { setShowFileModal(null); fetchCollections(); }} />}
    </div>
  );
}

function SettingsModal({ col, groups, onSave, onClose }) {
  const [form, setForm] = useState({ title: col.title, visibility: col.visibility, isPublished: col.isPublished, entryPath: col.entryPath || 'index.html', groupIds: (col.Groups||[]).map(g=>String(g.id)) });
  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{maxWidth:'400px'}}>
        <h3>설정: {col.slug}</h3>
        <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="제목" style={{width:'100%',marginBottom:'0.5rem'}} />
        <input value={form.entryPath} onChange={e=>setForm({...form,entryPath:e.target.value})} placeholder="진입 경로 (index.html)" style={{width:'100%',marginBottom:'0.5rem'}} />
        <select value={form.visibility} onChange={e=>setForm({...form,visibility:e.target.value})} style={{width:'100%',marginBottom:'0.5rem'}}>
          <option value="private">비공개 (나만)</option>
          <option value="group">그룹 공개</option>
          <option value="public">전체 공개</option>
        </select>
        {form.visibility === 'group' && (
          <select multiple value={form.groupIds} onChange={e=>setForm({...form,groupIds:[...e.target.selectedOptions].map(o=>o.value)})} style={{width:'100%',marginBottom:'0.5rem',height:'80px'}}>
            {groups.map(g=><option key={g.id} value={String(g.id)}>{g.name}</option>)}
          </select>
        )}
        <label><input type="checkbox" checked={form.isPublished} onChange={e=>setForm({...form,isPublished:e.target.checked})} /> 게시</label>
        <div style={{marginTop:'1rem',display:'flex',gap:'0.5rem',justifyContent:'flex-end'}}>
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={() => onSave(col, {...form, groupIds: form.groupIds.map(Number)})}>저장</button>
        </div>
      </div>
    </div>
  );
}

function FileManagerModal({ col, onClose }) {
  const [tree, setTree] = useState([]);
  const [selectedPath, setSelectedPath] = useState(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [zipFile, setZipFile] = useState(null);

  useEffect(() => { fetchTree(); }, []);

  async function fetchTree() {
    const r = await axios.get(`/api/collections/${col.id}/tree`);
    setTree(r.data);
  }
  async function selectFile(p) {
    setSelectedPath(p);
    try {
      const r = await axios.get(`/api/collections/${col.id}/files`, { params: { path: p } });
      setContent(r.data.content);
    } catch { setContent('(바이너리 파일 — 편집 불가)'); }
  }
  async function saveFile() {
    setSaving(true);
    try {
      await axios.put(`/api/collections/${col.id}/files`, { path: selectedPath, content });
      setMsg('저장됨');
    } catch(e) { setMsg(e.response?.data?.message || '저장 실패'); }
    finally { setSaving(false); }
  }
  async function uploadFile(e) {
    const file = e.target.files[0]; if (!file) return;
    const targetPath = prompt('저장 경로 (예: html/new.html):', file.name);
    if (!targetPath) return;
    const fd = new FormData(); fd.append('file', file); fd.append('targetPath', targetPath);
    await axios.post(`/api/collections/${col.id}/files`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    fetchTree();
  }
  async function deleteFile() {
    if (!selectedPath || !confirm(`"${selectedPath}" 삭제?`)) return;
    await axios.delete(`/api/collections/${col.id}/files`, { params: { path: selectedPath } });
    setSelectedPath(null); setContent(''); fetchTree();
  }
  async function newFile() {
    const p = prompt('새 파일 경로 (예: html/page.html):'); if (!p) return;
    await axios.put(`/api/collections/${col.id}/files`, { path: p, content: '' });
    await fetchTree(); selectFile(p);
  }
  async function replaceZip() {
    if (!zipFile || !confirm('전체 파일을 ZIP으로 교체할까요?')) return;
    const fd = new FormData(); fd.append('zipFile', zipFile);
    await axios.post(`/api/collections/${col.id}/replace`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    setZipFile(null); fetchTree(); setSelectedPath(null); setContent('');
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{maxWidth:'900px',width:'90vw'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.5rem'}}>
          <h3>파일 편집: {col.title}</h3>
          <button className="btn" onClick={onClose}>닫기</button>
        </div>
        <div style={{display:'flex',gap:'0.5rem',marginBottom:'0.5rem',flexWrap:'wrap'}}>
          <label className="btn btn-sm">📁 파일 업로드<input type="file" style={{display:'none'}} onChange={uploadFile}/></label>
          <button className="btn btn-sm" onClick={newFile}>📄 새 파일</button>
          <button className="btn btn-sm btn-danger" onClick={deleteFile} disabled={!selectedPath}>🗑 삭제</button>
          <label className="btn btn-sm">📦 ZIP 선택<input type="file" accept=".zip" style={{display:'none'}} onChange={e=>setZipFile(e.target.files[0])}/></label>
          {zipFile && <button className="btn btn-sm btn-primary" onClick={replaceZip}>ZIP 교체</button>}
        </div>
        <div style={{display:'flex',gap:'1rem',height:'450px'}}>
          <div style={{width:'220px',overflowY:'auto',borderRight:'1px solid #e5e7eb',paddingRight:'0.5rem'}}>
            {tree.map(f => (
              <div key={f.path} onClick={() => selectFile(f.path)}
                style={{padding:'0.25rem 0.4rem',cursor:'pointer',borderRadius:'4px',
                  background: f.path === selectedPath ? '#e8eaf6' : 'transparent',
                  fontSize:'0.82rem',wordBreak:'break-all'}}>
                {f.path}
              </div>
            ))}
          </div>
          <div style={{flex:1,display:'flex',flexDirection:'column'}}>
            {selectedPath && <div style={{fontSize:'0.8rem',color:'#666',marginBottom:'0.25rem'}}>{selectedPath}</div>}
            <textarea value={content} onChange={e=>setContent(e.target.value)} disabled={!selectedPath}
              style={{flex:1,fontFamily:'monospace',fontSize:'0.85rem',resize:'none',border:'1px solid #e5e7eb',borderRadius:'4px',padding:'0.5rem'}} />
            <div style={{display:'flex',gap:'0.5rem',marginTop:'0.5rem',alignItems:'center'}}>
              <button className="btn btn-primary btn-sm" onClick={saveFile} disabled={saving||!selectedPath}>{saving ? '저장 중...' : '저장'}</button>
              {msg && <span style={{fontSize:'0.85rem',color:'#666'}}>{msg}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
