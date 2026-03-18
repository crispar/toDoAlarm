# SmartToDo

Windows 기반 스마트 ToDo & 리마인더 데스크톱 앱.

"기억을 시스템에 위임하고 실행만 하게 만드는" 생산성 도구.

## 주요 기능

- **데일리 루프** - 매일 자동 리셋되는 루틴 체크리스트 (출근 시 루틴 관리)
- **빠른 입력** - `Ctrl+Alt+T` 글로벌 단축키로 어디서든 3초 내 등록
- **리마인더 알림** - Windows Toast Notification + 스누즈(5/10/30분)
- **우선순위 관리** - High / Medium / Low 색상 구분 및 정렬
- **카테고리 필터** - 데일리 루프 / 모든 할 일 / 오늘 / 다가오는 / 완료
- **검색** - `Ctrl+F` 키워드 검색
- **시스템 트레이** - 백그라운드 상주, 더블클릭으로 복원
- **오프라인** - 로컬 SQLite DB, 인터넷 불필요

## 기술 스택

| 영역 | 기술 |
|------|------|
| Framework | Electron 41 |
| Frontend | React 19 + TypeScript 5 |
| Bundler | Vite 8 |
| Database | SQLite (better-sqlite3) |
| Notification | Electron Notification API (Windows Toast) |
| Build | electron-builder (NSIS installer + Portable exe) |

## 사전 요구사항

- **Node.js** 20 이상
- **npm** 10 이상
- **Windows** 10/11 (x64)
- **Python 3** + **Visual Studio Build Tools** (better-sqlite3 네이티브 빌드에 필요)

