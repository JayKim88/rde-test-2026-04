# RDE Advisors Engineering Test — 구현 체크리스트

> 총 3.5시간 하드 월클럭. 30분마다 의미 있는 커밋. 부분 제출 허용.

---

## Part 1 — BTS chat-first search (~55분)

**데이터 소스:** `/data/listings.json`, `/public/images/listings/`, `/public/floorplans/`

### `/` (홈페이지)
- [ ] 단일 대형 텍스트박스 ("Describe your space")
- [ ] 히어로 헤드라인
- [ ] 예시 칩 4–6개 (클릭 시 텍스트박스 prefill)
  - 예: "Tech startup in Hudson Yards", "25 people in Midtown", "10,000 SF in FiDi", "Sublease near Penn Station"
- [ ] 제출 → `/search?q=...` 라우팅
- [ ] **SSR**: 실제 `<title>`, meta description, OG 태그
- [ ] **JSON-LD**: `WebSite` + `SearchAction` schema

### `/search?q=...` (채팅형 결과)
- [ ] 첫 로드 시 서버 렌더링
- [ ] **단일 LLM 호출** (Anthropic Claude, tool use / structured output 권장)
  - 반환값 (a) 짧은 대화형 응답, (b) 구조화 필터 `{submarket, sfMin, sfMax, features, subleaseOrDirect}`
- [ ] 상단 AI 말풍선 → 결과 카운트 → 리스팅 카드 → 하단 "Refine your search…" 텍스트박스
- [ ] **실패 처리**:
  - LLM 파싱 실패 → 사용자가 refine
  - valid submarket 없음 → 전체 결과 + AI 설명
- [ ] ❌ 필터 사이드바 결과 페이지 만들지 말 것

### `/listings/[slug]` (상세 뷰)
- [ ] **Scrubbable hero media**: 드래그/화살표 키로 사진 + 플로어플랜 스크럽
- [ ] 인접 이미지 preload (스크럽 중 멈춤 없도록)
- [ ] Space & Building Details
- [ ] Floor Plan & Space Layout (SVG)
- [ ] Transit & Commute (더미 데이터 OK)
- [ ] Pricing
- [ ] "Contact broker" CTA (더미 폼 OK)
- [ ] Slug 형식: `{building-slug}-ste-{unit}-{hash}`
- [ ] Next.js metadata template 통한 리스팅별 `<title>`

### 품질 바 (측정 항목)
- [ ] **Perceived speed** (체감 속도)
- [ ] **Interaction taste** (인터랙션 완성도)
- [ ] **SEO hygiene**: `view-source` 시 콘텐츠가 **SSR'd** 되어 있어야 함 (JS shell 금지)
- [ ] **Graceful AI failure** (LLM 실패 시에도 망가지지 않음)
- [ ] Bar = "자랑하고 싶은 프로덕트" 수준, **default Tailwind 느낌 금지**

### 보너스 (선택)
- [ ] 스트리밍 AI 응답 (구조화 필터 resolve 즉시 카드 렌더, prose는 병렬 스트림)
- [ ] 동적 `/office-space/[submarket]` SEO 랜딩 페이지
- [ ] 이미지 최적화 (blur-up, AVIF/WebP, responsive `sizes`)
- [ ] `/listings` 일반 브라우즈 뷰 (시간 남으면)

---

## Part 2 — PM one-button import (~45분) — INTEGRATION HALF

**데이터 소스:** `/data/buildium_export.zip` (tenants, units, leases, charges, payments, work_orders CSV)

### 사전 작업
- [ ] **`README.md`의 "Known quirks" 섹션 먼저 읽기** (데이터 이상치 카탈로그 — import 로직 설계 전 필수)

### 스키마
- [ ] Prisma 스키마 (SQLite OK): tenants, units, leases, scheduled charges, payments, work orders
- [ ] **관계 모델링 제대로** (lease history 포함, not just current tenant per unit)
- [ ] **Accounting-aware**: charges/payments가 추후 account reference와 linkable하도록 설계
- [ ] Phase 2 GL이 additive하게 bolt on 가능하도록
- [ ] ❌ **full double-entry GL은 Part 2에서 구현하지 말 것** (스펙 명시적 스코핑 제한)
- [ ] ⚠️ Prisma 7 주의: `DATABASE_URL`은 `prisma.config.ts`에서 읽음, `schema.prisma`에 추가 금지
- [ ] ⚠️ Prisma 7 주의: 생성된 client는 `src/generated/prisma` (NOT `@prisma/client`)

