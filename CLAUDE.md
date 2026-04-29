# html-share-app — CLAUDE.md

## 프로젝트 개요

AI(Gemini/LLM)가 생성한 HTML을 업로드·공유하는 멀티유저 웹 앱.
사용자별 소유권, 그룹 기반 공유, 정적 HTML 컬렉션 서빙을 지원한다.

## 기술 스택

| 레이어 | 기술 |
|---|---|
| 프론트엔드 | React 19 + Vite 7, axios, react-router-dom 6, framer-motion, lucide-react |
| 백엔드 | Node.js 20, Express 4, Sequelize (PostgreSQL), jsonwebtoken, bcryptjs, multer, adm-zip, cookie-parser |
| DB | PostgreSQL 15 (Docker) |
| 배포 | Docker Compose (외부 npm 네트워크 사용, NPM 리버스 프록시 뒤에서 운영) |

## 디렉토리 구조

```
html-share-app/
├── CLAUDE.md                   ← 이 파일
├── .env                        ← 실제 비밀값 (git 제외)
├── .env.sample                 ← 환경변수 템플릿
├── Dockerfile                  ← 2단계 빌드 (client build → server runtime)
├── docker-compose.yml
├── collections/                ← HTML 컬렉션 루트 (바인드 마운트로 영속)
│   └── t2y/                    ← SK에코플랜트 T2Y 보고서 컬렉션
│       ├── index.html
│       └── html/
│           ├── 00-project-overview.html … 09-final-report.html
│           └── css/style.css
├── server/
│   ├── index.js                ← Express 서버 (단일 파일, CommonJS)
│   └── package.json
└── client/
    ├── src/
    │   ├── main.jsx            ← axios.defaults.withCredentials = true
    │   ├── App.jsx             ← ProtectedRoute, 라우트 정의
    │   ├── pages/
    │   │   ├── Login.jsx       ← 아이디 + 비밀번호 로그인, ?next= 처리
    │   │   ├── Dashboard.jsx   ← 탭: Pages / Collections / 그룹 / 사용자
    │   │   ├── Collections.jsx ← 컬렉션 CRUD + 파일 편집 모달
    │   │   ├── Groups.jsx      ← 그룹 CRUD + 멤버 관리 (admin only)
    │   │   └── Users.jsx       ← 사용자 CRUD (admin only)
    │   └── components/
    │       └── EditorModal.jsx ← Page HTML 편집기 (visibility/groupIds 지원)
    └── package.json
```

## 환경변수 (.env)

```
APP_PORT=3001            # 호스트 포트 (컨테이너 내부는 3000)
ADMIN_USERNAME=admin     # 최초 기동 시 자동 생성되는 admin 계정 이름
ADMIN_PASSWORD=...       # admin 초기 비밀번호 (bcrypt 해시로 DB에 저장됨)
JWT_SECRET=...           # JWT 서명 키 (변경 시 기존 토큰 전부 무효화)
DB_HOST=db
DB_USER=postgres
DB_PASS=...           # server/index.js에서 DB_PASS → DB_PASSWORD 순으로 읽음
DB_NAME=htmldb
POSTGRES_USER=postgres
POSTGRES_PASSWORD=...
POSTGRES_DB=htmldb
```

> **주의**: `.env`는 git에 포함되지 않는다. 신규 서버 세팅 시 `.env.sample`을 복사해 값을 채운다.

## 빌드 및 실행

### 전체 재빌드 + 재시작 (코드 변경 후)

```bash
docker compose down && docker compose build && docker compose up -d
```

### 앱만 재시작 (코드 변경 없이)

```bash
docker compose restart app
```

### 로그 확인

```bash
docker compose logs -f app
```

### 로컬 개발 (Docker 없이)

```bash
# 터미널 1: DB는 Docker로 띄운 채로
docker compose up -d db

# 터미널 2: 서버
cd server && npm install && node index.js

# 터미널 3: 클라이언트 dev server
cd client && npm install && npm run dev
```

> 로컬 개발 시 Vite(5173) → Express(3000) CORS는 이미 `cors({ origin: true, credentials: true })`로 허용됨.

## 데이터 모델

```
User        { id, username (unique), passwordHash, role: admin|user }
Group       { id, name (unique), createdBy }
UserGroup   (userId, groupId)               ← 다대다 정션
Page        { id, slug, title, content, isPublished, ownerId, visibility }
PageGroup   (pageId, groupId)               ← 다대다 정션
Collection  { id, slug, title, folderName, entryPath, visibility, isPublished, ownerId }
CollectionGroup (collectionId, groupId)     ← 다대다 정션
```

**공개범위(visibility)**
- `private` — 소유자 + admin만
- `group`   — 소유자 + 연결된 그룹 멤버 + admin (그룹은 여러 개 연결 가능)
- `public`  — 비로그인 포함 전원

> `sync({ alter: true })`로 기동 시 마이그레이션 자동 적용.
> 최초 기동 시 User 테이블이 비어있으면 `ADMIN_USERNAME`/`ADMIN_PASSWORD`로 admin 계정 1개 시드.

## 인증 흐름

1. `POST /api/login` → JWT 발급 + **HttpOnly 쿠키** `token` 설정 (24h, SameSite=Lax)
2. React axios: `Authorization: Bearer <token>` 헤더 (localStorage)
3. 정적 HTML(`/c/:slug/*`) 직접 접근: Bearer 헤더 불가 → **쿠키로 인증**
4. 비공개 컬렉션 미인증 접근 → `/login?next=<원래경로>` 리다이렉트

