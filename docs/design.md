# KBO 응원가 즉시 재생 웹서비스 설계서

- 과목: 2026-2학기 스크립트프로그래밍 / 작성: 20241476 김도훈 / 작성일: 2026-11-15
- 단계: STEP 2 설계 (최종판, 설계 검토 반영)
- 기준 문서: `docs/requirements.md` (FR-01~33, NFR-01~14, BR-01~51, EX-01~31). [STEP 3-⑪] FR-29~33, BR-45~51, EX-30·31, NFR-14는 5.5절
- 검토 문서: `docs/reviews/design-review-claude.md`(R-01~28), `docs/reviews/design-review-codex.md`(C-01~18). 본문에서 검토 때문에 바뀐 곳에는 `[R-xx]`, `[C-xx]`를 붙였다. 전체 반영 내역은 15절.
- 배포: `https://kbocheer.kdhoon.me`(Cloudflare Workers 정적 자산, `wrangler.jsonc`의 `assets.directory: ./dist`, `not_found_handling: single-page-application`으로 모든 경로에 index.html을 돌려준다) [공개 배포]
- 기술 환경: React, TypeScript, Vite(포트 5173 고정, LAN 접속 허용), React Router(`react-router-dom`), YouTube IFrame Player API, YouTube Data API v3, LocalStorage, CSS

## 0. 설계 원칙과 폴더 구조

### 0.1 원칙

- 수업 범위(useState, useEffect, useRef, useReducer, Context, React Router, TypeScript) 안에서 만든다. 상태 관리 라이브러리와 UI 라이브러리는 쓰지 않는다.
- 화면과 상관없는 계산(시각 변환, URL 해석, 설명란 파싱, 후보 평가, 초성 검색, 형식 검사)은 `src/lib/`의 순수 함수로 분리한다. STEP 4에서 단위 테스트하기 쉽게 하기 위해서다.
- 외부 입력(LocalStorage, JSON 파일, API 응답)은 모두 `unknown`으로 받고 형식 검사 함수(타입 가드)를 통과한 값만 타입이 붙은 데이터로 쓴다. `any`와 검사 없는 `as` 변환은 쓰지 않는다.
- 저장하지 않아도 다시 계산할 수 있는 값(후보의 끝 시각·경고·중복, 팀별 곡 목록, 검색 결과)은 상태로 두지 않고 매 렌더링 계산한다. [C-08, C-09]
- YouTube 플레이어는 앱 전체에 하나만 만들고, 라우트가 바뀌어도 사라지지 않는 레이아웃에 둔다.
- 타이머와 플레이어 이벤트 처리기처럼 React 렌더링 밖에서 불리는 함수는 state가 아니라 ref만 읽는다. state는 화면을 그리는 데만 쓰고, 같은 값을 ref에도 함께 적는다. [R-04, C-11]
- 비동기 작업(스크립트 로드, API 요청, 플레이어 준비)이 끝났을 때는 그 작업이 아직 유효한지(취소되지 않았는지, 마지막 요청인지) 확인한 뒤에만 상태를 바꾼다. [R-05, C-02, C-12]
- 페이지의 `Referrer-Policy`를 바꾸지 않는다. Data API 키의 리퍼러 제한과 IFrame 플레이어(오류 153)가 리퍼러에 기대기 때문이다. [R-12]

### 0.2 폴더 구조

```
src/
  main.tsx                    앱 시작점
  App.tsx                     BrowserRouter, Provider, Routes
  index.css                   전체 스타일(디자인 토큰, 반응형) [디자인 개편]
  vite-env.d.ts               VITE_YOUTUBE_API_KEY 타입
  youtube-global.d.ts         window.YT, window.onYouTubeIframeAPIReady 타입 [R-12]
  types.ts                    공통 타입
  data/
    teams.ts                  10개 구단 고정 목록
    seed-songs.json           처음 데이터(내보내기 형식과 같음)
    players-2026.json         선수 기록(팀별 포지션·타석 수·사진 유무) [STEP 3-⑪]
    players.ts                선수 기록을 읽어 곡 → 선수 찾기(playerOf) [STEP 3-⑪]
  lib/
    time.ts                   시각 문자열 ↔ 초, ISO 8601 길이 변환
    youtubeUrl.ts             URL에서 영상 ID 뽑기
    chapterParser.ts          설명란 파싱, 자동 분류
    candidates.ts             후보 평가(시각 이상, 끝 시각, 이미 있음, 중복) [C-08, C-09]
    songValidation.ts         곡 형식 검사, 입력 검증
    songsFile.ts              JSON 내보내기·가져오기 형식
    storage.ts                LocalStorage 읽기·쓰기
    hangul.ts                 초성 추출
    search.ts                 곡 검색, 결과 정렬
    id.ts                     곡 ID 만들기
    env.ts                    Data API 허용 출처 목록, iOS 판별
    shortcuts.ts              단축키 → 동작, 입력 중 판별 [STEP 3-7]
    situationSlots.ts         상황 곡 → 4×2 칸 배치 [디자인 개편]
    motion.ts                 팀 전환 방향, 목록 줄 지연 [STEP 3-9], 두 팀 열의 들어올 방향 [STEP 3-⑫]
    players.ts                선수 기록 검사, 곡 ↔ 선수 연결, 사진·아바타 주소 [STEP 3-⑪], 누끼 주소·카드 둘째 줄 [STEP 3-⑫]
    matchup.ts                매치업 보드의 두 칸, 칸 바꾸기, 상황 칸 팀 [STEP 3-⑫]
    playerSort.ts             주전순·가나다·자주 튼 정렬 [STEP 3-⑪]
    history.ts                튼 횟수·최근 곡 기록, 검사 [STEP 3-⑪]
  api/
    youtubeData.ts            Data API 호출, 오류 분류
  player/
    youtubeIframe.ts          IFrame API 스크립트 로더
  context/
    NoticeContext.tsx         알림(토스트)
    PrefsContext.tsx          팀 상태, 설정
    songsReducer.ts           곡 목록 리듀서
    SongsContext.tsx          곡 목록 Context
    HistoryContext.tsx        튼 기록 Provider [STEP 3-⑪]
    historyState.ts           HistoryContext와 useHistory [STEP 3-⑪]
    PlayerContext.tsx         재생 상태, 플레이어 제어
    SituationSlotContext.ts   상황 버튼을 그릴 자리(오른쪽 열·하단 묶음) [STEP 3-7]
  hooks/
    useKeyboardShortcuts.ts   단축키
    useMediaQuery.ts          화면 폭(보드·휴대폰) 구독 [STEP 3-⑫]
  ui/
    motionTokens.ts           모션 시간·이징·스프링·거리 [STEP 3-9]
    Press.tsx                 누름 모션(TapButton, PressCell) [STEP 3-9]
  layouts/
    AppLayout.tsx, TeamLayout.tsx
  pages/
    HomeRedirect.tsx, TeamSelectPage.tsx, MainPage.tsx,
    SongListPage.tsx, SongEditPage.tsx, ImportPage.tsx, SettingsPage.tsx
  components/
    Header.tsx, TeamSheet.tsx, TeamGrid.tsx, TeamLogo.tsx, PrevTeamButton.tsx, Toast.tsx,
    PlayerPanel.tsx, PlayerHost.tsx, VolumeSlider.tsx, band.ts,
    SearchBox.tsx, SearchResults.tsx, PlayerGrid.tsx, PlayerPortrait.tsx, TeamSongList.tsx,
    SituationGrid.tsx, EmptyState.tsx, SongForm.tsx, SongRow.tsx,
    UrlInputForm.tsx, VideoSearchForm.tsx, CandidateTable.tsx, DataApiNotice.tsx,
    StatusMessage.tsx,
    TeamColumn.tsx, MatchupHeader.tsx, SituationTeamTabs.tsx, PlayerCard.tsx [STEP 3-⑫]
playerMediaPlugin.ts          개발 서버가 /players/*를 저장소 밖 사진 폴더에서 내주는 Vite 플러그인 [STEP 3-⑪]
scripts/
  optimize-logos.mjs          구단 로고 원본 → public/teams/*.webp
  optimize-avatars.mjs        기본 아바타 원본 → public/avatars/*.webp(256px) [STEP 3-⑪]
  build-deploy.mjs            npm run build:deploy: 빌드 + 사진 폴더를 dist/players로 복사 [STEP 3-⑪]
assets/avatars-original/      기본 아바타 원본 PNG 512px와 README(배포물에 넣지 않음)
public/avatars/<팀ID>.webp    기본 아바타(팀 10개, 각 5~6KB)
```

## 1. 데이터 모델

### 1.1 엔티티

| 모델 | 설명 | 저장 위치 |
| --- | --- | --- |
| Team | KBO 10개 구단. 고정 상수, 사용자가 바꾸지 않는다(BR-25) | `src/data/teams.ts` |
| Song | 곡 하나 = 영상 ID + 구간 + 응원가 시작 지점 | LocalStorage `kboCheer.songs` |
| TeamState | 현재 팀, 전 팀 | LocalStorage `kboCheer.team` |
| Settings | 볼륨, 격자 정렬 | LocalStorage `kboCheer.settings` |
| PlayerInfo | 선수 한 명의 포지션, 경기·타석 수, 사진 유무. 곡이 아니라 선수 기록이다 | 번들 `src/data/players-2026.json`(읽기 전용) [STEP 3-⑪] |
| PlayHistory | 곡별 튼 횟수와 최근 곡 id 10개 | LocalStorage `kboCheer.history` [STEP 3-⑪] |
| VideoInfo | Data API로 읽은 영상 정보 | 메모리(가져오기 화면) |
| ImportCandidate | 설명란 챕터 한 줄 = 확인 단계의 곡 후보 한 줄 | 메모리(가져오기 화면) |
| CandidateRow | 후보를 평가한 파생 값(끝 시각, 경고, 이미 있음, 중복) | 저장하지 않음, 매 렌더링 계산 [C-08, C-09] |
| NowPlaying | 재생 중인 곡 ID와 시작 당시 구간 | 메모리(PlayerContext) [R-28] |
| SongsFile | JSON 내보내기·가져오기·처음 데이터 형식 | 파일, `seed-songs.json` |

### 1.2 Song 필드

| 필드 | 타입 | 설명 | 규칙 |
| --- | --- | --- | --- |
| id | string | 곡 고유 ID | 앱 안에서 중복 없음 |
| teamId | TeamId | 소속 팀 | 10개 중 하나 |
| kind | SongKind | `player` / `team` / `situation` | |
| title | string | 선수 이름 또는 곡 제목 | 앞뒤 공백 제거 후 1~30자(BR-17) |
| videoId | string | YouTube 영상 ID | 11자 `[A-Za-z0-9_-]`, 수정 불가(BR-22) |
| videoDuration | number | 영상 길이(초) | 1 이상. 끝 시각 검증용(BR-20) |
| start | number | 시작 시각(초, 정수) | 0 ≤ start < end |
| end | number | 끝 시각(초, 정수) | end ≤ videoDuration |
| cheerStart | number \| null | 응원가 시작 지점(초) | 선수 곡만, start < cheerStart < end(BR-20, BR-21) |
| order | number | 팀 안의 등록 순서 | 팀 응원가·상황 곡 목록의 순서, 정렬·검색에서 같은 값일 때의 순서에 쓴다 |

- 시각은 모두 초 단위 정수로 저장하고, 화면에서만 `MM:SS`·`H:MM:SS`로 바꾼다. 비교와 계산을 단순하게 하기 위해서다.
- `videoDuration`을 곡마다 두는 이유: 수정 화면에서 Data API를 다시 부르지 않고 끝 시각 범위를 검사하기 위해서다(NFR-08, NFR-11).
- `order`는 등록할 때 그 팀의 가장 큰 order + 1부터 매긴다. 가져오기는 설명란 순서대로 이어 매긴다.

### 1.3 팀 고정 목록 (BR-25, FR-26, NFR-13)

| TeamId | 이름 | 전체 이름 | 대표 색 | 글자 색 | 대비 |
| --- | --- | --- | --- | --- | --- |
| kiwoom | 키움 | 키움 히어로즈 | #820024 | #FFFFFF | 10.63 |
| hanwha | 한화 | 한화 이글스 | #FF6600 | #000000 | 7.15 |
| lotte | 롯데 | 롯데 자이언츠 | #041E42 | #FFFFFF | 16.54 |
| ssg | SSG | SSG 랜더스 | #CE0E2D | #FFFFFF | 5.64 |
| doosan | 두산 | 두산 베어스 | #131230 | #FFFFFF | 18.15 |
| nc | NC | NC 다이노스 | #315288 | #FFFFFF | 7.80 |
| kia | KIA | KIA 타이거즈 | #EA0029 | #FFFFFF | 4.64 |
| lg | LG | LG 트윈스 | #C30452 | #FFFFFF | 6.07 |
| samsung | 삼성 | 삼성 라이온즈 | #074CA1 | #FFFFFF | 8.21 |
| kt | KT | KT 위즈 | #000000 | #FFFFFF | 21.00 |

- 대비는 WCAG 상대 휘도 공식으로 계산한 값이다(모두 4.5 이상). 한화 주황은 흰 글자 대비가 2.94라 검은 글자를 쓴다.
- 목록 순서는 요구사항 기본 정보에 적힌 모음 영상 순서다.

## 2. TypeScript 타입 정의

```ts
// src/types.ts

/** KBO 10개 구단 ID */
export type TeamId =
  | 'kiwoom' | 'hanwha' | 'lotte' | 'ssg' | 'doosan'
  | 'nc' | 'kia' | 'lg' | 'samsung' | 'kt';

export interface Team {
  id: TeamId;
  name: string;      // 짧은 이름(예: 한화)
  fullName: string;  // 전체 이름(예: 한화 이글스)
  color: string;     // 대표 색
  onColor: string;   // 대표 색 위 글자 색
}

/** 곡 종류: 선수 응원가 / 팀 응원가 / 상황 곡 */
export type SongKind = 'player' | 'team' | 'situation';

export interface Song {
  id: string;
  teamId: TeamId;
  kind: SongKind;
  title: string;
  videoId: string;
  videoDuration: number;
  start: number;
  end: number;
  cheerStart: number | null;
  order: number;
}

/** 새로 등록할 곡(ID와 순서는 Context가 붙인다) */
export type SongDraft = Omit<Song, 'id' | 'order'>;

/** 현재 팀과 전 팀. 현재 팀 없이 전 팀만 있는 상태는 만들 수 없다 [R-25] */
export type TeamState =
  | { currentTeamId: null; prevTeamId: null }
  | { currentTeamId: TeamId; prevTeamId: TeamId | null };

export type GridSort = 'starters' | 'name' | 'frequent';   // 주전순 / 가나다 / 자주 튼 [STEP 3-⑪]

export interface Settings {
  volume: number;     // 0~100
  gridSort: GridSort;
}

/** 선수 기록 한 명(번들 JSON을 검사해 읽는다). 곡과 이름으로 잇는다(BR-45) [STEP 3-⑪] */
export interface PlayerInfo {
  name: string;
  playerId: string;                    // KBO 선수 ID. 사진 파일 이름
  position: string | null;
  games: number | null;
  plateAppearances: number | null;     // 없으면 주전순에서 맨 아래
  photo: 'club' | 'kbo' | null;        // 사진 출처. null이면 사진 파일이 없다
  cutout: boolean;                     // 누끼 사진 유무(이번 단계는 화면에 쓰지 않음)
}

/** 튼 기록. 곡 목록과 따로 저장한다(BR-49) [STEP 3-⑪] */
export interface PlayHistory {
  counts: Record<string, number>;      // 곡 id → 튼 횟수(1 이상인 곡만)
  recent: string[];                    // 새것이 앞, 같은 id 없음, 최대 10개
}

/** Data API로 읽은 영상 정보 */
export interface VideoInfo {
  videoId: string;
  title: string;
  channelTitle: string;
  description: string;
  duration: number;        // 초(라이브 영상은 0)
  embeddable: boolean;
  ageRestricted: boolean;  // contentRating.ytRating === 'ytAgeRestricted' [R-20]
}

/** YouTube 검색 결과 한 건 */
export interface VideoSearchItem {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
}

/** 확인 단계의 곡 후보 = 설명란 타임스탬프 한 줄. 사용자가 고칠 수 있는 값만 둔다 */
export interface ImportCandidate {
  key: number;             // 설명란 순번(0부터), 후보 식별자
  lineNo: number;          // 설명란 줄 번호
  rawLine: string;         // 설명란 원문 한 줄(경고 줄에 보여 준다)
  inTeamSection: boolean;  // 마지막 구분선 뒤인지
  kind: SongKind;
  title: string;
  startText: string;       // 시작 시각 문자열. 모든 후보가 고칠 수 있다 [C-06]
  selection: 'auto' | 'on' | 'off';  // auto = 평가 결과의 기본값을 따름, on/off = 사용자가 직접 고름
}

export type CandidateWarning = 'badTime' | 'outOfRange' | 'timeReversed' | null;

/** 후보를 평가한 파생 값(저장하지 않음, 매 렌더링 계산) [C-08, C-09] */
export interface CandidateRow extends ImportCandidate {
  start: number | null;     // 해석한 시작 시각
  end: number | null;       // 계산한 끝 시각(경고 후보는 null)
  warning: CandidateWarning;
  existing: boolean;        // 같은 팀에 같은 videoId + 현재 start 곡이 있음(BR-15)
  duplicate: boolean;       // 같은 제목 상황 곡의 대표가 아님(BR-14)
  sameNamePlayer: boolean;  // 같은 팀에 같은 이름 선수 곡이 있음(BR-42) [R-15]
  titleError: string | null;
  selectable: boolean;      // warning·duplicate·titleError가 없을 때만 true
  willSave: boolean;        // selectable이고, selection이 on이거나 (auto이고 existing이 아님)
}

/** 재생 중인 곡: ID와 재생을 시작한 순간의 구간만 둔다 [R-28] */
export interface NowPlaying {
  songId: string;
  videoId: string;
  start: number;
  end: number;
}

/** JSON 내보내기·가져오기·처음 데이터 공통 형식 */
export interface SongsFile {
  format: 'kbo-cheer-songs';
  version: 1;
  exportedAt: string;    // ISO 8601
  songs: Song[];
}
```

```ts
// src/youtube-global.d.ts  [R-12]
// @types/youtube는 YT 네임스페이스만 선언하고 window 속성은 선언하지 않는다
interface Window {
  YT?: typeof YT;
  onYouTubeIframeAPIReady?: () => void;
}
```

- `Song`을 선수 곡과 나머지로 나누는 구분 유니온(`kind: 'player'`일 때만 cheerStart 허용)은 쓰지 않는다. 폼·리듀서·검사 코드가 모든 곳에서 두 갈래로 나뉘어 길어지는 데 비해, BR-21은 `isSong`과 `updateSong` 두 곳의 런타임 검사로 충분히 지켜지기 때문이다. [R-25]

## 3. LocalStorage 처리 설계

### 3.1 저장 키와 형식

| 키 | 값 형식 | 없을 때 | 깨졌을 때 |
| --- | --- | --- | --- |
| `kboCheer.songs` | `{ "version": 1, "songs": Song[] }` | 처음 데이터로 시작(알림 없음) | 원래 문자열을 `kboCheer.songs.broken`에 옮긴 뒤 처음 데이터로 복구, "저장 데이터가 손상되어 초기화했습니다" 1회 알림(EX-14) [R-16] |
| `kboCheer.team` | `{ "version": 1, "currentTeamId": TeamId \| null, "prevTeamId": TeamId \| null }` | 둘 다 null → 팀 선택 화면(BR-28) | 둘 다 null로 시작 |
| `kboCheer.settings` | `{ "version": 1, "volume": number, "gridSort": GridSort }` | 기본값 `{ volume: 100, gridSort: 'starters' }` | 볼륨이 틀렸거나 version이 다르면 기본값으로 시작. 정렬만 알 수 없는 값('chapter' 포함)이면 정렬만 기본값으로 읽고 볼륨은 지킨다 [STEP 3-⑪] |
| `kboCheer.history` | `{ "version": 1, "counts": { [songId]: number }, "recent": string[] }` | 빈 기록 | 빈 기록으로 시작(알림 없음). 구조는 맞고 항목만 틀리면 그 항목만 버린다 [STEP 3-⑪] |

- [STEP 3-⑪] 예전 정렬 값 'chapter'는 값 하나가 사라진 것이지 형식이 바뀐 것이 아니라 version을 올리지 않는다. 설정은 version 1 그대로 두고 `gridSort`를 읽을 때만 `parseGridSort(unknown)`으로 허용 값 세 가지 밖이면 기본값으로 바꾼다(처음에는 값 하나가 틀리면 설정 전체를 기본값으로 돌렸는데, 이러면 볼륨을 잃는다). 튼 기록(`kboCheer.history`)은 곡 목록과 키가 달라 JSON 가져오기·처음 데이터로 되돌리기(`kboCheer.songs`만 바꿈)가 기록을 지우지 않는다.
- 키를 넷으로 나눈 이유: 설정 값 하나가 깨져도 곡 목록까지 초기화되지 않게 하고, 자주 바뀌는 팀 상태를 저장할 때 곡 목록 전체(약 600곡)를 다시 쓰지 않기 위해서다.
- `version`은 지금 1뿐이다. 읽은 값의 version이 1이 아니면 깨진 데이터로 본다. 나중에 형식을 바꾸면 version 2를 만들고 `migrate(v1 → v2)` 함수를 이 자리에 넣는다.
- `kboCheer.songs.broken`은 사용자 기능이 아니라 데이터 보호용 사본이다. 한 번만 쓰고(이미 있으면 덮어쓰지 않음) 앱은 읽지 않는다. 곡 하나가 깨져 전체를 복구하더라도, 원래 값을 개발자 도구에서 되살릴 수 있게 하기 위해서다. [R-16]

### 3.2 storage.ts 함수

```ts
type LoadStatus = 'ok' | 'missing' | 'corrupt' | 'unavailable';   // [R-19]
type LoadResult<T> = { value: T; status: LoadStatus };

function loadSongs(seed: Song[]): LoadResult<Song[]>;
function saveSongs(songs: Song[]): boolean;          // 실패하면 false(EX-15)
function loadTeamState(): LoadResult<TeamState>;
function saveTeamState(state: TeamState): boolean;
function loadSettings(): LoadResult<Settings>;
function saveSettings(settings: Settings): boolean;
function loadHistory(): LoadResult<PlayHistory>;     // [STEP 3-⑪]
function saveHistory(history: PlayHistory): boolean;
```

읽기 순서(의사코드):

```
loadSongs(seed):
  try raw = localStorage.getItem('kboCheer.songs')
  catch → { value: seed, status: 'unavailable' }      // 저장소 접근 자체가 막힘 [R-19]
  if raw === null → { value: seed, status: 'missing' }
  try data: unknown = JSON.parse(raw)
  catch → backupBroken(raw); { value: seed, status: 'corrupt' }
  if !(isObject(data) && data.version === 1 && isSongArray(data.songs))
    → backupBroken(raw); { value: seed, status: 'corrupt' }
  → { value: data.songs, status: 'ok' }
```

- `isSongArray`는 배열의 모든 원소가 `isSong`을 통과하고 id가 서로 겹치지 않을 때만 true다. 하나라도 틀리면 전체를 깨진 데이터로 본다(EX-14 그대로).
- `isSong(x: unknown): x is Song`은 1.2절 규칙을 모두 검사한다: 문자열·정수 타입, teamId·kind 값 범위, title 길이, videoId 형식, `0 ≤ start < end ≤ videoDuration`, cheerStart는 null이거나 선수 곡이고 `start < cheerStart < end`.
- status별 알림: corrupt → EX-14 문구, unavailable → "이 브라우저에서는 저장할 수 없어 새로고침하면 바뀐 내용이 사라집니다"(EX-15). [R-19]
- 쓰기는 `try { setItem } catch { return false }`. false면 Provider가 EX-15 알림을 띄운다. 같은 알림이 계속 뜨지 않게, 저장이 다시 성공할 때까지는 한 번만 띄운다. 화면 상태는 그대로 둔다. [STEP 4-2, K-03] 팀·설정(PrefsProvider)도 같은 규칙으로 "설정을 저장하지 못했습니다. 새로고침하면 팀·볼륨·정렬이 이전 값으로 돌아갈 수 있습니다"를 알린다. 저장소를 아예 못 쓰는(unavailable) 경우는 곡 목록 쪽 알림 하나로 충분해 다시 알리지 않는다.

### 3.3 React 상태와 LocalStorage의 일관성

- 읽기: Provider가 `useReducer`·`useState`의 지연 초기화 함수에서 한 번만 읽는다(수업 LocalStorage 예제와 같은 방식). 첫 렌더링부터 저장된 값으로 그린다.
- 쓰기: `useEffect(() => saveSongs(songs), [songs])`처럼 상태가 바뀔 때마다 저장한다. 상태가 원본, LocalStorage는 사본이다. 컴포넌트는 LocalStorage를 직접 읽거나 쓰지 않는다.
- 결과: 등록·수정·삭제·팀 전환·설정 변경이 모두 같은 경로로 저장된다(NFR-05).
- 알려진 한계 1: 한 탭에서 쓰는 것을 전제로 한다. 탭 두 개에서 함께 쓰면 나중에 저장한 탭의 목록이 앞의 변경을 덮어쓴다. 다른 탭의 변경을 받아들이는 처리(`storage` 이벤트)는 만들지 않는다. [R-17, C-18]
- 알려진 한계 2: LocalStorage는 접속 주소(출처)마다 따로다. `https://kbocheer.kdhoon.me`, `localhost:5173`, `127.0.0.1:5173`, 노트북 LAN 주소는 모두 다른 저장소이고, 같은 공개 주소라도 기기·브라우저마다 따로다. 설정 화면에 지금 출처를 보여 주고 안내한다(BR-44, 5.2). [R-08]

