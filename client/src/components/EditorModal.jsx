import React, { useState, useEffect } from 'react';
import { X, Save, Upload } from 'lucide-react';
import { motion } from 'framer-motion';

const EditorModal = ({ isOpen, onClose, onSave, initialData }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setTitle(initialData.title);
            setContent(initialData.content);
        } else {
            setTitle('');
            setContent('');
        }
    }, [initialData, isOpen]);

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
        await onSave({ title, content });
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
