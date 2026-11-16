# 정리 단계에서 문서로 옮길 메모

마지막 정리 단계에서 requirements·design·test-cases·test-results·README로 옮긴 뒤 이 파일을 지운다.

## STEP 3-㉛ 넓은 화면 가사 여닫기를 한 자리로, 접기는 그 곡에만
- requirements(FR-40, BR-59, BR-35, 변경 이력), design(3.1, 5.8), test-cases(TC-155~157)는 이미 고침. test-results에 옮길 것:
  - 1440×900·1280×800 접은 상태 「가사」 버튼 66×44px, 카드 자리 오른쪽·위에 붙음, 팀 색 판보다 위, 맨 아래 「가사 보기」 없음, 누르는 자리 그대로(TC-156)
  - 접기는 그 곡에만, 다른 곡·새로고침이면 펼침, 설정에 lyricsOpen 없음(TC-155, TC-157), 예전 lyricsOpen 값은 읽지 않음(단위)
  - TC-89·90·97은 가사 요청을 막고 카드를 본다(설정 프리셋 대신)
  - npm test 391 passed, npm run test:e2e 전체 118 passed(4.8m), build·lint 통과
  - 캡처: lyrics-card-closed-{1440,1280}.png, lyrics-card-closed-panel-{1440,1280}.png, 펼친 상태는 with-lyrics/lyrics-card-open-{1440,1280}.png
