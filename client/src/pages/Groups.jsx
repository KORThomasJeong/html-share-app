import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => { fetchAll(); }, []);
  async function fetchAll() {
    const [gr, ur] = await Promise.all([axios.get('/api/groups'), axios.get('/api/users')]);
    setGroups(gr.data); setUsers(ur.data);
  }

  async function createGroup() {
    const name = prompt('그룹 이름:'); if (!name) return;
    await axios.post('/api/groups', { name }); fetchAll();
  }
  async function renameGroup(g) {
    const name = prompt('새 이름:', g.name); if (!name) return;
    await axios.put(`/api/groups/${g.id}`, { name }); fetchAll();
  }
  async function deleteGroup(g) {
    if (!confirm(`"${g.name}" 그룹을 삭제할까요?`)) return;
    await axios.delete(`/api/groups/${g.id}`); fetchAll();
  }
  async function addMember(g) {
    const nonMembers = users.filter(u => !(g.Users||[]).find(m => m.id === u.id));
    if (!nonMembers.length) { alert('추가할 사용자가 없습니다.'); return; }
    const choice = prompt('추가할 사용자 ID (숫자):\n' + nonMembers.map(u=>`${u.id}: ${u.username}`).join('\n'));
    if (!choice) return;
    await axios.post(`/api/groups/${g.id}/members`, { userId: Number(choice) }); fetchAll();
  }
  async function removeMember(g, userId) {
    await axios.delete(`/api/groups/${g.id}/members/${userId}`); fetchAll();
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
        <h2>그룹 관리</h2>
        <button className="btn btn-primary" onClick={createGroup}>+ 그룹 추가</button>
      </div>
      {groups.map(g => (
        <div key={g.id} className="card" style={{marginBottom:'1rem'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <strong>{g.name}</strong>
            <div>
              <button className="btn btn-sm" onClick={() => renameGroup(g)}>이름 변경</button>{' '}
              <button className="btn btn-sm btn-danger" onClick={() => deleteGroup(g)}>삭제</button>
            </div>
          </div>
          <div style={{marginTop:'0.5rem',display:'flex',flexWrap:'wrap',gap:'0.4rem',alignItems:'center'}}>
            {(g.Users||[]).map(u => (
              <span key={u.id} style={{background:'#e8eaf6',borderRadius:'12px',padding:'0.2rem 0.6rem',fontSize:'0.85rem',display:'flex',alignItems:'center',gap:'0.3rem'}}>
                {u.username}
                <button onClick={() => removeMember(g, u.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#666',fontSize:'1rem',lineHeight:1}}>×</button>
              </span>
            ))}
            <button className="btn btn-sm" onClick={() => addMember(g)}>+ 멤버 추가</button>
          </div>
        </div>
      ))}
    </div>
  );
}
