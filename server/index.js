require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');
const { Sequelize, DataTypes, Op } = require('sequelize');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const AdmZip = require('adm-zip');
const multer = require('multer');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const COLLECTIONS_DIR = path.join(__dirname, '../collections');
const TEXT_EXTS = new Set(['.html','.htm','.css','.js','.txt','.md','.svg','.json','.xml']);
const SAFE_NAME = /^[a-z0-9_-]+$/i;

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50*1024*1024 } });

// Sequelize setup
const sequelize = new Sequelize(
  process.env.DB_NAME || 'htmldb',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    logging: false,
  }
);

// Middleware (order matters)
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../client/dist')));

// Models

const Page = sequelize.define('Page', {
  slug:        { type: DataTypes.STRING, unique: true },
  title:       { type: DataTypes.STRING },
  content:     { type: DataTypes.TEXT },
  isPublished: { type: DataTypes.BOOLEAN, defaultValue: false },
  ownerId:     { type: DataTypes.INTEGER, allowNull: true },
  visibility:  { type: DataTypes.ENUM('private','group','public'), defaultValue: 'private' },
});

const User = sequelize.define('User', {
  username:     { type: DataTypes.STRING, unique: true, allowNull: false },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  role:         { type: DataTypes.ENUM('admin','user'), defaultValue: 'user' },
});

const Group = sequelize.define('Group', {
  name:      { type: DataTypes.STRING, unique: true, allowNull: false },
  createdBy: { type: DataTypes.INTEGER, allowNull: true },
});

const UserGroup = sequelize.define('UserGroup', {}, { timestamps: false });
User.belongsToMany(Group, { through: UserGroup });
Group.belongsToMany(User, { through: UserGroup });

const Collection = sequelize.define('Collection', {
  slug:        { type: DataTypes.STRING, unique: true, allowNull: false },
  title:       { type: DataTypes.STRING, allowNull: false },
  folderName:  { type: DataTypes.STRING, allowNull: false },
  entryPath:   { type: DataTypes.STRING, defaultValue: 'index.html' },
  visibility:  { type: DataTypes.ENUM('private','group','public'), defaultValue: 'private' },
  isPublished: { type: DataTypes.BOOLEAN, defaultValue: false },
  ownerId:     { type: DataTypes.INTEGER, allowNull: true },
});

const CollectionGroup = sequelize.define('CollectionGroup', {}, { timestamps: false });
Collection.belongsToMany(Group, { through: CollectionGroup });
Group.belongsToMany(Collection, { through: CollectionGroup });

const PageGroup = sequelize.define('PageGroup', {}, { timestamps: false });
Page.belongsToMany(Group, { through: PageGroup });
Group.belongsToMany(Page, { through: PageGroup });

// Associations
Collection.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });
Page.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });

// Auth helpers
function readToken(req) {
  const h = req.headers['authorization'];
  if (h && h.startsWith('Bearer ')) return h.slice(7);
  return (req.cookies && req.cookies.token) || null;
}
function verifyToken(req) {
  const t = readToken(req);
  if (!t) return null;
  try { return jwt.verify(t, JWT_SECRET); } catch { return null; }
}
function requireAuthApi(req, res, next) {
  const u = verifyToken(req);
  if (!u) return res.sendStatus(401);
  req.user = u; next();
}
function requireAdminApi(req, res, next) {
  const u = verifyToken(req);
  if (!u) return res.sendStatus(401);
  if (u.role !== 'admin') return res.sendStatus(403);
  req.user = u; next();
}
async function canRead(user, resource, JunctionModel, fkField) {
  if (resource.visibility === 'public') return true;
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (resource.ownerId === user.sub) return true;
  if (resource.visibility === 'group') {
    const rows = await JunctionModel.findAll({ where: { [fkField]: resource.id } });
    if (!rows.length) return false;
    const gids = rows.map(r => r.GroupId);
    const hit = await UserGroup.count({ where: { UserId: user.sub, GroupId: gids } });
    return hit > 0;
  }
  return false;
}
function ownerOrAdmin(req, resource, res) {
  if (req.user.role === 'admin') return true;
  if (resource.ownerId === req.user.sub) return true;
  res.sendStatus(403); return false;
}

