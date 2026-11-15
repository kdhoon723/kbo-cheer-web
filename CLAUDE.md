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

## 실행

- 개발 서버: `npm run dev` (포트 5173 고정, LAN 접속 허용. `vite.config.ts`)
- 빌드: `npm run build` / 단위 테스트: `npm test` / 린트: `npm run lint`
- 브라우저 확인은 Playwright MCP로 하고, 화면 캡처는 `docs/screenshots/`에 저장한다.
- 개발 서버 같은 프로세스는 직접 띄운 PID로만 끈다. `pkill -f`, `killall` 같은 이름 패턴 종료는 쓰지 않는다.

## YouTube API 키

- 키는 `.env.local`의 `VITE_YOUTUBE_API_KEY`로만 읽는다(`import.meta.env`). 원본은 `~/credentials/youtube/kbo-cheer-web.env`에 있다.
- 키 값은 화면, 콘솔, 로그, 커밋, 보고 어디에도 쓰지 않는다. `.env.local`은 `.gitignore`의 `*.local`로 제외된다.
- 키는 `http://localhost:5173`, `http://127.0.0.1:5173` 리퍼러에서만 동작한다. 포트를 바꾸지 않는다.

## Git

- 단계마다 커밋하고 `origin`(github.com/kdhoon723/kbo-cheer-web, 공개)에 푸시한다.
- `.env.local`, `node_modules`, `dist`는 올리지 않는다. 커밋 전에 `git status`와 스테이징한 내용을 확인한다.

## 보고

- 실제로 실행해 확인한 것만 확인했다고 쓴다. 실행한 명령과 결과를 함께 적는다.
- 확인하지 못한 것은 확인하지 못했다고 쓰고, 정해야 할 것은 선택지와 추천을 적고 멈춘다.
