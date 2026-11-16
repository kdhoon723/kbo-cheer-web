# CLAUDE.md - kbo-cheer-web

KBO 응원가 즉시 재생 웹서비스. 2026-2학기 스크립트프로그래밍 React 과제(20241476 김도훈).

## 기준 문서

- 개발은 `docs/requirements.md`(요구사항)와 `docs/design.md`(설계 최종판)를 기준으로 한다. 두 문서와 다르게 만들어야 하면 먼저 묻고, 정해지면 문서도 함께 고친다.
- 요청받은 단계의 기능만 만든다. 문서에 없는 기능을 넣지 않는다.
- `docs/prompt-log.md`는 손대지 않는다(커밋에는 포함해도 된다).

## 코드 규칙

- React 함수형 컴포넌트와 TypeScript를 쓴다. `any`를 쓰지 않는다. 외부 입력(LocalStorage, JSON 파일, API 응답)은 `unknown`으로 받아 타입 가드로 검사한 뒤 쓴다.
- 상태 관리 라이브러리와 UI 라이브러리는 쓰지 않는다. 수업 범위(useState, useEffect, useRef, useReducer, Context, React Router)에서 만든다.
- 주석은 한국어로, 코드만 보고 알 수 없는 이유가 있을 때만 쓴다.
- 새로 만드는 소스 파일(`.ts`, `.tsx`, `.css`)의 첫 줄은 `//20241476-김도훈-(YYYY-MM-DD)` 형식으로 쓴다. CSS 파일은 `/*20241476-김도훈-(YYYY-MM-DD)*/`로 쓴다.
- 화면과 상관없는 계산은 `src/lib/`의 순수 함수로 두고 Vitest 단위 테스트를 붙인다(`src/**/*.test.ts`).

## 디자인 규칙

- 다크 테마 하나만 쓴다. 색 토큰: 바탕 #131211, 면 #1B1A18, 누름·입력칸 #252320, 1px 선 #302D29, 버튼 테두리 #4A4640, 글자 #F1ECE3 / #ABA49A / #948D83, 밝은 판 #ECE7DD와 그 위 글자 #171513. 값은 `src/index.css`의 `:root` 변수로만 쓴다.
- 강조는 색이 아니라 반전(밝은 판 + 어두운 글자)으로 한다. 팀 색은 재생 중인 칸 위쪽 3px 띠와 플레이어 영역(위쪽 띠, 선수 카드의 낮은 판)에만 쓰고, 글자 색이나 그 밖의 넓은 바탕으로 쓰지 않는다. 팀 색 판 위에는 글자를 두지 않는다(10개 팀 색을 한 글자색으로 4.5:1에 맞출 수 없다). 팀은 로고(`TeamLogo`, 판 28·36·44, 선수 카드에서 선수 곡이 아닐 때만 88)로 구분한다.
- 모든 글자는 실제 바탕과 대비 4.5:1 이상이어야 한다. 새 색 조합을 넣으면 대비를 계산해 `docs/design.md` 5.4에 적는다.
- 글꼴은 Pretendard 하나(`pretendard@1.3.9`, `main.tsx`에서 불러 Vite가 묶음, CDN 금지). 아이콘은 `lucide-react`(버전 고정)만 쓰고 `strokeWidth={1.75}`. 기호 글자(▶ ■ ⇄ ☰ ✕ ‹ › ▾ ▴ → 등)나 이모지를 아이콘으로 쓰지 않는다.
- 카드·그림자 없이 1px 선으로 나눈다. 모서리는 판·격자 칸 4px, 버튼·입력칸 10px만 쓴다(예외: 선수 사진은 위쪽 모서리만 3px). 간격은 4의 배수, 화면 옆 여백 16px, 누르는 곳은 44px 이상.
- 쓰지 않는 것: 그라디언트 바탕, 네온, 빛 번짐, 유리 효과, 보라색 강조, 이모지, 뜻 없는 배지, 카드 그림자, 팀 색으로 화면 칠하기, 들뜬 문구, 누를 때 커지거나 튀는 효과, 로딩 뼈대 화면.

## 선수 정보와 사진 규칙

- 선수 사진(구단·KBO)은 저장소, `public/`, 제출 소스 어디에도 넣지 않는다. 저장소 밖 `../kbo-cheer-web-media/`에 있고 읽기만 한다. 개발 서버는 `.env.local`의 `KBO_MEDIA_DIR`(VITE_ 접두사 없음)로 `/players/*`를 내주고, 배포는 `npm run build:deploy`가 `dist/players/`로 복사한다.
- 사진이 있다고 표시된(`photo !== null`) 선수만 `/players/<팀ID>/<선수ID>.jpg`를 요청한다. 없거나 실패하면 구단 기본 아바타(`public/avatars/<팀ID>.webp`, 원본은 `assets/avatars-original/`, `node scripts/optimize-avatars.mjs`)를 쓴다.
- 튼 횟수와 최근 곡은 곡 목록과 별도 키 `kboCheer.history`에 둔다. 정렬 기본값은 주전순이다.