// File / ZIP helpers
function isSafeRelPath(p) {
  if (!p) return false;
  const norm = path.normalize(p);
  return !path.isAbsolute(norm) && !norm.startsWith('..');
}
function resolveInside(base, rel) {
  const full = path.resolve(base, rel);
  if (!full.startsWith(path.resolve(base))) throw new Error('path traversal');
  return full;
}
function walkTree(dir, base) {
  base = base || dir;
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    const rel  = path.relative(base, full);
    if (e.isDirectory()) { out = out.concat(walkTree(full, base)); }
    else { out.push({ path: rel, size: fs.statSync(full).size }); }
  }
  return out;
}
function extractZipSafe(buffer, destDir) {
  const zip = new AdmZip(buffer);
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    if (!isSafeRelPath(entry.entryName)) throw new Error('unsafe zip entry: ' + entry.entryName);
    const target = resolveInside(destDir, entry.entryName);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, entry.getData());
  }
}
function detectEntryPath(dir) {
  const top = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
  if (top.includes('index.html')) return 'index.html';
  if (top.length) return top[0];
  const sub = walkTree(dir).filter(f => f.path.endsWith('.html'));
  return sub.length ? sub[0].path : 'index.html';
}
async function setResourceGroups(resource, groupIds, addGroups, setGroups) {
  if (!Array.isArray(groupIds)) return;
  const ids = groupIds.map(Number).filter(n => !isNaN(n));
  const groups = await Group.findAll({ where: { id: ids } });
  await setGroups(groups);
}

// Seed function
async function seed() {
  fs.mkdirSync(COLLECTIONS_DIR, { recursive: true });
  fs.mkdirSync(path.join(COLLECTIONS_DIR, '.trash'), { recursive: true });
  if (await User.count() === 0) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const admin = await User.create({ username: ADMIN_USERNAME, passwordHash: hash, role: 'admin' });
    console.log('[seed] created initial admin user:', ADMIN_USERNAME);
    await Page.update({ ownerId: admin.id, visibility: 'public' },  { where: { ownerId: null, isPublished: true } });
    await Page.update({ ownerId: admin.id, visibility: 'private' }, { where: { ownerId: null, isPublished: false } });
    await Collection.findOrCreate({
      where: { slug: 't2y' },
      defaults: { title: 'SK에코플랜트 T2Y', folderName: 't2y', entryPath: 'index.html', visibility: 'private', isPublished: true, ownerId: admin.id },
    });
  }
}

// Routes

// Login / Logout / Me
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ sub: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 24*3600*1000 });
    res.json({ token, username: user.username, role: user.role });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/logout', (req, res) => { res.clearCookie('token'); res.json({ ok: true }); });

app.get('/api/me', requireAuthApi, async (req, res) => {
  const user = await User.findByPk(req.user.sub, { include: [{ model: Group }] });
  if (!user) return res.sendStatus(404);
  res.json({ id: user.id, username: user.username, role: user.role, groups: user.Groups });
});

