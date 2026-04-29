# HTML Share New — Plan 1: Foundation & Backend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/home/ubuntu/html-share-new`에 Next.js 15 기반 HTML 공유 플랫폼의 백엔드 전체를 구현한다 — 프로젝트 초기화, Prisma DB, Auth.js v5 인증, 파일 서비스, 전체 API Routes 포함.

**Architecture:** Pure Next.js App Router 단일 컨테이너. API Routes가 Prisma를 직접 호출하고, 컬렉션 파일은 `collections/` 바인드 마운트 파일시스템에서 스트리밍한다. middleware.ts 한 곳에서 라우트 보호를 처리한다.

**Tech Stack:** Next.js 15, TypeScript, Prisma 6 + PostgreSQL 15, Auth.js v5 (NextAuth), bcryptjs, adm-zip, nanoid, mime-types, Docker

---

## 파일 맵

```
/home/ubuntu/html-share-new/
├── prisma/
│   ├── schema.prisma          ← DB 스키마 (User, Group, Page, Collection + 정션)
│   └── seed.ts                ← Admin 초기 시드
├── lib/
│   ├── auth.ts                ← Auth.js v5 설정 (Credentials provider)
│   ├── db.ts                  ← Prisma 클라이언트 싱글톤
│   └── services/
│       ├── path-utils.ts      ← isSafeRelPath, resolveInside (ZIP slip 방지)
│       ├── auth-service.ts    ← canRead(), requireOwnerOrAdmin()
│       └── file-service.ts    ← ZIP 처리, 파일 읽기/쓰기, 트리 탐색
├── middleware.ts               ← 라우트 보호 (Auth.js)
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── pages/
│   │   │   ├── route.ts       ← GET(목록), POST(생성)
│   │   │   └── [id]/route.ts  ← GET, PUT, DELETE
│   │   ├── collections/
│   │   │   ├── route.ts       ← GET(목록), POST(생성)
│   │   │   ├── [id]/route.ts  ← GET, PUT, DELETE
│   │   │   ├── [id]/tree/route.ts
│   │   │   ├── [id]/files/route.ts
│   │   │   └── [id]/replace/route.ts
│   │   ├── users/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   └── groups/
│   │       ├── route.ts
│   │       ├── [id]/route.ts
│   │       └── [id]/members/
│   │           ├── route.ts
│   │           └── [userId]/route.ts
│   └── c/[slug]/[...path]/route.ts  ← 컬렉션 파일 스트리밍
├── Dockerfile
├── docker-compose.yml
├── .env.sample
└── next.config.ts
```

---

## Task 1: 프로젝트 초기화

**Files:**
- Create: `/home/ubuntu/html-share-new/` (npx create-next-app)
- Modify: `package.json`, `next.config.ts`, `tsconfig.json`

- [ ] **Step 1: Next.js 프로젝트 생성**

```bash
cd /home/ubuntu
npx create-next-app@latest html-share-new \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"
cd html-share-new
```

- [ ] **Step 2: 핵심 의존성 설치**

```bash
npm install \
  @auth/prisma-adapter \
  @prisma/client \
  next-auth@beta \
  bcryptjs \
  adm-zip \
  nanoid \
  mime-types \
  next-themes \
  qrcode

npm install -D \
  prisma \
  ts-node \
  @types/bcryptjs \
  @types/adm-zip \
  @types/mime-types \
  @types/qrcode \
  vitest \
  @vitejs/plugin-react \
  @vitest/coverage-v8
```

- [ ] **Step 3: next.config.ts 작성**

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },
}

export default nextConfig
```

- [ ] **Step 4: vitest.config.ts 작성**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 5: .gitignore 확인 후 collections/ 추가**

```bash
echo "collections/" >> .gitignore
echo ".env" >> .gitignore
```

- [ ] **Step 6: git 초기화 및 첫 커밋**

```bash
git init
git add -A
git commit -m "feat: initialize Next.js 15 project with TypeScript and Tailwind"
```

---

## Task 2: Prisma 스키마 & DB 설정

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `lib/db.ts`
- Create: `.env.sample`
- Create: `.env` (로컬 개발용, git 제외)

- [ ] **Step 1: Prisma 초기화**

```bash
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: prisma/schema.prisma 작성**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  admin
  user
}

enum Visibility {
  private
  group
  public
}

enum PageStatus {
  draft
  published
  archived
}

model User {
  id           String   @id @default(cuid())
  username     String   @unique
  passwordHash String
  role         Role     @default(user)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  pages       Page[]
  collections Collection[]
  groups      UserGroup[]
}

model Group {
  id        String   @id @default(cuid())
  name      String   @unique
  createdBy String
  createdAt DateTime @default(now())

  members     UserGroup[]
  pages       PageGroup[]
  collections CollectionGroup[]
}

model UserGroup {
  userId  String
  groupId String
  user    User  @relation(fields: [userId],  references: [id], onDelete: Cascade)
  group   Group @relation(fields: [groupId], references: [id], onDelete: Cascade)

  @@id([userId, groupId])
}