## 모션 규칙

- 움직임은 누른 일을 확인하고 어디서 왔는지 보여 줄 뿐이다. 소리를 기다리게 하지 않는다(누른 순간 재생과 재생 중 표시가 바뀌고, 움직임이 끝나기를 기다리는 일은 없다). 거리는 24px 이하, 들어오는 것은 200ms 안에 읽힌다. 장식으로 움직이는 것은 없다.
- 시간, 이징, 스프링, 거리, 눌림 크기는 모두 `src/ui/motionTokens.ts`에서 가져다 쓴다. 컴포넌트에 숫자를 직접 쓰지 않는다. 라이브러리는 `motion@14.14.0`만 쓴다. 컴포넌트는 `motion/react-m`의 `m.*`로 그리고(App의 `LazyMotion strict`가 `motion.*`을 막는다), 높이처럼 직접 움직일 때는 `motion/react-mini`의 `useAnimate`를 쓴다.
- transform과 opacity만 움직인다. 예외는 첫 곡에 재생 줄이 한 번 자라는 높이 하나다. 진행 막대는 `scaleX`로 그린다. 프레임마다 React 상태를 바꾸지 않는다.
- YouTube iframe(PlayerHost)은 옮기거나, 움직이는 요소로 감싸거나, 다시 마운트하지 않는다. 재생 중 칸의 반전과 진행 막대도 움직이지 않는다.
- 앱 전체를 `<MotionConfig reducedMotion="user">`로 감싼다. 동작 줄이기가 켜지면 옮기기·크기·스프링은 꺼지고 페이드만 남는다. 누름(`TapButton`, `PressCell`)과 닫을 때의 옮기기는 동작 줄이기에서 아예 빠진다.

## 실행

- 개발 서버: `npm run dev` (포트 5173 고정, LAN 접속 허용. `vite.config.ts`)
- 빌드: `npm run build` / 사진을 넣는 배포 빌드: `npm run build:deploy` / 단위 테스트: `npm test` / 린트: `npm run lint`
- E2E: `npm run test:e2e`. 시작할 때 `e2e/global-setup.ts`가 재생이 되는 YouTube 방문자 쿠키를 만들어 모든 테스트가 나눠 쓴다(쿠키 없는 새 방문자는 가끔 YouTube가 영상을 주지 않는다. `docs/test-results.md` F-01).
- 배포: 공개 주소 https://kbocheer.kdhoon.me (Cloudflare Workers 정적 자산, `wrangler.jsonc`). 실제 배포 명령(`npx wrangler deploy`)은 계정 자격증명이 필요해 직접 실행하지 않는다.
- 브라우저 확인은 Playwright MCP로 하고, 화면 캡처는 `docs/screenshots/`에 저장한다.
- 개발 서버 같은 프로세스는 직접 띄운 PID로만 끈다. `pkill -f`, `killall` 같은 이름 패턴 종료는 쓰지 않는다.
- 백그라운드로 띄울 때는 `npx`·`npm run`을 거치지 말고 `node node_modules/vite/bin/vite.js`로 직접 띄운다. `npm exec`의 PID를 끄면 그 아래 vite 프로세스가 남아 포트를 계속 잡는다.

## YouTube API 키

- 키는 `.env.local`의 `VITE_YOUTUBE_API_KEY`로만 읽는다(`import.meta.env`). 원본은 `~/credentials/youtube/kbo-cheer-web.env`에 있다.
- 키 값은 화면, 콘솔, 로그, 커밋, 보고 어디에도 쓰지 않는다. `.env.local`은 `.gitignore`의 `*.local`로 제외된다.
- 키는 `https://kbocheer.kdhoon.me`, `http://localhost:5173`, `http://127.0.0.1:5173` 리퍼러에서만 동작한다. 앱의 허용 목록은 `src/lib/env.ts`의 `DATA_API_ORIGINS`다. 포트를 바꾸지 않는다.

## Git

- 단계마다 커밋하고 `origin`(github.com/kdhoon723/kbo-cheer-web, 공개)에 푸시한다.
- `.env.local`, `node_modules`, `dist`는 올리지 않는다. 커밋 전에 `git status`와 스테이징한 내용을 확인한다.

## 보고

- 실제로 실행해 확인한 것만 확인했다고 쓴다. 실행한 명령과 결과를 함께 적는다.
- 확인하지 못한 것은 확인하지 못했다고 쓰고, 정해야 할 것은 선택지와 추천을 적고 멈춘다.