### 3.4 JSON 파일 형식 (FR-20, FR-21, BR-37, BR-38)

```ts
// src/lib/songsFile.ts
function createSongsFile(songs: Song[], now: Date): SongsFile;
type ParseFileResult =
  | { ok: true; songs: Song[] }
  | { ok: false; error: 'notJson' | 'badFormat' | 'empty' };
function parseSongsFile(input: unknown, options: { allowEmpty: boolean }): ParseFileResult;
```

- 내보내기: `createSongsFile` → `JSON.stringify(file, null, 2)` → `Blob` → `<a download="kbo-cheer-songs-YYYYMMDD.json">` 클릭. 곡 목록만 넣고 API 키, 팀 상태, 설정은 넣지 않는다.
- 가져오기: `<input type="file" accept="application/json,.json">` → `file.text()` → `JSON.parse`(실패하면 notJson) → `parseSongsFile(data, { allowEmpty: false })`. `format`, `version`, `isSongArray(songs)`를 검사한다.
  - 실패 문구: notJson·badFormat → "올바른 곡 목록 파일이 아닙니다"(EX-21), empty → "파일에 곡이 없습니다"(EX-22).
  - 성공하면 `window.confirm("지금 곡 목록 N곡을 파일의 M곡으로 바꿉니다")`을 거친 뒤 `replaceAll`을 부른다. 취소하면 아무것도 바꾸지 않는다.
- iOS 파일 선택기가 `accept` 때문에 .json 파일을 비활성화하는지는 실기기 확인 항목으로 넘긴다. 막히면 `accept`를 빼고 EX-21 형식 검사에 맡긴다. [R-26]
- 처음 데이터(`seed-songs.json`)도 같은 형식이고 같은 검사 함수를 쓴다(`allowEmpty: true`). 형식이 하나라 처음 데이터를 "앱에서 내보낸 파일"로 만들 수 있다(11절).
- 처음 데이터가 검사를 통과하지 못하면(개발 중 실수) 빈 목록으로 시작하고 `console.error`로 남긴다. STEP 4에 "seed-songs.json이 parseSongsFile을 통과한다" 단위 테스트를 둔다. [R-18]

### 3.5 곡 ID 만들기

`crypto.randomUUID()`는 보안 컨텍스트(HTTPS, localhost)에서만 있다. 개발 중 휴대폰은 http LAN 주소로 접속하므로 쓸 수 없다(공개 주소는 HTTPS지만 LAN 접속도 계속 지원한다). 그래서 `id.ts`에서 `Date.now().toString(36)` + 순번 + `Math.random().toString(36).slice(2, 8)`로 만든다. ID 생성은 리듀서 밖(Context의 액션 함수)에서 한다. 리듀서는 순수 함수로 두기 위해서다.

## 4. 설명란 파싱과 후보 평가 알고리즘

### 4.1 구조

```ts
// src/lib/chapterParser.ts — 가져오기 버튼을 누를 때 한 번
function parseDescription(description: string): ImportCandidate[];

// src/lib/candidates.ts — 후보를 고칠 때마다(매 렌더링) [C-08, C-09]
function evaluateCandidates(
  candidates: ImportCandidate[],
  video: VideoInfo,
  teamSongs: Song[],          // 최신 곡 목록 중 현재 팀 곡
): CandidateRow[];
```

- `parseDescription`은 설명란을 후보 목록으로 바꾸기만 한다. 사용자가 고칠 수 있는 값(종류, 이름, 시작 시각, 선택)만 후보에 담는다.
- 시각 이상, 끝 시각, 이미 있음, 중복, 같은 이름 선수, 저장 여부는 모두 `evaluateCandidates`가 현재 후보 값과 최신 곡 목록으로 매번 다시 계산한다. 그래서 시각 하나를 고치면 다른 곡의 끝 시각과 경고가 함께 바뀌는 것이 의도한 동작이 된다. [C-06, C-08, C-09]
- 설명란 챕터는 영상당 44~63개라 매 렌더링 O(n²) 계산이어도 충분히 빠르다.

### 4.2 1단계: 줄 해석 (parseDescription)

```
TIME_LINE = /^((?:\d{1,2}:)?\d{1,2}:\d{2})\s+(.+)$/
SEPARATOR = /^-{3,}$/

lines = description.split(/\r?\n/)
for 각 줄 (lineNo, line.trim()):
  SEPARATOR면 구분선 줄 번호 목록에 넣는다
  TIME_LINE이면 start = parseTime(시각 부분), null이면 제외 → 챕터 { lineNo, start, rawTitle: 제목.trim(), rawLine }
```

- 시간 부분은 `H:MM:SS`와 `MM:SS`를 모두 받는다(BR-10). 초가 60 이상이거나, 시가 있는데 분이 60 이상이면 챕터가 아니다. 시 없이 쓴 `75:00`처럼 분이 60을 넘는 값은 받는다(1시간 넘는 영상을 분으로만 적는 설명란이 있어서). 그 밖의 줄(안내 문구, 해시태그)은 무시한다.
- 챕터가 0개면 단일 영상 등록 화면으로 넘긴다(EX-04, FR-13).

### 4.3 2단계: 종류 분류 (BR-13)

```
teamSectionLine = 뒤에 챕터가 하나라도 있는 구분선 중 마지막 구분선의 줄 번호(없으면 없음)
PLAYER_SUFFIX = /\s*등장곡(\+응원가)?$/

for 각 챕터 c:
  inTeamSection = teamSectionLine이 있고 c.lineNo > teamSectionLine
  if inTeamSection                kind = 'team',      title = rawTitle          [C-16]
  else if PLAYER_SUFFIX가 맞으면   kind = 'player',    title = 접미사를 뺀 앞부분
  else                            kind = 'situation', title = rawTitle

후보 { key, lineNo, rawLine, inTeamSection, kind, title,
       startText: formatTime(c.start), selection: 'auto' }
```

- 분류 순서는 BR-13에 적힌 순서(팀 구획 → 선수 → 나머지)를 그대로 따른다. 팀 구획 안에 "○○ 등장곡"이 있으면 팀 응원가로 분류하고, 사용자가 확인 단계에서 종류를 바꾼다. 10개 영상에는 그런 줄이 없다. [C-16]
- "뒤에 챕터가 있는 마지막 구분선"으로 고르는 이유: 설명란 맨 끝 해시태그 앞에 구분선이 더 있어도 팀 구획을 잘못 잡지 않게 하기 위해서다.
- 구단 고유 곡(체로키, 셀리오, 환희 등)은 위치에 따라 상황 곡으로 분류되고, 확인 단계에서 사용자가 종류를 바꾼다(D-04).
- 중복 상황 곡도 후보 목록에서 빼지 않는다. 대표가 아닌 줄은 4.6절 평가에서 "중복"으로 표시한다. 후보를 고치면 대표가 바뀔 수 있기 때문이다. [C-08, C-17]

### 4.4 3단계: 시작 시각 해석과 시각 이상 판정 (BR-11) [R-03, C-07]

```
for 각 후보 k:
  s = parseTime(k.startText)
  if s === null          → warning 'badTime'
  else if s >= duration  → warning 'outOfRange'

// 남은 후보(설명란 순서)에서 시작 시각이 엄격하게 증가하는 가장 긴 부분열(LIS)을 고른다
values = 남은 후보들의 s (설명란 순서)
dp[i] = 1 + max(dp[j] : j < i, values[j] < values[i])   // 없으면 1
prev[i] = 그 최대를 만든 j 중 가장 작은 j
끝점 = dp가 가장 큰 i 중 가장 작은 i, prev를 따라가며 부분열을 만든다
부분열에 들지 못한 후보 → warning 'timeReversed'
```

- 시각 판정은 원래 설명란 값이 아니라 지금 후보의 `startText`로 한다. 사용자가 고친 값까지 포함해 설명란 순서대로 엄격하게 증가하는지를 매번 검사한다. 그래서 두 후보를 15:00, 14:00처럼 서로 거꾸로 고치거나 같은 시각으로 고치면 하나가 경고로 남는다. [C-07]
- LIS를 쓰는 이유: "바로 앞의 정상 줄보다 크면 정상" 방식은 큰 쪽으로 틀린 줄 하나가 생기면 그 뒤의 바른 줄들을 모두 경고로 만든다. LIS는 경고 줄 수를 가장 적게 만든다. [R-03]
- 길이가 같은 부분열이 여럿이면 앞쪽 줄을 남기도록 "가장 작은 j, 가장 작은 끝점"을 고른다. 결과가 매번 같아야 화면이 흔들리지 않기 때문이다.
- 확인한 결과(파이썬 프로토타입, 10개 영상):
  - 두산 `30:36 서울 두산 승리하리라` 1줄만 경고된다.
  - 이 줄을 40:36으로 고치면 경고가 사라진다.
  - 두산 `39:15 챔피언 두산`이 `49:15`로 잘못 적혔다고 가정해도, LIS는 그 줄(과 30:36)만 경고한다. 예전 방식은 `42:05` 뒤의 바른 줄들을 경고했다.

### 4.5 4단계: 끝 시각 계산 (BR-12)

```
boundaries = 경고가 없는 모든 후보의 시작 시각(중복·선택 해제 후보 포함), 정렬
for 각 후보 k:
  경고가 있으면 end = null
  아니면 end = start보다 큰 boundaries 중 가장 작은 값, 없으면 duration
```

- 경계는 저장 대상이 아니어도 "정상 챕터"면 모두 넣는다. 중복이라 저장하지 않는 공통 안타 송도 경계로 남아야, 등장곡만 있는 선수 곡이 그 뒤의 안타 송까지 늘어나지 않는다(키움 `권혁빈` 10:46 → 끝 11:14).
- 시각 이상 후보는 경계에서 뺀다. 그래서 두산 `챔피언 두산`의 끝은 고치기 전에는 42:05다(30:36으로 줄지 않음). 40:36으로 고치면 `챔피언 두산` 39:15 → 40:36, `서울 두산 승리하리라` 40:36 → 42:05가 된다(프로토타입 확인).
- 정상 후보의 시작 시각도 고칠 수 있다(FR-12). 고치면 그 앞 곡의 끝 시각이 따라 바뀐다. 이는 의도한 동작이다. [C-06]

### 4.6 5단계: 이미 있음, 중복, 같은 이름, 저장 여부 (BR-14, BR-15, BR-42)

```
existing(k) = 경고가 없고, teamSongs에 videoId === video.videoId 이고 start === k.start 인 곡이 있음   [C-09]

// 상황 곡 중복: normalize = 공백 제거 + 소문자
teamTitles = teamSongs 중 상황 곡 제목들의 normalize 집합
for 각 normalize 제목 T를 가진 상황 후보 묶음:
  existing인 후보도 묶음에 넣는다. 팀에 같은 제목이 있으면 existing 후보도 duplicate라 다시 골라 저장할 수 없다   [STEP 4-2, K-05]
  T ∈ teamTitles 이면 → 묶음의 나머지 후보 모두 duplicate                    (팀에 이미 같은 제목 있음)
  아니면 대표 = 경고 없는 첫 후보(없으면 첫 후보) → 나머지 duplicate        [C-17]

sameNamePlayer(k) = k.kind === 'player' 이고 existing이 아니고,
                    teamSongs에 normalize(title)이 같은 선수 곡이 있음                    [R-15]

titleError = 이름이 비었거나 30자 초과(BR-17)
selectable = warning === null && !duplicate && titleError === null
willSave   = selectable && (selection === 'on' || (selection === 'auto' && !existing))
```

- 모든 판정을 지금 값으로 다시 하므로, 두산 줄을 40:36으로 고쳐 저장한 뒤 같은 영상을 다시 가져와 40:36으로 고치면 그때 "이미 있음"이 된다. [C-09]
- 대표를 "경고 없는 첫 후보"로 고르므로, 첫 공통 안타 송의 시각이 틀리고 뒤의 것이 정상이면 뒤의 것이 저장된다. [C-17]
- 후보의 종류·이름을 바꿔 두 후보가 모두 "볼넷 송"이 되면 하나는 중복이 된다. [C-08]
- `selection: 'auto'`는 "평가 결과가 정하는 기본값을 따른다"는 뜻이다. 그래서 경고 후보를 고쳐 경고가 사라지면 자동으로 저장 대상이 된다(BR-11 "고치면 정상 후보가 된다"). 사용자가 체크박스를 누르면 on/off로 바뀌어 그 뒤로는 사용자 선택을 따른다. [C-09]
- 같은 이름 선수는 표시만 하고 기본 선택은 그대로 둔다(BR-42). 새 시즌 영상을 가져온 뒤 옛 곡은 곡 관리에서 지운다. [R-15]
- 알려진 한계: 새 시즌 영상의 상황 곡은 팀에 같은 제목이 이미 있으면 모두 중복이 된다. 새 영상의 상황 곡으로 바꾸려면 옛 상황 곡을 먼저 지운 뒤 가져온다.

### 4.7 저장

`willSave`인 후보만 `SongDraft`로 바꾼다: `{ teamId, kind, title, videoId, videoDuration, start, end, cheerStart: null }`. `importSongs(drafts)`가 ID와 order를 붙여 `IMPORT_SONGS`로 보낸다. 끝나면 `/team/:teamId`로 이동하고 "N곡을 저장했습니다" 알림을 띄운다.

## 5. 화면 구성과 사용자 동선

### 5.1 라우트

수업에서 배운 `BrowserRouter` + 중첩 `Route` + `Outlet` + `useParams` 구조로 만든다.

```tsx
<BrowserRouter>
  <Providers>
    <Routes>
      <Route path="/" element={<AppLayout />}>                  {/* 머리말, 플레이어, 알림 */}
        <Route index element={<HomeRedirect />} />
        <Route path="team/:teamId" element={<TeamLayout />}>     {/* teamId 검사, 팀 방문 기록 */}
          <Route index element={<MainPage />} />                  {/* 응원 화면 */}
          <Route path="songs" element={<SongListPage />} />       {/* 곡 관리 */}
          <Route path="songs/:songId/edit" element={<SongEditPage />} />
          <Route path="import" element={<ImportPage />} />        {/* 곡 가져오기 */}
        </Route>
        <Route path="settings" element={<SettingsPage />} />     {/* 데이터 관리 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  </Providers>
</BrowserRouter>
```

| 경로 | 화면 | 관련 요구사항 |
| --- | --- | --- |
| `/` | 마지막 팀이 있으면 `/team/<마지막 팀>`으로 이동, 없으면 팀 선택 화면 | FR-02, BR-28 |
| `/team/:teamId` | 메인(응원) 화면 | FR-04~10, FR-19, FR-23~25, FR-27 |
| `/team/:teamId/songs` | 곡 관리(목록, 수정·삭제 버튼) | FR-15, FR-16 |
| `/team/:teamId/songs/:songId/edit` | 곡 수정 | FR-15 |
| `/team/:teamId/import` | 곡 가져오기(URL, YouTube 검색, 확인, 단일 등록) | FR-11~14, FR-28 |
| `/settings` | 데이터 관리(JSON 내보내기·가져오기, 처음 데이터로 되돌리기, 접속 주소) | FR-20~22, BR-44 |

- 현재 팀을 URL에 두는 이유: 새로고침과 뒤로가기에서도 팀이 유지되고, 곡 관리·가져오기 화면이 "어느 팀의" 화면인지 분명해진다. 마지막 팀과 전 팀은 URL만으로 알 수 없으므로 TeamState에 따로 저장한다.
- `TeamLayout`은 `useParams`로 teamId를 읽고, 10개 팀 ID가 아니면 "팀을 찾을 수 없습니다"와 처음 화면 링크를 보여 준다(수업 MenuDetail 예제와 같은 처리).
- `TeamLayout`은 `<Outlet key={teamId} />`로 그린다. 팀이 바뀌면 아래 화면이 새로 만들어져 메인 화면의 검색어가 비워진다(BR-29). 같은 라우트에서 params만 바뀌면 React Router는 컴포넌트를 다시 만들지 않기 때문이다. [R-23]
- `SongEditPage`는 `songId`와 `teamId`가 모두 맞는 곡만 연다. 곡이 없거나 다른 팀 곡이면 "곡을 찾을 수 없습니다"와 곡 관리로 돌아가는 링크를 보여 준다(EX-29). [C-14, R-22]
- 팀을 바꾸면(머리말 팀 메뉴, 「전 팀」, 다른 팀 검색 결과) 언제나 그 팀의 메인 화면 `/team/<팀>`으로 간다. 수정 화면의 곡 ID는 원래 팀의 곡이라 다른 팀으로 그대로 옮길 수 없기 때문이다.
- Header의 팀 표시는 `useMatch('/team/:teamId/*')`로 URL의 팀을 먼저 쓰고, URL에 팀이 없을 때(`/settings`)만 `teamState.currentTeamId`를 쓴다. TeamLayout의 effect가 팀을 기록하기 전 한 프레임 동안 이전 팀이 보이는 것을 막는다. [R-24]

### 5.2 화면 배치 [디자인 개편]

[STEP 3-⑫] 화면 폭에 따라 세 가지 배치를 쓴다. 휴대폰(폭 899px 이하, 768~899px 태블릿 세로 포함), 노트북(900~1199px, 한 팀 화면), 넓은 화면(1200px 이상, 응원 화면만 두 팀을 나란히 놓는 매치업 보드)이다. 셋 다 같은 DOM(`Header, PlayerPanel, main`)을 CSS로 배치하고, 플레이어 iframe은 어느 배치에서도 같은 요소다. 자세한 결정과 이유는 5.6절.

휴대폰(폭 899px 이하), 재생 중에는 플레이어를 최소 200×200px로 보이게 둔다(D-05 (a)). 곡을 틀기 전에는 플레이어 자리를 접어 두고 첫 곡에 펼친다. [R-07, 디자인 개편 후속]

```
┌──────────────────────────────┐
│ [로고36 한화 v] [<> 로고 전 팀] (…)│ ← Header 56px. 팀 버튼은 팀 고르기 창을, (…)는 화면 메뉴를 연다
├══════════════════════════════┤ ← 재생 중이면 플레이어 위 3px 띠가 그 곡의 팀 색
│  ┌────────────────────────┐  │
│  │   YouTube 플레이어      │  │ ← PlayerHost(폭 100%, 높이 200px, 스크롤하면 위로 사라짐). 첫 곡 전에는 높이 0
│  └────────────────────────┘  │
├──────────────────────────────┤
│ [돋보기 초성이나 이름으로 찾기 ]│ ← SearchBox
│ 선수 22 | 팀 응원가 18   [주전순][가나다][자주 튼]│ ← 탭과 선수 정렬(좁으면 정렬이 아랫줄)
├─────────┬─────────┬──────────┤
│문현빈    │노시환    │강백호     │ ← PlayerGrid 3열, 칸 높이 84, 1px 선으로 나눔
│좌익수 [사진]│3루수 [사진]│1루수 [사진]│    이름 아래 포지션(12px), 오른쪽 아래에 40×50 사진
├─────────┼─────────┼──────────┤
│페라자    │=허인서=  │김태연     │ ← 재생 중 칸: 밝은 판 + 어두운 글자, 위쪽 3px 팀 색 띠
└─────────┴─────────┴──────────┘
│ ┌ 3곡을 저장했습니다      X ┐ │ ← Toast(독 바로 위)
╞━━━━━━━━━━━━━│━━━━━━━━━━━━━━━━╡ ← 독 위 가장자리 2px 진행 막대, │는 응원가 시작 지점
│ [사진] 노시환     [응원가로][정지][⋮]│ ← 재생 줄(선수 곡은 사진 32×40, 그 밖은 로고 판 36, 곡 이름, 경과/길이, 응원가로, 정지, 더보기)
│        00:12 / 01:01          │    더보기는 「지금을 응원가 시작으로」와 볼륨이 든 재생 도구 시트를 연다
│                               │    [STEP 3-⑫] 사진·곡 이름 자리를 누르면 「지금 재생」 시트(선수 카드, 굵은 진행 막대, 경과/길이)가 열린다
├───────┬───────┬───────┬──────┤
│ 안타   │ 아웃   │ 볼넷   │풀카운트│ ← 상황 칸 4×2(칸 높이 52). 상황 이름을 크게 쓰고, 곡이 없는 칸은 비워 둔다
├───────┼───────┼───────┼──────┤
│ 라인업 │라인업 소개│경기 개시│ 기타  │
└───────┴───────┴───────┴──────┘
```

노트북(폭 900~1199px, 그리고 1200px 이상의 응원 화면이 아닌 화면: 곡 관리·가져오기·설정). 한 팀 화면이다. 1200px 이상에서는 오른쪽 열에 선수 카드가 더해진다(아래 넓은 화면 그림):

```
┌──────────────────────────────────────────┬───────────────────────────┐
│ [로고 한화 v] [<> 로고 전 팀]   응원 곡 관리 가져오기 설정 │ ═════ 팀 색 3px 띠 ═════ │
├──────────────────────────────────────────┤ ┌───────────────────────┐ │
│ [돋보기 초성이나 이름으로 찾기 ........ /] │ │ YouTube 플레이어       │ │ ← 360×202, 열 위쪽
│ 선수 22 | 팀 응원가 18  [주전순][가나다][자주 튼]│ └───────────────────────┘ │
│ ┌──────┬──────┬──────┬──────┬──────┐     │ ━━━━━━━│━━━━━━━━━━━━━━━ │ ← 2px 진행 막대
│ │문현빈 │노시환 │강백호 │페라자 │허인서 │     │ 지금 재생                  │
│ ├──────┼──────┼──────┼──────┼──────┤     │ [로고] 노시환              │
│ │허인서 │ ...                       │     │ 한화 · 00:12 / 01:01 · 응원가 00:30 │
│ └──────┴──────┴──────┴──────┴──────┘     │ [>> 응원가로][정지 아이콘 정지] │
│                                          │ ┌──1─┬──2─┬──3─┬──4─┐   │ ← 상황 칸 4×2, 칸 오른쪽 위 단축키 번호
│                                          │ │안타 │아웃 │볼넷 │풀카운트│   │
│                                          │ ├──5─┼──6─┼──7─┼──8─┤   │
│ ┌ 알림 X ┐ ← Toast(왼쪽 아래)              │ │라인업│소개 │개시 │기타 │   │
│ └───────┘                                │ └────┴────┴────┴────┘   │
│                                          │ Space 정지 · S 응원가로 · T 전 팀 · / 검색 · 1~8 상황 칸 │
│                                          │ [깃발 지금을 응원가 시작으로]  │
│                                          │ 볼륨 ━━━━━━━━○ 70         │
└──────────────────────────────────────────┴───────────────────────────┘
  왼쪽: 머리말, 검색, 탭, 격자·목록     오른쪽 열(392px, 화면 높이): 플레이어, 재생 줄, 상황 칸
```

넓은 화면(폭 1200px 이상, 응원 화면) [STEP 3-⑫]. 앱 전체 폭은 1680px까지이고 그보다 넓으면 가운데에 둔다:

```
┌──────────────────────────────────────────────────────────────┬──────────────────────────┐
│                                 응원 곡 관리 가져오기 설정    │ ═════ 팀 색 3px 띠 ═════ │
├──────────────────────────────────────────────────────────────┤ ┌──────────────────────┐ │
│ [돋보기 초성이나 이름으로 찾기 .................. /] [주전순][가나다][자주 튼] │ │ YouTube 플레이어 16:9  │ │ ← 열 안쪽 폭, 1280px에서 359×202, 1920px에서 446×251
│ [로고44 한화 v]              vs  [로고44 삼성 v]                │ └──────────────────────┘ │
│ 선수 22 | 팀 응원가 18      │  선수 28 | 팀 응원가 27          │        ┌──┐              │ ← 선수 카드(높이 140): 누끼가
│ ┌─────┬─────┬─────┐          │ ┌─────┬─────┬─────┐              │ [로고] │누│ 팀 색 판      │   팀 색 판(아래 30%) 위에 서고
│ │문현빈│노시환│강백호│          │ │=디아즈=│최형우│류지혁│          │ ═══════╧══╧═══════        │   판 왼쪽 위에 로고 판 28
│ │좌익수 [사진48×60]│ ...       │ │1루수 ...│                     │ 디아즈                    │ ← 이름 22/700
│ ├─────┼─────┼─────┤          │ ├─────┼─────┼─────┤              │ 삼성 · 1루수              │ ← 구단 · 포지션 13
│ │ ...                         │ │ ...                             │ ━━━━━━━│━━━━━━━━━━━━━ │ ← 2px 진행 막대
│                               │                                  │ 지금 재생 00:12 / 00:49   │
│  왼쪽 열: URL의 팀(현재 팀)    │  오른쪽 열: 전 팀(상대 팀)        │ [>> 응원가로][정지]       │
│                               │  전 팀이 없으면 「상대 팀 고르기」  │ [로고 한화][로고 삼성]    │ ← 상황 칸 팀 탭
│ ┌ 알림 X ┐                    │                                  │ ┌─1─┬─2─┬─3─┬─4─┐     │ ← 상황 칸 4×2(고른 팀)
│ └───────┘                     │                                  │ └───┴───┴───┴───┘     │
│                               │                                  │ Space 정지 · … · T 상황 팀 │
│                               │                                  │ [깃발 지금을 응원가 시작으로] │
│                               │                                  │ 볼륨 ━━━━━━━━○ 100        │
└──────────────────────────────────────────────────────────────┴──────────────────────────┘
  왼쪽: 머리말(화면 링크만), 검색과 정렬, 매치업 머리, 두 팀 열     오른쪽 열(clamp(392px, 28vw, 480px), 화면 높이)
```