model Page {
  id         String     @id @default(cuid())
  slug       String     @unique
  title      String
  content    String     @db.Text
  status     PageStatus @default(draft)
  visibility Visibility @default(private)
  ownerId    String
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  owner  User        @relation(fields: [ownerId], references: [id])
  groups PageGroup[]
}

model PageGroup {
  pageId  String
  groupId String
  page    Page  @relation(fields: [pageId],  references: [id], onDelete: Cascade)
  group   Group @relation(fields: [groupId], references: [id], onDelete: Cascade)

  @@id([pageId, groupId])
}

model Collection {
  id         String     @id @default(cuid())
  slug       String     @unique
  title      String
  folderName String     @unique
  entryPath  String     @default("index.html")
  status     PageStatus @default(draft)
  visibility Visibility @default(private)
  ownerId    String
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  owner  User             @relation(fields: [ownerId], references: [id])
  groups CollectionGroup[]
}

model CollectionGroup {
  collectionId String
  groupId      String
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  group        Group      @relation(fields: [groupId],      references: [id], onDelete: Cascade)

  @@id([collectionId, groupId])
}
```

- [ ] **Step 3: lib/db.ts 작성 (Prisma 싱글톤)**

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['error'] : [] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 4: .env.sample 작성**

```bash
cat > .env.sample << 'EOF'
# App
APP_PORT=3001
NODE_ENV=production

# Auth.js
NEXTAUTH_SECRET=change-me-to-a-random-string-32-chars
NEXTAUTH_URL=http://localhost:3001

# Admin seed
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme123!

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/htmldb

# Docker DB
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=htmldb
EOF
```

- [ ] **Step 5: .env 로컬 개발용 작성 (실제값 채워넣기)**

```bash
cp .env.sample .env
# .env 파일을 열어 NEXTAUTH_SECRET, ADMIN_PASSWORD, DATABASE_URL 등 실제값 입력
# DATABASE_URL은 로컬 개발 시 localhost, Docker 환경에서는 db 호스트 사용
```

- [ ] **Step 6: prisma/seed.ts 작성**

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const username = process.env.ADMIN_USERNAME ?? 'admin'
  const password = process.env.ADMIN_PASSWORD ?? 'changeme123!'

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    console.log(`Admin user "${username}" already exists, skipping seed.`)
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)
  await prisma.user.create({
    data: { username, passwordHash, role: 'admin' },
  })
  console.log(`Admin user "${username}" created.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 7: package.json에 prisma seed 스크립트 추가**

`package.json`의 `scripts` 섹션에 추가:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:migrate": "prisma migrate dev",
    "db:seed": "npx ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed.ts",
    "db:reset": "prisma migrate reset"
  },
  "prisma": {
    "seed": "npx ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed.ts"
  }
}
```

- [ ] **Step 8: Docker DB를 먼저 실행해 마이그레이션 적용 (로컬 개발 시)**

```bash
# Docker DB가 아직 없으면 Task 10에서 생성. 있으면:
npx prisma migrate dev --name init
npx prisma generate
```

Expected output:
```
✔ Generated Prisma Client
```

- [ ] **Step 9: 커밋**

```bash
git add -A
git commit -m "feat: add Prisma schema with User, Group, Page, Collection models"
```

---

## Task 3: Auth.js v5 설정

**Files:**
- Create: `lib/auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `middleware.ts`

- [ ] **Step 1: lib/auth.ts 작성**

```typescript
// lib/auth.ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string },
        })
        if (!user) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        )
        if (!valid) return null

        return { id: user.id, name: user.username, role: user.role }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
        token.username = user.name
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      session.user.username = token.username as string
      return session
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
})
```

- [ ] **Step 2: TypeScript 타입 확장 (next-auth.d.ts)**

```typescript
// types/next-auth.d.ts
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      username: string
      role: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}
```

- [ ] **Step 3: app/api/auth/[...nextauth]/route.ts 작성**

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

- [ ] **Step 4: middleware.ts 작성**

```typescript
// middleware.ts
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // 로그인 페이지: 세션 있으면 대시보드로
  if (pathname === '/login') {
    if (session) return NextResponse.redirect(new URL('/dashboard', req.url))
    return NextResponse.next()
  }

  // 관리자 영역: admin role 필요
  if (pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL(`/login?next=${pathname}`, req.url))
    }
    if (session.user.role !== 'admin') {
      return new NextResponse('Forbidden', { status: 403 })
    }
    return NextResponse.next()
  }

  // 사용자 앱 영역: 로그인 필요
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/pages') ||
    pathname.startsWith('/collections')
  ) {
    if (!session) {
      return NextResponse.redirect(new URL(`/login?next=${pathname}`, req.url))
    }
    return NextResponse.next()
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/login',
    '/dashboard/:path*',
    '/pages/:path*',
    '/collections/:path*',
    '/admin/:path*',
  ],
}
```

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: add Auth.js v5 with Credentials provider and route middleware"
```

---

## Task 4: 핵심 서비스 레이어

**Files:**
- Create: `lib/services/path-utils.ts`
- Create: `lib/services/auth-service.ts`
- Create: `lib/services/file-service.ts`
- Create: `__tests__/services/path-utils.test.ts`
- Create: `__tests__/services/auth-service.test.ts`

- [ ] **Step 1: path-utils 실패 테스트 작성**

```typescript
// __tests__/services/path-utils.test.ts
import { describe, it, expect } from 'vitest'
import { isSafeRelPath, resolveInside } from '@/lib/services/path-utils'
import path from 'path'

