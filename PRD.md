# PRD: HTML Share App — 리팩토링 v2.0

## 1. 제품 개요

### 1.1 제품 목적

AI(Gemini/LLM)가 생성한 HTML 콘텐츠를 업로드·저장·공유하는 멀티유저 웹 플랫폼.  
개인 소유권, 그룹 기반 접근 제어, 정적 HTML 컬렉션 서빙을 핵심 기능으로 제공한다.

### 1.2 목표 사용자

| 역할 | 설명 |
|---|---|
| 일반 사용자 | AI가 생성한 HTML 페이지/보고서를 업로드하고 링크로 공유 |
| 관리자(Admin) | 사용자·그룹·전체 콘텐츠 관리 |

---

## 2. 현재 기능 목록 (As-Is)

### 2.1 인증

| 기능 | 상태 |
|---|---|
| 아이디/비밀번호 로그인 | ✅ |
| JWT 토큰 발급 (24h) | ✅ |
| HttpOnly 쿠키 병행 발급 | ✅ |
| 로그아웃 | ✅ |
| 내 정보 조회 (`/api/me`) | ✅ |
| 비인증 접근 → `/login?next=` 리다이렉트 | ✅ |

### 2.2 Pages (단일 HTML 페이지)

| 기능 | 상태 |
|---|---|
| 페이지 생성 (HTML 콘텐츠 직접 입력) | ✅ |
| 페이지 편집 (EditorModal) | ✅ |
| 페이지 삭제 | ✅ |
| 게시/미게시 토글 | ✅ |
| 공개범위 설정 (private / group / public) | ✅ |
| 그룹 연결 (다대다) | ✅ |
| 슬러그 자동 생성 (nanoid) | ✅ |
| 공개 URL 서빙 (`/s/:slug`) | ✅ |
| 타일/리스트 뷰 전환 | ✅ |
| 미리보기 iframe (타일 뷰) | ✅ |
| 페이지네이션 (10개/페이지) | ✅ |
| 링크 복사 (clipboard) | ✅ |
| 소유자 필터링 (본인 + 공개 + 그룹 공유) | ✅ |

### 2.3 Collections (다중 파일 HTML 컬렉션)

| 기능 | 상태 |
|---|---|
| 컬렉션 생성 (slug, 제목, 공개범위) | ✅ |
| ZIP 파일 업로드로 초기화 | ✅ |
| ZIP 교체 (전체 파일 대체) | ✅ |
| 개별 파일 업로드 | ✅ |
| 파일 트리 조회 | ✅ |
| 텍스트 파일 인라인 편집 | ✅ |
| 파일 삭제 | ✅ |
| 새 파일 생성 (빈 파일) | ✅ |
| 컬렉션 설정 변경 (제목, entryPath, 공개범위) | ✅ |
| 컬렉션 삭제 | ✅ |
| 정적 서빙 (`/c/:slug/*`) | ✅ |
| 쿠키 기반 인증 (정적 서빙용) | ✅ |
| 그룹 연결 (다대다) | ✅ |
| 쓰레기통 이동 (`.trash/`) | ✅ |

### 2.4 사용자 관리 (Admin 전용)

| 기능 | 상태 |
|---|---|
| 사용자 목록 조회 | ✅ |
| 사용자 생성 | ✅ |
| 역할 변경 (admin / user) | ✅ |
| 비밀번호 변경 | ✅ |
| 사용자 삭제 (마지막 admin 보호) | ✅ |
| 초기 Admin 시드 | ✅ |

### 2.5 그룹 관리 (Admin 전용)

| 기능 | 상태 |
|---|---|
| 그룹 목록 조회 | ✅ |
| 그룹 생성 | ✅ |
| 그룹명 수정 | ✅ |
| 그룹 삭제 | ✅ |
| 멤버 추가 | ✅ |
| 멤버 제거 | ✅ |

### 2.6 보안