## 주요 API 엔드포인트

| Method | Path | 인증 | 설명 |
|---|---|---|---|
| POST | `/api/login` | 없음 | 로그인 → JWT + 쿠키 |
| POST | `/api/logout` | 없음 | 쿠키 제거 |
| GET | `/api/me` | 로그인 | 현재 유저 정보 |
| GET/POST/PUT/DELETE | `/api/pages[/:id]` | 로그인 | Page CRUD (가시성 필터) |
| GET | `/s/:slug` | 조건부 | 공개 페이지 렌더 |
| GET/POST/PUT/DELETE | `/api/collections[/:id]` | 로그인 | Collection CRUD |
| GET | `/api/collections/:id/tree` | 소유자/admin | 파일 트리 |
| GET/POST/PUT/DELETE | `/api/collections/:id/files` | 소유자/admin | 파일 읽기/쓰기/삭제 |
| POST | `/api/collections/:id/replace` | 소유자/admin | ZIP으로 전체 교체 |
| GET/POST/PUT/DELETE | `/api/users[/:id]` | admin | 사용자 관리 |
| GET/POST/PUT/DELETE | `/api/groups[/:id]` | admin(쓰기) | 그룹 관리 |
| POST/DELETE | `/api/groups/:id/members[/:userId]` | admin | 멤버 추가/삭제 |
| GET | `/c/:slug/*` | 조건부 | 정적 컬렉션 서빙 |

## 컬렉션 관리

- `collections/` 폴더는 `docker-compose.yml`에서 호스트 `./collections`를 컨테이너 `/app/collections`에 **바인드 마운트**.
- 웹 UI에서 업로드한 파일은 호스트 파일시스템에 즉시 반영되며, 컨테이너 재생성 후에도 유지된다.
- 새 컬렉션 추가: Dashboard → Collections 탭 → "새 컬렉션" → ZIP 업로드 (또는 ZIP 없이 생성 후 개별 파일 업로드).
- t2y 컬렉션: `collections/t2y/` (서브페이지 `html/*.html`, 공유 CSS `html/css/style.css`)

### 컬렉션 URL 구조

```
/c/{slug}/              → entryPath (기본 index.html)
/c/{slug}/html/00-*.html
/c/{slug}/html/css/style.css
```

## 라우트 순서 (server/index.js)

변경 시 반드시 이 순서를 지켜야 한다:
1. `express.static('../client/dist')`  ← React 빌드 정적 파일
2. `/api/*` 라우트
3. `GET /s/:slug`  ← 공개 페이지 렌더
4. `app.use('/c/:slug', ...)`  ← 컬렉션 정적 서빙
5. `app.get('*', ...)`  ← SPA catch-all (마지막)

> `/c/:slug`가 catch-all 뒤에 오면 React index.html이 내려온다.

## 보안 주의사항

- **ZIP slip**: 업로드 ZIP 엔트리에 `..` 및 절대경로 차단 (`isSafeRelPath` + `resolveInside` 헬퍼)
- **경로 트래버설**: slug/folderName `/^[a-z0-9_-]+$/i` 검증
- **SameSite=Lax**: `Strict`로 변경 시 로그인 후 `/c/...` 리다이렉트에서 쿠키 미전송 버그 발생
- **secure 쿠키**: `NODE_ENV=production`일 때만 활성화 (NPM 리버스 프록시 뒤 HTTPS 환경)
- **마지막 admin 삭제 방지**: `DELETE /api/users/:id`에서 admin 수가 1이면 거부
- **bcryptjs 사용**: alpine Docker에서 네이티브 빌드 없이 동작 (bcrypt 대신)

## 알려진 이슈 / 운영 주의사항

### DB 비밀번호 불일치 (기존 볼륨 재사용 시)
`postgres_data` 볼륨이 이미 존재하면 `docker compose down && docker compose up -d`로 DB를 재생성해도 **볼륨 안의 비밀번호는 바뀌지 않는다.**
`.env`의 `DB_PASS`를 변경하거나 초기 설정 값과 다를 때 앱이 `password authentication failed` 에러로 기동 실패한다.

**해결 방법:**
```bash
# DB 컨테이너 안에서 비밀번호를 .env 값에 맞게 재설정
DB_PASS=$(grep "^DB_PASS=" .env | cut -d'=' -f2-)
docker exec html-share-db psql -U postgres -c "ALTER USER postgres WITH PASSWORD '$DB_PASS';"
docker compose restart app
```

또는 볼륨을 완전히 초기화하려면 (데이터 삭제):
```bash
docker compose down -v   # postgres_data 볼륨까지 삭제
docker compose up -d
```

### seed 오류: visibility ENUM 타입 불일치
`sequelize.literal()`로 ENUM 컬럼에 문자열 캐스팅 시 PostgreSQL이 타입 오류를 반환한다.
`server/index.js`의 seed 함수는 `isPublished` 조건으로 두 번 나누어 `update()`를 호출하는 방식으로 수정되어 있다.

---

## 자주 쓰는 명령어

```bash
# 전체 재빌드 + 재시작
docker compose down && docker compose build && docker compose up -d

# 앱만 재시작
docker compose restart app

# 실시간 로그
docker compose logs -f app

# DB 접속
docker exec -it html-share-db psql -U postgres -d htmldb

# 컬렉션 폴더 확인
ls -la collections/
```