describe('isSafeRelPath', () => {
  it('안전한 상대경로 허용', () => {
    expect(isSafeRelPath('index.html')).toBe(true)
    expect(isSafeRelPath('html/page.html')).toBe(true)
    expect(isSafeRelPath('css/style.css')).toBe(true)
  })

  it('.. 포함 경로 거부', () => {
    expect(isSafeRelPath('../secret.txt')).toBe(false)
    expect(isSafeRelPath('html/../../etc/passwd')).toBe(false)
  })

  it('절대경로 거부', () => {
    expect(isSafeRelPath('/etc/passwd')).toBe(false)
  })

  it('빈 문자열 거부', () => {
    expect(isSafeRelPath('')).toBe(false)
  })
})

describe('resolveInside', () => {
  it('베이스 디렉토리 내 경로 반환', () => {
    const base = '/app/collections/mysite'
    const result = resolveInside(base, 'index.html')
    expect(result).toBe(path.join(base, 'index.html'))
  })

  it('트래버설 시도 시 에러', () => {
    expect(() => resolveInside('/app/collections/mysite', '../other/file')).toThrow()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run __tests__/services/path-utils.test.ts
```
Expected: FAIL (모듈 없음)

- [ ] **Step 3: lib/services/path-utils.ts 구현**

```typescript
// lib/services/path-utils.ts
import path from 'path'

export function isSafeRelPath(relPath: string): boolean {
  if (!relPath || path.isAbsolute(relPath)) return false
  const normalized = path.normalize(relPath)
  return !normalized.startsWith('..')
}

export function resolveInside(base: string, relPath: string): string {
  const normalized = path.normalize(relPath)
  if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
    throw new Error(`Path traversal detected: ${relPath}`)
  }
  const resolved = path.resolve(base, normalized)
  if (!resolved.startsWith(path.resolve(base))) {
    throw new Error(`Path escapes base directory: ${relPath}`)
  }
  return resolved
}
```

- [ ] **Step 4: path-utils 테스트 통과 확인**

```bash
npx vitest run __tests__/services/path-utils.test.ts
```
Expected: PASS (5 tests)

- [ ] **Step 5: auth-service 실패 테스트 작성**

```typescript
// __tests__/services/auth-service.test.ts
import { describe, it, expect } from 'vitest'
import { canRead } from '@/lib/services/auth-service'

const makeCollection = (visibility: string, ownerId: string, groupIds: string[] = []) => ({
  visibility,
  ownerId,
  status: 'published',
  groups: groupIds.map((id) => ({ groupId: id })),
})

describe('canRead', () => {
  it('public 리소스는 비로그인도 접근 가능', () => {
    const col = makeCollection('public', 'user1')
    expect(canRead(col, null)).toBe(true)
  })

  it('private 리소스는 소유자만 접근 가능', () => {
    const col = makeCollection('private', 'user1')
    expect(canRead(col, { id: 'user1', role: 'user' })).toBe(true)
    expect(canRead(col, { id: 'user2', role: 'user' })).toBe(false)
    expect(canRead(col, null)).toBe(false)
  })

  it('admin은 모든 private 리소스 접근 가능', () => {
    const col = makeCollection('private', 'user1')
    expect(canRead(col, { id: 'admin1', role: 'admin' })).toBe(true)
  })

  it('group 리소스는 그룹 멤버가 접근 가능', () => {
    const col = makeCollection('group', 'user1', ['group1'])
    expect(canRead(col, { id: 'user2', role: 'user', groupIds: ['group1'] })).toBe(true)
    expect(canRead(col, { id: 'user3', role: 'user', groupIds: ['group2'] })).toBe(false)
  })
})
```

- [ ] **Step 6: auth-service 테스트 실패 확인**

```bash
npx vitest run __tests__/services/auth-service.test.ts
```
Expected: FAIL

- [ ] **Step 7: lib/services/auth-service.ts 구현**

```typescript
// lib/services/auth-service.ts
type ResourceLike = {
  visibility: string
  ownerId: string
  status: string
  groups: { groupId: string }[]
}

type UserLike = {
  id: string
  role: string
  groupIds?: string[]
} | null

export function canRead(resource: ResourceLike, user: UserLike): boolean {
  if (resource.visibility === 'public') return true
  if (!user) return false
  if (user.role === 'admin') return true
  if (resource.ownerId === user.id) return true

  if (resource.visibility === 'group') {
    const resourceGroupIds = resource.groups.map((g) => g.groupId)
    const userGroupIds = user.groupIds ?? []
    return resourceGroupIds.some((gid) => userGroupIds.includes(gid))
  }

  return false
}

export function isOwnerOrAdmin(resource: { ownerId: string }, user: UserLike): boolean {
  if (!user) return false
  return user.role === 'admin' || resource.ownerId === user.id
}
```

- [ ] **Step 8: auth-service 테스트 통과 확인**

```bash
npx vitest run __tests__/services/auth-service.test.ts
```
Expected: PASS (5 tests)

- [ ] **Step 9: lib/services/file-service.ts 구현**

```typescript
// lib/services/file-service.ts
import fs from 'fs/promises'
import path from 'path'
import AdmZip from 'adm-zip'
import { isSafeRelPath, resolveInside } from './path-utils'

const COLLECTIONS_ROOT = path.resolve(process.cwd(), 'collections')

export function collectionDir(folderName: string): string {
  return path.join(COLLECTIONS_ROOT, folderName)
}

export async function extractZip(folderName: string, buffer: Buffer): Promise<void> {
  const destDir = collectionDir(folderName)
  await fs.mkdir(destDir, { recursive: true })

  const zip = new AdmZip(buffer)
  const entries = zip.getEntries()

  for (const entry of entries) {
    if (!isSafeRelPath(entry.entryName)) continue
    const destPath = resolveInside(destDir, entry.entryName)

    if (entry.isDirectory) {
      await fs.mkdir(destPath, { recursive: true })
    } else {
      await fs.mkdir(path.dirname(destPath), { recursive: true })
      await fs.writeFile(destPath, entry.getData())
    }
  }
}

export async function deleteCollectionDir(folderName: string): Promise<void> {
  const dir = collectionDir(folderName)
  await fs.rm(dir, { recursive: true, force: true })
}

export type FileTreeNode = {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileTreeNode[]
}

export async function buildFileTree(folderName: string, subPath = ''): Promise<FileTreeNode[]> {
  const baseDir = collectionDir(folderName)
  const scanDir = subPath ? resolveInside(baseDir, subPath) : baseDir

  const entries = await fs.readdir(scanDir, { withFileTypes: true })
  const nodes: FileTreeNode[] = []

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const relPath = subPath ? `${subPath}/${entry.name}` : entry.name

    if (entry.isDirectory()) {
      const children = await buildFileTree(folderName, relPath)
      nodes.push({ name: entry.name, path: relPath, type: 'directory', children })
    } else {
      nodes.push({ name: entry.name, path: relPath, type: 'file' })
    }
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export async function readFile(folderName: string, relPath: string): Promise<string> {
  const filePath = resolveInside(collectionDir(folderName), relPath)
  return fs.readFile(filePath, 'utf-8')
}

export async function writeFile(folderName: string, relPath: string, content: string): Promise<void> {
  const filePath = resolveInside(collectionDir(folderName), relPath)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, 'utf-8')
}

export async function deleteFile(folderName: string, relPath: string): Promise<void> {
  const filePath = resolveInside(collectionDir(folderName), relPath)
  await fs.rm(filePath, { recursive: true, force: true })
}

export async function streamFile(folderName: string, relPath: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const mime = await import('mime-types')
  const filePath = resolveInside(collectionDir(folderName), relPath)
  const buffer = await fs.readFile(filePath)
  const mimeType = mime.lookup(filePath) || 'application/octet-stream'
  return { buffer, mimeType }
}
```

- [ ] **Step 10: 커밋**

```bash
git add -A
git commit -m "feat: add path-utils, auth-service, file-service with tests"
```

---

## Task 5: API 헬퍼 & 공통 유틸

**Files:**
- Create: `lib/api-helpers.ts`

- [ ] **Step 1: lib/api-helpers.ts 작성**

```typescript
// lib/api-helpers.ts
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function getSessionUser() {
  const session = await auth()
  if (!session?.user) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { groups: { select: { groupId: true } } },
  })
  if (!user) return null

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    groupIds: user.groups.map((g) => g.groupId),
  }
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export function notFound(msg = 'Not found') {
  return NextResponse.json({ error: msg }, { status: 404 })
}

export function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 })
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}
```

- [ ] **Step 2: 커밋**

```bash
git add -A
git commit -m "feat: add API helper utilities (getSessionUser, response helpers)"
```

---

## Task 6: Pages API Routes

**Files:**
- Create: `app/api/pages/route.ts`
- Create: `app/api/pages/[id]/route.ts`

- [ ] **Step 1: app/api/pages/route.ts 작성 (GET 목록, POST 생성)**

```typescript
// app/api/pages/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { canRead } from '@/lib/services/auth-service'
import { getSessionUser, unauthorized, ok, badRequest } from '@/lib/api-helpers'
import { nanoid } from 'nanoid'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const allPages = await prisma.page.findMany({
    include: { owner: { select: { id: true, username: true } }, groups: true },
    orderBy: { updatedAt: 'desc' },
  })

  const visible = allPages.filter((p) => canRead(p, user))
  return ok(visible)
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const body = await req.json()
  const { title, content, visibility = 'private', groupIds = [] } = body

  if (!title?.trim()) return badRequest('title is required')

  const slug = nanoid(10)

  const page = await prisma.page.create({
    data: {
      slug,
      title: title.trim(),
      content: content ?? '',
      visibility,
      status: 'draft',
      ownerId: user.id,
      groups: {
        create: groupIds.map((gid: string) => ({ groupId: gid })),
      },
    },
    include: { groups: true },
  })

  return ok(page, 201)
}
```

- [ ] **Step 2: app/api/pages/[id]/route.ts 작성 (GET, PUT, DELETE)**

```typescript
// app/api/pages/[id]/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { canRead, isOwnerOrAdmin } from '@/lib/services/auth-service'
import { getSessionUser, unauthorized, forbidden, notFound, ok, badRequest } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const page = await prisma.page.findUnique({
    where: { id },
    include: { owner: { select: { id: true, username: true } }, groups: true },
  })
  if (!page) return notFound()
  if (!canRead(page, user)) return forbidden()

  return ok(page)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const page = await prisma.page.findUnique({ where: { id }, include: { groups: true } })
  if (!page) return notFound()
  if (!isOwnerOrAdmin(page, user)) return forbidden()

  const body = await req.json()
  const { title, content, status, visibility, groupIds } = body

  if (title !== undefined && !title.trim()) return badRequest('title cannot be empty')

  const updated = await prisma.page.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(content !== undefined && { content }),
      ...(status !== undefined && { status }),
      ...(visibility !== undefined && { visibility }),
      ...(groupIds !== undefined && {
        groups: {
          deleteMany: {},
          create: groupIds.map((gid: string) => ({ groupId: gid })),
        },
      }),
    },
    include: { groups: true },
  })

  return ok(updated)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const page = await prisma.page.findUnique({ where: { id } })
  if (!page) return notFound()
  if (!isOwnerOrAdmin(page, user)) return forbidden()

  await prisma.page.delete({ where: { id } })
  return ok({ success: true })
}
```

- [ ] **Step 3: 커밋**

```bash
git add -A
git commit -m "feat: add Pages API routes (CRUD)"
```

---

## Task 7: Collections API Routes

**Files:**
- Create: `app/api/collections/route.ts`
- Create: `app/api/collections/[id]/route.ts`
- Create: `app/api/collections/[id]/tree/route.ts`
- Create: `app/api/collections/[id]/files/route.ts`
- Create: `app/api/collections/[id]/replace/route.ts`

- [ ] **Step 1: app/api/collections/route.ts (GET, POST)**

```typescript
// app/api/collections/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { canRead } from '@/lib/services/auth-service'
import { getSessionUser, unauthorized, ok, badRequest } from '@/lib/api-helpers'
import { nanoid } from 'nanoid'