> Visual Studio Build Tools가 없으면 `npm install` 시 better-sqlite3 빌드가 실패합니다.
> [windows-build-tools](https://github.com/nicedoc/windows-build-tools) 또는 Visual Studio Installer에서 "C++ 빌드 도구" 워크로드를 설치하세요.

## 설치 및 실행

```bash
# 1. 저장소 클론
git clone https://github.com/crispar/toDoAlarm.git
cd toDoAlarm

# 2. 의존성 설치 (postinstall에서 네이티브 모듈 자동 빌드)
npm install

# 3. 개발 모드 실행 (Hot Reload)
npm run dev

# 4. 프로덕션 빌드
npm run build

# 5. 배포용 exe 생성
npm run dist
```

배포 파일은 `release/` 폴더에 생성됩니다:

| 파일 | 설명 |
|------|------|
| `SmartToDo Setup 1.0.0.exe` | 설치형 (NSIS installer) |
| `SmartToDo-Portable.exe` | 포터블 (설치 없이 바로 실행) |

## npm 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | Vite dev server + Electron 동시 실행 (개발 모드) |
| `npm run build` | TypeScript 컴파일 + Vite 프로덕션 빌드 |
| `npm run dist` | build + electron-builder로 exe 패키징 |
| `npm start` | 빌드된 Electron 앱 직접 실행 |

## 프로젝트 구조

```
toDoAlarm/
├── electron/                # Electron 메인 프로세스 (Node.js)
│   ├── main.ts              # 앱 엔트리, 윈도우/트레이/단축키/IPC 관리
│   ├── database.ts          # SQLite CRUD, 검색, 데일리 리셋 로직
│   ├── preload.ts           # Context Bridge (렌더러 ↔ 메인 IPC 인터페이스)
│   └── reminder.ts          # 15초 간격 리마인더 체크 서비스
│
├── src/                     # React 프론트엔드 (렌더러 프로세스)
│   ├── main.tsx             # React 엔트리
│   ├── App.tsx              # 루트 컴포넌트 (라우팅, 상태 조합)
│   ├── components/
│   │   ├── TitleBar.tsx     # 커스텀 프레임리스 타이틀바
│   │   ├── Sidebar.tsx      # 카테고리 네비게이션 + 데일리 프로그레스
│   │   ├── TodoList.tsx     # 할 일 목록 + 인라인 추가 + 데일리 완료 배너
│   │   ├── TodoItem.tsx     # 개별 항목 (체크박스, 우선순위 색상, 기한)
│   │   ├── TodoDetail.tsx   # 상세 패널 (메모, 기한, 리마인더, 스누즈)
│   │   ├── QuickAdd.tsx     # 글로벌 단축키 빠른 입력 팝업
│   │   └── SearchBar.tsx    # Ctrl+F 검색바
│   ├── hooks/
│   │   └── useTodos.ts      # ToDo 상태 관리 커스텀 훅
│   ├── types/
│   │   └── todo.ts          # TypeScript 타입 + Window API 선언
│   └── styles/
│       └── global.css       # 다크 테마 CSS
│
├── index.html               # Vite HTML 엔트리
├── vite.config.ts            # Vite 설정
├── tsconfig.json             # React (렌더러) TypeScript 설정
├── tsconfig.electron.json    # Electron (메인) TypeScript 설정
└── package.json              # 의존성, 스크립트, electron-builder 설정
```

## 아키텍처

```
┌─────────────────────────────────────────────────┐
│                  Electron Main Process           │
│                                                  │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐  │
│  │ database │  │ reminder  │  │  IPC Handler  │  │
│  │ (SQLite) │  │ (15s poll)│  │              │  │
│  └──────────┘  └───────────┘  └──────┬───────┘  │
│                                       │          │
│  Global Shortcuts ─── Quick Add Window│          │
│  System Tray ──────── Main Window     │          │
└───────────────────────────────────────┼──────────┘
                                        │ IPC (Context Bridge)
┌───────────────────────────────────────┼──────────┐
│              Renderer Process         │          │
│                                       ▼          │
│  ┌─────────────────────────────────────────────┐ │
│  │  React App                                  │ │
│  │  ┌──────────┬───────────┬────────────────┐  │ │
│  │  │ Sidebar  │ TodoList  │ TodoDetail     │  │ │
│  │  │          │           │                │  │ │
│  │  └──────────┴───────────┴────────────────┘  │ │
│  │            useTodos (상태 관리)              │ │
│  └─────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

## 데이터 모델

```typescript
Todo {
  id: string               // UUID
  title: string            // 할 일 제목
  description: string      // 상세 메모
  deadline: string | null  // 기한 (ISO 8601)
  reminder_time: string | null  // 알림 시간 (ISO 8601)
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'completed'
  category: string         // 카테고리 (기본: 'inbox')
  is_daily: number         // 데일리 루프 여부 (0 | 1)
  daily_reset_date: string | null  // 마지막 리셋 날짜 (YYYY-MM-DD)
  created_at: string       // 생성 시각
  updated_at: string       // 수정 시각
  sort_order: number       // 정렬 순서
}
```

데이터는 `%APPDATA%/todolist-alarm/smarttodo.db` (SQLite)에 저장됩니다.

## 단축키

| 단축키 | 기능 |
|--------|------|
| `Ctrl+Alt+T` | 빠른 추가 (글로벌, 어떤 앱에서든 동작) |
| `Ctrl+F` | 검색 |
| `Ctrl+1/2/3` | 빠른 추가에서 우선순위 설정 (높음/보통/낮음) |
| `Enter` | 할 일 저장 |
| `Esc` | 검색 닫기 / 빠른 추가 닫기 |

## 트러블슈팅

### `npm run dist` 후 `npm run dev`가 안 될 때

electron-builder가 네이티브 모듈을 배포용으로 교체하기 때문에 dev 모드로 돌아가려면:

```bash
npx electron-rebuild -f -w better-sqlite3
```

### better-sqlite3 빌드 실패

```bash
# Windows Build Tools 설치
npm install -g windows-build-tools

# 또는 수동으로 rebuild
npx electron-rebuild -f -w better-sqlite3
```

## 라이선스

ISC
