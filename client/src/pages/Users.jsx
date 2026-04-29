import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ username:'', password:'', role:'user' });
  const [error, setError] = useState('');

  useEffect(() => { fetchUsers(); }, []);
  async function fetchUsers() {
    const r = await axios.get('/api/users'); setUsers(r.data);
  }
  async function createUser(e) {
    e.preventDefault(); setError('');
    try {
      await axios.post('/api/users', form);
      setShowModal(false); setForm({ username:'', password:'', role:'user' }); fetchUsers();
    } catch(e) { setError(e.response?.data?.message || e.message); }
  }
  async function toggleRole(u) {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    await axios.put(`/api/users/${u.id}`, { role: newRole }); fetchUsers();
  }
  async function resetPassword(u) {
    const pw = prompt(`"${u.username}"의 새 비밀번호:`); if (!pw) return;
    await axios.put(`/api/users/${u.id}`, { password: pw }); alert('변경됨');
  }
  async function deleteUser(u) {
    if (!confirm(`"${u.username}" 계정을 삭제할까요?`)) return;
    try { await axios.delete(`/api/users/${u.id}`); fetchUsers(); }
    catch(e) { alert(e.response?.data?.message || '삭제 실패'); }
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
        <h2>사용자 관리</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ 사용자 추가</button>
      </div>
      <table className="table">
        <thead><tr><th>사용자명</th><th>역할</th><th>그룹</th><th>작업</th></tr></thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
              <td>{(u.Groups||[]).map(g=>g.name).join(', ')||'-'}</td>
              <td>
                <button className="btn btn-sm" onClick={() => toggleRole(u)}>{u.role==='admin'?'→ user':'→ admin'}</button>{' '}
                <button className="btn btn-sm" onClick={() => resetPassword(u)}>비밀번호</button>{' '}
                <button className="btn btn-sm btn-danger" onClick={() => deleteUser(u)}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth:'360px'}}>
            <h3>사용자 추가</h3>
            {error && <p style={{color:'red'}}>{error}</p>}
            <form onSubmit={createUser}>
              <input required placeholder="사용자명" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} style={{width:'100%',marginBottom:'0.5rem'}} />
              <input required type="password" placeholder="비밀번호" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} style={{width:'100%',marginBottom:'0.5rem'}} />
              <select value={form.role} onChange={e=>setForm({...form,role:e.target.value})} style={{width:'100%',marginBottom:'1rem'}}>
                <option value="user">일반 사용자</option>
                <option value="admin">관리자</option>
              </select>
              <div style={{display:'flex',gap:'0.5rem',justifyContent:'flex-end'}}>
                <button type="button" className="btn" onClick={() => setShowModal(false)}>취소</button>
                <button type="submit" className="btn btn-primary">추가</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