const SLUG_RE = /^[a-z0-9_-]+$/i

export async function GET() {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const all = await prisma.collection.findMany({
    include: { owner: { select: { id: true, username: true } }, groups: true },
    orderBy: { updatedAt: 'desc' },
  })

  return ok(all.filter((c) => canRead(c, user)))
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const formData = await req.formData()
  const title = formData.get('title') as string
  const visibility = (formData.get('visibility') as string) ?? 'private'
  const entryPath = (formData.get('entryPath') as string) ?? 'index.html'
  const groupIdsRaw = formData.get('groupIds') as string
  const groupIds: string[] = groupIdsRaw ? JSON.parse(groupIdsRaw) : []
  const zipFile = formData.get('zip') as File | null

  if (!title?.trim()) return badRequest('title is required')

  const slug = nanoid(10)
  const folderName = slug

  if (!SLUG_RE.test(folderName)) return badRequest('invalid folderName')

  // ZIP 업로드 처리
  if (zipFile) {
    const { extractZip } = await import('@/lib/services/file-service')
    const buffer = Buffer.from(await zipFile.arrayBuffer())
    await extractZip(folderName, buffer)
  } else {
    const fs = await import('fs/promises')
    const path = await import('path')
    const dir = path.join(process.cwd(), 'collections', folderName)
    await fs.mkdir(dir, { recursive: true })
  }

  const collection = await prisma.collection.create({
    data: {
      slug,
      title: title.trim(),
      folderName,
      entryPath,
      visibility,
      status: 'draft',
      ownerId: user.id,
      groups: { create: groupIds.map((gid) => ({ groupId: gid })) },
    },
    include: { groups: true },
  })

  return ok(collection, 201)
}
```

- [ ] **Step 2: app/api/collections/[id]/route.ts (GET, PUT, DELETE)**

```typescript
// app/api/collections/[id]/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { canRead, isOwnerOrAdmin } from '@/lib/services/auth-service'
import { deleteCollectionDir } from '@/lib/services/file-service'
import { getSessionUser, unauthorized, forbidden, notFound, ok, badRequest } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const col = await prisma.collection.findUnique({
    where: { id },
    include: { owner: { select: { id: true, username: true } }, groups: true },
  })
  if (!col) return notFound()
  if (!canRead(col, user)) return forbidden()

  return ok(col)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const col = await prisma.collection.findUnique({ where: { id }, include: { groups: true } })
  if (!col) return notFound()
  if (!isOwnerOrAdmin(col, user)) return forbidden()

  const body = await req.json()
  const { title, entryPath, status, visibility, groupIds } = body

  if (title !== undefined && !title.trim()) return badRequest('title cannot be empty')

  const updated = await prisma.collection.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(entryPath !== undefined && { entryPath }),
      ...(status !== undefined && { status }),
      ...(visibility !== undefined && { visibility }),
      ...(groupIds !== undefined && {
        groups: {
          deleteMany: {},
          create: groupIds.map((gid: string) => ({ groupId: gid })),
        },
      }),
    },
    include: { groups: true },
  })

  return ok(updated)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const col = await prisma.collection.findUnique({ where: { id } })
  if (!col) return notFound()
  if (!isOwnerOrAdmin(col, user)) return forbidden()

  await deleteCollectionDir(col.folderName)
  await prisma.collection.delete({ where: { id } })

  return ok({ success: true })
}
```

- [ ] **Step 3: app/api/collections/[id]/tree/route.ts**

```typescript
// app/api/collections/[id]/tree/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { isOwnerOrAdmin } from '@/lib/services/auth-service'
import { buildFileTree } from '@/lib/services/file-service'
import { getSessionUser, unauthorized, forbidden, notFound, ok } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const col = await prisma.collection.findUnique({ where: { id } })
  if (!col) return notFound()
  if (!isOwnerOrAdmin(col, user)) return forbidden()

  const tree = await buildFileTree(col.folderName)
  return ok(tree)
}
```

- [ ] **Step 4: app/api/collections/[id]/files/route.ts**

```typescript
// app/api/collections/[id]/files/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { isOwnerOrAdmin } from '@/lib/services/auth-service'
import { readFile, writeFile, deleteFile } from '@/lib/services/file-service'
import { getSessionUser, unauthorized, forbidden, notFound, ok, badRequest } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

