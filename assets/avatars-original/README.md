# 구단 기본 아바타

사진이 없는 선수 자리에 쓰는 구단별 기본 캐릭터 그림이다. 실존 인물과 관계없는 가상의 야구 팬 캐릭터 한 명을 만들고, 구단마다 모자와 저지 깃만 바꿔 이미지 생성 모델로 그렸다(학생이 직접 생성). 모자 앞면에는 구단 공식 엠블럼을 패치처럼 넣었으며, 엠블럼의 상표는 각 구단에 있다(assets/teams-original/README.md).

- `<팀ID>.png`: 512×512 원본. 웹에서는 `node scripts/optimize-avatars.mjs`로 줄인 256px WebP(`public/avatars/<팀ID>.webp`)를 쓴다.