### `/import` 페이지 (원버튼 경험)
- [ ] zip 업로드 또는 "Try with sample data" 버튼
- [ ] 파싱 중 **progress view**
- [ ] **Preview step** (JSON dump 금지):
  - 엔티티별 카운트
  - 탐지된 중복
  - Orphan / unmatched 레코드
  - 파싱 실패 날짜/금액 → **명시적 flag** (silent drop 금지)
- [ ] "Commit" 버튼 → 실제 DB 쓰기
- [ ] Success 화면: 카운트 + tenant list / lease list 딥링크

### 데이터 품질
- [ ] **Idempotent** (재실행 시 double-write 금지)
- [ ] 최소 2개 edge case 표면화 + `SUBMISSION.md`에 기록
- [ ] Buildium만 구현, Appfolio/Yardi는 `SUBMISSION.md`에서 phase 2로 언급

---

## Part 3 — PM dashboard (~55분) — BUILD HALF

### `/dashboard` 4개 기능
- [ ] **Rent roll**: 활성 lease 테이블 (tenant, unit, monthly rent, start/end, status: current/late/notice)
  - 정렬 가능
  - CSV export
- [ ] **AR aging**: 0–30 / 31–60 / 61–90 / 90+ days 테이블 or 차트
  - 행 클릭 → **테넌트 상세 페이지** (별도 라우트) + payment history
- [ ] **Expense chart**: stacked bar or line (repairs, utilities, taxes, insurance 등), 최근 12개월
  - import에 없으면 synthetic fill OK
- [ ] **NL query bar**: "show me all tenants with past-due rent over $5,000" 등
  - **Part 1 BTS search와 동일 패턴** (Anthropic tool use, structured output)
  - 스키마 대상 안전 쿼리
  - **가드레일**: DROP/DELETE/UPDATE/ALTER 차단
  - `SUBMISSION.md`에 방어 기법 설명

### 품질 바
- [ ] Buildium/Appfolio/Yardi 수준의 외관 (table dump 아님)
- [ ] Part 1과 디자인 일관성
- [ ] **PM 도메인 사고 반영** — "월요일 아침 실제 property manager가 하는 일" 관점
- [ ] NL 쿼리가 실제로 쓸모 있어야 함 (장난감 X)

---

## Part 4 — `SUBMISSION.md` 서술 답변 (~40분)

각 150–250단어. [FACT] / [ESTIMATE] / [OPINION] / [UNCERTAIN] 라벨 활용 가능.

> **스펙 팁**: "I don't know X, here's how I'd find out"이라고 쓰는 게 **senior signal**로 읽힘. 모르는 걸 꾸미지 말 것.

- [ ] **W1. 스크래핑 + 워터마크/브랜딩 제거** (at scale)
  - 스크래핑: 스케줄링, 변경 탐지, 안티봇(residential IP, Cloudflare, UA 로테이션, 프록시, 큐), 크로스 포털 dedup, 품질 게이트, 스택 선택
  - 미디어 파이프라인: 템플릿 매칭 + SAM2/LaMa inpainting + OCR + 품질 게이트 + human-in-loop
  - **IP/법적 리스크 명시**
  - **개인 경험 있으면 "마지막에 뭐에 물렸는지" 언급** (senior signal 유도 질문)
- [ ] **W2. Phase-2 QuickBooks 대체**
  - Day-1 스키마가 맞춰야 할 것
  - 고객이 QB 해지하려면 필요한 최소 기능 (trust accounting per state, 1099 e-filing, bank rec, month-end close, audit trail)
  - 규제 민감 → year 1에 약속하지 말 것
- [ ] **W3. AI를 search 너머로 확장**
  - Cash flow Q, rent roll export, lease renewal 예측, vendor 분석
  - 단일 에이전트 vs 특화 툴들?
  - 스키마 성장 시 안정성
  - "AI helps" vs "AI decides" 경계