// GET: 파일 내용 읽기 (?path=html/index.html)
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const col = await prisma.collection.findUnique({ where: { id } })
  if (!col) return notFound()
  if (!isOwnerOrAdmin(col, user)) return forbidden()

  const filePath = req.nextUrl.searchParams.get('path')
  if (!filePath) return badRequest('path query param required')

  const content = await readFile(col.folderName, filePath)
  return ok({ content })
}

// POST: 파일 쓰기/생성
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const col = await prisma.collection.findUnique({ where: { id } })
  if (!col) return notFound()
  if (!isOwnerOrAdmin(col, user)) return forbidden()

  const body = await req.json()
  const { path: filePath, content } = body
  if (!filePath) return badRequest('path is required')

  await writeFile(col.folderName, filePath, content ?? '')
  return ok({ success: true })
}

// PUT: 파일 내용 업데이트
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const col = await prisma.collection.findUnique({ where: { id } })
  if (!col) return notFound()
  if (!isOwnerOrAdmin(col, user)) return forbidden()

  const body = await req.json()
  const { path: filePath, content } = body
  if (!filePath) return badRequest('path is required')

  await writeFile(col.folderName, filePath, content ?? '')
  return ok({ success: true })
}

// DELETE: 파일/디렉토리 삭제
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const col = await prisma.collection.findUnique({ where: { id } })
  if (!col) return notFound()
  if (!isOwnerOrAdmin(col, user)) return forbidden()

  const filePath = req.nextUrl.searchParams.get('path')
  if (!filePath) return badRequest('path query param required')

  await deleteFile(col.folderName, filePath)
  return ok({ success: true })
}
```

- [ ] **Step 5: app/api/collections/[id]/replace/route.ts**

```typescript
// app/api/collections/[id]/replace/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { isOwnerOrAdmin } from '@/lib/services/auth-service'
import { deleteCollectionDir, extractZip } from '@/lib/services/file-service'
import { getSessionUser, unauthorized, forbidden, notFound, ok, badRequest } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const col = await prisma.collection.findUnique({ where: { id } })
  if (!col) return notFound()
  if (!isOwnerOrAdmin(col, user)) return forbidden()

  const formData = await req.formData()
  const zipFile = formData.get('zip') as File | null
  if (!zipFile) return badRequest('zip file required')

  await deleteCollectionDir(col.folderName)
  const buffer = Buffer.from(await zipFile.arrayBuffer())
  await extractZip(col.folderName, buffer)

  return ok({ success: true })
}
```

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat: add Collections API routes (CRUD + files + replace)"
```