// Pages CRUD (with visibility filter)
app.get('/api/pages', requireAuthApi, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const user = req.user;

    let where;
    if (user.role === 'admin') {
      where = {};
    } else {
      const myGroups = await UserGroup.findAll({ where: { UserId: user.sub } });
      const gids = myGroups.map(g => g.GroupId);
      // Pages visible: owned by me, OR public, OR group-shared with one of my groups
      const groupPageIds = gids.length
        ? (await PageGroup.findAll({ where: { GroupId: gids } })).map(r => r.PageId)
        : [];
      where = {
        [Op.or]: [
          { ownerId: user.sub },
          { visibility: 'public' },
          ...(groupPageIds.length ? [{ id: groupPageIds, visibility: 'group' }] : []),
        ],
      };
    }
    const { count, rows } = await Page.findAndCountAll({
      where, limit, offset, order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'owner', attributes: ['id','username'] }],
    });
    res.json({ pages: rows, total: count, totalPages: Math.ceil(count / limit), currentPage: page });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/pages', requireAuthApi, async (req, res) => {
  try {
    const { title, content, isPublished, visibility, groupIds } = req.body;
    const slug = nanoid(10);
    const p = await Page.create({ slug, title, content, isPublished: !!isPublished, visibility: visibility || 'private', ownerId: req.user.sub });
    if (groupIds) await p.setGroups(await Group.findAll({ where: { id: Array.isArray(groupIds) ? groupIds : [groupIds] } }));
    res.json(p);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/pages/:id', requireAuthApi, async (req, res) => {
  try {
    const p = await Page.findByPk(req.params.id);
    if (!p) return res.sendStatus(404);
    if (!ownerOrAdmin(req, p, res)) return;
    const { title, content, isPublished, visibility, groupIds } = req.body;
    await p.update({ title, content, isPublished, visibility });
    if (groupIds !== undefined) await p.setGroups(await Group.findAll({ where: { id: Array.isArray(groupIds) ? groupIds : [groupIds] } }));
    res.json(p);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/pages/:id', requireAuthApi, async (req, res) => {
  try {
    const p = await Page.findByPk(req.params.id);
    if (!p) return res.sendStatus(404);
    if (!ownerOrAdmin(req, p, res)) return;
    await p.setGroups([]);
    await p.destroy();
    res.json({ message: 'Deleted' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// Public page render
app.get('/s/:slug', async (req, res) => {
  try {
    const page = await Page.findOne({ where: { slug: req.params.slug } });
    if (!page) return res.sendStatus(404);
    const ok = await canRead(verifyToken(req), page, PageGroup, 'PageId');
    if (!ok) return res.sendStatus(401);
    res.send(page.content);
  } catch(e) { res.status(500).send(e.message); }
});

// Collections CRUD

// List collections visible to user
app.get('/api/collections', requireAuthApi, async (req, res) => {
  try {
    const user = req.user;
    let where;
    if (user.role === 'admin') {
      where = {};
    } else {
      const myGroups = await UserGroup.findAll({ where: { UserId: user.sub } });
      const gids = myGroups.map(g => g.GroupId);
      const groupColIds = gids.length
        ? (await CollectionGroup.findAll({ where: { GroupId: gids } })).map(r => r.CollectionId)
        : [];
      where = {
        [Op.or]: [
          { ownerId: user.sub },
          { visibility: 'public' },
          ...(groupColIds.length ? [{ id: groupColIds, visibility: 'group' }] : []),
        ],
      };
    }
    const cols = await Collection.findAll({
      where, order: [['createdAt','DESC']],
      include: [{ model: User, as: 'owner', attributes: ['id','username'] }, { model: Group }],
    });
    res.json(cols);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// Create collection (multipart with optional ZIP)
app.post('/api/collections', requireAuthApi, upload.single('zipFile'), async (req, res) => {
  try {
    const { slug, title, visibility, isPublished, groupIds } = req.body;
    if (!SAFE_NAME.test(slug)) return res.status(400).json({ message: 'Invalid slug' });
    const folderName = slug;
    const destDir = path.join(COLLECTIONS_DIR, folderName);
    fs.mkdirSync(destDir, { recursive: true });
    let entryPath = 'index.html';
    if (req.file) {
      extractZipSafe(req.file.buffer, destDir);
      entryPath = detectEntryPath(destDir);
    }
    const gids = groupIds ? (Array.isArray(groupIds) ? groupIds : JSON.parse(groupIds)) : [];
    const col = await Collection.create({ slug, title, folderName, entryPath, visibility: visibility || 'private', isPublished: isPublished === 'true' || isPublished === true, ownerId: req.user.sub });
    if (gids.length) await col.setGroups(await Group.findAll({ where: { id: gids } }));
    res.json(col);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/collections/:id', requireAuthApi, async (req, res) => {
  try {
    const col = await Collection.findByPk(req.params.id, {
      include: [{ model: User, as: 'owner', attributes: ['id','username'] }, { model: Group }],
    });
    if (!col) return res.sendStatus(404);
    const ok = await canRead(req.user, col, CollectionGroup, 'CollectionId');
    if (!ok) return res.sendStatus(403);
    res.json(col);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/collections/:id', requireAuthApi, async (req, res) => {
  try {
    const col = await Collection.findByPk(req.params.id);
    if (!col) return res.sendStatus(404);
    if (!ownerOrAdmin(req, col, res)) return;
    const { title, visibility, isPublished, entryPath, groupIds } = req.body;
    await col.update({ title, visibility, isPublished, entryPath });
    if (groupIds !== undefined) {
      const ids = Array.isArray(groupIds) ? groupIds : JSON.parse(groupIds);
      await col.setGroups(await Group.findAll({ where: { id: ids } }));
    }
    res.json(col);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/collections/:id', requireAuthApi, async (req, res) => {
  try {
    const col = await Collection.findByPk(req.params.id);
    if (!col) return res.sendStatus(404);
    if (!ownerOrAdmin(req, col, res)) return;
    const dir = path.join(COLLECTIONS_DIR, col.folderName);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    await col.setGroups([]);
    await col.destroy();
    res.json({ message: 'Deleted' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// Collection file management routes
function getCol(id) { return Collection.findByPk(id); }

app.get('/api/collections/:id/tree', requireAuthApi, async (req, res) => {
  try {
    const col = await getCol(req.params.id);
    if (!col || !ownerOrAdmin(req, col, res)) return;
    const dir = path.join(COLLECTIONS_DIR, col.folderName);
    if (!fs.existsSync(dir)) return res.json([]);
    res.json(walkTree(dir));
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/collections/:id/files', requireAuthApi, async (req, res) => {
  try {
    const col = await getCol(req.params.id);
    if (!col || !ownerOrAdmin(req, col, res)) return;
    const relPath = req.query.path;
    if (!relPath || !isSafeRelPath(relPath)) return res.status(400).json({ message: 'bad path' });
    const ext = path.extname(relPath).toLowerCase();
    if (!TEXT_EXTS.has(ext)) return res.status(400).json({ message: 'binary file' });
    const fullPath = resolveInside(path.join(COLLECTIONS_DIR, col.folderName), relPath);
    if (!fs.existsSync(fullPath)) return res.sendStatus(404);
    res.json({ content: fs.readFileSync(fullPath, 'utf8') });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/collections/:id/files', requireAuthApi, upload.single('file'), async (req, res) => {
  try {
    const col = await getCol(req.params.id);
    if (!col || !ownerOrAdmin(req, col, res)) return;
    const relPath = req.body.targetPath;
    if (!relPath || !isSafeRelPath(relPath)) return res.status(400).json({ message: 'bad path' });
    const fullPath = resolveInside(path.join(COLLECTIONS_DIR, col.folderName), relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, req.file.buffer);
    res.json({ path: relPath });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/collections/:id/files', requireAuthApi, async (req, res) => {
  try {
    const col = await getCol(req.params.id);
    if (!col || !ownerOrAdmin(req, col, res)) return;
    const { path: relPath, content } = req.body;
    if (!relPath || !isSafeRelPath(relPath)) return res.status(400).json({ message: 'bad path' });
    const fullPath = resolveInside(path.join(COLLECTIONS_DIR, col.folderName), relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content || '', 'utf8');
    res.json({ path: relPath });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/collections/:id/files', requireAuthApi, async (req, res) => {
  try {
    const col = await getCol(req.params.id);
    if (!col || !ownerOrAdmin(req, col, res)) return;
    const relPath = req.query.path;
    if (!relPath || !isSafeRelPath(relPath)) return res.status(400).json({ message: 'bad path' });
    const fullPath = resolveInside(path.join(COLLECTIONS_DIR, col.folderName), relPath);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/collections/:id/replace', requireAuthApi, upload.single('zipFile'), async (req, res) => {
  try {
    const col = await getCol(req.params.id);
    if (!col || !ownerOrAdmin(req, col, res)) return;
    if (!req.file) return res.status(400).json({ message: 'no zip' });
    const dir = path.join(COLLECTIONS_DIR, col.folderName);
    if (fs.existsSync(dir)) {
      const trash = path.join(COLLECTIONS_DIR, '.trash', `${col.folderName}-${Date.now()}`);
      fs.mkdirSync(path.dirname(trash), { recursive: true });
      fs.renameSync(dir, trash);
    }
    fs.mkdirSync(dir, { recursive: true });
    extractZipSafe(req.file.buffer, dir);
    const entryPath = detectEntryPath(dir);
    await col.update({ entryPath });
    res.json({ ok: true, entryPath });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// Users CRUD (admin only)
app.get('/api/users', requireAdminApi, async (req, res) => {
  const users = await User.findAll({ include: [{ model: Group, attributes: ['id','name'] }], attributes: { exclude: ['passwordHash'] } });
  res.json(users);
});

app.post('/api/users', requireAdminApi, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const u = await User.create({ username, passwordHash: hash, role: role || 'user' });
    res.json({ id: u.id, username: u.username, role: u.role });
  } catch(e) { res.status(400).json({ message: e.message }); }
});

app.put('/api/users/:id', requireAdminApi, async (req, res) => {
  try {
    const u = await User.findByPk(req.params.id);
    if (!u) return res.sendStatus(404);
    const { role, password } = req.body;
    const updates = {};
    if (role) updates.role = role;
    if (password) updates.passwordHash = await bcrypt.hash(password, 10);
    await u.update(updates);
    res.json({ id: u.id, username: u.username, role: u.role });
  } catch(e) { res.status(400).json({ message: e.message }); }
});

app.delete('/api/users/:id', requireAdminApi, async (req, res) => {
  try {
    const uid = parseInt(req.params.id);
    if (uid === req.user.sub) return res.status(400).json({ message: 'Cannot delete yourself' });
    const u = await User.findByPk(uid);
    if (!u) return res.sendStatus(404);
    if (u.role === 'admin') {
      const cnt = await User.count({ where: { role: 'admin' } });
      if (cnt <= 1) return res.status(400).json({ message: 'Cannot delete last admin' });
    }
    await u.destroy();
    res.json({ message: 'Deleted' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// Groups CRUD (admin only)
app.get('/api/groups', requireAuthApi, async (req, res) => {
  const groups = await Group.findAll({ include: [{ model: User, attributes: ['id','username'], through: { attributes: [] } }] });
  res.json(groups);
});

app.post('/api/groups', requireAdminApi, async (req, res) => {
  try {
    const g = await Group.create({ name: req.body.name, createdBy: req.user.sub });
    res.json(g);
  } catch(e) { res.status(400).json({ message: e.message }); }
});

app.put('/api/groups/:id', requireAdminApi, async (req, res) => {
  try {
    const g = await Group.findByPk(req.params.id);
    if (!g) return res.sendStatus(404);
    await g.update({ name: req.body.name });
    res.json(g);
  } catch(e) { res.status(400).json({ message: e.message }); }
});

app.delete('/api/groups/:id', requireAdminApi, async (req, res) => {
  try {
    const g = await Group.findByPk(req.params.id);
    if (!g) return res.sendStatus(404);
    await g.destroy();
    res.json({ message: 'Deleted' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/groups/:id/members', requireAdminApi, async (req, res) => {
  try {
    const g = await Group.findByPk(req.params.id);
    if (!g) return res.sendStatus(404);
    const u = await User.findByPk(req.body.userId);
    if (!u) return res.sendStatus(404);
    await g.addUser(u);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/groups/:id/members/:userId', requireAdminApi, async (req, res) => {
  try {
    const g = await Group.findByPk(req.params.id);
    if (!g) return res.sendStatus(404);
    const u = await User.findByPk(req.params.userId);
    if (!u) return res.sendStatus(404);
    await g.removeUser(u);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// Static collection serving (BEFORE SPA catch-all)
app.use('/c/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    if (!SAFE_NAME.test(slug)) return res.sendStatus(404);
    const col = await Collection.findOne({ where: { slug } });
    if (!col || !col.isPublished) return res.sendStatus(404);
    const user = verifyToken(req);
    const ok = await canRead(user, col, CollectionGroup, 'CollectionId');
    if (!ok) {
      if (!user) return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
      return res.sendStatus(403);
    }
    express.static(path.join(COLLECTIONS_DIR, col.folderName))(req, res, next);
  } catch(e) { res.status(500).send(e.message); }
});

// SPA catch-all (LAST)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Boot
sequelize.sync({ alter: true })
  .then(seed)
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => { console.error('Failed to start:', err); process.exit(1); });
