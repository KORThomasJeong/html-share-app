# HTML Share New — Plan 2: Frontend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plan 1(Foundation & Backend)이 완료된 상태에서 전체 UI를 구현한다 — shadcn/ui 기반 공통 컴포넌트, 로그인/공개 페이지, 일반 사용자 앱 영역, 관리자 영역 포함.

**Architecture:** Next.js App Router route groups: `(app)` (일반 사용자), `(admin)` (관리자), `(public)` (비로그인). shadcn/ui + Tailwind CSS + next-themes. 모든 데이터 페칭은 Server Component에서 직접 Prisma 호출 또는 Client Component에서 fetch API.

**Tech Stack:** Next.js 15, React 19, shadcn/ui, Tailwind CSS, next-themes, qrcode, CodeMirror 6, lucide-react

**전제 조건:** Plan 1의 모든 태스크가 완료되어 있어야 한다 (Prisma, Auth.js, API Routes, 서비스 레이어).

---

## 파일 맵

```
app/
├── (public)/
│   ├── layout.tsx                    ← 최소 레이아웃 (네비 없음)
│   ├── login/page.tsx                ← 로그인 폼
│   └── s/[slug]/page.tsx             ← 공개 HTML 페이지 SSR
├── (app)/
│   ├── layout.tsx                    ← 상단 AppNav + 다크모드
│   ├── dashboard/page.tsx            ← 요약 대시보드
│   ├── pages/
│   │   ├── page.tsx                  ← Pages 목록
│   │   └── [id]/page.tsx             ← 페이지 상세/편집
│   └── collections/
│       ├── page.tsx                  ← Collections 목록
│       └── [id]/page.tsx             ← 파일 트리 + 편집
├── (admin)/
│   ├── layout.tsx                    ← 좌측 사이드바 레이아웃
│   ├── admin/page.tsx                ← 통계 대시보드
│   ├── admin/users/page.tsx          ← 사용자 관리
│   ├── admin/groups/page.tsx         ← 그룹 관리
│   └── admin/content/page.tsx        ← 전체 콘텐츠
└── layout.tsx                        ← Root layout (ThemeProvider)

components/
├── providers.tsx                     ← ThemeProvider wrapper
├── theme-toggle.tsx                  ← ☀/🌙 토글 버튼
├── app/
│   ├── AppNav.tsx                    ← 상단 네비바
│   ├── PageCard.tsx                  ← 페이지 카드 (상태배지, 액션)
│   ├── CollectionCard.tsx            ← 컬렉션 카드
│   ├── PageForm.tsx                  ← 페이지 생성/편집 폼
│   ├── CollectionForm.tsx            ← 컬렉션 생성 폼
│   ├── EditorDialog.tsx              ← HTML 편집기 다이얼로그
│   ├── FileTree.tsx                  ← 파일 트리 컴포넌트
│   ├── ShareModal.tsx                ← 공유 링크 + QR코드
│   └── UploadZone.tsx                ← 드래그앤드롭 ZIP 업로드
└── admin/
    ├── AdminSidebar.tsx              ← 관리자 사이드바
    ├── UserTable.tsx                 ← 사용자 관리 테이블
    ├── UserForm.tsx                  ← 사용자 생성/편집 폼
    ├── GroupTable.tsx                ← 그룹 관리 테이블
    └── ContentTable.tsx              ← 전체 콘텐츠 테이블
```

---

## Task 1: shadcn/ui 설치 & 글로벌 레이아웃

**Files:**
- Modify: `app/layout.tsx`
- Create: `components/providers.tsx`
- Create: `components/theme-toggle.tsx`
- Create: `app/(public)/layout.tsx`

- [ ] **Step 1: shadcn/ui 초기화**

```bash
cd /home/ubuntu/html-share-new
npx shadcn@latest init
```

프롬프트 응답:
- Style: Default
- Base color: Zinc
- CSS variables: Yes

- [ ] **Step 2: 필요한 shadcn/ui 컴포넌트 일괄 설치**

```bash
npx shadcn@latest add \
  button card badge dialog alert-dialog \
  table dropdown-menu select separator \
  input label form textarea toast \
  collapsible tooltip popover \
  avatar skeleton progress tabs
```

- [ ] **Step 3: next-themes 설치**

```bash
npm install next-themes lucide-react
```

- [ ] **Step 4: components/providers.tsx 작성**

```tsx
// components/providers.tsx
'use client'

import { ThemeProvider } from 'next-themes'
import { SessionProvider } from 'next-auth/react'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </SessionProvider>
  )
}
```

- [ ] **Step 5: components/theme-toggle.tsx 작성**

```tsx
// components/theme-toggle.tsx
'use client'

import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
```

- [ ] **Step 6: app/layout.tsx (Root layout) 수정**

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HTML Share',
  description: 'Share AI-generated HTML pages and collections',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 7: Sonner 설치 (toast)**

```bash
npm install sonner
npx shadcn@latest add sonner
```

- [ ] **Step 8: app/(public)/layout.tsx 작성**

```tsx
// app/(public)/layout.tsx
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
```

- [ ] **Step 9: 커밋**

```bash
git add -A
git commit -m "feat: add shadcn/ui, next-themes, ThemeProvider, root layout"
```

---

## Task 2: 로그인 페이지

**Files:**
- Create: `app/(public)/login/page.tsx`

- [ ] **Step 1: app/(public)/login/page.tsx 작성**

```tsx
// app/(public)/login/page.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      })

      if (result?.error) {
        toast.error('아이디 또는 비밀번호가 올바르지 않습니다')
      } else {
        router.push(next)
        router.refresh()
      }
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">HTML Share</CardTitle>
          <CardDescription>계정에 로그인하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">아이디</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              로그인
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add -A
git commit -m "feat: add Login page with Auth.js Credentials sign-in"
```

