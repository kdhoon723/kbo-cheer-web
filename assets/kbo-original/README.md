# KBO CI

KBO 공식 홈페이지 로고 페이지(https://www.koreabaseball.com/Kbo/AboutKbo/Logo/Logo.aspx)의 「KBO AI.zip」 안 PDF 1쪽(벡터)을 렌더링한 원본이다. 색은 바꾸지 않았다. 상표권은 KBO에 있고, 비상업 학습용 과제에서 앱 아이콘으로만 출처와 함께 쓴다.

| 파일 | 내용 |
| --- | --- |
| `kbo-ci-signature.png` | 심볼 + KBO 로고타입 세로 조합, 1436×2115, 투명 배경 |
| `kbo-ci-symbol.png` | 위에서 심볼만 잘라 낸 것(투명 여백 제거), 1436×1468 |

이 폴더는 원본 보관용이라 배포물에 들어가지 않는다. 앱은 `node scripts/make-icons.mjs`로 만든 `public/favicon-16.png`, `public/favicon-32.png`(심볼만), `public/apple-touch-icon.png`(심볼 + 글자)를 쓴다. 모두 밝은 판(#ECE7DD) 위에 놓는다.