---

## Task 8: Users & Groups API Routes

**Files:**
- Create: `app/api/users/route.ts`
- Create: `app/api/users/[id]/route.ts`
- Create: `app/api/groups/route.ts`
- Create: `app/api/groups/[id]/route.ts`
- Create: `app/api/groups/[id]/members/route.ts`
- Create: `app/api/groups/[id]/members/[userId]/route.ts`

- [ ] **Step 1: app/api/users/route.ts (admin only)**

```typescript
// app/api/users/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { getSessionUser, unauthorized, forbidden, ok, badRequest } from '@/lib/api-helpers'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (user.role !== 'admin') return forbidden()

  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true, createdAt: true,
      _count: { select: { pages: true, collections: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return ok(users)
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (user.role !== 'admin') return forbidden()

  const { username, password, role = 'user' } = await req.json()
  if (!username?.trim() || !password) return badRequest('username and password required')

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) return badRequest('username already exists')

  const passwordHash = await bcrypt.hash(password, 10)
  const created = await prisma.user.create({
    data: { username: username.trim(), passwordHash, role },
    select: { id: true, username: true, role: true, createdAt: true },
  })
  return ok(created, 201)
}
```

- [ ] **Step 2: app/api/users/[id]/route.ts**

```typescript
// app/api/users/[id]/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { getSessionUser, unauthorized, forbidden, notFound, ok, badRequest } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (user.role !== 'admin') return forbidden()

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) return notFound()

  const { role, password } = await req.json()
  const data: Record<string, unknown> = {}

  if (role) data.role = role
  if (password) data.passwordHash = await bcrypt.hash(password, 10)

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, username: true, role: true, updatedAt: true },
  })
  return ok(updated)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (user.role !== 'admin') return forbidden()

  // 마지막 admin 보호
  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) return notFound()

  if (target.role === 'admin') {
    const adminCount = await prisma.user.count({ where: { role: 'admin' } })
    if (adminCount <= 1) return badRequest('Cannot delete the last admin')
  }

  await prisma.user.delete({ where: { id } })
  return ok({ success: true })
}
```