| 항목 | 상태 |
|---|---|
| ZIP slip 방지 | ✅ |
| 경로 트래버설 방지 | ✅ |
| slug/folderName 정규식 검증 | ✅ |
| bcryptjs 비밀번호 해시 | ✅ |
| SameSite=Lax 쿠키 | ✅ |
| production 환경 Secure 쿠키 | ✅ |

---

## 3. 현재 아키텍처 문제점 (Pain Points)

### 3.1 서버 (`server/index.js` — 단일 597줄 파일)

- 모델 정의, 비즈니스 로직, 라우트 핸들러, 유틸리티가 한 파일에 혼재
- 에러 처리 패턴 불일치 (일부 `try/catch` 누락)
- DB 쿼리 레이어 추상화 없음 (라우트 핸들러에서 직접 ORM 호출)
- 환경변수 검증 없음 (누락 시 사일런트 폴백)

### 3.2 클라이언트

- 인증 토큰을 `localStorage`에 저장 (XSS 취약)
- axios 요청마다 `localStorage.getItem('token')` 반복 코드
- `App.jsx`의 `ProtectedRoute`가 토큰 존재 여부만 확인 (만료 미검증)
- 모달 상태 관리가 `Dashboard.jsx`에 집중되어 있음
- CSS 인라인 스타일 과다 사용 (일관성 부족)
- `Collections.jsx`에 3개의 컴포넌트가 한 파일에 혼재
- `alert()` / `confirm()` 네이티브 다이얼로그 사용 (UX 미흡)

### 3.3 인프라

- `.env` 미검증 상태로 앱 기동
- CORS `origin: true` (모든 출처 허용)
- 업로드 파일 크기 제한은 있으나 파일 타입 검증 부재

---

## 4. 리팩토링 목표 (To-Be)

### 4.1 서버 모듈화

```
server/
├── index.js              ← 진입점 (Express 앱 설정, 미들웨어, 기동)
├── config.js             ← 환경변수 로딩·검증
├── db/
│   ├── index.js          ← Sequelize 인스턴스
│   └── models/           ← User, Group, Page, Collection + 정션 테이블
├── middleware/
│   ├── auth.js           ← requireAuth, requireAdmin, verifyToken
│   └── upload.js         ← multer 설정
├── routes/
│   ├── auth.js           ← /api/login, /api/logout, /api/me
│   ├── pages.js          ← /api/pages CRUD
│   ├── collections.js    ← /api/collections CRUD + 파일 관리
│   ├── users.js          ← /api/users CRUD
│   ├── groups.js         ← /api/groups CRUD + 멤버 관리
│   └── serve.js          ← /s/:slug, /c/:slug 정적 서빙
├── services/
│   ├── fileService.js    ← ZIP 처리, 파일 읽기/쓰기, 트리 탐색
│   └── authService.js    ← canRead, ownerOrAdmin 권한 로직
└── utils/
    └── path.js           ← isSafeRelPath, resolveInside
```

### 4.2 클라이언트 모듈화

```
client/src/
├── api/
│   └── client.js             ← axios 인스턴스 (인터셉터 포함)
├── hooks/
│   ├── useAuth.js            ← 인증 상태, 로그아웃
│   └── useApi.js             ← 공통 데이터 페칭 훅
├── components/
│   ├── ui/                   ← Button, Modal, Badge, Table, Tabs
│   ├── ConfirmDialog.jsx     ← alert/confirm 대체
│   └── EditorModal.jsx
└── pages/
    ├── Login.jsx
    ├── Dashboard.jsx
    ├── pages/                ← Pages 탭 관련 컴포넌트
    └── collections/          ← Collections 탭 관련 컴포넌트
```

### 4.3 인증 개선

- `localStorage` → **메모리 + HttpOnly 쿠키 전용** 방식으로 전환
- axios 인터셉터에서 401 → 자동 로그인 페이지 리다이렉트
- `ProtectedRoute`에서 토큰 만료 검증

### 4.4 UX 개선