- [ ] **W4. AI 플로어플랜 디자이너**
  - LLM 영역 (intent, critique) / 기하 알고리즘 (collision, packing, CSP) / UI (drag-drop, snap, export)
  - v1 / v2 / research 구분
  - 대안 프로덕트 라인 제안 OK
  - 오버프로미스 리스크
- [ ] **W5. 부트스트랩 비용 관리**
  - 10K → 100K 월 검색 가정
  - 구체적 수치 (모델 라우팅, 프롬프트 캐시 TTL/hit rate, Supabase 티어, Vercel 대역폭, self-host 경계, RAG chunk)
  - **Claude API 3대 비용 함정** (본인이 본 구체적 사례)
  - **1페이지 비용 표** 10K/50K/100K (LLM, DB, 대역폭, CDN, 이미지 처리, 기타)

### 추가 필수 섹션
- [ ] **200단어 아키텍처 개요** (non-tech 창업자용, 노 전문용어)
- [ ] **비용 프로젝션 1페이지 표** (W5에 포함)
- [ ] **Phase-2 단락** (Part 2에 — 스키마가 어떻게 books를 own하게 되는지)
- [ ] **Edge cases 단락** (Part 2에 — 표면화한 2+ 케이스)
- [ ] **NL 쿼리 가드레일 단락** (Part 3에)
- [ ] **Decisions & Tradeoffs 섹션** — **최소 5개**, 각 파일/함수 참조 포함
  - 예: "`Lease`를 별도 `LeaseHistory` 테이블로 모델링 (not row versioning) — `prisma/schema.prisma:42` 참조"
  - 제네릭 불릿 금지 ("TypeScript 썼음" 같은 것)

---

## Part 5 — Loom (~10분)

- [ ] 라이브 배포 URL 열어서 클릭스루
- [ ] 2–3개 트레이드오프 설명 (cut/kept/why)
- [ ] 1주 차에 다음으로 무엇을 빌드할지
- [ ] **🔴 필수: non-tech 창업자에게 설명** (~60초, jargon 없이)
- [ ] **🔴 필수: 코드 결정 워크스루** (~2분, 3개 결정 / 각: 선택 / 거부된 대안 / 이유)
- [ ] **🔴 필수: AI 툴 공개** (10–20초, Claude/ChatGPT/Cursor/Copilot 등)
- [ ] ❌ 코드베이스 전체 내레이션 금지

---

## 프로세스 규칙

- [ ] 3.5시간 하드 월클럭 — **rebase 금지**
- [ ] **30분마다 의미 있는 커밋** (`wip` 금지, `feat: search page renders ai bubble + cards` 형태)
- [ ] AI 툴 사용 OK — Loom에서 공개
- [ ] 서브컨트랙팅 / 페어 프로그래밍 금지
- [ ] 첫 10분 내 setup blocker → Ross에게 이메일 (클럭 일시정지)
  - 예시 blocker: Prisma migration, clone auth, anything weird
- [ ] **시작 전 clarifying questions OK** (test-send 이메일 답장) — "good signal"로 간주됨

---

## 제출 (마감 시 `ross@rdeadvisors.com` 이메일)

- [ ] GitHub 레포 URL
- [ ] **Live deploy URL** — 공개 접근 가능 (Vercel SSO / password / auth 벽 금지)
- [ ] Loom URL
- [ ] PayPal / Wise / 은행 정보 ($100)

---

## 평가 기준 요약

우선순위:
- 시간 압박 하 합리적 스코핑 (1개를 잘 vs 3개 엉망)
- **PM build + integration 50/50 동등 가중** — 어느 쪽도 punt 금지
- 데이터 모델링 판단 (특히 Part 2)
- 디자인 감각 (디자이너 없이)
- 글쓰기 (`SUBMISSION.md`, README, Loom)
- 비자명한 문제 발견 (워터마크 법적, phase-2 trust accounting, 구체적 비용 함정)
- 비기술 창업자와의 커뮤니케이션
- **오너십 시그널** — 유기적 커밋 cadence + 구체적 Decisions & Tradeoffs + Loom 설명력

덜 중요:
- 테스트 커버리지
- 완벽한 lint / CI
- 과한 픽셀 UI