---

## Task 3: 공개 HTML 페이지 렌더 (/s/[slug])

**Files:**
- Create: `app/(public)/s/[slug]/page.tsx`

- [ ] **Step 1: app/(public)/s/[slug]/page.tsx 작성**

```tsx
// app/(public)/s/[slug]/page.tsx
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { canRead } from '@/lib/services/auth-service'

type Props = { params: Promise<{ slug: string }> }

export default async function PublicPageRender({ params }: Props) {
  const { slug } = await params

  const page = await prisma.page.findUnique({
    where: { slug },
    include: { groups: true },
  })

  if (!page || page.status === 'archived') return notFound()

  const session = await auth()
  let userForAuth = null

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

  if (!canRead(page, userForAuth)) {
    if (!session) redirect(`/login?next=/s/${slug}`)
    return notFound()
  }

  // HTML 콘텐츠를 iframe sandboxed로 렌더링
  return (
    <iframe
      srcDoc={page.content}
      className="w-full h-screen border-0"
      sandbox="allow-scripts allow-same-origin"
      title={page.title}
    />
  )
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const page = await prisma.page.findUnique({ where: { slug }, select: { title: true } })
  return { title: page?.title ?? 'HTML Share' }
}
```

- [ ] **Step 2: 커밋**

```bash
git add -A
git commit -m "feat: add public HTML page renderer with sandboxed iframe"
```

---

## Task 4: AppNav & (app) Layout

**Files:**
- Create: `components/app/AppNav.tsx`
- Create: `app/(app)/layout.tsx`

- [ ] **Step 1: components/app/AppNav.tsx 작성**

```tsx
// components/app/AppNav.tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LayoutDashboard, FileText, FolderOpen, Shield, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = { href: string; label: string; icon: React.ReactNode }

const navItems: NavItem[] = [
  { href: '/dashboard', label: '대시보드', icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: '/pages', label: 'Pages', icon: <FileText className="h-4 w-4" /> },
  { href: '/collections', label: 'Collections', icon: <FolderOpen className="h-4 w-4" /> },
]

type Props = { username: string; role: string }

export function AppNav({ username, role }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-14 items-center gap-6">
        <Link href="/dashboard" className="font-bold text-lg text-blue-600 dark:text-blue-400">
          HTML Share
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <Button
              key={item.href}
              variant={pathname.startsWith(item.href) ? 'secondary' : 'ghost'}
              size="sm"
              asChild
            >
              <Link href={item.href} className="flex items-center gap-2">
                {item.icon}
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    {username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 text-sm font-medium">{username}</div>
              <DropdownMenuSeparator />
              {role === 'admin' && (
                <DropdownMenuItem onClick={() => router.push('/admin')}>
                  <Shield className="mr-2 h-4 w-4" />
                  Admin 패널
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-red-600 dark:text-red-400"
              >
                <LogOut className="mr-2 h-4 w-4" />
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: app/(app)/layout.tsx 작성**

```tsx
// app/(app)/layout.tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AppNav } from '@/components/app/AppNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="min-h-screen bg-background">
      <AppNav username={session.user.username} role={session.user.role} />
      <main className="container py-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: 커밋**

```bash
git add -A
git commit -m "feat: add AppNav and (app) layout with session check"
```

---

## Task 5: 공통 컴포넌트 — StatusBadge, ShareModal, UploadZone

**Files:**
- Create: `components/app/StatusBadge.tsx`
- Create: `components/app/ShareModal.tsx`
- Create: `components/app/UploadZone.tsx`

- [ ] **Step 1: components/app/StatusBadge.tsx 작성**

```tsx
// components/app/StatusBadge.tsx
import { Badge } from '@/components/ui/badge'

type Status = 'draft' | 'published' | 'archived'

const config: Record<Status, { label: string; variant: 'secondary' | 'default' | 'outline' }> = {
  draft:     { label: '초안', variant: 'secondary' },
  published: { label: '게시됨', variant: 'default' },
  archived:  { label: '보관됨', variant: 'outline' },
}

export function StatusBadge({ status }: { status: Status }) {
  const { label, variant } = config[status] ?? config.draft
  return <Badge variant={variant}>{label}</Badge>
}
```

- [ ] **Step 2: QR 코드 패키지 설치**

```bash
npm install qrcode
npm install -D @types/qrcode
```

- [ ] **Step 3: components/app/ShareModal.tsx 작성**

```tsx
// components/app/ShareModal.tsx
'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Copy, Check } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  url: string
  title: string
}

export function ShareModal({ open, onClose, url, title }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open && url) {
      QRCode.toDataURL(url, { width: 200, margin: 2 }).then(setQrDataUrl)
    }
  }, [open, url])

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('링크가 복사되었습니다')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>공유: {title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input readOnly value={url} className="text-sm" />
            <Button size="icon" variant="outline" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          {qrDataUrl && (
            <div className="flex justify-center">
              <img src={qrDataUrl} alt="QR Code" className="rounded border p-2" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: components/app/UploadZone.tsx 작성**

```tsx
// components/app/UploadZone.tsx
'use client'

import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Upload, FileArchive, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  onFile: (file: File) => void
  accept?: string
  label?: string
}