- [ ] **Step 3: app/api/groups/route.ts**

```typescript
// app/api/groups/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUser, unauthorized, forbidden, ok, badRequest } from '@/lib/api-helpers'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const groups = await prisma.group.findMany({
    include: { members: { include: { user: { select: { id: true, username: true } } } } },
    orderBy: { createdAt: 'asc' },
  })
  return ok(groups)
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (user.role !== 'admin') return forbidden()

  const { name } = await req.json()
  if (!name?.trim()) return badRequest('name is required')

  const existing = await prisma.group.findUnique({ where: { name } })
  if (existing) return badRequest('group name already exists')

  const group = await prisma.group.create({
    data: { name: name.trim(), createdBy: user.id },
    include: { members: true },
  })
  return ok(group, 201)
}
```

- [ ] **Step 4: app/api/groups/[id]/route.ts**

```typescript
// app/api/groups/[id]/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUser, unauthorized, forbidden, notFound, ok, badRequest } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (user.role !== 'admin') return forbidden()

  const group = await prisma.group.findUnique({ where: { id } })
  if (!group) return notFound()

  const { name } = await req.json()
  if (!name?.trim()) return badRequest('name is required')

  const updated = await prisma.group.update({ where: { id }, data: { name: name.trim() } })
  return ok(updated)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (user.role !== 'admin') return forbidden()

  const group = await prisma.group.findUnique({ where: { id } })
  if (!group) return notFound()

  await prisma.group.delete({ where: { id } })
  return ok({ success: true })
}
```

- [ ] **Step 5: app/api/groups/[id]/members/route.ts 와 [userId]/route.ts**

```typescript
// app/api/groups/[id]/members/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUser, unauthorized, forbidden, notFound, ok, badRequest } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (user.role !== 'admin') return forbidden()

  const group = await prisma.group.findUnique({ where: { id } })
  if (!group) return notFound()

  const { userId } = await req.json()
  if (!userId) return badRequest('userId is required')

  const targetUser = await prisma.user.findUnique({ where: { id: userId } })
  if (!targetUser) return notFound('user not found')

  await prisma.userGroup.upsert({
    where: { userId_groupId: { userId, groupId: id } },
    create: { userId, groupId: id },
    update: {},
  })
  return ok({ success: true }, 201)
}
```

```typescript
// app/api/groups/[id]/members/[userId]/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionUser, unauthorized, forbidden, notFound, ok } from '@/lib/api-helpers'

type Params = { params: Promise<{ id: string; userId: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id, userId } = await params
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (user.role !== 'admin') return forbidden()

  const group = await prisma.group.findUnique({ where: { id } })
  if (!group) return notFound()

  await prisma.userGroup.deleteMany({ where: { groupId: id, userId } })
  return ok({ success: true })
}
```

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat: add Users and Groups API routes (admin only)"
```

---

## Task 9: 컬렉션 파일 스트리밍 & 공개 페이지 SSR

**Files:**
- Create: `app/c/[slug]/[...path]/route.ts`
- Create: `app/s/[slug]/page.tsx` (공개 HTML SSR, Plan 2에서 UI 완성)
- Create: `app/api/me/route.ts`

- [ ] **Step 1: app/c/[slug]/[...path]/route.ts (컬렉션 파일 스트리밍)**

```typescript
// app/c/[slug]/[...path]/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { canRead } from '@/lib/services/auth-service'
import { streamFile } from '@/lib/services/file-service'