- [디자인 개편] 휴대폰 화면 순서는 머리말, 플레이어, 본문, 독이다(플레이어 도구 줄은 노트북에만 있다). DOM은 `Header, PlayerPanel(플레이어·도구·독), main` 순서 그대로 두고, 휴대폰에서는 PlayerPanel을 `display: contents`로 풀어 CSS `order`로 배치한다. 노트북에서는 같은 PlayerPanel이 오른쪽 열이 된다. 플레이어 DOM이 화면 폭에 따라 다시 만들어지지 않아 재생이 끊기지 않는다.
- [디자인 개편] 독은 `position: sticky; bottom: 0`인 마지막 줄이다. 고정 위치(`fixed`)와 달리 문서 흐름에 자리를 차지하므로 본문 아래쪽 여백을 독 높이에 맞춰 계산할 필요가 없다. 상황 곡이 8곡을 넘어 줄이 늘어도 본문이 가려지지 않는다.
- [디자인 개편 후속] 「지금을 응원가 시작으로」와 볼륨은 경기 중이 아니라 준비할 때 쓰는 기능이라, 휴대폰에서는 재생 줄의 더보기 버튼(`EllipsisVertical`, 44×44)이 여는 재생 도구 시트에 둔다. 노트북은 지금처럼 오른쪽 열 아래 도구 줄에 둔다. 두 자리는 같은 요소를 PlayerPanel이 한 번 만들어 넣으며, 휴대폰 도구 줄은 CSS로 감추고 시트는 열 때만 그린다. 재생 줄이 더보기 버튼만큼 좁아져 휴대폰에서는 「팀 ·」을 빼고 「경과/길이」만 쓴다(팀은 로고 판으로 보인다).
- [디자인 개편 후속] 곡을 틀기 전에는 휴대폰 플레이어 자리(`.player-stage`)를 높이 0, `overflow: hidden`으로 접는다. PlayerPanel이 첫 곡을 받은 렌더에서 `has-played`를 붙여 자리를 펼친다. iframe은 접힌 동안에도 같은 크기로 문서에 남아 있어 다시 만들지 않고, 펼칠 때 움직임도 없다(모션 규칙: iframe을 감싸거나 옮기지 않는다). 노트북은 늘 보인다. 바꾸기 전과 360×640에서 새 창의 첫 재생을 80번씩 번갈아 재 보니, 누른 순간부터 PLAYING까지 중앙값 308ms → 314ms, 평균 335.0ms → 323.9ms, 90번째 백분위 385ms → 371ms, 8초 안에 재생되지 않은 횟수(F-01) 9 → 7로 나빠지지 않았다.
- [디자인 개편 후속] 휴대폰 높이: 머리말 56이 위에 있고, 독(진행 2 + 재생 줄 60 + 상황 칸 105 + 여백 8 = 약 177)이 아래에 붙는다. 첫 곡 전에는 플레이어 자리가 없어 격자 첫 줄이 203에서 시작하고, 맨 위에서 다 보이는 격자 줄은 360×640에서 3줄(+ 걸친 줄 1), 390×844에서 6줄이다. 재생 중에는 플레이어 203px이 더해져 첫 줄이 406에서 시작하고, 360×640에서 0줄(걸친 줄 1), 390×844에서 3줄이다. 첫 곡을 누르는 순간 격자가 플레이어 높이만큼 아래로 밀린다. 스크롤하면 플레이어가 위로 사라지며 격자가 보인다. 재생 중 플레이어는 어떤 요소에도 덮이지 않는다(TC-24).
- [디자인 개편] 메인 화면은 「선수 N | 팀 응원가 N」 탭으로 격자와 목록 중 하나만 보여 준다. 정렬(주전순 / 가나다 / 자주 튼)은 선수 탭에서만 보인다. 폭 360px에서는 탭과 정렬 세 개가 한 줄에 들어가지 않아 정렬이 아랫줄로 내려간다. 탭은 팀이 바뀌면 선수로 돌아간다(TeamLayout이 `key`로 화면을 새로 만든다).
- [디자인 개편] 상황 칸은 `lib/situationSlots.ts`의 `situationSlots(songs)`가 정한다. 칸 순서는 안타, 아웃, 볼넷, 풀카운트 / 라인업, 라인업 소개, 경기 개시, 기타다. 제목을 `normalize`한 뒤 낱말로 칸을 고른다. "라인업"이 있으면 "소개"나 "수비"가 함께 있을 때 라인업 소개, 아니면 라인업이다. 그 밖에는 안타, 아웃, 볼넷, 풀카운트, 개시(경기 개시) 순으로 보고, 아무것도 없으면 기타다.
  - [디자인 개편 후속] 칸 글자는 `situationLabel(title)`이 정한다. 칸에는 곡 제목에서 고른 상황 이름(안타, 아웃, 볼넷, 풀카운트, 라인업, 라인업 소개, 경기 개시)을 17px 굵게 쓰고, 곡 제목은 그 아래 13px 보조 글자색 한 줄(넘치면 말줄임)로 쓴다. 제목에서 빈칸을 빼고 앞의 「공통」, 뒤의 「송·곡·음악·응원가」를 뗀 말이 상황 이름과 같으면 제목 줄은 생략한다. 처음 데이터의 상황 곡 48곡 중 제목 줄이 남는 곡은 롯데의 「수비 라인업송」「공격 라인업송」 둘이다. 기타 칸은 곡 제목을 크게 쓴다. 다른 칸으로 밀려난 곡도 자기 제목에서 고른 이름을 쓴다. 칸의 접근 가능한 이름은 곡 제목 전체다. 「라인업 소개」는 360px 칸(안쪽 폭 약 65px)에 한 줄로 들어가지 않아 낱말 단위로 두 줄이 된다.
  - 곡은 `order` 순서로 제 칸을 차지하고, 제 칸이 이미 찬 곡(같은 상황의 두 번째 곡)은 9번째 칸부터 줄을 더해 놓는다. 다른 상황의 빈 칸에는 넣지 않는다. 그래서 앞 8칸과 단축키 1~8은 늘 같은 상황이고, 같은 상황은 팀이 바뀌어도 같은 칸에 있다. [STEP 4-2, K-06] 처음에는 밀려난 곡을 앞쪽 빈 칸(예: 아웃 칸)에 넣었는데, 그러면 단축키 2가 볼넷 곡을 트는 일이 생겨 바꿨다.
  - 더한 줄은 4칸 단위로 빈 칸을 채운다. 곡을 버리지 않으면서 앞 8칸의 위치는 바뀌지 않는다. 더한 줄에는 단축키가 없다. 처음 데이터는 상황마다 곡이 하나라(BR-14) 이 경우는 사용자가 같은 상황의 곡을 더 등록했을 때만 생긴다.
  - 곡이 없는 칸은 누를 수 없는 빈 칸(`span`, `aria-hidden`)으로 그린다. 팀에 상황 곡이 하나도 없으면 상황 칸 묶음을 그리지 않는다.
- [디자인 개편 후속] 팀 고르기 창과 재생 도구 시트는 같은 `Sheet` 컴포넌트(아래에서 올라오는 `<dialog>`, 제목과 닫기 버튼)를 쓴다.
- [디자인 개편] 팀 메뉴는 `<select>` 대신 머리말의 팀 버튼(로고 판 36 + 팀 이름 + 아래 화살표)과 팀 고르기 창(TeamSheet)이다. 창은 `<dialog>`를 `showModal()`로 열어 대화상자 역할, 포커스 가두기, Esc로 닫기를 브라우저가 맡는다. 열면 지금 팀 칸에 포커스를 두고, 닫으면 팀 버튼으로 포커스가 돌아간다. 창 뒤를 어둡게 덮지 않아(`::backdrop` 투명) 플레이어가 가려지지 않는다. 휴대폰은 화면 아래에서 올라오는 시트, 노트북은 왼쪽 열 위쪽의 상자다. 팀 고르기 창과 첫 실행 화면은 같은 5×2 로고 격자(TeamGrid)를 쓴다.
- [디자인 개편] 「전 팀」 버튼은 맞바꿈 아이콘, 전 팀 로고 판 28, "전 팀" 글자다. 접근 가능한 이름은 "전 팀: 삼성"이고, 전 팀이 없으면 "전 팀"이며 비활성이다.
- [디자인 개편] 화면 메뉴(곡 관리, 가져오기, 설정, 응원)는 휴대폰에서 더 보기 아이콘으로 열고, 머리말 아래로 펼쳐져 내용을 밀어낸다(플레이어를 덮지 않음). Esc로 닫힌다. 노트북에서는 머리말 오른쪽에 글자 링크로 늘 보인다.
- [STEP 3-7] 상황 칸은 MainPage가 고르고(1~8번 단축키와 같은 배열), PlayerPanel 안의 자리(`.dock-situations`)에 `createPortal`로 그린다. 자리 요소는 AppLayout이 `SituationSlotContext`로 내려 준다.
- [STEP 3-7] 알림(Toast)은 독 안에 두어, 휴대폰에서는 독 바로 위에 뜨고 플레이어를 덮지 않는다. 노트북에서는 왼쪽 열 아래에 뜬다. 누르면 바로 닫히고, 4초 뒤에도 닫힌다.
- [STEP 3-7] 진행 표시는 곡 구간 기준 `경과 / 길이`(예: 00:12 / 01:01)다. 모음 영상은 30분이 넘어, 영상 기준 시각(23:45 / 24:46)으로는 곡이 얼마나 남았는지 알기 어렵다. PlayerPanel이 250ms마다 `getCurrentTime()`을 읽고, 표시하는 초가 바뀔 때만 상태를 바꾼다. 응원가 시작 지점이 구간 안에 있으면 막대에 눈금으로 표시한다.
- 버튼 최소 크기는 44×44px(NFR-02)이고, 페이지 전체 가로 스크롤은 없다(NFR-01). 상황 칸은 고정 4열이라 가로로 넘기지 않는다.
- 플레이어 크기는 IFrame API 문서의 "Embedded players must have a viewport that is at least 200px by 200px" 조건에 따른다. 휴대폰에서 첫 재생이 막혔을 때 사용자가 영상을 직접 눌러 허용하려면 플레이어가 보여야 한다(8.6). [R-02]
- 설정 화면 맨 아래에 "이 브라우저 저장소: `http://192.168.0.10:5173`(지금 접속 주소)"를 보여 주고, "접속 주소가 바뀌면 곡 목록이 따로 저장됩니다. 늘 같은 주소(https://kbocheer.kdhoon.me)로 열고, 다른 기기로 옮길 때는 JSON 내보내기·가져오기를 써 주세요"를 함께 적는다(BR-44). [R-08, 공개 배포]

### 5.3 사용자 동선

| 동선 | 흐름 |
| --- | --- |
| 처음 실행 | `/` → 팀 선택 화면(로고 5×2) → 팀 누름 → `/team/hanwha`(전 팀 없음, 「전 팀」 비활성) |
| 다시 열기 | `/` → `/team/<마지막 팀>` 바로 이동 |
| 타자 등장 | 선수 버튼 → 재생 → 「응원가로」(지점 있을 때) → 끝 시각에 자동 정지 또는 「정지」 |
| 응원가 시작 지정 | 선수 곡 재생 중 응원가가 시작될 때 「지금을 응원가 시작으로」(휴대폰은 재생 줄의 더보기 → 재생 도구 시트) → 바로 「응원가로」 활성 |
| 상황 | 상황 칸(4×2, 같은 상황은 늘 같은 칸) → 재생 |
| 상대 팀 차례 | 「전 팀: 삼성」 → `/team/samsung`, 재생 중인 곡은 계속(BR-06) |
| 검색 재생 | 검색칸 입력 → 결과(현재 팀 먼저, 다른 팀은 로고와 팀 이름) → 누름 → 재생(다른 팀이면 팀 전환) |
| 첫 재생이 막힘(휴대폰) | 안내 "영상을 한 번 직접 눌러 재생을 허용해 주세요" → 플레이어 누름 → 그 곡이 재생되고, 다음부터는 버튼으로 재생 |
| 모음 영상 가져오기 | 메뉴 「가져오기」 → URL 입력 → 후보 표 확인·수정 → 「저장」 → 메인 화면 |
| YouTube 검색 등록 | 가져오기 화면 「YouTube 검색」 탭 → 검색어 → 결과 하나 선택 → 모음이면 후보 표, 아니면 단일 등록 폼 |
| 곡 수정·삭제 | 메뉴 「곡 관리」 → 곡 줄의 「수정」 → 폼 저장 / 「삭제」 → 확인 |
| 노트북 → 휴대폰 | 노트북 「설정」 → 내보내기 → 파일을 휴대폰으로 전달(메신저 등) → 휴대폰 「설정」 → 가져오기 → 확인 |

### 5.4 디자인 언어 [디자인 개편]

어두운 거실에서 게임을 하다 휴대폰을 힐끗 보고 엄지로 누르는 리모컨이 목표다. 색은 줄이고, 재생 중인 것만 반전으로 튀게 한다.

| 토큰 | 값 | 쓰는 곳 |
| --- | --- | --- |
| `--bg` | #131211 | 화면 바탕(따뜻한 검정) |
| `--surface` | #1B1A18 | 독, 노트북 오른쪽 열, 팀 고르기 창, 상태 안내 |
| `--pressed` | #252320 | 누른 상태, 입력칸, 선택한 정렬, 알림, 곡이 없을 때 선수 카드의 판 [STEP 3-⑫] |
| `--line` | #302D29 | 1px 구분선 |
| `--edge` | #4A4640 | 버튼·입력칸 테두리 |
| `--text` / `--text-2` / `--text-3` | #F1ECE3 / #ABA49A / #948D83 | 본문 / 보조 / 셋째(개수, 단축키 안내, 비활성) |
| `--plate` / `--ink` | #ECE7DD / #171513 | 밝은 판(로고 판, 재생 중 칸, 주 버튼, 오류 알림)과 그 위 글자 |