export function UploadZone({ onFile, accept = '.zip', label = 'ZIP 파일을 드래그하거나 클릭하세요' }: Props) {
  const [dragging, setDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFile = useCallback((file: File) => {
    setSelectedFile(file)
    onFile(file)
  }, [onFile])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-2">
      <label
        className={cn(
          'flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
          dragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
            : 'border-muted-foreground/30 hover:border-blue-400 hover:bg-muted/50',
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input type="file" accept={accept} className="hidden" onChange={onInputChange} />
        <Upload className="h-6 w-6 text-muted-foreground mb-2" />
        <span className="text-sm text-muted-foreground text-center px-4">{label}</span>
      </label>

      {selectedFile && (
        <div className="flex items-center gap-2 p-2 rounded bg-muted text-sm">
          <FileArchive className="h-4 w-4 text-blue-500 shrink-0" />
          <span className="flex-1 truncate">{selectedFile.name}</span>
          <span className="text-muted-foreground shrink-0">
            {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => setSelectedFile(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: add StatusBadge, ShareModal with QR, UploadZone components"
```

---

## Task 6: PageCard & CollectionCard

**Files:**
- Create: `components/app/PageCard.tsx`
- Create: `components/app/CollectionCard.tsx`

- [ ] **Step 1: components/app/PageCard.tsx 작성**

```tsx
// components/app/PageCard.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from './StatusBadge'
import { ShareModal } from './ShareModal'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MoreHorizontal, Share2, Pencil, Trash2, Eye } from 'lucide-react'

type Page = {
  id: string
  slug: string
  title: string
  status: 'draft' | 'published' | 'archived'
  visibility: string
  updatedAt: string
}

type Props = {
  page: Page
  isOwner: boolean
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: string) => void
}

export function PageCard({ page, isOwner, onEdit, onDelete, onStatusChange }: Props) {
  const [shareOpen, setShareOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${page.slug}`

  return (
    <>
      <Card className="group flex flex-col hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base line-clamp-2">{page.title}</CardTitle>
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(page.id)}>
                    <Pencil className="mr-2 h-4 w-4" /> 편집
                  </DropdownMenuItem>
                  {page.status === 'draft' && (
                    <DropdownMenuItem onClick={() => onStatusChange(page.id, 'published')}>
                      <Eye className="mr-2 h-4 w-4" /> 게시하기
                    </DropdownMenuItem>
                  )}
                  {page.status === 'published' && (
                    <DropdownMenuItem onClick={() => onStatusChange(page.id, 'archived')}>
                      보관하기
                    </DropdownMenuItem>
                  )}
                  {page.status === 'archived' && (
                    <DropdownMenuItem onClick={() => onStatusChange(page.id, 'draft')}>
                      초안으로 되돌리기
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteOpen(true)}
                    className="text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> 삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 pb-2">
          <StatusBadge status={page.status} />
        </CardContent>

        <CardFooter className="pt-2 gap-2">
          {page.status === 'published' && (
            <Button size="sm" variant="outline" onClick={() => setShareOpen(true)}>
              <Share2 className="mr-1 h-3 w-3" /> 공유
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {new Date(page.updatedAt).toLocaleDateString('ko-KR')}
          </span>
        </CardFooter>
      </Card>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={shareUrl}
        title={page.title}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>페이지 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{page.title}"을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(page.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

- [ ] **Step 2: components/app/CollectionCard.tsx 작성**

```tsx
// components/app/CollectionCard.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from './StatusBadge'
import { ShareModal } from './ShareModal'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MoreHorizontal, Share2, FolderOpen, Trash2, Eye } from 'lucide-react'

type Collection = {
  id: string
  slug: string
  title: string
  status: 'draft' | 'published' | 'archived'
  visibility: string
  updatedAt: string
}

type Props = {
  collection: Collection
  isOwner: boolean
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: string) => void
}

export function CollectionCard({ collection, isOwner, onDelete, onStatusChange }: Props) {
  const [shareOpen, setShareOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/c/${collection.slug}/`

  return (
    <>
      <Card className="group flex flex-col hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base line-clamp-2">{collection.title}</CardTitle>
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {collection.status === 'draft' && (
                    <DropdownMenuItem onClick={() => onStatusChange(collection.id, 'published')}>
                      <Eye className="mr-2 h-4 w-4" /> 게시하기
                    </DropdownMenuItem>
                  )}
                  {collection.status === 'published' && (
                    <DropdownMenuItem onClick={() => onStatusChange(collection.id, 'archived')}>
                      보관하기
                    </DropdownMenuItem>
                  )}
                  {collection.status === 'archived' && (
                    <DropdownMenuItem onClick={() => onStatusChange(collection.id, 'draft')}>
                      초안으로 되돌리기
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteOpen(true)}
                    className="text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> 삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 pb-2">
          <StatusBadge status={collection.status} />
        </CardContent>

        <CardFooter className="pt-2 gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href={`/collections/${collection.id}`}>
              <FolderOpen className="mr-1 h-3 w-3" /> 열기
            </Link>
          </Button>
          {collection.status === 'published' && (
            <Button size="sm" variant="outline" onClick={() => setShareOpen(true)}>
              <Share2 className="mr-1 h-3 w-3" /> 공유
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {new Date(collection.updatedAt).toLocaleDateString('ko-KR')}
          </span>
        </CardFooter>
      </Card>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={shareUrl}
        title={collection.title}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>컬렉션 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{collection.title}"을 삭제하시겠습니까? 파일도 모두 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(collection.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

- [ ] **Step 3: 커밋**

```bash
git add -A
git commit -m "feat: add PageCard and CollectionCard components"
```

---

## Task 7: Dashboard 페이지

**Files:**
- Create: `app/(app)/dashboard/page.tsx`

- [ ] **Step 1: app/(app)/dashboard/page.tsx 작성**

```tsx
// app/(app)/dashboard/page.tsx
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, FolderOpen, Globe, Lock } from 'lucide-react'

export default async function DashboardPage() {
  const session = await auth()
  const userId = session!.user.id

  const [pageCount, collectionCount, publishedPages, publishedCollections] = await Promise.all([
    prisma.page.count({ where: { ownerId: userId } }),
    prisma.collection.count({ where: { ownerId: userId } }),
    prisma.page.count({ where: { ownerId: userId, status: 'published' } }),
    prisma.collection.count({ where: { ownerId: userId, status: 'published' } }),
  ])

  const recentPages = await prisma.page.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: 'desc' },
    take: 3,
    select: { id: true, title: true, status: true, updatedAt: true },
  })

  const recentCollections = await prisma.collection.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: 'desc' },
    take: 3,
    select: { id: true, title: true, status: true, updatedAt: true },
  })

  const stats = [
    { label: '내 Pages', value: pageCount, icon: <FileText className="h-5 w-5 text-blue-500" />, href: '/pages' },
    { label: '게시된 Pages', value: publishedPages, icon: <Globe className="h-5 w-5 text-green-500" />, href: '/pages' },
    { label: '내 Collections', value: collectionCount, icon: <FolderOpen className="h-5 w-5 text-purple-500" />, href: '/collections' },
    { label: '게시된 Collections', value: publishedCollections, icon: <Globe className="h-5 w-5 text-green-500" />, href: '/collections' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">안녕하세요, {session!.user.username}님</h1>
        <p className="text-muted-foreground mt-1">HTML 페이지와 컬렉션을 관리하세요</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                {stat.icon}
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">최근 Pages</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/pages">전체 보기</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentPages.length === 0 ? (
              <p className="text-sm text-muted-foreground">페이지가 없습니다</p>
            ) : (
              recentPages.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1">
                  <span className="text-sm truncate">{p.title}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {new Date(p.updatedAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">최근 Collections</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/collections">전체 보기</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentCollections.length === 0 ? (
              <p className="text-sm text-muted-foreground">컬렉션이 없습니다</p>
            ) : (
              recentCollections.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-1">
                  <span className="text-sm truncate">{c.title}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {new Date(c.updatedAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add -A
git commit -m "feat: add Dashboard page with stats and recent items"
```

---

## Task 8: Pages 목록 & 편집 페이지

**Files:**
- Create: `app/(app)/pages/page.tsx`
- Create: `app/(app)/pages/[id]/page.tsx`
- Create: `components/app/EditorDialog.tsx`

- [ ] **Step 1: CodeMirror 설치**

```bash
npm install @codemirror/view @codemirror/state @codemirror/lang-html codemirror
```

- [ ] **Step 2: components/app/EditorDialog.tsx 작성**

```tsx
// components/app/EditorDialog.tsx
'use client'

import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { html } from '@codemirror/lang-html'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type Props = {
  open: boolean
  onClose: () => void
  initialContent: string
  onSave: (content: string) => Promise<void>
  title?: string
}

export function EditorDialog({ open, onClose, initialContent, onSave, title = '편집' }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  useEffect(() => {
    if (!open || !editorRef.current) return

    viewRef.current = new EditorView({
      doc: initialContent,
      extensions: [basicSetup, html()],
      parent: editorRef.current,
    })

    return () => {
      viewRef.current?.destroy()
      viewRef.current = null
    }
  }, [open, initialContent])

  async function handleSave() {
    const content = viewRef.current?.state.doc.toString() ?? ''
    await onSave(content)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div
          ref={editorRef}
          className="flex-1 overflow-auto border rounded-md text-sm [&_.cm-editor]:h-full [&_.cm-scroller]:overflow-auto"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button onClick={handleSave}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: app/(app)/pages/page.tsx 작성**

```tsx
// app/(app)/pages/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageCard } from '@/components/app/PageCard'
import { EditorDialog } from '@/components/app/EditorDialog'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Search } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

type Page = {
  id: string
  slug: string
  title: string
  content: string
  status: 'draft' | 'published' | 'archived'
  visibility: string
  ownerId: string
  updatedAt: string
}

export default function PagesPage() {
  const { data: session } = useSession()
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editPage, setEditPage] = useState<Page | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newVisibility, setNewVisibility] = useState('private')
  const [newContent, setNewContent] = useState('')

  const loadPages = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/pages')
    if (res.ok) setPages(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { loadPages() }, [loadPages])

  const filtered = pages.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()),
  )

  async function handleCreate() {
    const res = await fetch('/api/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, content: newContent, visibility: newVisibility }),
    })
    if (res.ok) {
      toast.success('페이지가 생성되었습니다')
      setCreateOpen(false)
      setNewTitle('')
      setNewContent('')
      setNewVisibility('private')
      loadPages()
    } else {
      toast.error('생성에 실패했습니다')
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/pages/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('페이지가 삭제되었습니다')
      loadPages()
    } else {
      toast.error('삭제에 실패했습니다')
    }
  }

  async function handleStatusChange(id: string, status: string) {
    const res = await fetch(`/api/pages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      toast.success('상태가 변경되었습니다')
      loadPages()
    }
  }

  async function handleSaveEdit(content: string) {
    if (!editPage) return
    const res = await fetch(`/api/pages/${editPage.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    if (res.ok) {
      toast.success('저장되었습니다')
      loadPages()
    } else {
      toast.error('저장에 실패했습니다')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pages</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> 새 페이지
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="페이지 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? '검색 결과가 없습니다' : '아직 페이지가 없습니다. 새 페이지를 만들어보세요!'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((page) => (
            <PageCard
              key={page.id}
              page={page}
              isOwner={page.ownerId === session?.user?.id}
              onEdit={(id) => setEditPage(pages.find((p) => p.id === id) ?? null)}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* 새 페이지 생성 다이얼로그 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 페이지 만들기</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>제목</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="페이지 제목"
              />
            </div>
            <div className="space-y-2">
              <Label>공개범위</Label>
              <Select value={newVisibility} onValueChange={setNewVisibility}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">비공개</SelectItem>
                  <SelectItem value="group">그룹 공유</SelectItem>
                  <SelectItem value="public">전체 공개</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>HTML 내용 (선택)</Label>
              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="<html>...</html>"
                rows={5}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>취소</Button>
            <Button onClick={handleCreate} disabled={!newTitle.trim()}>만들기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 편집 다이얼로그 */}
      {editPage && (
        <EditorDialog
          open={!!editPage}
          onClose={() => setEditPage(null)}
          initialContent={editPage.content}
          onSave={handleSaveEdit}
          title={`편집: ${editPage.title}`}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "feat: add Pages list page with create/edit/delete/status"
```

---

## Task 9: Collections 목록 & 파일 관리 페이지

**Files:**
- Create: `components/app/FileTree.tsx`
- Create: `app/(app)/collections/page.tsx`
- Create: `app/(app)/collections/[id]/page.tsx`

- [ ] **Step 1: components/app/FileTree.tsx 작성**

```tsx
// components/app/FileTree.tsx
'use client'

import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type TreeNode = {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: TreeNode[]
}

type Props = {
  nodes: TreeNode[]
  onSelectFile: (path: string) => void
  selectedPath?: string
  depth?: number
}

export function FileTree({ nodes, onSelectFile, selectedPath, depth = 0 }: Props) {
  return (
    <div className={cn('space-y-0.5', depth > 0 && 'ml-4')}>
      {nodes.map((node) => (
        <FileTreeNode
          key={node.path}
          node={node}
          onSelectFile={onSelectFile}
          selectedPath={selectedPath}
          depth={depth}
        />
      ))}
    </div>
  )
}

function FileTreeNode({ node, onSelectFile, selectedPath, depth }: {
  node: TreeNode
  onSelectFile: (path: string) => void
  selectedPath?: string
  depth: number
}) {
  const [open, setOpen] = useState(depth < 1)

  if (node.type === 'directory') {
    return (
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-7 px-1 font-normal text-sm"
          onClick={() => setOpen(!open)}
        >
          {open
            ? <ChevronDown className="mr-1 h-3 w-3 shrink-0" />
            : <ChevronRight className="mr-1 h-3 w-3 shrink-0" />}
          <Folder className="mr-1 h-3 w-3 shrink-0 text-blue-500" />
          <span className="truncate">{node.name}</span>
        </Button>
        {open && node.children && (
          <FileTree
            nodes={node.children}
            onSelectFile={onSelectFile}
            selectedPath={selectedPath}
            depth={depth + 1}
          />
        )}
      </div>
    )
  }

  return (
    <Button
      variant={selectedPath === node.path ? 'secondary' : 'ghost'}
      size="sm"
      className="w-full justify-start h-7 px-1 font-normal text-sm ml-4"
      onClick={() => onSelectFile(node.path)}
    >
      <File className="mr-1 h-3 w-3 shrink-0 text-muted-foreground" />
      <span className="truncate">{node.name}</span>
    </Button>
  )
}
```

- [ ] **Step 2: app/(app)/collections/page.tsx 작성**

```tsx
// app/(app)/collections/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CollectionCard } from '@/components/app/CollectionCard'
import { UploadZone } from '@/components/app/UploadZone'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Search } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'

type Collection = {
  id: string
  slug: string
  title: string
  status: 'draft' | 'published' | 'archived'
  visibility: string
  ownerId: string
  updatedAt: string
}

export default function CollectionsPage() {
  const { data: session } = useSession()
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [visibility, setVisibility] = useState('private')
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const loadCollections = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/collections')
    if (res.ok) setCollections(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { loadCollections() }, [loadCollections])

  const filtered = collections.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()),
  )

  async function handleCreate() {
    if (!title.trim()) return
    setUploading(true)
    setUploadProgress(10)

    const formData = new FormData()
    formData.append('title', title)
    formData.append('visibility', visibility)
    if (zipFile) formData.append('zip', zipFile)

    setUploadProgress(40)
    const res = await fetch('/api/collections', { method: 'POST', body: formData })
    setUploadProgress(100)

    if (res.ok) {
      toast.success('컬렉션이 생성되었습니다')
      setCreateOpen(false)
      setTitle('')
      setZipFile(null)
      setVisibility('private')
      loadCollections()
    } else {
      toast.error('생성에 실패했습니다')
    }
    setUploading(false)
    setUploadProgress(0)
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/collections/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('컬렉션이 삭제되었습니다')
      loadCollections()
    } else {
      toast.error('삭제에 실패했습니다')
    }
  }

  async function handleStatusChange(id: string, status: string) {
    const res = await fetch(`/api/collections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      toast.success('상태가 변경되었습니다')
      loadCollections()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Collections</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> 새 컬렉션
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="컬렉션 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? '검색 결과가 없습니다' : '컬렉션이 없습니다. 새 컬렉션을 만들어보세요!'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((col) => (
            <CollectionCard
              key={col.id}
              collection={col}
              isOwner={col.ownerId === session?.user?.id}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 컬렉션 만들기</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>제목</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="컬렉션 제목" />
            </div>
            <div className="space-y-2">
              <Label>공개범위</Label>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">비공개</SelectItem>
                  <SelectItem value="group">그룹 공유</SelectItem>
                  <SelectItem value="public">전체 공개</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ZIP 파일 업로드 (선택)</Label>
              <UploadZone onFile={setZipFile} />
            </div>
            {uploading && <Progress value={uploadProgress} className="h-2" />}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>취소</Button>
            <Button onClick={handleCreate} disabled={!title.trim() || uploading}>
              {uploading ? '생성 중...' : '만들기'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 3: app/(app)/collections/[id]/page.tsx 작성**

```tsx
// app/(app)/collections/[id]/page.tsx
'use client'

import { useEffect, useState, use } from 'react'
import { FileTree } from '@/components/app/FileTree'
import { EditorDialog } from '@/components/app/EditorDialog'
import { UploadZone } from '@/components/app/UploadZone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { ExternalLink, RefreshCw } from 'lucide-react'

type TreeNode = { name: string; path: string; type: 'file' | 'directory'; children?: TreeNode[] }
type Collection = { id: string; slug: string; title: string; entryPath: string; status: string }

export default function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [collection, setCollection] = useState<Collection | null>(null)
  const [tree, setTree] = useState<TreeNode[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)

  useEffect(() => {
    fetch(`/api/collections/${id}`)
      .then((r) => r.json())
      .then(setCollection)

    fetch(`/api/collections/${id}/tree`)
      .then((r) => r.json())
      .then(setTree)
  }, [id])

  async function handleSelectFile(path: string) {
    // 텍스트 파일만 편집 가능
    const textExts = ['.html', '.htm', '.css', '.js', '.json', '.txt', '.md', '.xml', '.svg']
    const isText = textExts.some((ext) => path.toLowerCase().endsWith(ext))
    if (!isText) {
      toast.info('이 파일은 편집할 수 없습니다')
      return
    }

    const res = await fetch(`/api/collections/${id}/files?path=${encodeURIComponent(path)}`)
    if (res.ok) {
      const { content } = await res.json()
      setSelectedFile(path)
      setFileContent(content)
      setEditorOpen(true)
    }
  }

  async function handleSave(content: string) {
    if (!selectedFile) return
    const res = await fetch(`/api/collections/${id}/files`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: selectedFile, content }),
    })
    if (res.ok) {
      toast.success('저장되었습니다')
    } else {
      toast.error('저장에 실패했습니다')
    }
  }

  async function handleZipReplace(file: File) {
    const formData = new FormData()
    formData.append('zip', file)
    const res = await fetch(`/api/collections/${id}/replace`, { method: 'POST', body: formData })
    if (res.ok) {
      toast.success('ZIP으로 교체되었습니다')
      const treeRes = await fetch(`/api/collections/${id}/tree`)
      setTree(await treeRes.json())
    } else {
      toast.error('교체에 실패했습니다')
    }
  }

  if (!collection) return <div className="animate-pulse h-96 bg-muted rounded-lg" />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{collection.title}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`/c/${collection.slug}/`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> 미리보기
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                파일 트리
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={async () => {
                    const res = await fetch(`/api/collections/${id}/tree`)
                    setTree(await res.json())
                  }}
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tree.length === 0 ? (
                <p className="text-sm text-muted-foreground">파일이 없습니다</p>
              ) : (
                <FileTree nodes={tree} onSelectFile={handleSelectFile} selectedPath={selectedFile ?? undefined} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">ZIP으로 전체 교체</CardTitle>
            </CardHeader>
            <CardContent>
              <UploadZone onFile={handleZipReplace} label="새 ZIP 파일을 드래그하세요" />
            </CardContent>
          </Card>
        </div>

        <Card className="flex items-center justify-center min-h-[400px]">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">좌측에서 파일을 선택하면 편집할 수 있습니다</p>
          </div>
        </Card>
      </div>

      {selectedFile && (
        <EditorDialog
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          initialContent={fileContent}
          onSave={handleSave}
          title={selectedFile}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "feat: add Collections list and detail pages with FileTree and editor"
```

---

## Task 10: Admin Layout & 사이드바

**Files:**
- Create: `components/admin/AdminSidebar.tsx`
- Create: `app/(admin)/layout.tsx`

- [ ] **Step 1: components/admin/AdminSidebar.tsx 작성**

```tsx
// components/admin/AdminSidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard, Users, Tag, FileText, ArrowLeft, LogOut, Shield,
} from 'lucide-react'

const navItems = [
  { href: '/admin', label: '대시보드', icon: <LayoutDashboard className="h-4 w-4" />, exact: true },
  { href: '/admin/users', label: '사용자 관리', icon: <Users className="h-4 w-4" /> },
  { href: '/admin/groups', label: '그룹 관리', icon: <Tag className="h-4 w-4" /> },
  { href: '/admin/content', label: '전체 콘텐츠', icon: <FileText className="h-4 w-4" /> },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <aside className="flex flex-col w-60 min-h-screen border-r bg-muted/40">
      <div className="flex items-center gap-2 px-4 h-14 border-b">
        <Shield className="h-5 w-5 text-blue-600" />
        <span className="font-bold text-sm">Admin Console</span>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Button
              key={item.href}
              variant={active ? 'secondary' : 'ghost'}
              size="sm"
              className={cn('w-full justify-start', active && 'font-medium')}
              asChild
            >
              <Link href={item.href} className="flex items-center gap-2">
                {item.icon}
                {item.label}
              </Link>
            </Button>
          )
        })}
      </nav>

      <div className="p-2 space-y-1 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={() => router.push('/dashboard')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> 내 앱으로
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOut className="mr-2 h-4 w-4" /> 로그아웃
        </Button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: app/(admin)/layout.tsx 작성**

```tsx
// app/(admin)/layout.tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'admin') redirect('/dashboard')

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-6 bg-background overflow-auto">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: 커밋**

```bash
git add -A
git commit -m "feat: add Admin layout with sidebar navigation"
```

---

## Task 11: Admin 페이지들 (대시보드, 사용자, 그룹, 콘텐츠)

**Files:**
- Create: `app/(admin)/admin/page.tsx`
- Create: `app/(admin)/admin/users/page.tsx`
- Create: `app/(admin)/admin/groups/page.tsx`
- Create: `app/(admin)/admin/content/page.tsx`

- [ ] **Step 1: app/(admin)/admin/page.tsx (통계 대시보드)**

```tsx
// app/(admin)/admin/page.tsx
import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, FileText, FolderOpen, Tag } from 'lucide-react'

export default async function AdminDashboardPage() {
  const [userCount, pageCount, collectionCount, groupCount] = await Promise.all([
    prisma.user.count(),
    prisma.page.count(),
    prisma.collection.count(),
    prisma.group.count(),
  ])

  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, username: true, role: true, createdAt: true },
  })

  const stats = [
    { label: '전체 사용자', value: userCount, icon: <Users className="h-5 w-5 text-blue-500" /> },
    { label: '전체 Pages', value: pageCount, icon: <FileText className="h-5 w-5 text-green-500" /> },
    { label: '전체 Collections', value: collectionCount, icon: <FolderOpen className="h-5 w-5 text-purple-500" /> },
    { label: '전체 그룹', value: groupCount, icon: <Tag className="h-5 w-5 text-orange-500" /> },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin 대시보드</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              {s.icon}
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">최근 가입 사용자</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-1 border-b last:border-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{u.username}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {u.role}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(u.createdAt).toLocaleDateString('ko-KR')}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: app/(admin)/admin/users/page.tsx 작성**

```tsx
// app/(admin)/admin/users/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'

type User = {
  id: string
  username: string
  role: string
  createdAt: string
  _count: { pages: number; collections: number }
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [deleteUser, setDeleteUser] = useState<User | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/users')
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role }),
    })
    if (res.ok) {
      toast.success('사용자가 생성되었습니다')
      setCreateOpen(false)
      setUsername(''); setPassword(''); setRole('user')
      load()
    } else {
      const err = await res.json()
      toast.error(err.error ?? '생성에 실패했습니다')
    }
  }

  async function handleEdit() {
    if (!editUser) return
    const body: Record<string, string> = {}
    if (role) body.role = role
    if (password) body.password = password

    const res = await fetch(`/api/users/${editUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      toast.success('수정되었습니다')
      setEditUser(null)
      load()
    } else {
      toast.error('수정에 실패했습니다')
    }
  }

  async function handleDelete() {
    if (!deleteUser) return
    const res = await fetch(`/api/users/${deleteUser.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('삭제되었습니다')
      setDeleteUser(null)
      load()
    } else {
      const err = await res.json()
      toast.error(err.error ?? '삭제에 실패했습니다')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">사용자 관리</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> 사용자 추가
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>아이디</TableHead>
              <TableHead>역할</TableHead>
              <TableHead>Pages</TableHead>
              <TableHead>Collections</TableHead>
              <TableHead>가입일</TableHead>
              <TableHead className="text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">불러오는 중...</TableCell></TableRow>
            ) : users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.username}</TableCell>
                <TableCell>
                  <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>{u.role}</Badge>
                </TableCell>
                <TableCell>{u._count.pages}</TableCell>
                <TableCell>{u._count.collections}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(u.createdAt).toLocaleDateString('ko-KR')}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => { setEditUser(u); setRole(u.role); setPassword('') }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600"
                      onClick={() => setDeleteUser(u)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>사용자 추가</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>아이디</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
            </div>
            <div className="space-y-2">
              <Label>비밀번호</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>역할</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>취소</Button>
            <Button onClick={handleCreate} disabled={!username || !password}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editUser?.username} 수정</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>역할</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>새 비밀번호 (변경 시에만 입력)</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="변경하지 않으면 비워두세요" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>취소</Button>
            <Button onClick={handleEdit}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>사용자 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteUser?.username}"을 삭제하시겠습니까? 이 사용자의 모든 데이터가 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

- [ ] **Step 3: app/(admin)/admin/groups/page.tsx 작성**

```tsx
// app/(admin)/admin/groups/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Trash2, UserPlus, UserMinus } from 'lucide-react'

type Member = { userId: string; user: { id: string; username: string } }
type Group = { id: string; name: string; createdAt: string; members: Member[] }
type User = { id: string; username: string }

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [addMemberGroupId, setAddMemberGroupId] = useState<string | null>(null)
  const [deleteGroup, setDeleteGroup] = useState<Group | null>(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')

  const load = useCallback(async () => {
    const [gRes, uRes] = await Promise.all([fetch('/api/groups'), fetch('/api/users')])
    if (gRes.ok) setGroups(await gRes.json())
    if (uRes.ok) setUsers(await uRes.json())
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newGroupName }),
    })
    if (res.ok) {
      toast.success('그룹이 생성되었습니다')
      setCreateOpen(false)
      setNewGroupName('')
      load()
    } else {
      const err = await res.json()
      toast.error(err.error ?? '생성 실패')
    }
  }

  async function handleAddMember() {
    if (!addMemberGroupId || !selectedUserId) return
    const res = await fetch(`/api/groups/${addMemberGroupId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedUserId }),
    })
    if (res.ok) {
      toast.success('멤버가 추가되었습니다')
      setAddMemberGroupId(null)
      setSelectedUserId('')
      load()
    } else {
      toast.error('추가에 실패했습니다')
    }
  }

  async function handleRemoveMember(groupId: string, userId: string) {
    const res = await fetch(`/api/groups/${groupId}/members/${userId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('멤버가 제거되었습니다')
      load()
    }
  }

  async function handleDeleteGroup() {
    if (!deleteGroup) return
    const res = await fetch(`/api/groups/${deleteGroup.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('그룹이 삭제되었습니다')
      setDeleteGroup(null)
      load()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">그룹 관리</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> 그룹 추가
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <Card key={g.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{g.name}</CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => { setAddMemberGroupId(g.id); setSelectedUserId('') }}>
                    <UserPlus className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600"
                    onClick={() => setDeleteGroup(g)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">멤버 {g.members.length}명</p>
              <div className="flex flex-wrap gap-1">
                {g.members.map((m) => (
                  <div key={m.userId} className="flex items-center gap-1 bg-muted rounded-full px-2 py-0.5">
                    <span className="text-xs">{m.user.username}</span>
                    <button
                      onClick={() => handleRemoveMember(g.id, m.userId)}
                      className="text-muted-foreground hover:text-red-600 transition-colors"
                    >
                      <UserMinus className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {g.members.length === 0 && (
                  <span className="text-xs text-muted-foreground">멤버 없음</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>그룹 추가</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>그룹명</Label>
            <Input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="그룹 이름" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>취소</Button>
            <Button onClick={handleCreate} disabled={!newGroupName.trim()}>만들기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!addMemberGroupId} onOpenChange={() => setAddMemberGroupId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>멤버 추가</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>사용자 선택</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger><SelectValue placeholder="사용자를 선택하세요" /></SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.username}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberGroupId(null)}>취소</Button>
            <Button onClick={handleAddMember} disabled={!selectedUserId}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteGroup} onOpenChange={() => setDeleteGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>그룹 삭제</AlertDialogTitle>
            <AlertDialogDescription>"{deleteGroup?.name}" 그룹을 삭제하시겠습니까?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup} className="bg-red-600 hover:bg-red-700">삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

- [ ] **Step 4: app/(admin)/admin/content/page.tsx 작성**

```tsx
// app/(admin)/admin/content/page.tsx
import { prisma } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

export default async function ContentPage() {
  const [pages, collections] = await Promise.all([
    prisma.page.findMany({
      include: { owner: { select: { username: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.collection.findMany({
      include: { owner: { select: { username: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  const statusVariant = (s: string) =>
    s === 'published' ? 'default' : s === 'archived' ? 'outline' : 'secondary'

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">전체 콘텐츠</h1>

      <Tabs defaultValue="pages">
        <TabsList>
          <TabsTrigger value="pages">Pages ({pages.length})</TabsTrigger>
          <TabsTrigger value="collections">Collections ({collections.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pages">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>제목</TableHead>
                  <TableHead>소유자</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>공개범위</TableHead>
                  <TableHead>수정일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium max-w-xs truncate">{p.title}</TableCell>
                    <TableCell>{p.owner.username}</TableCell>
                    <TableCell><Badge variant={statusVariant(p.status)}>{p.status}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{p.visibility}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(p.updatedAt).toLocaleDateString('ko-KR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="collections">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>제목</TableHead>
                  <TableHead>소유자</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>공개범위</TableHead>
                  <TableHead>수정일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium max-w-xs truncate">{c.title}</TableCell>
                    <TableCell>{c.owner.username}</TableCell>
                    <TableCell><Badge variant={statusVariant(c.status)}>{c.status}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{c.visibility}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(c.updatedAt).toLocaleDateString('ko-KR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: add all Admin pages (dashboard, users, groups, content)"
```

---

## Task 12: 루트 리다이렉트 & 최종 통합

**Files:**
- Create: `app/page.tsx` (루트 리다이렉트)
- Modify: `next.config.ts` (필요 시)

- [ ] **Step 1: app/page.tsx 작성 (루트 → 대시보드 리다이렉트)**

```tsx
// app/page.tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export default async function RootPage() {
  const session = await auth()
  if (session) redirect('/dashboard')
  redirect('/login')
}
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```
Expected: 오류 없음 (있으면 수정)

- [ ] **Step 3: 로컬 빌드 테스트**

```bash
npm run build
```
Expected: ✓ Compiled successfully

- [ ] **Step 4: Docker 전체 빌드 테스트**

```bash
docker network create npm 2>/dev/null || true
docker compose build
docker compose up -d
```

- [ ] **Step 5: DB 마이그레이션 & 시드**

```bash
docker compose run --rm app sh -c "npx prisma migrate deploy"
docker compose run --rm app sh -c "ADMIN_USERNAME=admin ADMIN_PASSWORD=changeme123! npx prisma db seed"
```

- [ ] **Step 6: 최종 통합 검증**

브라우저에서 `http://localhost:3001`을 열어 다음을 확인:

```
✅ 루트(/) → /login 리다이렉트
✅ 로그인 (admin / changeme123!) → /dashboard 리다이렉트
✅ 대시보드 통계 카드 표시
✅ /pages → 빈 목록 표시
✅ "새 페이지" → 생성 다이얼로그
✅ 페이지 생성 → 카드 표시, status=draft
✅ 페이지 "게시하기" → status=published, 공유 버튼 활성화
✅ 공유 모달 → URL + QR 코드 표시
✅ /s/:slug 공개 접근 → HTML 렌더링 (published만)
✅ /collections → 새 컬렉션 생성
✅ ZIP 업로드 → 파일 트리 표시
✅ 파일 선택 → 편집기 다이얼로그
✅ /admin → Admin 대시보드 (admin 계정만)
✅ /admin/users → 사용자 목록, CRUD
✅ /admin/groups → 그룹 목록, 멤버 추가/삭제
✅ /admin/content → Pages/Collections 전체 목록
✅ 다크모드 토글 (☀/🌙) → 전체 앱 전환
✅ 일반 사용자로 /admin 접근 → /dashboard 리다이렉트
✅ 로그아웃 → /login 리다이렉트
```

- [ ] **Step 7: 최종 커밋**

```bash
git add -A
git commit -m "feat: Plan 2 complete - full frontend implementation"
```

---

## 검증 체크리스트

- [ ] `npm run build` — 빌드 오류 없음
- [ ] `npx tsc --noEmit` — 타입 오류 없음
- [ ] `docker compose build && docker compose up -d` — 컨테이너 기동
- [ ] 로그인 → 대시보드 → Pages → Collections → Admin 전체 플로우
- [ ] 다크모드 토글 동작
- [ ] QR 코드 공유 모달 동작
- [ ] ZIP 업로드 및 파일 트리 표시
- [ ] CodeMirror 편집기 동작
- [ ] Admin 전용 라우트 보호 (일반 사용자 차단)
- [ ] `/c/:slug/*` 컬렉션 파일 스트리밍
- [ ] `/s/:slug` 공개 페이지 렌더링
