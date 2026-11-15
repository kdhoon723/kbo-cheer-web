# KBO 응원가 즉시 재생 웹서비스

야구 게임을 하면서 타석에 선 선수의 응원가와 상황 응원가를 버튼 한 번으로 트는 웹서비스다. 음원 파일 없이 YouTube 모음 영상의 구간을 재생하고, 곡 목록은 브라우저 LocalStorage에 저장한다.

2026-2학기 스크립트프로그래밍 과제 / 20241476 김도훈

## 실행

```bash
npm install
cp <API 키 파일> .env.local   # VITE_YOUTUBE_API_KEY=... (곡 가져오기에만 필요)
npm run dev                    # http://localhost:5173
```

- 노트북은 `http://localhost:5173`으로 연다. 같은 와이파이의 휴대폰은 `http://<노트북 LAN 주소>:5173`으로 접속한다.
- 빌드 `npm run build`, 단위 테스트 `npm test`

## 문서

- 요구사항 정의서: [docs/requirements.md](docs/requirements.md)
- 설계서: [docs/design.md](docs/design.md)