- 강조는 색이 아니라 반전이다. 재생 중인 칸(선수 격자, 팀 응원가 줄, 검색 결과, 상황 칸)은 밝은 판 바탕에 어두운 글자가 된다. 주 버튼(저장, 불러오기, 곡 가져오기)과 오류 알림도 밝은 판이다. 오류·경고는 색 대신 아이콘(CircleAlert, TriangleAlert)과 글자로 알린다.
- 팀 색은 화면을 칠하지 않는다. 쓰는 곳은 재생 중 칸 위쪽 3px 띠와, 재생 중일 때 플레이어 위 3px 띠 두 군데뿐이다. [STEP 3-⑫] 플레이어 영역에 속하는 선수 카드의 낮은 판(카드 높이의 30%)이 팀 색으로 면을 칠하는 유일한 곳이다. 이 판 위에는 글자를 두지 않는다(5.6). 띠 색은 지금 보는 팀이 아니라 재생 중인 곡의 팀 색이다. 팀 색은 글자 색으로 쓰지 않는다. 그래서 `Team.onColor`는 화면에서 더는 쓰지 않는다.
- 팀은 로고로 알아본다. 로고는 언제나 같은 밝은 판(#ECE7DD, 모서리 4px) 위에 `object-fit: contain`과 안쪽 여백으로 놓고, 판 크기는 28·36·44px만 쓴다(TeamLogo). [STEP 3-⑫] 예외는 선수 카드에서 선수 곡이 아닐 때의 88px 판 하나다(5.6). 이미지(`public/teams/<팀>.webp`)를 못 읽으면 판 안에 팀 짧은 이름을 쓴다.
- 글꼴은 Pretendard 하나다. `pretendard@1.3.9`를 설치하고 가변 글꼴의 글자 범위별 CSS(`dist/web/variable/pretendardvariable-dynamic-subset.css`)를 `main.tsx`에서 불러 Vite가 글꼴 파일을 묶는다(CDN 없음). 브라우저는 화면에 나온 글자 범위의 조각(woff2)만 받는다. 굵기별 정적 CSS는 828개 `@font-face`라 묶은 CSS가 536kB(gzip 190kB)였고, 가변 글꼴은 92개라 훨씬 작다. 크기와 굵기: 머리말 팀 이름 22/700, 선수 이름 18/600, 지금 재생 제목 17/700, 탭·버튼 15~16, 보조 13, 개수 12. 숫자는 `tabular-nums`, 줄바꿈은 `word-break: keep-all`.
- 카드와 그림자는 없다. 격자와 목록은 1px 선으로 나눈다. 격자는 칸마다 1px 외곽선(`outline`)을 그리고 칸 사이를 1px 띄워, 마지막 줄의 빈 자리에는 선이 생기지 않게 한다. 모서리는 판·격자 칸 4px, 버튼·입력칸 10px 두 가지뿐이다(한 가지 예외: 선수 사진 3px, 5.5절). 간격은 4의 배수(4, 8, 12, 16, 24, 32), 화면 옆 여백은 16px다.
- 아이콘은 `lucide-react@1.73.0`만 쓰고 `strokeWidth`는 1.75다. 이모지나 기호 글자(▶ ■ ⇄ ☰ ✕ ‹ › ▾ ▴ → 등)를 아이콘으로 쓰지 않는다. 아이콘만으로 뜻이 모호하면 글자를 함께 둔다(「전 팀」, 「응원가로」, 노트북의 「정지」). 아이콘만 있는 버튼(메뉴, 닫기, 휴대폰의 정지)은 `aria-label`을 단다.
- 누를 수 있는 것은 모두 44×44px 이상이다. 선수 칸 84(사진 때문에 68에서 늘렸다), 팀 응원가 줄·상황 칸 52.
- 쓰지 않는 것: 그라디언트 바탕, 네온, 빛 번짐, 유리 효과, 보라색 강조, 이모지, 뜻 없는 배지, 카드 그림자, 팀 색으로 화면 칠하기, 들뜬 문구, 누를 때 커지거나 튀는 효과, 로딩 뼈대 화면. 문구는 짧은 평서문이다.

글자 대비(WCAG 상대 휘도 공식, 실제로 놓이는 바탕마다 계산):

| 글자 \ 바탕 | #131211 | #1B1A18 | #252320 | #ECE7DD |
| --- | --- | --- | --- | --- |
| #F1ECE3 본문 | 15.90 | 14.78 | 13.32 | 쓰지 않음 |
| #ABA49A 보조 | 7.58 | 7.05 | 6.35 | 쓰지 않음 |
| #948D83 셋째 | 5.70 | 5.30 | 4.77 | 쓰지 않음 |
| #171513 판 위 글자 | 쓰지 않음 | 쓰지 않음 | 쓰지 않음 | 14.78 |

- 주 버튼에 마우스를 올리면 바탕이 #DDD7CB가 되고, 그 위 #171513 글자 대비는 12.71이다.
- 셋째 글자는 #302D29(선 색) 위에서 4.17이라 선 위에는 글자를 두지 않는다. 재생 중인 밝은 판 위에서는 보조·셋째 글자도 모두 #171513으로 바꾼다(`.is-playing *`, 선수 칸의 포지션·횟수 글자는 `.is-playing .player-sub`).
- [STEP 3-⑫] 새로 놓인 글자 조합(모두 4.5 이상):
  - 선수 카드 아래 이름(22/700, #F1ECE3)과 「구단 · 포지션」(13px, #ABA49A)은 넓은 화면 오른쪽 열과 지금 재생 시트 바탕 #1B1A18 위에서 14.78, 7.05다. 곡이 없을 때 「선택한 곡 없음」(#ABA49A)은 7.05다.
  - 팀 색 판 위에는 글자가 없다. 판 위의 로고 판 28·88은 밝은 판(#ECE7DD)이고, 로고 그림을 못 읽을 때 그 위 팀 이름(#171513)은 14.78이다. 팀 색 판 자체는 글자가 아니라 대비 기준 밖이다(롯데 #041E42, 두산 #131230, KT #000000은 #1B1A18과 1.05·1.04·1.21로 어둡지만 누끼·로고 판으로 자리가 보인다). 판 위에 #F1ECE3 글자를 놓았다면 한화 #FF6600 위에서 2.50, #171513 글자를 놓았다면 롯데 위에서 1.10이라 어느 한 색으로도 10개 팀을 맞출 수 없어 글자를 두지 않았다.
  - 매치업 머리의 팀 이름(22/700, #F1ECE3)은 #131211 위 15.90, 「vs」(13px, #948D83)는 5.70, 「상대 팀 고르기」 버튼 글자(#F1ECE3)는 15.90(누르면 #252320 위 13.32)이다. 빈 오른쪽 열의 안내(#ABA49A)는 #131211 위 7.58이다.
  - 상황 칸 팀 탭은 고른 탭 #F1ECE3, 고르지 않은 탭 #ABA49A로 #1B1A18 위 14.78, 7.05다. 「이 팀에는 상황 곡이 없습니다」(13px, #ABA49A)는 7.05다.
  - 지금 재생 시트의 「경과 / 길이」(17/600, #F1ECE3)와 「응원가 00:30」(13px, #ABA49A)은 #1B1A18 위 14.78, 7.05다.
- [STEP 3-⑪] 새로 놓인 글자 조합: 선수 칸의 포지션·「N번」(12px, #ABA49A)은 칸 바탕 #131211에서 7.58, 누르거나 마우스를 올린 #252320에서 6.35다. 재생 중 칸에서는 #171513으로 바뀌어 #ECE7DD 위에서 14.78이다(마우스를 올린 재생 칸 #DDD7CB 위에서 12.71). 「최근 튼 곡」 제목(13px, #ABA49A)은 #131211에서 7.58이다. 모두 4.5 이상이다.

#### 모션 [STEP 3-9]

움직임은 누른 일을 확인하고 그것이 어디서 왔는지 보여 줄 뿐이다. 소리를 기다리게 하지 않고(누른 순간 곡이 나오고 재생 중 표시가 바뀐다), 거리는 24px 이하, 들어오는 것은 200ms 안에 읽히며, 장식으로 움직이는 것은 없다. `motion@14.14.0`을 쓰고, 값은 모두 `src/ui/motionTokens.ts` 한 곳에 둔다. [STEP 4-2] 컴포넌트는 `motion/react-m`의 `m.*`로 그리고, App이 `<LazyMotion features={domAnimation} strict>`로 필요한 기능만 싣는다(strict라 `motion.*`을 쓰면 오류). 재생 줄 높이는 `motion/react-mini`의 `useAnimate`(WAAPI)로 움직이고, 이것은 MotionConfig를 읽지 않으므로 동작 줄이기를 PlayerPanel이 직접 본다. React 묶음은 `vite.config.ts`의 `codeSplitting`으로 따로 떼어, 빌드 결과가 index 283.78 kB(gzip 85.21)와 react 218.75 kB(gzip 68.27)가 되고 500 kB 경고가 없어졌다(바꾸기 전 한 파일 569.57 kB).

| 토큰 | 값 | 쓰는 곳 |
| --- | --- | --- |
| `tap` | 80ms, `out` | 눌려 들어가기 |
| `quick` | 140ms, `in` | 알림이 사라질 때. 재생 줄 제목이 바뀔 때는 같은 시간에 `out`으로 나타난다 |
| `swap` | 200ms, `out` | 팀 전환 도착, 목록 첫 등장, 첫 곡의 재생 줄 글자, 알림 등장, 시트·메뉴의 페이드 |
| `row` | 220ms, `out` | 첫 곡에 재생 줄이 자라기 |
| `exit` | 180ms, `in` | 팀 고르기 창·화면 메뉴 닫기 |
| `ease.out` / `ease.in` / `ease.inOut` | cubic-bezier(.2,.8,.2,1) / (.4,0,1,1) / (.4,0,.2,1) | 도착 / 나가기 / 화면 안 두 자리 사이 옮기기(지금 쓰는 곳 없음) |
| `spring.press` | `visualDuration` 240ms, `bounce` 0 | 눌림이 풀려 돌아오기 |
| `spring.sheet` | `visualDuration` 280ms, `bounce` 0.08 | 팀 고르기 창·재생 도구 시트가 올라오기, 화면 메뉴가 내려오기(옮기기만. 페이드는 `swap`) |
| `stagger` | 24ms, 앞 8줄까지 | 목록 첫 등장. 9번째 줄부터는 8번째 줄과 같이 움직인다(`lib/motion.ts`의 `staggerDelay`) |
| `distance` | 팀 24px, 목록 줄 8px, 시트 24px | |
| `pressScale` | 0.96 | |
| `rowTextDelay` | 60ms | 첫 곡의 재생 줄 글자가 올라오기 전 기다림 |

- 스프링: motion은 `bounce`를 감쇠비 `1 - bounce`로 바꾼다(`motion-dom`의 `bounceToDampingRatio`). 감쇠비 0.92는 `bounce` 0.08이고, 넘침은 exp(-ζπ/√(1-ζ²)) ≈ 0.06%라 24px에서 0.02px다. 눈에 보이는 넘침은 없다.
- 누름: 1px 선으로 붙은 칸(선수 칸, 상황 칸, 팀 응원가 줄, 검색 결과 줄, 팀 고르기 칸)은 칸과 선은 그대로 두고 안의 내용(`.press-content`)만 0.96으로 줄어든다(`ui/Press.tsx`의 `PressCell`). 상황 칸의 단축키 번호는 줄어들지 않는다. 혼자 선 버튼(정지, 응원가로, 더보기, 지금을 응원가 시작으로, 전 팀, 팀 버튼, 메뉴, 창 닫기)은 버튼 전체가 줄어든다(`TapButton`). 들어갈 때 `tap`, 풀릴 때 `spring.press`. 재생 중 칸의 반전은 움직이지 않고 바로 바뀐다.
- 팀 전환: 선수 격자·팀 응원가 목록(`#panel-songs`)이 팀 순서(`TEAMS`)에서 새 팀이 있는 쪽에서 24px 들어온다(`swap`). 방향은 `lib/motion.ts`의 `teamSwitchDirection`이 정하고, TeamLayout이 직전 팀을 기억해 `<Outlet context>`로 내려 준다(Outlet은 팀마다 `key`로 새로 만들어져 직전 팀을 모른다). 「전 팀」으로 두 팀을 오가면 늘 반대쪽에서 온다. 같은 팀 안에서 화면만 바뀌면 움직이지 않는다. 나가는 목록은 그 프레임에 사라진다. 머리말, 검색칸, 탭, 상황 칸은 움직이지 않는다. 들어오는 격자가 가로 스크롤을 만들지 않게 `.app-main`에 `overflow-x: clip`을 둔다.
- 목록 첫 등장: 검색 결과가 처음 나타날 때, 곡 관리 화면과 가져오기 후보 목록이 처음 열릴 때 줄이 아래 8px에서 24ms씩 차례로 올라온다(`listItemMotion`). 이미 열린 검색 결과에 검색어를 더 쳐서 생기는 줄은 움직이지 않는다(SearchResults가 처음 렌더의 곡 id를 `useState`로 기억한다. [STEP 4-2] 렌더 중 ref 읽기 경고를 없애려고 `useMounted`를 없앴다).
- 팀 고르기 창과 재생 도구 시트(`Sheet`): `<dialog>`는 그대로 `showModal()`로 열고, 보이는 판(`.sheet-body`)이 아래 24px에서 `spring.sheet`로 올라온다. 닫을 때(닫기, 팀 고르기, 바깥 누름, Esc)는 판이 `exit`로 사라진 뒤 `close()`한다. Esc는 `cancel` 이벤트를 막고 같은 길로 닫는다. 포커스는 `close()` 때 팀 버튼으로 돌아간다. 창 뒤는 5.2대로 어둡게 덮지 않는다(플레이어가 가려지지 않게).
- 화면 메뉴(휴대폰): 머리말 아래로 펼쳐지므로 위 8px에서 내려오고(`spring.sheet`, 페이드 `swap`), 닫을 때 `exit`. 메뉴가 내용을 밀어내는 높이 변화는 움직이지 않는다.
- 휴대폰 플레이어 자리가 첫 곡에 펼쳐지는 것은 움직이지 않는다(iframe을 움직이는 요소로 감싸지 않는다).
- 재생 줄: 처음 곡을 튼 순간 한 번 `row`로 자라고(앱에서 높이를 움직이는 곳은 여기 하나), 글자(`.now`)는 60ms 뒤 아래 8px에서 `swap`으로 올라온다. 지금 배치에서는 재생 전과 재생 중의 줄 높이가 같아(360px에서 60px, 1280px에서 151.6px) 실제로 자라는 일은 없고 글자만 올라온다. 곡이 바뀌면 제목만 `quick`으로 페이드된다.
- 알림: 아래 8px에서 `swap`으로 올라오고 `quick`으로 사라진다. 알림이 바로 다른 알림으로 바뀌면 앞 알림이 사라진 뒤 새 알림이 올라와 둘이 겹치지 않는다.
- [STEP 3-⑫] 매치업 보드의 팀 열: 그 열의 팀이 바뀔 때만 팀 전환과 같은 움직임(새 팀 쪽에서 24px, `swap`)으로 들어온다. 왼쪽 팀만 바꾸면 오른쪽 열은 움직이지 않고, 오른쪽 팀만 바꾸면 왼쪽 열은 움직이지 않는다. 두 칸이 맞바뀌면 두 열 모두 들어온다. MainPage는 URL 팀마다 새로 만들어져 오른쪽 열의 직전 팀을 모르므로, TeamLayout이 두 칸의 직전 팀을 기억해 `<Outlet context>`로 `{ current, prev }` 방향을 넘긴다(`lib/motion.ts`의 `ColumnEnter`). 오른쪽 열은 팀 id를 `key`로 두어 팀이 바뀔 때 새로 들어온다. 비어 있던 오른쪽 칸에 처음 팀이 들어올 때는 방향이 없어 움직이지 않는다. 곡을 눌러도 열은 움직이지 않는다.
- [STEP 3-⑫] 선수 카드: 곡이 바뀌면 카드 전체(판, 누끼, 이름)가 `swap`으로 페이드만 한다. 옮기기는 없다. 처음 그릴 때는 나타나지 않는다(재생 줄 제목과 같은 방식으로 처음 key를 기억). 판의 팀 색도 페이드 안에서 바로 바뀐다. 누끼는 불러온 뒤에 `opacity`로 보인다(움직임 없음).
- [STEP 3-⑫] 상황 칸 팀 탭으로 팀을 바꾸면 칸은 움직이지 않고 바로 바뀐다(재생 중 표시처럼 누른 결과가 바로 보이는 자리). 지금 재생 시트는 다른 시트와 같은 `Sheet` 움직임이다.
- 움직이지 않는 것: 소리의 시작·정지 시점, 재생 중 표시(칸 반전, 아이콘), 진행 막대(재생 위치를 그대로 따른다. `width` 대신 `transform: scaleX`), YouTube iframe(옮기거나 감싸거나 다시 마운트하지 않는다).
- transform과 opacity만 움직인다(예외는 재생 줄 높이). 프레임마다 React 상태를 바꾸지 않는다.
- 동작 줄이기: 앱 전체를 `<MotionConfig reducedMotion="user">`로 감싸, 시스템의 동작 줄이기가 켜지면 옮기기·크기·스프링이 순간 적용되고 페이드만 남는다. 누름은 아예 꺼지고, 창·메뉴를 닫을 때는 옮기기 없이 사라지기만 한다(순간 이동으로 튀지 않게). E2E는 이 설정(`playwright.config.ts`의 `reducedMotion: 'reduce'`)으로 돈다.

### 5.5 선수 정보·사진·정렬·최근 곡 [STEP 3-⑪]

선수 이름만으로는 누구인지 알아보기 어려워, 선수 칸에 포지션과 사진을 붙이고 순서를 자주 쓰는 선수가 앞에 오게 했다. 노트북 배치는 다음 단계에서 다시 짜므로 이 단계는 지금 배치를 건드리지 않고 칸만 키웠다.

**데이터와 연결.** 선수 기록은 `src/data/players-2026.json`(596명, 팀별 배열)이고 `lib/players.ts`의 `parsePlayers(unknown)`가 항목마다 타입 검사를 해 읽는다(틀린 항목은 건너뜀). `buildPlayerIndex`가 팀마다 `정규화한 이름 → 선수` 사전을 만들고, 같은 이름이 둘이면 값을 `null`로 둬 잇지 않는다(BR-45). `findPlayer`는 선수 곡만 찾는다. 앱은 `data/players.ts`의 `playerOf(song)`로 쓴다(번들 데이터라 한 번만 만든다). LG에는 한 선수가 「오스틴」(기록 있음)과 「오스틴 딘」(기록 없음) 두 줄로 있고 선수 ID가 같다. 이름이 다르므로 서로 다른 선수로 다루고, 곡 「오스틴」은 기록이 있는 쪽에 이어진다. 처음 데이터의 선수 곡 235곡은 모두 이어지고, 이어진 곡 모두 사진이 있으며 누끼는 173곡, 타석 기록은 229곡에 있다(`data/players.test.ts`가 이 숫자를 지킨다).

**정렬(`lib/playerSort.ts`).** `sortPlayerSongs(songs, sort, { playerOf, counts })`는 새 배열을 돌려준다. 주전순은 타석 수 내림차순이고 같으면 가나다, 기록이 없거나 이어지지 않은 곡은 맨 아래 가나다다. 가나다는 `localeCompare('ko')`에 등록 순서를 보조로 둔다. 자주 튼은 횟수 내림차순에 주전순을 보조로 둔다. 「자주 튼」의 순서에 쓰는 횟수는 MainPage가 화면을 열 때와 정렬을 고를 때 한 번 찍어 두고(`order` 상태), 곡을 누를 때마다 다시 정하지 않는다. 눌러서 칸이 옮겨 가면 연달아 다른 선수를 누르기 어렵기 때문이다. 칸의 「N번」 글자는 실시간 횟수라 바로 바뀐다. 팀을 바꾸면 MainPage가 새로 만들어져 그때의 횟수로 다시 정해진다.

**튼 기록(`lib/history.ts`, `context/HistoryContext.tsx`).** `recordPlay(history, id)`는 순수 함수로 횟수를 올리고 최근 곡 맨 앞에 놓는다(같은 id는 앞으로 옮기고 10개를 넘으면 가장 오래된 것을 뺌). `PlayerContext.play`가 곡을 틀 때 `recordPlay`를 부른다(종류 상관없이, 재생 성공 전에). 저장은 Prefs와 같은 방식이다. 상태가 바뀔 때 `saveHistory`를 부르고, 실패하면 다시 성공할 때까지 한 번만 알린다(EX-15, EX-31). `recentSongs(history, songs)`가 지운 곡의 id를 건너뛴다. 기록은 지우지 않아, 곡을 다시 등록하면 같은 id일 때만 횟수가 이어진다(가져오기는 새 id를 만들므로 사실상 이어지지 않는다). Provider 순서는 Notice → Prefs → History → Songs → Player다(Player가 History를 쓴다).

**선수 칸(`PlayerGrid`).** 칸은 `PressCell`이고, 안의 내용(`.player-cell-body`)은 이름(18/600) 아래에 포지션(12px, `--text-2`)과 「N번」(12px)이 세로로 쌓인다. 사진은 줄어들지 않는 `extra`로 칸 오른쪽 아래에 `position: absolute; right: 8px; bottom: 0`로 붙는다. 사진을 눌림 때 줄어드는 내용 안에 두면 `transform-origin: left center` 기준으로 줄어 사진이 아래 선에서 떠 버리기 때문이다(상황 칸의 단축키 번호와 같은 이유). 칸은 `min-height: 84`(이름 줄 10+22, 사진 50이 이름 줄 아래에서 시작) 하나로 정해 한 팀 격자의 칸 높이가 같고, 사진이 이름을 가리지 않는다. 이름은 한 줄이고 넘치면 말줄임이다. 포지션은 `max-width: calc(100% - 40px)`로 사진 왼쪽까지만 쓴다. 접근 가능한 버튼 이름은 곡 제목 그대로 두려고 포지션·횟수 글자는 `aria-hidden`이다.

**사진 자리(`PlayerPortrait`).** 크기는 칸 40×50, 검색 결과 줄 32×40(줄 왼쪽, 줄 아래 선에 붙음), 재생 줄 32×40(칸 안 가운데, 모서리 4px)이다. 사진 비율은 4:5다. 칸과 줄의 사진은 위쪽 모서리만 3px 둥글다(학생이 정한 예외 값. 판·칸은 4px, 버튼은 10px 규칙의 밖이다). 구단 기본 아바타를 항상 먼저 깔고 사진 `img`는 불러온 뒤(`onLoad`)에만 보이게(`opacity`) 한다. 사진 요청이 실패하면(`onError`) 사진 요소를 치운다. 그래서 불러오는 동안과 실패 뒤에도 깨진 그림 표시가 없고, 아바타로 매끄럽게 내려간다. 사진 주소는 사진이 있다고 표시된 선수만 요청한다(BR-51). 사진과 아바타는 장식이라 `alt=""`, `aria-hidden`이다. 검색 결과 줄과 재생 줄에서 선수 곡이 아닌 곡은 이전처럼 로고 판(`TeamLogo`)이다. 검색 결과에서 다른 팀 곡의 팀 로고 판 28과 팀 이름은 그대로 오른쪽에 둔다.

**기본 아바타 크기.** 원본 512px(260KB)를 `scripts/optimize-avatars.mjs`(sharp, `fit: 'inside'`, `withoutEnlargement`)로 256px WebP(품질 82, 5~6KB)로 줄여 `public/avatars/<팀ID>.webp`에 둔다(10개 합 약 56KB, 원본 2.6MB). 지금 칸은 40×50이라 3배 화면에서도 120×150이면 충분하지만, 다음 단계에서 키울 카드(가로 120px대, 2배 화면 기준 약 250px)에도 선명하도록 256px로 정했다. 더 키우면 파일만 커진다. 원본은 `assets/avatars-original/`(README 포함)에 두고 배포물에 넣지 않는다(로고의 `assets/teams-original`과 같은 방식). 사진 `object-fit: cover`, `object-position: center top`으로 네모 아바타를 4:5로 자른다.

**최근 곡(`MainPage`).** 검색칸의 `onFocus`·`onBlur`로 커서 여부를 알고, 커서가 있고 검색어가 비면 격자 대신 「최근 튼 곡」과 `SearchResults`(검색 결과와 같은 줄 모양, 같은 `onPick` 규칙)를 보여 준다. 줄을 누르면 재생하고, 다른 팀이면 그 팀으로 이동(BR-33)한 뒤 검색칸을 벗어난다. 휴대폰은 이 목록이 키보드가 올라온 화면에서 쓰는 주된 자리다. 노트북에서도 같은 동작으로 두었다(`/`로 검색칸에 가면 왼쪽 열에 나온다). 노트북 전용 고정 자리(예: 오른쪽 열이나 격자 위 줄)는 만들지 않았다. 오른쪽 열은 이미 플레이어·재생 줄·상황 칸·도구로 차 있고, 격자 위에 고정 줄을 두면 격자가 밀려 다음 단계의 노트북 배치와 부딪치기 때문이다. 노트북 배치를 다시 짤 때 고정 자리를 정한다.

**사진 파일 경로와 개발·배포.** 앱은 `/players/<팀ID>/<선수ID>.jpg`를 읽는다(누끼 `/players/<팀ID>/cutout/<선수ID>.webp`는 [STEP 3-⑫] 선수 카드에서 쓴다. 5.6). 사진은 저장소 밖 폴더(기본 위치 `../kbo-cheer-web-media/players/…`)에 있고 저장소·`public/`에는 넣지 않는다.

- 개발: `.env.local`의 `KBO_MEDIA_DIR`(VITE_ 접두사가 없어 브라우저 번들에 들어가지 않음)에 폴더를 적으면, `vite.config.ts`의 `playerMedia` 플러그인(`playerMediaPlugin.ts`)이 `/players/*`를 그 폴더의 `players/` 아래에서 내준다. 확장자는 `.jpg`·`.webp`만, 경로가 폴더 밖으로 나가는 요청은 막는다. 환경 변수가 없거나 폴더·파일이 없으면 404이고 화면은 아바타로 내려간다. `vite preview`에도 같은 플러그인이 붙는다.
- 배포: `npm run build:deploy`(`scripts/build-deploy.mjs`)가 폴더 확인 → `npm run build` → `players/`의 `.jpg`·`.webp`를 `dist/players/`로 복사한다. 폴더가 없거나 비어 있으면 빌드 전에 안내를 쓰고 실패한다. 폴더 위치는 `KBO_MEDIA_DIR`, 없으면 `../kbo-cheer-web-media`다. 그다음 `npx wrangler deploy`는 기존과 같다. 공개 주소는 없는 경로를 `index.html`로 돌려주므로(SPA), 사진이 없는 선수를 요청하면 HTML이 오는데, 이 경우에도 `img`가 그림이 아니라서 `onError`가 불려 아바타로 내려간다. 사진이 있다고 표시된 선수만 요청하므로 이런 일은 거의 없다.

### 5.6 매치업 보드와 선수 카드 [STEP 3-⑫]

넓은 화면은 휴대폰 화면을 옆으로 늘인 것이라 빈 곳만 많았다. 실제 경기(친구와 MLB The Show)에는 늘 두 팀이 있으므로, 넓은 화면은 두 팀의 선수를 나란히 두고 「전 팀」 없이 어느 팀이든 바로 누르게 했다. 재생 자리에는 지금 곡의 선수를 크게 보이는 선수 카드를 더했다. 이 배치는 학생(김도훈)이 정했다.

**나누는 폭.** 보드는 1200px부터다. 오른쪽 열이 392px이고 왼쪽 여백 24px씩, 두 열 사이 48px을 빼면 1200px에서 한 열이 약 344px이라 선수 칸(최소 128px)이 두 칸, 1280px에서 세 칸 들어간다. 그보다 좁으면 한 열에 두 칸도 빠듯해 두 팀을 나란히 둘 이유가 없다. 900~1199px은 지금의 한 팀 노트북 화면 그대로다. 768~899px(태블릿 세로)은 휴대폰 배치 그대로 둔다. 오른쪽 열(392px)을 두면 왼쪽 격자가 3칸이 안 되고, 아래에 붙는 독이 엄지로 누르기에 낫기 때문이다. JS가 배치를 알아야 하는 곳(보드를 그릴지, 휴대폰 재생 줄을 버튼으로 둘지)은 `hooks/useMediaQuery.ts`의 `BOARD_QUERY`(`(min-width: 1200px)`)·`NARROW_QUERY`(`(max-width: 899.98px)`)로 읽고, 값은 `index.css`의 `@media`와 같다. 처음 렌더에서 `matchMedia`를 바로 읽어 첫 화면이 깜박이지 않는다.

**두 칸의 뜻(URL, currentTeamId, prevTeamId).** 새 상태를 만들지 않고 기존 TeamState를 그대로 쓴다. 왼쪽 열은 URL의 팀(= currentTeamId), 오른쪽 열은 prevTeamId다. 휴대폰의 「전 팀」과 같은 값이라, 보드에서 고른 상대 팀은 휴대폰으로 좁히면 「전 팀: 삼성」으로 보이고 그 반대도 같다. 규칙은 `lib/matchup.ts`의 순수 함수다.

| 동작 | 보드에서 | 휴대폰·노트북(그대로) |
| --- | --- | --- |
| 왼쪽 팀 이름 → X 고르기 | 현재 팀 = X, 전 팀 그대로, URL `/team/X` | 머리말 팀 버튼: 현재 팀 = X, 전 팀 = 원래 현재 팀(BR-26) |
| 오른쪽 팀 이름(또는 「상대 팀 고르기」) → Y 고르기 | 전 팀 = Y, 현재 팀·URL 그대로 | 없음 |
| 다른 칸에 있는 팀 고르기 | 두 칸이 맞바뀐다(「전 팀」을 누른 것과 같은 결과). 빈 오른쪽 칸에 왼쪽 팀을 고르면 바뀌지 않는다 | 없음 |
| 어느 열의 곡이든 누르기 | 재생만. 열, URL, 팀 상태 모두 그대로 | 그대로 |
| 검색 결과·최근 곡 누르기 | 보이는 두 팀의 곡이면 재생만, 그 밖의 팀이면 그 팀으로 이동(현재 팀 = 그 팀, 전 팀 = 원래 현재 팀. BR-33) | 다른 팀이면 이동(BR-33) |
| `T` | 상황 칸의 팀을 다른 팀으로(열은 그대로). 상대 팀이 없으면 아무것도 안 함 | 전 팀으로 이동 |
| 「전 팀」 버튼, 머리말 팀 버튼 | 보드에서는 숨긴다. 매치업 머리의 두 팀 이름이 같은 일을 한다 | 그대로 |

- `assignTeam(state, slot, teamId)`가 한 칸을 바꾼 새 TeamState를 돌려주고, PrefsContext의 `assignTeam(slot, teamId)`가 이것으로 상태를 바꾼다. 현재 팀이 바뀌면 MainPage가 `navigate`도 한다. 둘을 한 `startTransition` 안에서 부른다. React Router 7의 `BrowserRouter`는 주소 변경을 transition으로 그리므로, 상태만 먼저 그려지면 한 프레임 동안 오른쪽 열이 잘못된 팀을 보이기 때문이다. URL이 바뀐 뒤 TeamLayout의 `visitTeam`은 이미 같은 팀이라 아무것도 하지 않는다. 그래서 `visitTeam` 기록 규칙(BR-26)은 손대지 않았다.
- `matchupOf(urlTeamId, teamState)`가 화면에 놓을 두 팀을 정한다. 저장된 현재 팀이 URL과 같으면 저장된 두 팀이고, 다르면(검색 결과·뒤로 가기·주소 입력으로 URL만 먼저 바뀐 렌더) `visitTeam`이 곧 만들 짝(URL 팀, 원래 현재 팀)을 미리 보인다. 그래서 오른쪽 열이 한 번 깜박이지 않는다.
- 새로고침하면 URL이 왼쪽, 저장된 전 팀이 오른쪽이다. 휴대폰과 같은 저장값이라 따로 저장하는 것이 없다.

**휴대폰 정렬 [STEP 3-⑪ 후속].** 폭 899px 이하에서는 정렬 세 버튼(`.sort-toggle`) 대신 탭 오른쪽에 지금 정렬 이름과 아래 화살표만 보이는 버튼(`SortPicker`, 44px 높이)을 두고, 누르면 Sheet 「선수 정렬」에서 고른다. 고른 항목은 밝은 판(반전)과 Check 아이콘, 고르면 시트가 닫힌다. 360·390px에서 탭 줄이 두 줄(101px)에서 한 줄(49px)이 되어 격자 첫 줄이 255px에서 203px로 올라왔다. 노트북(900px 이상)과 매치업 보드는 세 버튼 그대로다. 둘 다 DOM에 있고 CSS로 하나만 보인다. 정렬 이름 목록은 `lib/playerSort.ts`의 `GRID_SORTS` 하나를 함께 쓴다.

**정렬은 두 열 공통.** 정렬은 이미 모든 팀에 공통인 설정(BR-35)이고 "나는 주전순으로 찾는다" 같은 사람의 버릇이라 팀마다 다를 이유가 없다. 열마다 두면 정렬 버튼이 두 벌이 되고 저장값도 늘어난다. 그래서 정렬 버튼은 검색칸 오른쪽에 한 벌만 두고 두 열에 함께 적용한다. 「자주 튼」 순서에 쓰는 횟수도 MainPage가 한 번 찍어 두 열에 함께 넘긴다(5.5). 탭(선수 | 팀 응원가)은 열마다 따로다. 한쪽은 선수, 다른 쪽은 팀 응원가를 보는 일이 있기 때문이다.

**보드 모양.** 머리말에는 왼쪽에 앱 이름 「KBO 응원가」, 오른쪽에 화면 링크가 남는다(팀 버튼과 「전 팀」은 `.app:has(.board)`일 때 숨김). [STEP 3-⑭] 앱 이름은 17px/700, `--text-2`(바탕 대비 7.58)로 매치업 머리의 팀 이름(22/700, `--text`)보다 작고 흐리게 두어 두 팀 이름과 겨루지 않는다. 1199px 이하에서는 숨긴다(팀 버튼이 그 자리에 있다). 그 아래 검색칸과 정렬 한 줄, 매치업 머리(로고 판 44 + 팀 이름 22/700 + 아래 화살표, 가운데 「vs」 13px 셋째 글자), 두 팀 열이다. 매치업 머리와 두 열은 같은 격자 선(`1fr 48px 1fr`)에 맞춰, 팀 이름이 그 팀 열 바로 위에 온다. 두 열 사이 48px 가운데에 1px 세로선을 둔다. 선수 칸은 보드에서 128px 이상, 높이 100, 사진 48×60으로 키웠다(이름 줄 10+22.5 아래 40px부터 사진이 시작해 겹치지 않는다. 포지션 글자는 사진 왼쪽까지 `calc(100% - 52px)`). 검색 중에는 휴대폰처럼 검색 결과가 두 열 자리를 대신한다. 오른쪽 열이 비면 「상대 팀을 고르면 두 팀의 선수를 나란히 볼 수 있습니다」(빈 상태 문구)를 두고, 매치업 머리 오른쪽 자리는 「상대 팀 고르기」 버튼(Plus 아이콘)이다. 팀 고르기 창은 같은 TeamSheet이고 제목만 「팀 고르기」/「상대 팀 고르기」로 다르다.

**아주 넓은 화면.** 앱 전체(`.app`)에 `max-width: 1680px; margin-inline: auto`를 둔다. 1920px에서는 양옆 120px씩 바탕색(#131211)만 남고 장식은 없다. 오른쪽 열은 `clamp(392px, 28vw, 480px)`라 1920px에서 480px, 두 팀 열은 약 552px씩(선수 칸 4개)이다. 1680px보다 넓으면 오른쪽 열 바깥에도 1px 선을 그어 열이 바탕에 묻히지 않게 한다. 고정 위치인 알림과 팀 고르기 창은 `--app-left`(앱 왼쪽 끝)로 앱 안쪽에 맞춘다.

**상황 칸의 팀.** 상황 칸은 마지막으로 누른 곡(선수·팀 응원가·상황, 검색·최근 곡·단축키 포함)의 팀을 따른다. 한화 타자를 누르면 한화 상황 칸, 삼성 타자를 누르면 삼성 상황 칸이 되어, 공격 팀이 바뀌는 대로 따라간다. 상황 칸 위의 두 팀 탭(로고 판 28 + 팀 이름, `role="tab"`)으로 직접 바꿀 수 있고, `T`도 다른 팀으로 바꾼다. 단축키 `1`~`8`은 보이는 상황 칸을 따른다. 상태는 MainPage의 `lastPicked`(마지막으로 누른 곡의 팀, 탭으로 고른 팀) 하나이고, `situationTeamOf(lastPicked, 두 팀)`가 보이는 두 팀 중 하나면 그 팀, 아니면 왼쪽 팀을 고른다. 화면을 새로 열 때는 재생 중인 곡의 팀에서 시작한다. 상대 팀이 없거나 보드가 아니면 늘 URL 팀이다(휴대폰·노트북은 그대로). 고른 팀에 상황 곡이 없으면 「이 팀에는 상황 곡이 없습니다」를 쓴다. 단축키 안내는 보드에서 「T 상황 팀」이다.

**선수 카드(`PlayerCard`).** 넓은 화면 오른쪽 열(플레이어 아래)과 휴대폰의 지금 재생 시트에 같은 컴포넌트를 쓴다. 카드는 높이 140px의 무대와 그 아래 글자 두 줄이다.

- 무대 아래 30%(42px)가 판이다. 판만 그 곡의 팀 색(`--band`)으로 칠한다. 5.4절의 "팀 색은 띠와 플레이어 영역에만"에서 이 판이 플레이어 영역이다. 판 위에는 글자를 두지 않는다. 팀 색 10가지 모두와 글자 대비를 맞출 수 없기 때문이다(한화 #FF6600 위에서 #F1ECE3은 2.3).
- 누끼(`/players/<팀>/cutout/<선수ID>.webp`, 208×260 투명 PNG를 WebP로 줄인 4:5 상반신)는 무대 높이 그대로(140×112) 판 바닥에 가운데로 선다. 그래서 가슴 아래는 판 위에, 머리와 어깨는 판 위 어두운 바탕에 올라온다. 판 왼쪽 위에 로고 판 28을 둔다(판 위쪽 끝에서 8px 아래, 왼쪽 8px). 누끼 주소는 누끼가 있다고 표시된 선수만 요청한다(`cutoutUrl`, 처음 데이터 235곡 중 173곡). 불러오기 전에는 보이지 않고(`opacity`), 못 불러오면 사진 카드로 내려간다.
- 누끼가 없으면 4:5 사진 카드(96×120, 판 바닥에서 8px 위, 모서리 3px)가 판 위에 선다. 사진도 없으면 같은 자리에 구단 기본 아바타다(`PlayerPortrait`의 `card` 크기, 5.5의 아바타 위에 사진을 덮는 방식 그대로).
- 선수 곡이 아니면(팀 응원가, 상황) 판 가운데에 큰 로고 판(88px)이 판 바닥에서 12px 위에 선다. 로고 판 크기는 28·36·44만 쓰는 규칙(5.4)의 예외로, 이 자리 하나에만 88을 쓴다(학생이 정함).
- 카드 아래 첫 줄은 이름(22/700, #F1ECE3), 둘째 줄은 「구단 · 포지션」(13px, #ABA49A). 선수 곡이 아니면 「한화 · 팀 응원가」, 「한화 · 상황」이고, 포지션이 없거나 이어지지 않은 선수는 「한화」만 쓴다(`cardSubtitle`).
- 곡이 없을 때(첫 곡 전, 정지 뒤): 판은 누른 색(#252320)이고 그 위에 아무것도 없다. 아래는 「선택한 곡 없음」(17/600, #ABA49A)이고 둘째 줄은 빈 줄로 높이를 지킨다. 재생 줄의 「대기 중 · 선택한 곡 없음」과 같은 말이고, 카드 높이가 그대로라 첫 곡을 틀 때 아래 상황 칸이 밀리지 않는다.
- 넓은 화면에서는 이름과 구단·포지션이 카드에 있으므로 재생 줄의 사진, 곡 이름, 팀 이름을 감추고 「지금 재생 00:12 / 00:49 · 응원가 00:30」 한 줄만 둔다.
- 1280×800에서 오른쪽 열은 플레이어 자리 205(띠 3 포함), 카드 200(무대 140, 이름 줄 12+28, 둘째 줄 20. 곡이 없을 때도 같다), 재생 줄, 상황 탭과 칸까지 화면 안에 들어오고(상황 칸 아래 끝 726px), 단축키 안내와 도구(지금을 응원가 시작으로, 볼륨)는 열을 스크롤해야 보인다. 도구는 경기 중이 아니라 준비할 때 쓰는 것이라 아래에 둔다.

**휴대폰 지금 재생 시트.** 휴대폰 배치는 바꾸지 않았다(바꾸기 전과 뒤에 360×640·390×844 화면을 첫 곡 전·재생 중으로 찍어 비교하면 플레이어 영상 안쪽 말고는 같은 그림이고, 주요 요소의 위치·크기가 모두 같다). 재생 줄의 사진·곡 이름·시간 자리를 버튼(`.now-open`, 겉모양은 줄 그대로)으로 감싸, 누르면 「지금 재생」 시트(같은 `Sheet`)가 열린다. 시트에는 선수 카드, 4px 진행 막대(응원가 눈금 포함), 17px 「경과 / 길이」와 오른쪽에 「응원가 00:30」이 있다. 응원가로·정지·더보기 버튼은 이 버튼 밖 형제라 누르면 원래 일만 한다. 곡이 없으면 버튼은 비활성이다(곡이 있을 때와 같은 요소로 둬야 곡을 멈추고 틀 때마다 재생 줄 글자가 다시 만들어지지 않는다). 시트 판의 최대 높이는 `100dvh - 260px`(머리말 57 + 플레이어 203)이라 재생 중인 플레이어(360×200)를 덮지 않고, 뒤는 다른 시트처럼 어둡게 덮지 않는다. 360×640에서 시트는 309px에서 시작하고 플레이어 아래 끝은 260px이다. 화면이 900px 이상으로 넓어지면 시트는 닫힌 것으로 본다.

**최근 곡.** 보드에서도 검색칸에 커서를 두면 두 열 자리에 「최근 튼 곡」이 나오는 지금 방식 그대로다(5.5). 왼쪽은 두 팀 열이 다 쓰고 오른쪽 열은 플레이어·카드·상황 칸으로 차 있어 고정 자리를 따로 두지 않았다. 최근 곡이 보이는 두 팀의 곡이면 재생만, 그 밖이면 그 팀으로 옮겨 간다(위 표).

**플레이어 iframe.** PlayerPanel과 PlayerHost는 AppLayout에 한 번만 있고, 보드·한 팀 화면·휴대폰 배치는 CSS로만 바꾼다. 보드의 오른쪽 열 팀을 바꿔도, 휴대폰 폭으로 줄였다가 넓혀도 같은 iframe 요소인 것을 E2E(TC-89)가 iframe에 붙인 표시로 확인한다.

## 6. 컴포넌트 구조

### 6.1 계층

```
App
└ BrowserRouter
  └ NoticeProvider
    └ PrefsProvider
      └ HistoryProvider                          [STEP 3-⑪]
        └ SongsProvider
          └ PlayerProvider
            └ Routes
            └ AppLayout
              ├ Header
              │ ├ 팀 버튼 → TeamSheet(dialog) → TeamGrid [디자인 개편]
              │ ├ PrevTeamButton
              │ └ NavLink 메뉴
              ├ Outlet
              │ ├ HomeRedirect → TeamSelectPage → TeamGrid
              │ ├ TeamLayout
              │ │ └ Outlet key={teamId}
              │ │   ├ MainPage
              │ │   │ ├ SearchBox (넓은 화면은 정렬 버튼과 한 줄) [STEP 3-⑫]
              │ │   │ ├ SearchResults          (검색어 있을 때)
              │ │   │ ├ 최근 튼 곡 → SearchResults (검색칸에 커서, 검색어 없을 때) [STEP 3-⑪]
              │ │   │ ├ TeamColumn             (휴대폰·노트북: URL 팀 하나) [STEP 3-⑫]
              │ │   │ │ ├ PlayerGrid → PlayerPortrait (선수 탭)
              │ │   │ │ ├ TeamSongList         (팀 응원가 탭)
              │ │   │ │ └ EmptyState           (팀에 곡이 없을 때)
              │ │   │ ├ 매치업 보드              (넓은 화면) [STEP 3-⑫]
              │ │   │ │ ├ MatchupHeader → TeamSheet(현재 팀 / 상대 팀)
              │ │   │ │ ├ TeamColumn(현재 팀)
              │ │   │ │ └ TeamColumn(전 팀) 또는 「상대 팀」 빈 상태
              │ │   │ └ SituationTeamTabs(넓은 화면, 두 팀일 때), SituationGrid, 단축키 안내 (PlayerPanel의 .dock-situations에 포털로) [디자인 개편, STEP 3-⑫]
              │ │   ├ SongListPage
              │ │   │ └ SongRow × N
              │ │   ├ SongEditPage
              │ │   │ └ SongForm
              │ │   └ ImportPage
              │ │     ├ DataApiNotice
              │ │     ├ UrlInputForm / VideoSearchForm
              │ │     ├ CandidateTable
              │ │     └ SongForm               (단일 영상 등록)
              │ └ SettingsPage
              └ PlayerPanel
                ├ PlayerHost                (player-stage 안)
                ├ PlayerCard                (넓은 화면 오른쪽 열, 휴대폰 지금 재생 시트) [STEP 3-⑫]
                ├ 재생 줄: PlayerPortrait(선수 곡) 또는 TeamLogo
                ├ VolumeSlider              (「지금을 응원가 시작으로」와 함께. 노트북은 player-tools, 휴대폰은 재생 도구 시트)
                ├ Sheet                     (재생 도구 시트, 휴대폰) [디자인 개편 후속]
                ├ Sheet                     (지금 재생 시트, 휴대폰. PlayerCard와 큰 진행 막대) [STEP 3-⑫]
                └ Toast                     (독 안) [STEP 3-7]
```

### 6.2 책임과 Props

| 컴포넌트 | 책임 | Props | 쓰는 Context |
| --- | --- | --- | --- |
| AppLayout | 공통 틀, 플레이어·알림 상시 표시, 상황 버튼 자리를 `SituationSlotContext`로 제공 [STEP 3-7] | 없음 | Prefs |
| Header | 팀 버튼(로고 판 36, 팀 이름)과 팀 고르기 창, 전 팀 버튼, 화면 메뉴. 팀은 `useMatch`로 URL에서 먼저 읽음 [R-24, 디자인 개편] | `teamId: TeamId \| null` | 없음 |
| Sheet | 아래에서 올라오는 창. `<dialog>`를 `showModal()`로 열고, 제목과 닫기 버튼, Esc·바깥 누르기로 닫힘, 닫는 움직임이 끝난 뒤 `close()` [디자인 개편 후속] | `open: boolean`, `title: string`, `titleId: string`, `className?: string`, `focusSelector?: string`, `onClose(): void`, `children: ReactNode` | 없음 |
| TeamSheet | 팀 고르기 창. Sheet에 TeamGrid를 넣고 지금 팀에 포커스 [디자인 개편]. [STEP 3-⑫] 매치업 머리가 「상대 팀 고르기」 제목으로도 쓴다. 빈 칸이면 포커스할 팀이 없다 | `open: boolean`, `title?: string`(기본 「팀 고르기」), `currentTeamId: TeamId \| null`, `onClose(): void`, `onPick(teamId: TeamId): void` | 없음 |
| TeamGrid | 10개 팀 로고 5×2 격자(첫 실행 화면과 팀 고르기 창이 함께 씀) [디자인 개편] | `currentTeamId: TeamId \| null`, `onPick(teamId: TeamId): void` | 없음 |
| TeamLogo | 밝은 판 위 팀 로고, 못 읽으면 팀 짧은 이름 [디자인 개편]. 88은 선수 카드의 선수 곡이 아닌 곡에만 [STEP 3-⑫] | `teamId: TeamId`, `size: 28 \| 36 \| 44 \| 88` | 없음 |
| PrevTeamButton | 「전 팀」: 맞바꿈 아이콘 + 전 팀 로고 판 28, 이름 "전 팀: 삼성"(BR-27) | 없음 | Prefs |
| Toast | 알림 한 줄, 4초 뒤 사라짐, 누르면 바로 닫힘 [STEP 3-7] | 없음 | Notice |
| HomeRedirect | 마지막 팀으로 `<Navigate>` 또는 팀 선택 화면 | 없음 | Prefs |
| TeamSelectPage | 10개 팀 로고 격자(TeamGrid) | 없음 | 없음(useNavigate) |
| TeamLayout | teamId 검사, 팀 방문 기록(`visitTeam`), `<Outlet key={teamId}>` [R-23]. 두 칸(현재 팀, `matchupOf`의 전 팀)의 직전 팀을 기억해 열이 들어올 방향 `ColumnEnter`를 Outlet context로 넘김 [STEP 3-⑫] | 없음 | Prefs |
| MainPage | 검색어·검색칸 커서 상태, 최근 곡, 「자주 튼」 순서 횟수, 상황 칸 팀(`lastPicked`)과 `situationSlots`로 상황 칸 만들기, 단축키 연결, 상황 칸을 독 자리에 포털로 그림 [STEP 3-7, 디자인 개편, STEP 3-⑪]. [STEP 3-⑫] 넓은 화면(`useMediaQuery(BOARD_QUERY)`)이면 매치업 보드를 그리고, 팀 칸 바꾸기(`assignTeam` + `navigate`를 한 transition으로), 보드 밖 팀 곡의 이동(`leavesMatchup`)을 맡음 | 없음 | Songs, Prefs, History, Player, SituationSlot |
| TeamColumn | 한 팀의 「선수 N \| 팀 응원가 N」 탭과 선수 격자·팀 응원가 목록, 곡이 없으면 EmptyState. 열이 둘이면 `idPrefix`로 탭·패널 id를 나눔. 들어올 방향이 있으면 팀 전환 움직임 [STEP 3-⑫] | `teamId: TeamId`, `songs: Song[]`, `idPrefix: string`, `sort: GridSort`, `sortCounts: Readonly<Record<string, number>>`, `counts?: Readonly<Record<string, number>>`, `nowPlayingId: string \| null`, `enterFrom: SwitchDirection`, `sortControl?: ReactNode`, `onPlay(song: Song): void` | 없음 |
| MatchupHeader | 넓은 화면의 두 팀 이름(로고 판 44, 이름, 아래 화살표)과 「vs」, 전 팀이 없으면 「상대 팀 고르기」. 누른 칸의 팀 고르기 창(TeamSheet)을 연다 [STEP 3-⑫] | `matchup: Matchup`, `onPick(slot: Slot, teamId: TeamId): void` | 없음 |
| SituationTeamTabs | 상황 칸 위 두 팀 탭(로고 판 28 + 이름, `role="tab"`) [STEP 3-⑫] | `teams: readonly TeamId[]`, `selected: TeamId`, `panelId: string`, `onSelect(teamId: TeamId): void` | 없음 |
| PlayerCard | 지금 곡의 선수 카드: 팀 색 낮은 판 위 누끼(없으면 4:5 사진, 없으면 아바타), 판 왼쪽 위 로고 판 28, 선수 곡이 아니면 로고 판 88. 아래 이름과 「구단 · 포지션」. 곡이 없으면 빈 판과 「선택한 곡 없음」. 곡이 바뀌면 페이드 [STEP 3-⑫] | `song: Song \| null` | 없음 |
| SearchBox | 검색 입력칸. 커서 여부를 `onFocus`·`onBlur`로 알린다(최근 곡) | `value: string`, `onChange(v: string): void`, `inputRef: RefObject<HTMLInputElement \| null>`, `onFocus?(): void`, `onBlur?(): void` | 없음 |
| SearchResults | 검색 결과·최근 곡 목록(52px 줄), 선수 곡은 왼쪽에 사진 32×40, 다른 팀 결과에 로고 판 28과 팀 이름 | `hits: SearchHit[]`, `nowPlayingId: string \| null`, `onPick(song: Song): void` | 없음 |
| PlayerGrid | 선수 칸 격자(휴대폰 3열, 칸 높이 84): 이름, 포지션, 「자주 튼」일 때 「N번」, 오른쪽 아래 사진 [STEP 3-⑪] | `songs: Song[]`, `nowPlayingId: string \| null`, `counts?: Readonly<Record<string, number>>`, `onPlay(song: Song): void` | 없음 |
| PlayerPortrait | 구단 아바타 위에 선수 사진을 덮는 사진 자리. 사진이 없거나 실패하면 아바타만. `cell` 40×50(넓은 화면 보드는 48×60), `row`·`dock` 32×40 [STEP 3-⑪], `card` 96×120(선수 카드, 누끼가 없을 때) [STEP 3-⑫] | `teamId: TeamId`, `player: PlayerInfo \| null`, `size: 'cell' \| 'row' \| 'dock' \| 'card'` | 없음 |
| TeamSongList | 팀 응원가 목록(번호와 제목, 52px 줄) | `songs: Song[]`, `nowPlayingId: string \| null`, `onPlay(song: Song): void` | 없음 |
| SituationGrid | 상황 칸 4×2(칸 높이 52), 상황 이름과 필요할 때만 곡 제목 줄(`situationLabel`), 빈 칸은 누를 수 없음, 노트북에서 칸마다 단축키 번호 [디자인 개편, 후속] | `cells: (Song \| null)[]`, `nowPlayingId: string \| null`, `onPlay(song: Song): void` | 없음 |
| EmptyState | 곡 없음 문구, 가져오기 링크(EX-16). 메인과 곡 관리에서 함께 씀 | `teamId: TeamId` | 없음 |
| StatusMessage | 빈 상태·불러오는 중·오류·안내 문구 한 가지 모양 [STEP 3-7] | `tone: 'empty' \| 'loading' \| 'error' \| 'info'`, `children: ReactNode`, `action?: ReactNode` | 없음 |
| PlayerPanel | [STEP 3-⑫] 플레이어 아래 선수 카드 자리(넓은 화면에서만 보임), 휴대폰에서 재생 줄의 사진·글자 자리를 버튼으로 감싸 지금 재생 시트(카드, 굵은 진행 막대, 경과/길이)를 엶. (재생 줄에 선수 곡은 사진, 그 밖은 로고 판) 플레이어 자리(재생 중 곡의 팀 색 띠, 휴대폰은 첫 곡 전에 접힘), 도구 줄(「지금을 응원가 시작으로」, 볼륨. 휴대폰은 더보기 버튼이 여는 재생 도구 시트), 독(진행 막대, 재생 줄, 응원가로, 정지, 더보기, 알림, 상황 칸 자리). 응원가 시작 버튼 활성 여부와 진행 시간을 250ms마다 스스로 갱신 [C-10, STEP 3-7] | `situationSlotRef(el: HTMLDivElement \| null): void` | Player, Songs, Prefs |
| PlayerHost | 플레이어가 들어갈 DOM 자리 | 없음 | Player(`attachHost`) |
| VolumeSlider | 볼륨 0~100, iOS 안내(EX-24) | `value: number`, `onChange(v: number): void`, `supported: boolean` | 없음 |
| SongListPage | 팀 곡을 종류별로 나열 | 없음 | Songs, Player |
| SongRow | 곡 한 줄(종류, 이름, 구간, 수정·삭제) | `song: Song`, `onEdit(id: string): void`, `onDelete(song: Song): void` | 없음 |
| SongEditPage | songId·teamId가 모두 맞는 곡 찾기, 없으면 안내(EX-29), 저장 후 곡 관리로 이동 [C-14] | 없음 | Songs |
| SongForm | 이름·종류·시작·끝·응원가 시작 입력과 검증(BR-19~21), 같은 제목 상황 곡 경고(BR-43) [C-08] | `initial: SongFormValues`, `videoId: string`, `videoDuration: number`, `isDuplicateSituationTitle(title: string): boolean`, `submitLabel: string`, `onSubmit(fields: SongFields): void`, `onCancel(): void` | 없음 |
| ImportPage | 가져오기 단계 관리(입력→불러오는 중→확인/단일 등록), 요청 취소, 저장 중 표시 [C-05, R-21] | 없음 | Songs, Notice |
| DataApiNotice | 키 없음·LAN 접속 안내(EX-06, EX-20) | `reason: 'noKey' \| 'lanHost'` | 없음 |
| UrlInputForm | URL 입력, 형식 검사(EX-01) | `disabled: boolean`, `onSubmit(videoId: string): void` | 없음 |
| VideoSearchForm | YouTube 검색어 입력, 결과 목록 | `disabled: boolean`, `onPick(videoId: string): void` | 없음 |
| CandidateTable | 후보 표. 선택·종류·이름·시작 시각 고치기, 경고·이미 있음·중복·같은 이름 표시 | `rows: CandidateRow[]`, `videoId: string`, `onChange(key: number, patch: Partial<Pick<ImportCandidate, 'kind' \| 'title' \| 'startText' \| 'selection'>>): void`, `disabled: boolean` | 없음 |
| SettingsPage | 내보내기, 가져오기(확인), 되돌리기(확인), 접속 주소 표시 [C-15, R-08] | 없음 | Songs, Notice |

```ts
/** SongForm 입력값(시각은 문자열로 받아 검증 후 초로 바꾼다) */
interface SongFormValues {
  title: string;
  kind: SongKind;
  startText: string;
  endText: string;
  cheerStartText: string;  // 비우면 null
}
/** SongForm이 검증을 통과시킨 값 */
interface SongFields {
  title: string;
  kind: SongKind;
  start: number;
  end: number;
  cheerStart: number | null;
}
/** 검색 결과 한 건 */
interface SearchHit {
  song: Song;
  team: Team;
  isCurrentTeam: boolean;
}
```

- 화면 조각(SearchBox, PlayerGrid, SituationGrid 등)은 Context를 쓰지 않고 Props만 받는다. 페이지가 데이터를 골라 내려주므로 조각은 그리기만 하고, 테스트와 재사용이 쉽다.
- SongForm은 수정(FR-15)과 단일 영상 등록(FR-13)에 함께 쓴다.
  - `isDuplicateSituationTitle`은 페이지가 "같은 팀에 normalize 제목이 같은 다른 상황 곡이 있는가"로 만들어 넘긴다. 수정 중인 곡 자신은 뺀다.
  - 결과가 true면 "같은 제목의 상황 곡이 이미 있습니다. 상황 버튼이 두 개 생깁니다" 경고를 보여 주되 저장은 막지 않는다(BR-43). [R-14, C-08]
- 재생 버튼(PlayerGrid, SituationGrid, TeamSongList, SearchResults)은 `onMouseDown={e => e.preventDefault()}`로 마우스 클릭 때 포커스를 가져가지 않는다. 키보드 Tab으로 고를 때의 포커스 표시는 그대로 남는다(12.5). [R-06]
- 「저장」(가져오기), 「삭제」, JSON 가져오기, 되돌리기 버튼은 누르는 즉시 처리 중 상태로 바꿔 다시 누를 수 없게 한다. [R-21]

## 7. 상태 관리 설계

### 7.1 상태를 어디에 두나

| 상태 | 위치 | 방식 | 이유 |
| --- | --- | --- | --- |
| 곡 목록 | SongsContext | useReducer | 여러 화면(메인, 곡 관리, 수정, 가져오기, 설정, 플레이어)이 같이 읽고 바꾼다. 바꾸는 방법이 5가지로 정해져 있어 리듀서가 맞다 |
| 현재 팀·전 팀 | PrefsContext | useState | 머리말, 처음 화면, TeamLayout이 쓴다. 단순 값 두 개라 리듀서까지 필요 없다 |
| 볼륨·격자 정렬 | PrefsContext | useState | 플레이어(볼륨)와 메인 화면(정렬)이 쓴다 |
| 튼 횟수·최근 곡 | HistoryContext | useState + 순수 함수 `recordPlay` | 플레이어(기록하기)와 메인 화면(횟수·최근 곡 표시)이 쓴다. 곡 목록과 따로 저장한다(BR-49) [STEP 3-⑪] |
| 검색칸 커서 여부, 「자주 튼」 순서에 쓴 횟수 | MainPage | useState | 메인 화면 안에서만 쓴다. 팀이 바뀌면 새로 만들어진다 [STEP 3-⑪]. 「자주 튼」 횟수는 보드의 두 열이 함께 쓴다 [STEP 3-⑫] |
| 보드의 두 팀(어느 팀이 어느 칸인가) | PrefsContext의 TeamState(왼쪽 = URL = currentTeamId, 오른쪽 = prevTeamId) | 기존 useState + 순수 함수 `assignTeam`, 화면에 놓을 짝은 `matchupOf`로 파생 | 휴대폰의 「전 팀」과 같은 값이라 화면 폭이 바뀌어도 두 팀이 이어진다. 새 저장값이 없다 [STEP 3-⑫] |
| 상황 칸 팀(마지막으로 누른 곡의 팀, 탭으로 고른 팀) | MainPage | useState(`TeamId \| null`) + 순수 함수 `situationTeamOf` | 상황 칸과 단축키 1~8이 함께 따른다. 화면을 열 때 재생 중인 곡의 팀에서 시작한다. 저장하지 않는다 [STEP 3-⑫] |
| 선수 탭 / 팀 응원가 탭 | TeamColumn | useState | 열마다 따로다. 팀이 바뀌면 열이 새로 만들어져 선수 탭으로 돌아간다 [STEP 3-⑫] |
| 넓은 화면인가, 휴대폰인가 | `useMediaQuery` | useState + useEffect(`matchMedia` 구독) | 보드와 휴대폰 재생 줄 버튼처럼 DOM이 달라지는 곳만 JS로 본다. 나머지 배치는 CSS가 맡는다 [STEP 3-⑫] |
| 지금 재생 시트 열림 | PlayerPanel | useState(boolean) | 휴대폰에서만 연다. 넓어지면 닫힌 것으로 본다 [STEP 3-⑫] |
| 재생 중 곡(ID·구간), 재생 상태, 플레이어 준비 여부 | PlayerContext | useState + 같은 값의 ref | 화면은 state로, 타이머·이벤트 처리기는 ref로 읽는다 [R-04, C-11] |
| YouTube 플레이어 객체, 타이머, 대기 중 재생 요청 | PlayerContext | useRef | 화면을 다시 그릴 필요가 없는 값이다 |
| 「지금을 응원가 시작으로」 활성 여부 | PlayerPanel | useState(boolean) | 재생 위치에 따라 바뀌므로 PlayerPanel이 스스로 주기적으로 계산한다. 값이 바뀔 때만 다시 그린다 [C-10] |
| 알림 문구 | NoticeContext | useState | Provider 안 어디서든(저장 실패, 재생 오류) 알림을 띄운다 |
| 검색어 | MainPage | useState | 메인 화면 안에서만 쓴다. 팀이 바뀌면 `<Outlet key={teamId}>`로 새로 만들어져 비워진다(BR-29) [R-23] |
| 가져오기 단계·후보 | ImportPage | useState | 저장 전에는 다른 화면과 공유하지 않는다(BR-08). 후보의 파생 값은 상태로 두지 않는다 [C-08, C-09] |
| 폼 입력값·오류 | SongForm | useState | 저장 전 임시 값이다 |

Provider 순서는 의존 관계 순이다: Notice(아무도 의존 안 함) → Prefs(알림) → History(알림) → Songs(알림) → Player(곡 목록: 최신 곡 읽기·삭제 감지, 설정: 볼륨, 튼 기록, 알림).

### 7.2 SongsContext (useReducer + Context)

```ts
// src/context/songsReducer.ts
export interface SongsState { songs: Song[] }

export type SongsAction =
  | { type: 'ADD_SONG'; song: Song }            // 등록(단일 영상)
  | { type: 'UPDATE_SONG'; song: Song }         // 수정, 응원가 시작 지정
  | { type: 'DELETE_SONG'; id: string }         // 삭제
  | { type: 'IMPORT_SONGS'; songs: Song[] }     // 가져오기 저장(여러 곡 추가)
  | { type: 'REPLACE_ALL'; songs: Song[] };     // JSON 가져오기, 처음 데이터로 되돌리기

export function songsReducer(state: SongsState, action: SongsAction): SongsState {
  switch (action.type) {
    case 'ADD_SONG':     return { songs: [...state.songs, action.song] };
    case 'UPDATE_SONG':  return { songs: state.songs.map(s => s.id === action.song.id ? action.song : s) };
    case 'DELETE_SONG':  return { songs: state.songs.filter(s => s.id !== action.id) };
    case 'IMPORT_SONGS': return { songs: [...state.songs, ...action.songs] };
    case 'REPLACE_ALL':  return { songs: action.songs };
  }
}
```

```ts
// src/context/SongsContext.tsx 가 제공하는 값
interface SongsContextValue {
  songs: Song[];
  addSong(draft: SongDraft): Song;          // id·order를 붙여 ADD_SONG
  updateSong(song: Song): void;
  deleteSong(id: string): void;
  importSongs(drafts: SongDraft[]): number; // 저장한 곡 수. drafts의 teamId가 모두 같아야 한다 [R-28]
  replaceAll(songs: Song[]): void;
  resetToSeed(): void;                      // REPLACE_ALL(처음 데이터). 확인은 호출하는 화면이 받는다
}
export function useSongs(): SongsContextValue;  // Provider 밖이면 오류(수업 useCart와 같은 방식)
```

- 초기화: `useReducer(songsReducer, seed, init)`의 init에서 `loadSongs(seed)`를 부른다. status가 corrupt·unavailable이면 마운트 후 `useEffect`로 한 번 알림(EX-14, EX-15).
- 저장: `useEffect(() => { if (!saveSongs(state.songs)) notify(저장 실패) }, [state.songs])`.
- 팀별 목록과 종류별 목록은 상태로 따로 두지 않고 `songs.filter(...)`로 그때그때 만든다. 같은 데이터를 두 곳에 두면 어긋날 수 있기 때문이다. 600곡 수준이라 매 렌더링 필터링해도 느리지 않다.
- 되돌리기 확인(FR-22, BR-39): SettingsPage가 `window.confirm("곡 목록을 처음 데이터(N곡)로 되돌립니다. 지금 곡 목록과 지정한 응원가 시작 지점이 사라집니다")`를 받은 경우에만 `resetToSeed()`를 부른다. 취소하면 아무것도 바뀌지 않는다. [C-15]

### 7.3 PrefsContext

```ts
interface PrefsContextValue {
  teamState: TeamState;
  visitTeam(teamId: TeamId): void;  // BR-26
  assignTeam(slot: 'current' | 'prev', teamId: TeamId): void;  // 보드의 한 칸만 바꾼다(BR-53) [STEP 3-⑫]
  settings: Settings;
  setVolume(v: number): void;       // 0~100으로 자름
  setGridSort(s: GridSort): void;
}
```

```
visitTeam(x):
  setTeamState(prev => prev.currentTeamId === x ? prev
                       : { currentTeamId: x, prevTeamId: prev.currentTeamId })
```

- `TeamLayout`이 `useEffect(() => visitTeam(teamId), [teamId])`로 부른다. 그래서 팀 메뉴, 「전 팀」, 검색 결과, 주소창 직접 입력, 뒤로가기 어느 경로로 팀이 바뀌어도 같은 규칙으로 기록된다. StrictMode에서 effect가 두 번 돌아도 두 번째는 같은 팀이라 바뀌지 않는다.
- 「전 팀」은 `navigate('/team/' + prevTeamId)`만 한다. 도착한 TeamLayout이 `visitTeam`을 불러 현재·전 팀이 맞바뀐다(BR-27).
- [STEP 3-⑫] `assignTeam(slot, x)`는 `setTeamState(prev => assignTeam(prev, slot, x))`다(`lib/matchup.ts`). 보드에서 팀 이름을 눌러 고를 때만 쓴다. 현재 팀이 바뀌면 MainPage가 같은 `startTransition` 안에서 `navigate`하고, 도착한 TeamLayout의 `visitTeam`은 이미 같은 팀이라 아무것도 하지 않는다. 그래서 전 팀이 원래 현재 팀으로 밀려나지 않는다(5.6 표).

### 7.4 PlayerContext

```ts
type PlayerApiState = 'loading' | 'loaded' | 'failed';        // 스크립트 상태
type PlaybackStatus = 'idle' | 'starting' | 'playing' | 'fading';

interface PlayerContextValue {
  apiState: PlayerApiState;
  playerReady: boolean;                // onReady를 받았는가(플레이어 객체 존재와 구분) [C-01]
  status: PlaybackStatus;
  nowPlaying: NowPlaying | null;       // 곡 ID와 시작 당시 구간 [R-28]
  canControlVolume: boolean;           // iOS면 false(NFR-10)
  play(song: Song): void;
  stop(): void;                        // 페이드아웃 후 정지(BR-41)
  skipToCheer(): void;                 // FR-06
  getCurrentTime(): number | null;
  attachHost(el: HTMLDivElement | null): void;
}
```

- nowPlaying에는 곡 ID와 재생을 시작한 순간의 `{ videoId, start, end }`만 둔다. 이렇게 하면 두 규칙이 별도 갱신 함수 없이 함께 지켜진다. [R-28]
  - 구간(start, end)은 시작 당시 값으로 고정되므로 "재생 중인 곡을 수정하면 다음에 누를 때부터 새 값"이다(BR-24).
  - 곡 이름, 종류, 응원가 시작 지점은 늘 최신 곡 목록에서 `songs.find(s => s.id === nowPlaying.songId)`로 읽는다. 그래서 「지금을 응원가 시작으로」으로 지점을 저장하면 「응원가로」가 바로 활성이 된다(FR-19).
- 곡 목록에서 nowPlaying.songId가 사라지면(삭제, JSON 가져오기, 되돌리기) `useEffect([songs])`가 감지해 바로 멈추고, 대기 중 재생 요청도 지운다(BR-24, BR-40). [C-02]
- 「지금을 응원가 시작으로」(PlayerPanel) [C-10]:

```
// 활성 여부: 재생 중인 동안 250ms마다 계산, 값이 바뀔 때만 setState
useEffect(() => {
  if (!nowPlaying) { setCanCheerHere(false); return }
  const id = setInterval(() => {
    const t = getCurrentTime(); const song = 최신 곡
    const ok = t !== null && song?.kind === 'player' && song.start < Math.floor(t) && Math.floor(t) < song.end
    setCanCheerHere(prev => prev === ok ? prev : ok)
  }, 250)
  return () => clearInterval(id)
}, [nowPlaying, songs])

onCheerHere():
  t = getCurrentTime(); song = 최신 곡
  if t === null or song 없음 or song.kind !== 'player' → return
  sec = Math.floor(t)
  if !(song.start < sec < song.end) → return        // EX-23
  updateSong({ ...song, cheerStart: sec })            // 최신 곡에서 읽으므로 「응원가로」 바로 활성
```

## 8. YouTube 플레이어 연동

### 8.1 스크립트 로드 [R-05, R-13, C-12]

```ts
// src/player/youtubeIframe.ts
let scriptEl: HTMLScriptElement | null = null;
let apiPromise: Promise<void> | null = null;

export function loadYouTubeIframeApi(timeoutMs = 10000): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  const p = new Promise<void>((resolve, reject) => {
    let settled = false;
    const settle = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      ok ? resolve() : reject(new Error('youtube-iframe-api'));
    };
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prevReady?.(); settle(true); };
    if (!scriptEl) {                       // 아직 불러오는 중인 스크립트가 있으면 새로 넣지 않는다
      scriptEl = document.createElement('script');
      scriptEl.src = 'https://www.youtube.com/iframe_api';
      scriptEl.onerror = () => { scriptEl?.remove(); scriptEl = null; settle(false); };
      document.head.appendChild(scriptEl);
    }
    const timer = setTimeout(() => settle(window.YT?.Player !== undefined), timeoutMs);
  });
  apiPromise = p;
  p.catch(() => { if (apiPromise === p) apiPromise = null; });  // 이 요청이 실패했을 때만 비운다
  return p;
}
```

- 타입은 DefinitelyTyped의 `@types/youtube`(전역 `YT` 네임스페이스)와 2절의 `youtube-global.d.ts`를 쓴다. `any` 없이 `YT.Player`, `YT.PlayerState`, `YT.OnStateChangeEvent`를 쓸 수 있다. [R-12]
- 시간 초과로 실패해도 `<script>`는 지우지 않는다. 늦게라도 로드되면 다음 시도에서 `window.YT.Player`가 있어 바로 성공한다. 스크립트 로드 자체가 실패(onerror)했을 때만 지우고 새로 넣는다. 그래서 스크립트가 두 개 들어가지 않는다. [R-13, C-12]
- `settled` 플래그로 성공·실패·시간 초과 중 처음 한 번만 처리하고, 끝나면 타이머를 지운다. 늦게 온 이전 요청의 실패가 새 요청의 `apiPromise`를 비우지 않도록 `apiPromise === p`를 확인한다. [C-12]
- PlayerProvider가 처음 마운트될 때 바로 불러온다. 첫 버튼을 누를 때 기다리지 않게 하기 위해서다(NFR-03). 실패 상태에서 재생을 누르면 "플레이어를 불러오지 못했습니다" 알림 후 다시 시도한다(EX-10). [STEP 4-2, K-01] 스크립트를 받은 뒤 플레이어 iframe의 `onReady`가 10초(`READY_TIMEOUT_MS`) 안에 오지 않아도 같은 실패로 본다. apiState를 'failed'로 바꿔 그 플레이어를 치우고, 기다리던 곡이 있으면 알린다. 다음에 곡을 누르면 플레이어를 새로 만든다.

### 8.2 플레이어 하나를 만들고 정리하기 [R-05, C-01, C-02]

```
// 스크립트 로드: 시도 번호(apiAttempt)가 바뀔 때마다
useEffect(() => {
  let cancelled = false
  setApiState('loading')
  loadYouTubeIframeApi()
    .then(() => { if (!cancelled) setApiState('loaded') })
    .catch(() => { if (!cancelled) setApiState('failed') })
  return () => { cancelled = true }
}, [apiAttempt])

// 생성: 스크립트 로드 완료 + host 있음, 두 조건을 보는 effect 하나에서만 만든다
useEffect(() => {
  if (apiState !== 'loaded' || !hostEl) return
  const inner = document.createElement('div'); hostEl.appendChild(inner)
  let alive = true
  const p = new YT.Player(inner, {
    width: '100%', height: '100%',
    playerVars: { playsinline: 1, controls: 0, disablekb: 1, rel: 0, origin: location.origin },
    events: {
      onReady:           () => { if (!alive) return; readyRef.current = true; setPlayerReady(true); runPending() },
      onStateChange:     e => { if (alive) handleStateChange(e.data) },
      onError:           e => { if (alive) handleError(e.data) },
      onAutoplayBlocked: () => { if (alive) handleAutoplayBlocked() },
    },
  })
  playerRef.current = p
  return () => {
    alive = false
    clearAllTimers(); pendingRef.current = null
    readyRef.current = false; setPlayerReady(false)
    p.destroy(); playerRef.current = null; inner.remove()
  }
}, [apiState, hostEl])
```

- `attachHost`는 `useState`의 setter(`setHostEl`)를 그대로 콜백 ref로 쓴다. host를 기록만 하고, 생성은 위 effect 하나에서만 한다. 생성 경로가 하나라 StrictMode의 "마운트 → 정리 → 다시 마운트"에서도 플레이어가 두 개 생기지 않는다. [R-05]
- `alive` 플래그로, 정리된 플레이어의 늦은 이벤트(onReady 등)가 새 상태를 바꾸지 못하게 한다. [C-02]
- 플레이어 객체가 있는 것과 API를 부를 수 있는 것은 다르다. 모든 플레이어 호출은 `readyRef.current`가 true일 때만 하고, 그 전에는 대기 요청으로 둔다(8.3). [C-01]
- IFrame API는 넘긴 div를 iframe으로 바꿔 끼운다. React가 그리는 div를 직접 넘기면 React의 DOM과 충돌하므로, React는 빈 바깥 div만 그리고 안쪽 div는 직접 만들어 넘긴다.
- PlayerHost는 라우트가 바뀌어도 사라지지 않는 AppLayout 안에 있다. 그래서 팀을 바꾸거나 곡 관리 화면으로 가도 재생이 이어진다(BR-06).
- `playsinline: 1`은 iOS에서 전체 화면으로 바뀌지 않게, `disablekb: 1`은 플레이어 자체 단축키가 앱 단축키(BR-36)와 겹치지 않게 하기 위해서다.

### 8.3 구간 재생과 끝 시각 정지 (FR-05, BR-01~03, NFR-04) [R-01, R-10, C-03]

끝 시각은 두 겹으로 지킨다.

1. 플레이어 자체 끝 시각: 모든 재생을 `loadVideoById({ videoId, startSeconds: start, endSeconds: end })`로 시작한다. 브라우저가 앱의 타이머를 늦추는 경우에도(게임을 전체 화면으로 해서 브라우저 창이 가려짐) 플레이어가 끝 시각에 멈춘다. [R-10, C-03]
2. 앱 감시 타이머: 공식 문서는 "endSeconds를 준 뒤 seekTo를 부르면 endSeconds가 더는 적용되지 않는다"고 쓴다. 그래서 「응원가로」(seekTo) 뒤에는 앱 타이머만 끝 시각을 지킨다. 페이드도 이 타이머가 시작한다.

```
play(song):
  cancelFade(); clearAutoplayCheck(); pendingRef.current = null
  seg = { songId: song.id, videoId: song.videoId, start: song.start, end: song.end }
  segRef.current = seg; setNowPlaying(seg)
  setStatusBoth('starting'); seekAtRef.current = performance.now()
  if apiState === 'failed': notify(EX-10); setApiAttempt(n + 1)
  if !readyRef.current: pendingRef.current = song; return       // onReady에서 runPending() [C-01]
  player.setVolume(volumeRef.current)
  player.loadVideoById({ videoId: seg.videoId, startSeconds: seg.start, endSeconds: seg.end })
  startAutoplayCheck()                                           // 8.6

runPending():  // onReady에서
  song = pendingRef.current; pendingRef.current = null
  if song이 있고 segRef.current?.songId === song.id: play(song)  // 그 사이 정지·삭제됐으면 재생하지 않음 [C-02]

// 감시 타이머: nowPlaying이 있는 동안 늘 200ms 간격 (status와 무관) [R-01]
useEffect(() => {
  if (!nowPlaying) return
  const id = setInterval(tick, 200)
  return () => clearInterval(id)
}, [nowPlaying])

tick():   // ref만 읽는다 [R-04, C-11]
  seg = segRef.current; if !seg or !readyRef.current: return
  state = player.getPlayerState(); t = player.getCurrentTime()
  if state === PLAYING and statusRef.current === 'starting': setStatusBoth('playing')   // 이벤트가 안 와도 [R-01]
  if performance.now() - seekAtRef.current < 1500 and (t < seg.start - 1 or t > seg.end + 1): return   // 이동 전 위치 무시 [R-01]
  trackBuffering(state)                                                                // 8.6
  if canControlVolume and statusRef.current === 'playing' and state === PLAYING and t >= seg.end - 1:
    startFade(seg.end - t)
  if t >= seg.end: finish()
```

- 재생 여부는 이벤트(onStateChange)에만 기대지 않고 매 확인 때 `getPlayerState()`로 직접 읽는다. 상태가 그대로 PLAYING이면 이벤트가 다시 오지 않을 수 있기 때문이다. [R-01]
- `loadVideoById`나 `seekTo` 직후 1.5초 동안은 `getCurrentTime()`이 이동 전 위치를 돌려줄 수 있다. 그래서 구간에서 크게 벗어난 값은 무시한다. 그렇지 않으면 30:00 곡에서 5:00~6:00 곡으로 바꿀 때 새 곡이 바로 끊길 수 있다. [R-01]
- 감시 간격 200ms는 정지 오차의 상한이 아니다. 메인 스레드가 바쁘거나 탭이 가려지면 더 늦게 돈다. 그래서 끝 시각의 1차 보장은 플레이어의 endSeconds가 맡고, 타이머는 응원가로 뒤의 끝 시각과 페이드를 맡는다. [C-03]
- 같은 곡을 다시 누르면 `play`가 그대로 다시 불려 시작 시각으로 돌아간다(BR-03). 다른 곡을 누르면 페이드를 취소하고 바로 바꾼다(BR-01, BR-41).
- STEP 3 측정 항목: 같은 모음 영상 안에서 `loadVideoById`로 곡을 바꾸는 시간이 1초를 넘으면, 같은 영상일 때만 `seekTo(start) + playVideo()`로 바꾼다. 그 경우 끝 시각은 앱 타이머만 지키므로, 창이 가려진 상태의 정지 오차를 함께 잰다. 측정 전 기본값은 언제나 `loadVideoById`다.

### 8.4 응원가로 이동 (FR-06, BR-04)

```
skipToCheer():
  seg = segRef.current; song = songsRef.current.find(s => s.id === seg?.songId)   // 최신 곡 [R-28]
  if readyRef.current and song?.kind === 'player' and song.cheerStart !== null
     and seg.start < song.cheerStart < seg.end:
    seekAtRef.current = performance.now()
    player.seekTo(song.cheerStart, true)          // 이 뒤로 endSeconds는 풀리고 앱 타이머가 끝 시각을 지킨다
```

PlayerPanel은 같은 조건으로 버튼 활성 여부를 정한다. 구간 안 검사는 "재생 중에 응원가 시작 지점을 구간 밖으로 수정한 경우"를 막는다.

### 8.5 페이드아웃 (FR-25, BR-41) [C-04]

```
stop():
  pendingRef.current = null
  if !segRef.current: return
  if fadingRef.current: finish(); return                 // 페이드 중 정지를 한 번 더 누르면 바로 멈춤 [C-04]
  if !canControlVolume or !readyRef.current: finish(); return   // iOS: 바로 정지(EX-24)
  startFade(1)

startFade(durationSec):
  if fadingRef.current: return                           // 끝 시각 페이드가 두 번 시작되지 않게 [C-04]
  cancelFade(); fadingRef.current = true; setStatusBoth('fading')
  from = volumeRef.current; step = 0; steps = 10
  fadeTimerRef.current = setInterval(() => {
    step++; player.setVolume(Math.round(from * (1 - step / steps)))
    if step >= steps: finish()
  }, durationSec * 100)

cancelFade():
  clearInterval(fadeTimerRef.current); fadeTimerRef.current = null; fadingRef.current = false

finish():
  cancelFade(); clearAutoplayCheck(); pendingRef.current = null
  if readyRef.current: pausingByAppRef.current = true; player.pauseVideo(); player.setVolume(volumeRef.current)
  segRef.current = null; setNowPlaying(null); setStatusBoth('idle')
```

- 페이드 타이머는 언제나 `cancelFade()`로 이전 것을 지운 뒤 새로 만든다. 타이머 참조를 잃어버린 채 남는 일이 없다. `play()`도 맨 앞에서 `cancelFade()`를 부르므로, 이전 페이드가 새 곡의 볼륨을 줄이지 않는다. [C-04]
- 볼륨 복구는 `volumeRef.current`(지금 설정값)로 한다. 페이드 도중 볼륨을 바꿔도 다음 곡이 옛 값으로 나오지 않는다. [R-04]
- 페이드는 「정지」와 끝 시각 도달 때만 한다. 끝 시각 페이드는 `end - 1`초에 시작해 남은 시간 동안 줄이므로 끝 시각 안에서 끝난다(NFR-04).
- `canControlVolume`은 `env.ts`의 `isIOS()`가 false일 때 true다. iOS 판별: userAgent에 iPhone·iPad·iPod가 있거나, `platform === 'MacIntel'`이면서 터치 지점이 2개 이상(아이패드 데스크톱 모드).
- 볼륨 슬라이더가 바뀌면 `volumeRef`를 갱신하고, 페이드 중이 아닐 때 `player.setVolume`을 부른다(FR-24).

### 8.6 상태 변화, 오류, 자동 재생 제한 [R-02, R-11, R-12, C-13]

```
handleStateChange(state):
  PLAYING   → if !fadingRef.current: setStatusBoth('playing')
  ENDED     → finish()                                         // endSeconds 도달 또는 영상 끝
  PAUSED    → if pausingByAppRef.current: pausingByAppRef.current = false   // 앱이 멈춘 것
              else if segRef.current: finish(); notify('재생이 멈췄습니다')  // 전화 수신 등 외부 요인 [R-11]
  BUFFERING → bufferingSinceRef.current ??= performance.now()

trackBuffering(state):   // tick에서
  if state !== BUFFERING: bufferingSinceRef.current = null; return
  if performance.now() - bufferingSinceRef.current > 8000 and 아직 안내 안 함:
    notify('네트워크가 느려 재생이 늦어지고 있습니다')           // 멈추지는 않는다 [C-13]
```

`endSeconds` 도달 때 플레이어가 PAUSED나 ENDED 중 무엇을 보내든 둘 다 `finish()`로 끝나므로 결과가 같다.

- 구현 중 브라우저에서 확인한 것(2026-11-15): 앞 곡이 끝난(ENDED) 상태에서 `loadVideoById`를 부르면, 새 곡을 불러온 직후(약 30ms, 위치 0초) ENDED가 한 번 더 온다. 그래서 불러온 직후 1.5초 안에, 새 곡이 아직 한 번도 PLAYING이 되지 않았을 때 오는 ENDED·PAUSED 중 위치가 새 곡의 끝 시각 ±1초 밖(구간 앞이든 뒤든)인 것은 이전 로드에서 남은 신호로 보고 무시한다(`lib/playback.ts`의 `isLeftoverStop`). [STEP 4-2, K-02] 처음에는 PLAYING을 받은 뒤에도 1.5초 동안 무시해, 재생 직후 실제로 멈춘 것을 놓쳤다. 또 위치가 끝 시각보다 앞일 때만 무시해, 뒤 챕터에서 앞 챕터로 바꿀 때 이전 위치(구간 뒤)의 ENDED가 새 곡을 끊을 수 있었다(코드 검토의 확인 필요 항목). PLAYING을 받으면 자동 재생 확인 타이머도 지운다. 또 「응원가로」(seekTo) 뒤에도 끝 시각에서 ENDED가 와서, 이번 확인에서는 seekTo 뒤에도 endSeconds가 유지됐다. 앱 감시 타이머는 그대로 두 번째 안전장치로 남긴다.

| 상황 | 감지 | 처리 |
| --- | --- | --- |
| `onError` 2 | 잘못된 영상 ID | finish() 후 "이 곡을 재생할 수 없습니다(영상 주소가 잘못됐습니다)" |
| `onError` 5 | HTML5 플레이어 오류 | finish() 후 "이 곡을 재생할 수 없습니다(브라우저 재생 오류)" |
| `onError` 100 | 영상 없음·비공개 | finish() 후 "이 곡을 재생할 수 없습니다(영상이 삭제됐거나 비공개입니다)" |
| `onError` 101, 150 | 퍼가기 금지 | finish() 후 "이 곡을 재생할 수 없습니다(퍼가기가 막힌 영상입니다)" |
| `onError` 153 | 리퍼러·클라이언트 식별 정보 없음 | finish() 후 "재생 정보를 확인하지 못했습니다(페이지 설정 문제)" [R-12, C-13] |
| `onError` 그 밖의 코드 | 목록에 없는 값 | finish() 후 "이 곡을 재생할 수 없습니다" [C-13] |
| 자동 재생 제한(EX-12) | `onAutoplayBlocked` 이벤트. 보조로, play 후 3초가 지나도 `getPlayerState()`가 PLAYING·BUFFERING이 아님 | 재생 상태(nowPlaying)는 그대로 두고 "영상을 한 번 직접 눌러 재생을 허용해 주세요" 안내 [R-02] |
| 오래 버퍼링(EX-27) | BUFFERING이 8초 넘게 이어짐 | 안내만 하고 계속 기다림 [C-13] |
| 외부 요인 일시정지(EX-28) | 앱이 부르지 않은 PAUSED | finish() 후 안내 [R-11] |
| 스크립트 로드 실패(EX-10) | loader reject | apiState 'failed', 재생 누르면 알림 후 재시도 |
| 플레이어 준비 실패(EX-10) [STEP 4-2] | 스크립트는 받았는데 `onReady`가 10초 안에 안 옴 | apiState 'failed'로 플레이어 정리, 기다리던 곡이 있으면 알림, 다음 재생 때 새로 만듦 |
| 네트워크 끊김(EX-09) | 스크립트 실패 또는 오래 버퍼링 | 위 처리로 안내 |

- onError의 `e.data`는 `const code: number = e.data`로 숫자로 받아 비교한다. `@types/youtube`의 `PlayerError` 열거형에는 153이 없기 때문이다. [R-12]
- 자동 재생이 막혔을 때 nowPlaying을 지우지 않는 이유: 사용자가 플레이어를 직접 누르면 그 곡이 재생되고, 감시 타이머가 그대로 끝 시각을 지켜야 하기 때문이다. 앱 버튼을 다시 누르라는 안내는 같은 이유로 다시 막힐 수 있어 쓰지 않는다. [R-02]
- 재생은 항상 버튼 클릭 처리 함수 안에서 바로 `loadVideoById`를 부른다. 다른 팀 검색 결과도 `play(song)`을 먼저 부르고 그다음 `navigate`한다. 플레이어 준비 전에 누른 곡(대기 요청)은 onReady에서 재생하는데, 이때는 사용자 동작 밖이라 막힐 수 있고 그러면 위 안내가 뜬다.
- 휴대폰 실기기 확인은 구현이 끝난 뒤 학생(김도훈)이 직접 한다. STEP 3에서는 데스크톱 브라우저와 Playwright 모바일 화면 크기로 확인한다.

### 8.7 정리(cleanup)

- 플레이어를 정리할 때(8.2 생성 effect의 cleanup) 다음을 모두 지운다: 감시·페이드·자동 재생 확인 타이머, 대기 중 재생 요청(`pendingRef`), 준비 플래그(`readyRef`), 플레이어 객체(`destroy()`), 안쪽 div. [C-02]
- 감시 타이머는 nowPlaying이 바뀔 때마다 effect cleanup으로 지우고 새로 건다.
- `stop()`과 `finish()`는 플레이어가 없거나 준비 전이어도 안전하게 동작한다(플레이어 호출은 `readyRef` 확인 뒤에만). [C-02]
- 정리된 플레이어의 늦은 이벤트는 `alive` 플래그로 막는다(8.2).

## 9. 검색 알고리즘

### 9.1 초성 추출 (BR-31)

```ts
// src/lib/hangul.ts
const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

function toChosung(s: string): string {
  // 완성형 한글(U+AC00~U+D7A3)은 (코드 - 0xAC00) / 588 의 몫으로 초성을 구한다
  // 그 밖의 글자(영문, 숫자)는 그대로 둔다
}
function isChosungOnly(q: string): boolean;   // 모든 글자가 ㄱ~ㅎ 호환 자모(U+3131~U+314E)인지
function normalize(s: string): string;        // 공백 제거 + 소문자
```

예: `toChosung('노시환') === 'ㄴㅅㅎ'`, `toChosung('KT위즈') === 'KTㅇㅈ'`.

### 9.2 찾기와 정렬 (FR-10, BR-30~34)

```
searchSongs(songs, query, currentTeamId):
  q = normalize(query); if q === '' → []
  chosung = isChosungOnly(q)
  hits = []
  for 각 song (10개 구단 전체):
    target = chosung ? toChosung(normalize(song.title)) : normalize(song.title)
    pos = target.indexOf(q)
    if pos >= 0: hits.push({ song, pos })
  정렬 키(앞이 우선) [R-28]:
    1. 현재 팀 여부(현재 팀 먼저)          ← BR-32
    2. 앞부분 일치 여부(pos === 0 먼저)
    3. order
  같으면 곡 목록 순서 그대로(안정 정렬)
```

- 정렬 키를 셋으로 줄였다. 팀 순서와 종류 순서는 결과가 수십 개일 때만 차이가 나고, 수용 기준은 위 세 키로 모두 만족한다. [R-28]
- 매번 600곡의 초성을 다시 구하지 않도록 MainPage에서 `useMemo`로 `{ song, norm, cho }` 색인을 곡 목록이 바뀔 때만 만든다.
- 결과를 누르면 `play(song)` 다음, 다른 팀 곡이면 `navigate('/team/' + song.teamId)`. 팀이 바뀌면 MainPage가 새로 만들어져 검색어가 비워진다(BR-29, BR-33).
- 결과 없음 → "검색 결과가 없습니다"(EX-17). 검색어가 비면 격자·목록으로 돌아간다(BR-34).

## 10. Data API 호출 모듈과 오류 분류

### 10.1 함수

```ts
// src/api/youtubeData.ts
export type DataApiError =
  | 'noKey'          // 키 미설정(EX-06)
  | 'lanHost'        // 허용 출처(DATA_API_ORIGINS)가 아닌 주소(EX-20)
  | 'keyRejected'    // 키 무효, 리퍼러 불일치(EX-07)
  | 'quotaExceeded'  // 할당량 초과(EX-08)
  | 'network'        // fetch 실패(EX-09)
  | 'notFound'       // 영상 없음(EX-02)
  | 'unknown';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: DataApiError };

export function dataApiAvailability(): { ok: true } | { ok: false; error: 'noKey' | 'lanHost' };
export function fetchVideo(videoId: string, signal: AbortSignal): Promise<ApiResult<VideoInfo>>;
export function searchVideos(query: string, signal: AbortSignal): Promise<ApiResult<VideoSearchItem[]>>;
export function errorMessage(error: DataApiError): string;
```

| 함수 | 호출 | 할당량 |
| --- | --- | --- |
| fetchVideo | `GET /youtube/v3/videos?part=snippet,contentDetails,status&id=<ID>&key=<키>` | 1 |
| searchVideos | `GET /youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=10&q=<검색어>&key=<키>` | 100 |

- 키는 `import.meta.env.VITE_YOUTUBE_API_KEY`로만 읽는다. `vite-env.d.ts`에 `readonly VITE_YOUTUBE_API_KEY?: string`을 선언한다. 키를 콘솔이나 화면에 찍지 않는다(NFR-07).
- `dataApiAvailability`는 fetch 전에 검사한다. 키가 비었으면 noKey, `location.origin`이 `lib/env.ts`의 `DATA_API_ORIGINS`(`https://kbocheer.kdhoon.me`, `http://localhost:5173`, `http://127.0.0.1:5173`)에 없으면 lanHost. 목록은 API 키의 리퍼러 제한과 같게 둔다. 목록 밖 주소에서는 API를 부르지 않는다(BR-18, EX-20). [공개 배포] 호스트 이름만 보던 것을 포트까지 포함한 출처로 바꿨다. 리퍼러 제한도 출처 단위라 다른 포트의 localhost는 키가 거절되기 때문이다.
- 퍼가기 금지·라이브·연령 제한은 API 오류가 아니라 정상 응답의 내용이라, `DataApiError`에 넣지 않고 ImportPage가 `VideoInfo`를 보고 판단한다(10.4).
- 검색은 `videoEmbeddable=true`로 퍼가기 가능한 영상만 받는다. 그래도 고른 영상은 fetchVideo로 다시 확인한다.
- 응답은 `unknown`으로 받아 `isVideoListResponse` 같은 타입 가드로 필요한 필드만 검사해 꺼낸다. `contentDetails.duration`(예: `PT1H4M50S`, 라이브는 `P0D`)은 `lib/time.ts`의 `parseIsoDuration`으로 초로 바꾼다. `contentDetails.contentRating.ytRating === 'ytAgeRestricted'`면 `ageRestricted: true`. [R-20]

### 10.2 오류 분류 규칙

2026-11-15에 실제 키로 확인한 응답을 근거로 정했다.

| 조건 | 실제 응답(확인함) | 분류 |
| --- | --- | --- |
| fetch가 예외를 던짐(TypeError) | - | network |
| fetch가 AbortError | - | 결과를 버리고 아무것도 표시하지 않음 |
| 200, `items`가 빈 배열 | 없는 ID `AAAAAAAAAAA` → `items: []` | notFound |
| 403, `errors[].reason`이 `quotaExceeded` 또는 `dailyLimitExceeded` | (문서 기준, 재현 안 함) | quotaExceeded |
| 403, `errors[].reason === 'forbidden'` | 리퍼러 없음 → `ACCESS_DENIED`, LAN 리퍼러 → `API_KEY_HTTP_REFERRER_BLOCKED` | keyRejected |
| 400, `details[].reason === 'API_KEY_INVALID'` | 틀린 키 → `400 badRequest / API_KEY_INVALID` | keyRejected |
| 그 밖 | - | unknown |

| 분류·판단 | 화면 문구 |
| --- | --- |
| noKey | API 키가 없어 곡 가져오기를 쓸 수 없습니다 |
| lanHost | 이 주소(LAN 주소)에서는 곡 가져오기를 쓸 수 없습니다. https://kbocheer.kdhoon.me에서 등록하거나 JSON 내보내기·가져오기로 옮겨 주세요 |
| keyRejected | API 키 설정을 확인해 주세요 |
| quotaExceeded | 오늘 YouTube API 사용량을 다 썼습니다. 내일 다시 시도해 주세요 |
| network | 네트워크 연결을 확인해 주세요 |
| notFound | 영상을 찾을 수 없습니다 |
| unknown | YouTube 정보를 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요 |
| 퍼가기 금지(EX-03) | 이 영상은 다른 사이트에서 재생할 수 없어 등록할 수 없습니다 |
| 라이브(EX-25) | 라이브 영상은 등록할 수 없습니다 |
| 연령 제한(EX-26) | 연령 제한 영상은 이 앱에서 재생되지 않아 등록할 수 없습니다 |

### 10.3 URL 해석 (BR-09, EX-01)

```
extractVideoId(input):
  s = input.trim(); if s === '' → null
  if /^[A-Za-z0-9_-]{11}$/.test(s) → s
  url = new URL(s에 'http'로 시작하지 않으면 'https://'를 붙여서)   // 실패하면 null
  host = url.hostname에서 앞의 'www.'를 뺀 값
  if host === 'youtu.be'                       → id = 경로 첫 조각
  if host ∈ {'youtube.com','m.youtube.com'}:
    경로 '/watch'        → id = url.searchParams.get('v')
    경로 '/shorts/<id>'  → id = 두 번째 조각
    경로 '/embed/<id>'   → id = 두 번째 조각
  id가 11자 형식이면 id, 아니면 null
```

- `searchParams.get('v')`만 읽으므로 `&pp=`, `&t=`, `&list=`, `?si=`는 저절로 무시된다.

### 10.4 가져오기 화면 단계 [C-05, R-20, R-21]

```ts
type ImportError = DataApiError | 'badUrl' | 'notEmbeddable' | 'live' | 'ageRestricted';

type ImportPhase =
  | { phase: 'input'; error: ImportError | null }
  | { phase: 'loading' }
  | { phase: 'review'; video: VideoInfo; candidates: ImportCandidate[]; saving: boolean }
  | { phase: 'single'; video: VideoInfo; saving: boolean };
```

```
onSubmit(videoId):     // UrlInputForm(형식 검사 통과) 또는 VideoSearchForm(결과 선택)
  requestRef.current?.abort()                                   // 앞 요청 취소 [R-21]
  const ctrl = new AbortController(); requestRef.current = ctrl
  setPhase({ phase: 'loading' })
  const r = await fetchVideo(videoId, ctrl.signal)
  if (requestRef.current !== ctrl) return                       // 마지막 요청이 아니면 버림 [R-21]
  if (!r.ok) { setPhase({ phase: 'input', error: r.error }); return }          // [C-05]
  const video = r.data
  if (!video.embeddable)  { setPhase({ phase: 'input', error: 'notEmbeddable' }); return }
  if (video.duration === 0) { setPhase({ phase: 'input', error: 'live' }); return }          // [R-20]
  if (video.ageRestricted)  { setPhase({ phase: 'input', error: 'ageRestricted' }); return } // [R-20]
  const candidates = parseDescription(video.description)
  if (candidates.length === 0) setPhase({ phase: 'single', video, saving: false })   // EX-04, FR-13
  else                         setPhase({ phase: 'review', video, candidates, saving: false })

// 화면을 떠나면
useEffect(() => () => requestRef.current?.abort(), [])
```

- 실패 분기는 모두 그 자리에서 `return`한다. `ApiResult`가 판별 유니온이라 `r.ok`를 확인하기 전에는 `r.data`에 접근할 수 없고, TypeScript가 이를 막아 준다. [C-05]
- 확인 화면 렌더링: `rows = evaluateCandidates(candidates, video, 현재 팀 곡)`(4절). 표 위에 "선수 N · 상황 N · 팀 응원가 N / 저장 N곡" 요약을 보여 준다. `willSave`가 0곡이면 「저장」 비활성(EX-05).
- 후보 행 표시:

| 평가 결과 | 표시 | 체크박스 |
| --- | --- | --- |
| warning 있음 | 원래 설명란 줄, "시각이 앞뒤 줄과 맞지 않습니다. 영상에서 확인해 고쳐 주세요", YouTube 링크 | 비활성 |
| duplicate | "같은 상황 곡 있음(저장 안 함)" | 비활성 |
| existing | "이미 있음" | 기본 해제, 사용자가 켤 수 있음 |
| sameNamePlayer | "같은 이름 있음" | 기본 선택 유지 |

- 경고 줄의 YouTube 링크는 앞 정상 후보의 시작 시각에서 연다(`https://www.youtube.com/watch?v=<ID>&t=<초>s`, 새 탭). EX-19 문구 "영상에서 확인해 고쳐 주세요"를 실제로 할 수 있게 하기 위해서다.
- 「저장」을 누르면 먼저 `saving: true`로 바꿔 표와 버튼을 비활성화한 뒤 `importSongs`를 부르고 이동한다. 두 번 눌러 곡이 두 배로 들어가지 않는다. [R-21]
- 단일 등록 폼 초기값: 이름 = 영상 제목 앞 30자, 종류 = 상황 곡, 시작 = 0, 끝 = 영상 길이.

## 11. 처음 데이터 만드는 절차 (FR-18, D-01)

처음 데이터는 별도 스크립트가 아니라 앱의 가져오기 기능(FR-11, FR-12)과 내보내기 기능(FR-20)으로 만든다.

1. `src/data/seed-songs.json`을 곡 0개인 파일(`{ "format": "kbo-cheer-songs", "version": 1, "exportedAt": "...", "songs": [] }`)로 두고 시작한다. 처음 데이터 검사는 `allowEmpty: true`라 빈 목록도 통과한다.
2. 노트북 `http://localhost:5173`에서 LocalStorage를 비우고 앱을 연다. 곡이 없으므로 각 팀 화면에 빈 상태(EX-16)가 나온다.
3. 10개 팀마다 `/team/<팀>/import`에서 해당 모음 영상 URL을 넣는다.

| 팀 | 영상 |
| --- | --- |
| 키움 | https://www.youtube.com/watch?v=cSMSbK4bVBw |
| 한화 | https://www.youtube.com/watch?v=0OUzosfuD0s |
| 롯데 | https://www.youtube.com/watch?v=MwFbCfRsAx4 |
| SSG | https://www.youtube.com/watch?v=Rb0D-bA8mjE |
| 두산 | https://www.youtube.com/watch?v=jHxEtjKhJvA |
| NC | https://www.youtube.com/watch?v=yZ-hA9gpgak |
| KIA | https://www.youtube.com/watch?v=CPoz8Y3hbAg |
| LG | https://www.youtube.com/watch?v=NDz15LL1YaI |
| 삼성 | https://www.youtube.com/watch?v=bZb6y4beRUQ |
| KT | https://www.youtube.com/watch?v=Zqv2hQNORFE |

4. 확인 단계에서 바로잡는다. [R-09]
   - 두산 `30:36 서울 두산 승리하리라`는 `40:36`의 오타로 보고 40:36으로 고친다. 근거:
     - 이 줄은 앞 줄(39:15)과 뒤 줄(42:05) 사이에 있어야 한다. 숫자 한 자리만 바꾼 40:36이 그 사이에 들어간다.
     - 고치면 앞 곡 `챔피언 두산`은 1분 21초(39:15~40:36), 이 곡은 1분 29초(40:36~42:05)다. 같은 영상의 다른 팀 응원가 길이(1~2분)와 맞는다.
   - 구단 고유 곡(체로키, 셀리오, 환희, 시그널, 리듬 응원 송, Let's GO, 기아 없이는 못살아, 승리하리라 KT WIZ 등)은 설명란 위치로 기본 분류한다(마지막 구분선 앞 = 상황 곡, 뒤 = 팀 응원가).
   - 바꿀 만한 후보 목록(곡 이름, 팀, 기본 분류, 설명란 위치)을 학생(김도훈)에게 보여 주고, 바꾸라는 곡만 확인 단계에서 종류를 바꾼다. 소리를 듣고 판단하는 일은 사람이 하기 때문이다.
5. 10개 팀 저장 후 `/settings`에서 내보내기 → 받은 파일을 `src/data/seed-songs.json`으로 바꿔 넣는다.
6. 검증: LocalStorage를 비우고 다시 열어 10개 팀 곡 수를 확인한다. 선수 수는 1.5절 조사 결과(합계 235명)와 같아야 하고, 두산 `서울 두산 승리하리라`는 40:36이어야 한다(FR-18 수용 기준). seed 파일이 `parseSongsFile`을 통과하는지 단위 테스트로도 확인한다(R-18).

- 응원가 시작 지점(cheerStart)은 처음 데이터에서 모두 null이다. 235명을 다 듣고 지정하는 일은 처음 데이터 범위에 넣지 않고, 사용자가 쓰면서 FR-19로 채운다.
- 이 절차는 가져오기·확인·내보내기 기능이 모두 구현된 뒤(STEP 3 후반)에 한다.

## 12. 데이터 흐름

### 12.1 선수 곡 재생

```
PlayerGrid 버튼 onClick
 → MainPage.onPlay(song) → PlayerContext.play(song)
   → HistoryContext.recordPlay(song.id): 튼 횟수 +1, 최근 곡 맨 앞 [STEP 3-⑪]
   → segRef·nowPlaying = { songId, videoId, start, end }, status 'starting'
   → player.loadVideoById({ videoId, startSeconds: start, endSeconds: end })
   → tick: getPlayerState() === PLAYING → status 'playing'
   → t ≥ end-1 → 페이드 → t ≥ end(또는 endSeconds로 ENDED/PAUSED) → finish() → idle
 → nowPlaying.songId가 바뀌어 PlayerGrid의 해당 버튼이 "재생 중" 표시
```

### 12.2 곡 수정

```
SongListPage 「수정」 → navigate('/team/:teamId/songs/' + encodeURIComponent(songId) + '/edit')   // [STEP 4-2, K-04] 가져온 JSON의 id에 / 가 있어도 경로가 맞는다
 → SongEditPage: useParams → songs에서 id와 teamId가 모두 맞는 곡 찾기(없으면 EX-29)
 → SongForm(initial) → 「저장」: 검증(BR-19~21) 통과, 같은 제목 상황 곡이면 경고만(BR-43)
 → SongsContext.updateSong({ ...song, ...fields, cheerStart: kind가 player가 아니면 null })
 → dispatch(UPDATE_SONG) → 새 state.songs → useEffect → saveSongs(LocalStorage)
 → navigate('/team/:teamId/songs')
```

### 12.3 팀 전환

```
PrevTeamButton onClick → navigate('/team/' + prevTeamId)
 → Header의 팀 로고·이름: useMatch로 URL의 새 팀을 바로 표시
 → TeamLayout(teamId 바뀜) → <Outlet key={teamId}>로 MainPage 새로 만듦(검색어 비움)
 → useEffect → visitTeam(teamId) → setTeamState({ current: 새 팀, prev: 이전 팀 }) → saveTeamState
 → PlayerContext는 그대로 → 재생 계속(BR-06)
```

[STEP 3-⑫] 넓은 화면의 매치업 보드에서 팀 칸 바꾸기:

```
MatchupHeader 팀 이름 → TeamSheet → onPick(slot, x)
 → MainPage.pickSlot: target = assignTeam(teamState, slot, x).currentTeamId
 → startTransition(() => { prefs.assignTeam(slot, x); target이 URL 팀과 다르면 navigate('/team/' + target) })
 → 같은 렌더에서 TeamState와 URL이 함께 바뀜 → matchupOf(URL, TeamState)로 두 열
 → TeamLayout: 바뀐 칸만 방향이 생김(ColumnEnter) → 그 열만 들어옴
 → visitTeam(target)은 이미 같은 팀이라 그대로
 → PlayerContext는 그대로 → 재생 계속
```

### 12.4 가져오기

```
UrlInputForm → extractVideoId → ImportPage.onSubmit(videoId)
 → 앞 요청 abort → dataApiAvailability → fetchVideo → 실패면 즉시 input 단계로
 → parseDescription → phase 'review'
 → CandidateTable 수정 → candidates 상태 갱신 → evaluateCandidates로 rows 다시 계산(끝 시각·경고·중복·이미 있음)
 → 「저장」 → saving → importSongs(drafts) → IMPORT_SONGS → saveSongs
 → navigate('/team/:teamId') + 알림 "N곡을 저장했습니다"
```

### 12.5 단축키 (FR-23, BR-36) [R-06]

```
MainPage → useKeyboardShortcuts(onAction)   // 키 → 동작은 lib/shortcuts.ts의 shortcutAction(순수 함수) [STEP 3-7]
 useEffect: window에 keydown·keyup 등록, cleanup에서 해제
 keydown(e):
   if e.ctrlKey || e.metaKey || e.altKey || e.repeat → 무시
   입력 중(대상이 글자를 받는 input·textarea·select·contentEditable, 또는 <dialog> 안) → Esc만 처리(검색어 비우기, blur)
   e.code === 'Space'            → e.preventDefault(); stop()
   e.code === 'KeyS'             → skipToCheer()
   e.code === 'KeyT'             → 넓은 화면에 두 팀이 있으면 상황 칸 팀을 다른 팀으로 [STEP 3-⑫]
                                   그 밖에는 전 팀이 있으면 navigate('/team/' + prevTeamId)
   e.key === '/'                 → e.preventDefault(); 검색칸 focus
   e.key === 'Escape'            → 검색어 비우기
   e.code === 'Digit1'~'Digit8'  → situationSlots(상황 칸 팀의 상황 곡)[n-1]이 곡이면 play, 빈 칸이면 아무것도 안 함 [디자인 개편, STEP 3-⑫]
 keyup(e):
   keydown에서 정지로 쓴 Space이고 대상이 button이면 e.preventDefault()   // 포커스된 버튼이 keyup에서 눌리지 않게 [STEP 4-2, K-07]
```

- [STEP 3-7] 리스너는 한 번만 등록하고 MainPage의 최신 처리 함수는 ref로 읽는다. 볼륨 슬라이더처럼 글자를 받지 않는 input(range, checkbox 등)에 포커스가 있을 때는 입력 중으로 보지 않는다. 마우스로 볼륨을 바꾼 직후 Space로 정지할 수 있게 하기 위해서다.
- [디자인 개편] 숫자 1~8은 상황 칸 순서를 따른다(안타 1, 아웃 2, 볼넷 3, 풀카운트 4, 라인업 5, 라인업 소개 6, 경기 개시 7, 기타 8). 같은 숫자는 팀이 바뀌어도 같은 상황이다. 빈 칸 번호를 누르면 아무것도 하지 않는다. 9칸째부터(8곡을 넘는 상황 곡)는 단축키가 없다.
- [디자인 개편] 팀 고르기 창(`<dialog>`) 안에서는 Space·숫자가 그 창의 버튼 조작이라 단축키를 끈다(BR-36의 대화상자).
- 단축키는 메인 화면에서만 켠다. 곡 관리·가져오기·설정 화면은 글자를 입력하는 화면이라 겹치지 않게 하기 위해서다.
- 글자 키는 `e.key`가 아니라 `e.code`(물리 키 위치)로 판단한다. 한글 입력 상태에서는 `S`·`T`의 `e.key`가 `ㄴ`·`ㅅ`로 들어오기 때문이다.
- Space 문제: 재생 버튼을 마우스로 누른 뒤 Space를 누르면, 포커스된 버튼이 keyup 때 눌려 정지 직후 같은 곡이 다시 시작될 수 있다. 두 겹으로 막는다. [R-06]
  1. 재생 버튼은 마우스 클릭 때 포커스를 가져가지 않는다(6.2).
  2. 정지로 쓴 Space의 keydown·keyup을 모두 `preventDefault`한다. [STEP 4-2, K-07] 처음에는 keyup을 모든 버튼에서 막아, 팀 고르기 창 안의 버튼을 Space로 누를 수 없었다. 이제 keydown에서 정지 단축키로 쓴 Space만 기억해 그 keyup만 막는다.
  - 브라우저마다 동작이 다를 수 있으므로 STEP 3에서 Chrome·Edge(가능하면 Firefox)로 확인한다.

## 13. 결정 사항

| ID | 질문 | 결정 |
| --- | --- | --- |
| D-05 | YouTube 플레이어 화면을 얼마나 보이게 둘까(IFrame API 문서: 최소 200×200px) | (a) 채택. 휴대폰은 머리말 아래 폭 100%·높이 200px, 노트북은 오른쪽 열 360×202(STEP 3-7). 휴대폰 격자 공간은 조작줄을 한 줄로 줄이고 상황 버튼 줄을 한 줄로 두어 확보한다(5.2) [R-07]. [디자인 개편 후속] 200×200은 재생 중 조건으로 보고, 휴대폰은 첫 곡 전에 플레이어 자리를 접는다 |
| D-06 | 확인 단계에서 정상 후보의 시작 시각도 고칠 수 있나(R-27과 C-06의 의견 차이) | C-06 채택. 모든 후보의 시작 시각을 고칠 수 있다. 후보의 끝 시각·경고·이미 있음·중복은 파생 값으로 매번 계산한다(4절). requirements.md의 FR-12는 그대로 두고 BR-12 문구만 설계에 맞춘다 |

## 14. 요구사항 추적표

### 14.1 기능 요구사항

| 요구사항 | 설계 요소 | 절 |
| --- | --- | --- |
| FR-01 팀 목록·선택 | `teams.ts`, TeamSheet, TeamGrid, TeamSelectPage, 라우트 `/team/:teamId` | 1.3, 5.1, 6.2 |
| FR-02 마지막 팀 복원 | TeamState, `kboCheer.team`, HomeRedirect | 3.1, 5.1, 7.3 |
| FR-03 전 팀 전환 | PrevTeamButton, visitTeam | 7.3, 12.3 |
| FR-04 선수 격자 | PlayerGrid, `sortPlayerSongs`, CSS auto-fill 격자 | 1.2, 5.2, 6.2 |
| FR-05 선수 곡 재생 | play, loadVideoById(endSeconds), 감시 타이머 | 8.3 |
| FR-06 응원가로 | skipToCheer, PlayerPanel | 8.4 |
| FR-07 상황 버튼 | SituationGrid, `situationSlots`, kind = 'situation', 파생 중복 판정, 폼 경고 | 4.6, 6.2 |
| FR-08 팀 응원가 목록 | TeamSongList | 6.2 |
| FR-09 재생 상태·정지 | PlayerPanel(최신 곡에서 이름·팀 표시), nowPlaying, stop | 7.4, 8.5 |
| FR-10 곡 검색 | `hangul.ts`, `search.ts`, SearchBox, SearchResults | 9 |
| FR-11 모음 영상 가져오기 | `youtubeUrl.ts`, fetchVideo, parseDescription | 4, 10 |
| FR-12 가져오기 확인·저장 | CandidateTable, evaluateCandidates, importSongs | 4.4~4.7, 10.4 |
| FR-13 단일 영상 등록 | ImportPhase 'single', SongForm, addSong | 10.4, 6.2 |
| FR-14 YouTube 검색 등록 | searchVideos, VideoSearchForm | 10.1 |
| FR-15 곡 수정 | SongEditPage, SongForm, UPDATE_SONG | 7.2, 12.2 |
| FR-16 곡 삭제 | SongRow, `window.confirm`, DELETE_SONG | 7.2 |
| FR-17 데이터 저장·유지 | `storage.ts`, Provider의 useEffect 저장 | 3 |
| FR-18 처음 데이터 | `seed-songs.json`, loadSongs(seed), 11절 절차 | 3.2, 3.4, 11 |
| FR-19 지금을 응원가 시작으로 | PlayerPanel onCheerHere, canCheerHere 주기 갱신 | 7.4 |
| FR-20 JSON 내보내기 | createSongsFile, Blob 다운로드 | 3.4 |
| FR-21 JSON 가져오기 | parseSongsFile, confirm, REPLACE_ALL | 3.4, 7.2 |
| FR-22 처음 데이터로 되돌리기 | SettingsPage confirm, resetToSeed | 7.2 |
| FR-23 키보드 단축키 | useKeyboardShortcuts | 12.5 |
| FR-24 볼륨 조절 | VolumeSlider, Settings.volume, volumeRef | 7.3, 8.5 |
| FR-25 페이드아웃 | stop, startFade, cancelFade, finish | 8.5 |
| FR-26 구단 표시 | TeamLogo(`public/teams/<팀>.webp`), Team.color(재생 중 띠), useMatch | 1.3, 5.1, 5.2, 5.4 |
| FR-27 격자 정렬 | Settings.gridSort, `sortPlayerSongs`, `parseGridSort` | 3.1, 5.5, 7.3, 6.2 |
| FR-28 접속 주소 안내 | dataApiAvailability('lanHost'), DataApiNotice, 설정 화면 접속 주소 | 5.2, 10.1 |
| FR-29 선수 정보 연결 | `players-2026.json`, `parsePlayers`, `buildPlayerIndex`, `findPlayer`, `playerOf` | 5.5 |
| FR-30 선수 칸 정보 | PlayerGrid(이름·포지션·`extra` 사진), `.player-cell` CSS | 5.2, 5.5 |
| FR-31 선수 사진과 기본 아바타 | PlayerPortrait, `photoUrl`, `avatarUrl`, `public/avatars`, `playerMediaPlugin.ts`, `build-deploy.mjs` | 5.5 |
| FR-32 튼 횟수 | `history.ts`, HistoryContext, `kboCheer.history` | 3.1, 5.5 |
| FR-33 최근 튼 곡 | `recentSongs`, MainPage 최근 곡, SearchBox 커서 | 5.5 |
| FR-34 매치업 보드 | `lib/matchup.ts`(`matchupOf`, `assignTeam`, `situationTeamOf`, `leavesMatchup`), MainPage, MatchupHeader, TeamColumn, SituationTeamTabs, PrefsContext `assignTeam`, TeamLayout `ColumnEnter`, `useMediaQuery` | 5.2, 5.6, 7.3, 12.3 |
| FR-35 선수 카드 | PlayerCard, `cutoutUrl`, `cardSubtitle`, PlayerPortrait `card`, TeamLogo 88 | 5.6 |
| FR-36 지금 재생 시트 | PlayerPanel `.now-open`, Sheet, PlayerCard | 5.2, 5.6 |

### 14.2 비기능 요구사항

| 요구사항 | 설계 요소 | 절 |
| --- | --- | --- |
| NFR-01 반응형 | 휴대폰·노트북 배치, auto-fill 격자, 상황 줄 내부 가로 넘김 | 5.2 |
| NFR-02 조작성 | 버튼 44px, 하단 고정 한 줄 조작줄·상황 줄 | 5.2 |
| NFR-03 응답성 | 스크립트 미리 로드, 곡 전환 시간 측정 후 seekTo 대안 | 8.1, 8.3 |
| NFR-04 구간 정확도 | endSeconds + 감시 타이머 두 겹, 끝 1초 전 페이드 | 8.3, 8.5 |
| NFR-05 데이터 유지 | 상태 변경 → useEffect 저장 | 3.3 |
| NFR-06 견고성 | 타입 가드, version 검사, 복구 규칙, broken 사본 | 3.1, 3.2 |
| NFR-07 보안 | `import.meta.env`, `.env.local`, 내보내기에 키 없음 | 3.4, 10.1 |
| NFR-08 할당량 | 가져오기·검색 버튼에서만 호출, 수정 화면은 videoDuration 사용 | 1.2, 10.1 |
| NFR-09 코드 품질 | `@types/youtube` + `youtube-global.d.ts`, unknown + 타입 가드, 판별 유니온 | 0.1, 2, 8.1 |
| NFR-10 호환성 | playsinline, isIOS, canControlVolume | 8.2, 8.5 |
| NFR-11 오프라인 일부 동작 | 곡 관리·검색·JSON은 네트워크 없이 동작 | 3, 9 |
| NFR-12 네트워크 접속 | `vite.config.ts`: `server: { port: 5173, strictPort: true, host: true }`, 보안 컨텍스트 없이 동작하는 ID 생성 | 3.5 |
| NFR-13 색 대비 | 1.3절 대비 표 | 1.3 |

### 14.3 업무 규칙과 예외

| 요구사항 | 설계 요소 | 절 |
| --- | --- | --- |
| BR-01~03 한 곡 재생, 끝 정지, 다시 누르면 처음부터 | play, endSeconds, 감시 타이머 | 8.3 |
| BR-04~05 응원가로 조건 | skipToCheer 조건, 버튼 활성 | 8.4 |
| BR-06 팀 전환 중 재생 유지 | PlayerHost를 AppLayout에 둠 | 8.2 |
| BR-07 응원가 시작 지정 조건 | onCheerHere, canCheerHere | 7.4 |
| BR-08 확인 후 저장 | ImportPhase, 저장 전 상태는 ImportPage에만 | 7.1, 10.4 |
| BR-09 URL 형식 | extractVideoId | 10.3 |
| BR-10 타임스탬프 형식 | TIME_LINE 정규식 | 4.2 |
| BR-11~12 시각 이상, 끝 시각 | LIS 판정, boundaries | 4.4, 4.5 |
| BR-13 자동 분류 | 팀 구획 → 선수 → 상황 순서 | 4.3 |
| BR-14~15, BR-42 중복, 이미 있음, 같은 이름 선수 | evaluateCandidates 파생 판정 | 4.6 |
| BR-16 퍼가기 금지 | VideoInfo.embeddable 검사 | 10.4 |
| BR-17 이름 규칙 | isSong, SongForm 검증, titleError | 3.2, 4.6 |
| BR-18 허용 출처에서만 API | DATA_API_ORIGINS, dataApiAvailability | 10.1 |
| BR-19~21 시각 형식·범위, 응원가 시작 | `time.ts`, SongForm 검증, updateSong | 6.2, 12.2 |
| BR-22 영상 ID 수정 불가 | SongForm에 videoId는 읽기 전용 표시 | 6.2 |
| BR-23 삭제 확인 | `window.confirm` | 14.1 FR-16 |
| BR-24, BR-40 재생 중 곡 수정·삭제 | nowPlaying 구간 고정, songs 감시 effect | 7.4 |
| BR-25 고정 10개 팀 | `teams.ts` | 1.3 |
| BR-26~27 팀 방문 규칙, 맞바꾸기 | visitTeam | 7.3 |
| BR-28 처음 실행 | HomeRedirect | 5.1 |
| BR-29 팀 바꾸면 검색어 비움 | `<Outlet key={teamId}>` | 5.1 |
| BR-30~34 전체 검색, 정렬, 다른 팀 결과 | searchSongs, play 후 navigate | 9.2 |
| BR-35 볼륨·정렬 공통 설정 | Settings, `kboCheer.settings` | 3.1, 7.3 |
| BR-36 단축키 배정 | useKeyboardShortcuts | 12.5 |
| BR-37~38 JSON 형식, 통째로 바꾸기 | songsFile.ts | 3.4 |
| BR-39 되돌리기는 곡 목록만, 확인 후 | SettingsPage confirm, resetToSeed | 7.2 |
| BR-41 페이드 규칙 | stop, startFade, cancelFade | 8.5 |
| BR-43 같은 제목 상황 곡 폼 경고 | SongForm `isDuplicateSituationTitle` | 6.2 |
| BR-44 접속 주소 표시 | SettingsPage | 5.2 |
| BR-52~56 매치업 보드의 두 칸, 칸 바꾸기, 재생과 이동, 상황 칸 팀, 공통 정렬 [STEP 3-⑫] | `lib/matchup.ts`, MainPage, MatchupHeader, PrefsContext `assignTeam` | 5.6, 7.3 |
| EX-01 URL 형식 오류 | extractVideoId → null → 'badUrl' | 10.3, 10.4 |
| EX-02~03, EX-06~09, EX-18 API 관련 | DataApiError 분류와 문구 | 10.2 |
| EX-04 타임스탬프 없음 | phase 'single' | 10.4 |
| EX-05 저장 대상 0곡 | 저장 버튼 비활성 | 10.4 |
| EX-10~12 플레이어 로드·재생 오류·자동 재생 | 8.6 표, onAutoplayBlocked | 8.6 |
| EX-13 수정 입력 오류 | SongForm 칸별 오류 | 6.2 |
| EX-14~15 저장 데이터 손상·쓰기 실패·저장소 사용 불가 | loadSongs status, saveSongs false | 3.2 |
| EX-16 팀에 곡 없음 | EmptyState | 6.2 |
| EX-17 검색 결과 없음 | SearchResults 빈 문구 | 9.2 |
| EX-19 시각 이상 | LIS 판정, 경고 줄, 링크 | 4.4, 10.4 |
| EX-20 허용 출처가 아닌 주소 | lanHost, DataApiNotice | 10.1 |
| EX-21~22 잘못된 JSON, 빈 JSON | parseSongsFile 오류 | 3.4 |
| EX-23 응원가 시작 지정 불가 | canCheerHere, onCheerHere 조건 | 7.4 |
| EX-24 iOS 볼륨 | canControlVolume, VolumeSlider 안내 | 8.5 |
| EX-25~26 라이브, 연령 제한 영상 | ImportPage 판단 | 10.4 |
| EX-27~28 오래 버퍼링, 외부 일시정지 | trackBuffering, handleStateChange | 8.6 |
| EX-29 수정 주소의 곡 없음·다른 팀 | SongEditPage | 5.1 |

## 15. 설계 검토 반영 기록

### 15.1 지적별 반영 내역

출처: Claude Code = `design-review-claude.md`, Codex = `design-review-codex.md`. 두 검토가 같은 문제를 짚은 것은 한 줄로 합쳤다.

| 번호 | 출처 | 요약 | 반영 | 이유·반영 위치 |
| --- | --- | --- | --- | --- |
| R-01 | Claude Code | 같은 영상에서 seekTo로 곡을 바꾸면 상태 이벤트가 안 와 끝 시각 감시가 멈추거나, 이동 전 위치를 읽어 새 곡이 바로 끊김 | 반영 | 감시 타이머를 nowPlaying 동안 늘 돌리고 getPlayerState로 직접 확인, 이동 직후 1.5초 동안 구간 밖 값 무시. 곡 시작은 loadVideoById 기본(8.3) |
| R-02 | Claude Code | 휴대폰 첫 재생이 막힐 수 있고 "다시 누르기" 안내가 맞지 않음 | 반영 | onAutoplayBlocked 감지, "영상을 직접 눌러" 안내, nowPlaying 유지(8.6). 실기기 확인은 구현 뒤 학생이 직접 |
| R-03, C-07 | 둘 다 | 큰 쪽 오타 하나에 뒤 정상 줄들이 경고됨 / 연속 교정 값끼리 순서를 검사하지 않음 | 반영 | 고친 값을 포함한 현재 값으로 LIS 판정, 엄격 증가, 같은 시각도 경고(4.4) |
| R-04, C-11 | 둘 다 | 타이머·외부 콜백이 오래된 state를 읽음 | 반영 | 원칙 추가(0.1), statusRef·volumeRef·segRef·fadingRef·songsRef(7.1, 8.3, 8.5) |
| R-05, R-13, C-02, C-12 | 둘 다 | 비동기 로드·생성의 정리 불완전, 플레이어 중복 생성, 대기 요청 취소 없음, 스크립트 중복·늦은 실패 | 반영 | 로더 settled·식별 검사·스크립트 재사용(8.1), 생성 경로 하나·cancelled·alive 플래그, 정지·삭제·cleanup에서 대기 요청 취소(8.2, 8.7) |
| C-01 | Codex | 플레이어 객체 존재를 준비 완료로 봄 | 반영 | playerReady·readyRef 분리, 준비 전에는 최신 요청 하나만 대기(7.4, 8.2, 8.3) |
| C-04 | Codex | 정지 연속 클릭 때 페이드 타이머 중복 | 반영 | 페이드 중 정지는 바로 멈춤, startFade 중복 방지, cancelFade 후 새 타이머(8.5) |
| R-10, C-03 | 둘 다 | 200ms 폴링은 정지 오차 상한이 아님, 창이 가려지면 타이머가 늦어짐, endSeconds 근거 문장 오류 | 반영 | loadVideoById(endSeconds) + 앱 타이머 두 겹, 근거 문장을 공식 문서대로 정정, STEP 3 측정 항목(8.3) |
| R-11, C-13 | 둘 다 | 외부 요인 PAUSED, 오래 버퍼링, 미등록 오류 코드 처리 없음 | 반영 | handleStateChange·trackBuffering, EX-27·EX-28, 그 밖의 오류 코드 기본 처리(8.6) |
| R-12 | Claude Code(153은 Codex C-13도) | 오류 153 누락, window.YT 타입 선언 없음 | 반영 | `youtube-global.d.ts`(2, 0.2), 153 처리와 숫자 비교(8.6), Referrer-Policy 유지 원칙(0.1) |
| C-05 | Codex | 가져오기 의사코드가 실패 분기 뒤에도 계속 진행 | 반영 | 모든 실패 분기에서 즉시 return(10.4) |
| R-27, C-06 | 둘 다(의견 차이) | 정상 후보 시각 편집 금지가 FR-12를 줄임(C-06) / 요구사항 문구를 설계에 맞추자(R-27) | C-06 반영, R-27은 BR-12만 반영 | 모든 후보 시각 편집, 파생 값 계산(4절, D-06). requirements BR-12 문구 수정, FR-12 유지 |
| R-14, C-08 | 둘 다 | 상황 곡 중복 방지가 첫 파싱에만 있음 | 반영 | 후보를 바꿀 때마다 중복 재계산(4.6), 단일 등록·수정 폼 경고(BR-43, 6.2). FR-07 수용 기준 유지 |
| C-09 | Codex | 시각을 고친 뒤 "이미 있음"이 갱신되지 않음 | 반영 | existing을 현재 시각과 최신 곡 목록에서 계산, selection 'auto'로 교정 후 기본 선택 정의(2, 4.6) |
| C-10 | Codex | 「지금을 응원가 시작으로」 활성 여부를 갱신할 경로가 없음 | 반영 | PlayerPanel이 250ms마다 계산, 바뀔 때만 setState(7.4) |
| C-14, R-22 | 둘 다 | 수정 주소의 팀 불일치·없는 곡 처리 없음 | 반영 | songId·teamId 모두 확인, EX-29(5.1, 6.2) |
| C-15 | Codex | 처음 데이터로 되돌리기 확인 흐름 없음 | 반영 | SettingsPage confirm 후에만 resetToSeed(7.2) |
| C-16 | Codex | 분류 우선순위가 BR-13과 다름 | 반영 | 팀 구획 → 선수 → 상황 순서로 변경(4.3). 요구사항 순서를 따르는 쪽이 맞다고 판단 |
| C-17 | Codex | 시각 이상인 첫 중복 곡이 정상 중복 곡을 가림 | 반영 | 대표 = 경고 없는 첫 후보(4.6) |
| R-06 | Claude Code | 버튼 포커스가 남은 채 Space를 누르면 정지 뒤 다시 재생 | 반영 | 마우스 클릭 때 포커스 안 가져감, Space keydown·keyup preventDefault, STEP 3 브라우저 확인(6.2, 12.5) |
| R-07 | Claude Code | 휴대폰에서 격자 공간이 약 3줄뿐 | 반영 | 조작줄 한 줄 + 펼침 줄, 상황 줄 한 줄(5.2, D-05) |
| R-08 | Claude Code | 접속 주소가 바뀌면 곡 목록이 사라진 것처럼 보임 | 반영 | 설정 화면에 출처와 안내 표시(BR-44, 5.2), 알려진 한계(3.3) |
| R-09 | Claude Code | 처음 데이터의 "듣고 정하기" 담당이 없음 | 반영 | 두산 40:36 근거와 함께 고정, 고유 곡은 위치로 기본 분류 후 학생에게 후보 목록 확인(11) |
| R-15 | Claude Code | 새 시즌 영상의 같은 선수 중복 | 반영 | "같은 이름 있음" 표시, 선택 유지(BR-42, 4.6) |
| R-16 | Claude Code | 깨진 데이터 복구 때 원래 값을 덮어씀 | 반영(낮음, 내 판단) | `kboCheer.songs.broken` 사본 한 번. 코드 몇 줄로 데이터 손실을 막을 수 있어 반영(3.1) |
| R-17, C-18 | 둘 다 | 여러 탭 일관성 정책 없음 | 미반영 | 한 탭 사용을 전제로 하고 알려진 한계로 적음(3.3, requirements 11절) |
| R-18 | Claude Code | 처음 데이터 파일 자체가 틀렸을 때 동작 없음 | 반영(낮음) | 빈 목록 + console.error, 단위 테스트(3.4, 11) |
| R-19 | Claude Code | 저장소를 아예 못 쓸 때 "손상" 문구가 나옴 | 반영(낮음) | LoadStatus 'unavailable'과 EX-15 문구(3.2) |
| R-20 | Claude Code | 라이브·연령 제한·지역 제한 영상 처리 없음 | 일부 반영(낮음) | 라이브(duration 0)·연령 제한은 등록 거부(EX-25·26, 10.4). 지역 제한은 재생 오류(EX-11)로 충분해 미반영 |
| R-21 | Claude Code | 저장 두 번 누르기, 요청 겹치기 | 반영(낮음) | saving 상태, 앞 요청 abort, 마지막 요청만 반영(10.4, 6.2) |
| R-23 | Claude Code | `<MainPage key>`를 붙일 위치가 없음 | 반영(낮음) | `<Outlet key={teamId}>`(5.1) |
| R-24 | Claude Code | 팀을 바꿀 때 한 프레임 이전 팀 표시 | 반영(낮음) | Header가 useMatch로 URL의 팀을 먼저 씀(5.1) |
| R-25 | Claude Code | 타입이 불가능한 조합을 허용 | 일부 반영(낮음) | TeamState는 판별 유니온으로 바꿈. Song 구분 유니온은 코드가 길어지는 데 비해 이득이 작아 미반영(2) |
| R-26 | Claude Code | iOS에서 JSON 파일 선택이 막힐 수 있음 | 확인 항목으로 넘김(낮음) | 실기기 확인은 구현 뒤 학생이 함. 막히면 accept 제거(3.4) |
| R-28 | Claude Code | 덜어 낼 수 있는 복잡함 | 반영 | 검색 정렬 키 3개(9.2), importSongs(drafts)(7.2), nowPlaying = ID + 구간, cheerStart는 최신 곡에서 읽기(7.4) |

### 15.2 두 검토 비교

- Claude Code가 잘 찾은 것:
  - 실제 실행 환경에서만 드러나는 문제를 많이 찾았다. 같은 영상 seekTo 때 상태 이벤트가 오지 않는 경우, 휴대폰 첫 재생 제한, 버튼 포커스와 Space, 접속 주소별 저장소, 휴대폰 화면 높이 계산이 여기에 든다.
  - 공식 문서와 타입 파일을 직접 다시 확인했다. 그래서 onAutoplayBlocked 이벤트, 오류 153, window 타입 누락, endSeconds 문장 오류를 근거와 함께 짚었다.
  - 처음 데이터 절차에 사람이 들어야 하는 일이 있다는 진행상 문제도 찾았다.
  - 알고리즘 문제(LIS)는 반례(49:15)를 만들어 보였다.
- Codex가 잘 찾은 것:
  - 설계 안의 계약과 상태 전이 결함을 꼼꼼히 찾았다. 플레이어 객체와 준비 완료의 구분, 대기 요청 취소, 페이드 타이머 중복, 시각을 고친 뒤 "이미 있음" 갱신, 응원가 시작 버튼 갱신 경로, 되돌리기 확인 누락이 여기에 든다.
  - 의사코드의 실제 버그(C-05, 실패 분기 뒤 계속 진행)와 요구사항 충돌(C-06 FR-12 축소, C-16 BR-13 순서)도 찾았다.
- Claude Code가 놓친 것: 설계를 쓴 도구가 같은 도구로 검토해 자기 의사코드의 버그(C-05)와 빠진 확인 흐름(C-15)을 보지 못했다. 자기 설계의 가정에 기댄 흔적이다. C-06은 오히려 반대 방향으로 요구사항 문구를 고치자고 했다(R-27).
- Codex가 놓친 것: 브라우저·기기·실제 사용 장면에서 생기는 문제(R-02, R-06, R-07, R-08)와 진행 절차의 문제(R-09)는 짚지 않았다. 타입 선언 누락(R-12)도 보지 못했다.
- 정리: 두 검토가 겹친 항목은 8개 묶음이다(R-03/C-07, R-04/C-11, R-05·R-13/C-02·C-12, R-10/C-03, R-11/C-13, R-14/C-08, R-17/C-18, R-22/C-14). 나머지는 한쪽만 찾았다. 높음·중간 문제를 기준으로 세면 Claude Code만 썼다면 약 9건(C-01, C-04, C-05, C-06, C-09, C-10, C-15, C-17 등), Codex만 썼다면 약 7건(R-01, R-02, R-06, R-07, R-08, R-09, R-12)을 놓쳤다. 두 도구가 보는 방향이 달라 함께 쓰는 편이 나았다.
