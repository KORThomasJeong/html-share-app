import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('/api/login', { password });
            localStorage.setItem('token', res.data.token);
            navigate('/admin');
        } catch (err) {
            setError('Invalid password');
        }
    };

    return (
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
                style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}
            >
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem auto'
                    }}>
                        <Lock size={32} color="var(--accent)" />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Admin Access</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Enter password to continue</p>
                </div>

                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <input
                            type="password"
                            className="input"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                        />
                    </div>
                    {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>}
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                        Login
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default Login;
