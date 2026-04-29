import React, { useState, useEffect } from 'react';
import { X, Save, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

const VISIBILITY_OPTIONS = [
    { value: 'private', label: '비공개' },
    { value: 'group', label: '그룹' },
    { value: 'public', label: '전체공개' },
];

const EditorModal = ({ isOpen, onClose, onSave, initialData }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [visibility, setVisibility] = useState('private');
    const [groupIds, setGroupIds] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setTitle(initialData.title);
            setContent(initialData.content);
            setVisibility(initialData.visibility || 'private');
            setGroupIds((initialData.Groups || []).map(g => String(g.id)));
        } else {
            setTitle('');
            setContent('');
            setVisibility('private');
            setGroupIds([]);
        }
    }, [initialData, isOpen]);

    useEffect(() => {
        if (isOpen) {
            axios.get('/api/groups')
                .then(r => setGroups(r.data))
                .catch(() => setGroups([]));
        }
    }, [isOpen]);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            setContent(e.target.result);
        };
        reader.readAsText(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        await onSave({ title, content, visibility, groupIds: groupIds.map(Number) });
        setLoading(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="modal"
            >
                <div className="modal-header">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                        {initialData ? 'Edit Page' : 'Create New Page'}
                    </h2>
                    <button onClick={onClose} className="btn btn-ghost">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div className="modal-body">
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Title</label>
                            <input
                                type="text"
                                className="input"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="My Awesome Page"
                                required
                            />
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>공개범위</label>
                            <select
                                className="input"
                                value={visibility}
                                onChange={(e) => setVisibility(e.target.value)}
                            >
                                {VISIBILITY_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {visibility === 'group' && groups.length > 0 && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>그룹 선택</label>
                                <select
                                    className="input"
                                    multiple
                                    value={groupIds}
                                    onChange={(e) => setGroupIds([...e.target.selectedOptions].map(o => o.value))}
                                    style={{ height: '100px' }}
                                >
                                    {groups.map(g => (
                                        <option key={g.id} value={String(g.id)}>{g.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <label style={{ fontWeight: '500' }}>HTML Content</label>
                                <label className="btn btn-ghost" style={{ fontSize: '0.875rem', padding: '0.25rem 0.5rem' }}>
                                    <Upload size={14} /> Upload HTML File
                                    <input type="file" accept=".html" onChange={handleFileUpload} style={{ display: 'none' }} />
                                </label>
                            </div>
                            <textarea
                                className="input"
                                style={{ fontFamily: 'monospace', minHeight: '300px', resize: 'vertical' }}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Paste your HTML here..."
                                required
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            <Save size={18} />
                            {loading ? 'Saving...' : 'Save Page'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default EditorModal;
