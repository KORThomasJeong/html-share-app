const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Sequelize, DataTypes } = require('sequelize');
const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Allow large HTML content
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from React app
app.use(express.static(path.join(__dirname, '../client/dist')));


// Database Setup
const sequelize = new Sequelize(
    process.env.DB_NAME || 'htmldb',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASS || 'postgres',
    {
        host: process.env.DB_HOST || 'db',
        dialect: 'postgres',
        logging: false,
    }
);

// Models
const Page = sequelize.define('Page', {
    slug: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'Untitled Page',
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    isPublished: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
});

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Routes

// Login
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token });
    } else {
        res.status(401).json({ message: 'Invalid password' });
    }
});

// Create Page
app.post('/api/pages', authenticateToken, async (req, res) => {
    try {
        const { content, title } = req.body;
        const slug = nanoid(10); // Random 10 char ID
        const page = await Page.create({
            slug,
            content,
            title: title || 'Untitled',
        });
        res.json(page);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List Pages
app.get('/api/pages', authenticateToken, async (req, res) => {
    try {
        const pageNum = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (pageNum - 1) * limit;

        const { count, rows } = await Page.findAndCountAll({
            limit,
            offset,
            order: [['createdAt', 'DESC']],
        });

        res.json({
            total: count,
            pages: rows,
            totalPages: Math.ceil(count / limit),
            currentPage: pageNum,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Page
app.put('/api/pages/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { isPublished, content, title } = req.body;
        const page = await Page.findByPk(id);

        if (!page) return res.status(404).json({ message: 'Page not found' });

        if (isPublished !== undefined) page.isPublished = isPublished;
        if (content !== undefined) page.content = content;
        if (title !== undefined) page.title = title;

        await page.save();
        res.json(page);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Page
app.delete('/api/pages/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const page = await Page.findByPk(id);
        if (!page) return res.status(404).json({ message: 'Page not found' });
        await page.destroy();
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Public View
app.get('/s/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const page = await Page.findOne({ where: { slug } });

        if (!page || !page.isPublished) {
            return res.status(404).send('Page not found or unpublished');
        }

        // Serve raw HTML
        res.send(page.content);
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

// Catch-all handler for any request that doesn't match the above
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Sync DB and Start
sequelize.sync().then(() => {
    console.log('Database connected and synced');
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Unable to connect to the database:', err);
});
