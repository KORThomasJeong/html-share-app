import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    LayoutGrid, List, Plus, Search, ExternalLink,
    Copy, Trash2, Edit, Eye, EyeOff, LogOut
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import EditorModal from '../components/EditorModal';

const Dashboard = () => {
    const [pages, setPages] = useState([]);
    const [viewMode, setViewMode] = useState('tile'); // 'tile' or 'list'
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPage, setEditingPage] = useState(null);
    const navigate = useNavigate();

    const fetchPages = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/pages?page=${page}&limit=10`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPages(res.data.pages);
            setTotalPages(res.data.totalPages);
        } catch (err) {
            if (err.response && err.response.status === 401) {
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPages();
    }, [page]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const handleSave = async (data) => {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        if (editingPage) {
            await axios.put(`/api/pages/${editingPage.id}`, data, { headers });
        } else {
            await axios.post('/api/pages', data, { headers });
        }
        fetchPages();
        setEditingPage(null);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this page?')) return;
        const token = localStorage.getItem('token');
        await axios.delete(`/api/pages/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        fetchPages();
    };

    const handleTogglePublish = async (page) => {
        const token = localStorage.getItem('token');
        await axios.put(`/api/pages/${page.id}`, { isPublished: !page.isPublished }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        fetchPages();
    };

    const copyToClipboard = (slug) => {
        const url = `${window.location.origin}/s/${slug}`;
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
    };

    return (
        <div className="container">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>HTML Share Admin</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage your shared pages</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => { setEditingPage(null); setIsModalOpen(true); }} className="btn btn-primary">
                        <Plus size={18} /> New Page
                    </button>
                    <button onClick={handleLogout} className="btn btn-ghost" style={{ color: 'var(--danger)' }}>
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: 'var(--radius)' }}>
                    <button
                        className={`btn ${viewMode === 'tile' ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ padding: '0.5rem' }}
                        onClick={() => setViewMode('tile')}
                    >
                        <LayoutGrid size={18} />
                    </button>
                    <button
                        className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ padding: '0.5rem' }}
                        onClick={() => setViewMode('list')}
                    >
                        <List size={18} />
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Page {page} of {totalPages}</span>
                    <button
                        className="btn btn-ghost"
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                    >Previous</button>
                    <button
                        className="btn btn-ghost"
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                    >Next</button>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>Loading...</div>
            ) : (
                <>
                    {viewMode === 'list' ? (
                        <div className="card">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pages.map(p => (
                                        <tr key={p.id}>
                                            <td>
                                                <div style={{ fontWeight: '500' }}>{p.title}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>/s/{p.slug}</div>
                                            </td>
                                            <td>
                                                <span className={`badge ${p.isPublished ? 'badge-success' : 'badge-neutral'}`}>
                                                    {p.isPublished ? 'Published' : 'Draft'}
                                                </span>
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                                {new Date(p.createdAt).toLocaleDateString()}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button onClick={() => copyToClipboard(p.slug)} className="btn btn-ghost" title="Copy Link"><Copy size={16} /></button>
                                                    <button onClick={() => { setEditingPage(p); setIsModalOpen(true); }} className="btn btn-ghost" title="Edit"><Edit size={16} /></button>
                                                    <button onClick={() => handleTogglePublish(p)} className="btn btn-ghost" title={p.isPublished ? "Unpublish" : "Publish"}>
                                                        {p.isPublished ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                    <button onClick={() => handleDelete(p.id)} className="btn btn-ghost" style={{ color: 'var(--danger)' }} title="Delete"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="grid-view">
                            {pages.map(p => (
                                <motion.div
                                    key={p.id}
                                    className="card"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    whileHover={{ y: -4 }}
                                >
                                    <div style={{ position: 'relative', height: '200px', background: '#fff', overflow: 'hidden' }}>
                                        <iframe
                                            srcDoc={p.content}
                                            style={{
                                                width: '200%',
                                                height: '200%',
                                                transform: 'scale(0.5)',
                                                transformOrigin: '0 0',
                                                border: 'none',
                                                pointerEvents: 'none'
                                            }}
                                            sandbox=""
                                        />
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            padding: '0.5rem',
                                            background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                                            display: 'flex',
                                            justifyContent: 'flex-end'
                                        }}>
                                            <a
                                                href={`/s/${p.slug}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="btn btn-primary"
                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                            >
                                                <ExternalLink size={14} /> Open
                                            </a>
                                        </div>
                                    </div>
                                    <div style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                            <h3 style={{ fontWeight: 'bold', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>{p.title}</h3>
                                            <span className={`badge ${p.isPublished ? 'badge-success' : 'badge-neutral'}`}>
                                                {p.isPublished ? 'Live' : 'Draft'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                                            <button onClick={() => copyToClipboard(p.slug)} className="btn btn-ghost" title="Copy Link"><Copy size={16} /></button>
                                            <button onClick={() => { setEditingPage(p); setIsModalOpen(true); }} className="btn btn-ghost" title="Edit"><Edit size={16} /></button>
                                            <button onClick={() => handleTogglePublish(p)} className="btn btn-ghost" title={p.isPublished ? "Unpublish" : "Publish"}>
                                                {p.isPublished ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                            <button onClick={() => handleDelete(p.id)} className="btn btn-ghost" style={{ color: 'var(--danger)' }} title="Delete"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </>
            )}

            <EditorModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingPage(null); }}
                onSave={handleSave}
                initialData={editingPage}
            />
        </div>
    );
};

export default Dashboard;