- `alert()` / `confirm()` → 커스텀 `ConfirmDialog` 컴포넌트
- 로딩/에러 상태 일관된 UI 패턴 (skeleton, toast 알림)
- 반응형 레이아웃 개선

---

## 5. 데이터 모델 (변경 없음)

```
User            { id, username, passwordHash, role: admin|user }
Group           { id, name, createdBy }
UserGroup       (userId, groupId)
Page            { id, slug, title, content, isPublished, ownerId, visibility }
PageGroup       (pageId, groupId)
Collection      { id, slug, title, folderName, entryPath, visibility, isPublished, ownerId }
CollectionGroup (collectionId, groupId)
```

> 데이터 모델은 리팩토링 범위에 포함하지 않는다. 기존 DB 스키마와 완전 호환을 유지한다.

---

## 6. API 계약 (변경 없음)

기존 API 엔드포인트 경로·메서드·요청/응답 스펙은 변경하지 않는다.  
리팩토링은 내부 구현 구조만 변경한다.

| Method | Path | 인증 | 설명 |
|---|---|---|---|
| POST | `/api/login` | 없음 | 로그인 → JWT + 쿠키 |
| POST | `/api/logout` | 없음 | 쿠키 제거 |
| GET | `/api/me` | 로그인 | 현재 유저 정보 |
| GET/POST/PUT/DELETE | `/api/pages[/:id]` | 로그인 | Page CRUD |
| GET | `/s/:slug` | 조건부 | 공개 페이지 렌더 |
| GET/POST/PUT/DELETE | `/api/collections[/:id]` | 로그인 | Collection CRUD |
| GET | `/api/collections/:id/tree` | 소유자/admin | 파일 트리 |
| GET/POST/PUT/DELETE | `/api/collections/:id/files` | 소유자/admin | 파일 읽기/쓰기/삭제 |
| POST | `/api/collections/:id/replace` | 소유자/admin | ZIP으로 전체 교체 |
| GET/POST/PUT/DELETE | `/api/users[/:id]` | admin | 사용자 관리 |
| GET/POST/PUT/DELETE | `/api/groups[/:id]` | admin(쓰기) | 그룹 관리 |
| POST/DELETE | `/api/groups/:id/members[/:userId]` | admin | 멤버 추가/삭제 |
| GET | `/c/:slug/*` | 조건부 | 정적 컬렉션 서빙 |

---

## 7. 우선순위

| 순위 | 항목 | 이유 |
|---|---|---|
| P0 | 서버 라우트 모듈 분리 | 가장 큰 복잡도 감소 효과 |
| P0 | axios 인스턴스 + 인터셉터 | 클라이언트 전반 인증 코드 제거 |
| P1 | 서비스 레이어 추출 (fileService, authService) | 비즈니스 로직 테스트 가능성 확보 |
| P1 | UI 컴포넌트 분리 (Modal, Badge, Table) | 인라인 스타일 제거 및 일관성 |
| P1 | ConfirmDialog 컴포넌트 | alert/confirm 대체 |
| P2 | 환경변수 검증 (config.js) | 운영 안정성 |
| P2 | 커스텀 훅 (useAuth, useApi) | 반복 코드 제거 |
| P3 | 인증 토큰 저장 방식 개선 | 보안 강화 |

---

## 8. 비기능 요구사항

| 항목 | 요구사항 |
|---|---|
| 하위 호환성 | 기존 API 경로, DB 스키마, 환경변수 이름 유지 |
| Docker 빌드 | 리팩토링 후에도 단일 Dockerfile로 동작 |
| 점진적 적용 | 기능별로 독립 PR, 각 단계 후 동작 확인 |
| 테스트 | 핵심 서비스 레이어(fileService, authService)에 단위 테스트 추가 검토 |

---

## 9. 리팩토링 제외 범위

- DB 마이그레이션 / 스키마 변경
- 신규 기능 추가
- 기술 스택 변경 (Node/Express/React/Sequelize 유지)
- CI/CD 파이프라인 구성