type Params = { params: Promise<{ slug: string; path: string[] }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { slug, path } = await params
  const relPath = path.join('/')

  const col = await prisma.collection.findUnique({
    where: { slug },
    include: { groups: true },
  })

  if (!col || col.status === 'archived') {
    return new Response('Not Found', { status: 404 })
  }

  // 인증 체크
  const session = await auth()
  let userForAuth: { id: string; role: string; groupIds: string[] } | null = null

  if (session?.user) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { groups: { select: { groupId: true } } },
    })
    if (dbUser) {
      userForAuth = {
        id: dbUser.id,
        role: dbUser.role,
        groupIds: dbUser.groups.map((g) => g.groupId),
      }
    }
  }

  if (!canRead(col, userForAuth)) {
    if (!session) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('next', `/c/${slug}/${relPath}`)
      return Response.redirect(loginUrl)
    }
    return new Response('Forbidden', { status: 403 })
  }

  // 경로가 없으면 entryPath로
  const filePath = relPath || col.entryPath

  try {
    const { buffer, mimeType } = await streamFile(col.folderName, filePath)
    return new Response(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'no-cache',
      },
    })
  } catch {
    return new Response('File Not Found', { status: 404 })
  }
}
```

- [ ] **Step 2: app/api/me/route.ts**

```typescript
// app/api/me/route.ts
import { prisma } from '@/lib/db'
import { getSessionUser, unauthorized, ok } from '@/lib/api-helpers'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const full = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, username: true, role: true, createdAt: true },
  })
  return ok(full)
}
```

- [ ] **Step 3: 커밋**

```bash
git add -A
git commit -m "feat: add collection file streaming and /api/me endpoint"
```

---

## Task 10: Docker 설정

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.dockerignore`

- [ ] **Step 1: Dockerfile 작성**

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

RUN mkdir -p collections && chown nextjs:nodejs collections

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
```

- [ ] **Step 2: docker-compose.yml 작성**

```yaml
# docker-compose.yml
services:
  app:
    build: .
    container_name: html-share-new-app
    restart: unless-stopped
    ports:
      - "${APP_PORT:-3001}:3000"
    env_file: .env
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      - NODE_ENV=production
    volumes:
      - ./collections:/app/collections
    depends_on:
      db:
        condition: service_healthy
    networks:
      - npm

  db:
    image: postgres:15-alpine
    container_name: html-share-new-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - npm

networks:
  npm:
    external: true

volumes:
  postgres_data:
```

- [ ] **Step 3: .dockerignore 작성**

```
node_modules
.next
.git
.env
collections/
__tests__/
*.md
```

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "feat: add Dockerfile and docker-compose.yml"
```

---

## Task 11: 빌드 & 통합 검증

- [ ] **Step 1: TypeScript 타입 체크**

```bash
npx tsc --noEmit
```
Expected: 오류 없음

- [ ] **Step 2: 전체 서비스 테스트 실행**

```bash
npx vitest run
```
Expected: PASS (path-utils 5개, auth-service 5개)

- [ ] **Step 3: Docker Compose 빌드 테스트**

```bash
# npm 네트워크가 없으면 먼저 생성
docker network create npm 2>/dev/null || true

docker compose build
```
Expected: 빌드 성공 (에러 없음)

- [ ] **Step 4: Docker Compose 실행 및 DB 마이그레이션**

```bash
docker compose up -d db
sleep 5

# 마이그레이션 실행 (컨테이너 내부)
docker compose run --rm app sh -c "npx prisma migrate deploy && npx prisma db seed"

docker compose up -d
```

- [ ] **Step 5: API 동작 확인**

```bash
# 로그인 테스트
curl -s -X POST http://localhost:3001/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"changeme123!","csrfToken":""}' | head -c 200

# 상태 확인
docker compose logs app --tail=20
```
Expected: 앱이 실행 중, DB 연결 성공 로그 확인

- [ ] **Step 6: 최종 커밋**

```bash
git add -A
git commit -m "feat: Plan 1 complete - foundation and backend API"
```

---

## 검증 체크리스트

- [ ] `npx vitest run` — 모든 테스트 통과
- [ ] `npx tsc --noEmit` — 타입 오류 없음
- [ ] `docker compose build` — 빌드 성공
- [ ] `docker compose up -d` — 컨테이너 정상 기동
- [ ] `http://localhost:3001/api/me` — 401 반환 (미인증)
- [ ] DB seed — admin 계정 생성 확인
- [ ] `/c/:slug/*` 라우트 — public 컬렉션 파일 반환
- [ ] middleware — `/dashboard` 미인증 접근 시 `/login?next=` 리다이렉트
