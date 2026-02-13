# 통합 QA 테스트 시스템 - 빠른 참조 카드

## 🎯 핵심 명령어

| 명령어 | 설명 | 소요시간 |
|--------|------|----------|
| `npm run test:smoke` | 주요 페이지 빠른 검증 | 1-2분 |
| `npm run test:integration` | 완전한 통합 테스트 | 10-15분 |
| `npm run crawl:full` | 2단계 크롤링 (수집+검증) | 1-2분 |
| `npm run test:all` | 모든 테스트 실행 | 20-30분 |

## 📂 주요 파일 위치

```
utils/
├── crawlerDiscovery.ts # URL 수집 (Stage 1)
├── crawlerValidation.ts # 병렬 검증 (Stage 2)
├── apiMonitor.ts      # API 추적 및 검증
├── csvReporter.ts     # CSV 리포트 생성
├── assertions.ts      # Quality Gates
└── crawler.ts         # (Legacy) 크롤링

tests/integration/     # 통합 테스트
config/                # 설정
test-results/reports/  # CSV 출력
```

## 🔧 주요 함수

### API 모니터링
```typescript
const monitor = await setupApiMonitoring(page);
const results = monitor.getResults();
monitor.stop();
```

### CSV 리포트
```typescript
const reporter = getGlobalCsvReporter();
reporter.addTestResult({ ... });
reporter.addApiResult({ ... });
reporter.generateReports();
```

### Quality Gates
```typescript
const { consoleErrors, failedRequests } = await setupMonitoring(page);
await runQualityGates(page, consoleErrors, failedRequests);
```

## 📊 리포트 파일

- `test-report-*.csv` - 모든 테스트 결과
- `api-report-*.csv` - API 호출 상세
- `error-report-*.csv` - **에러만 (이것부터 확인!)**
- `summary-report-*.csv` - 통계 요약
- `link-report-*.csv` - 링크 검증

## ⚙️ 설정 변경

### 타임아웃 증가
```typescript
// playwright.config.ts
timeout: 600 * 1000  // 10분
```

### 페이지 추가
```typescript
// config/keyPages.ts
{ path: '/new', name: 'New Page', requiresAuth: false }
```

### 크롤링 범위
```typescript
await discoverURLs(page, baseURL, {
  maxPages: 50,    // 최대 로드 수
  maxDepth: 3,     // 수집 깊이
});
```

## 🐛 트러블슈팅

| 문제 | 해결 |
|------|------|
| 타임아웃 | 2단계 분리 사용 및 워커 조절 |
| 한글 깨짐 | Excel "데이터 가져오기" 사용 |
| API 0건 | networkRules에 도메인 추가 |
| 메모리 부족 | Fallback 정책 확인 또는 maxPages 감소 |

## 📖 문서

- `QUICKSTART_KR.md` - 빠른 시작
- `DEVELOPER_GUIDE_KR.md` - 개발자 가이드 (이 문서)
- `README_INTEGRATION.md` - 통합 테스트 상세
- `TEST_RESULTS_*.md` - 테스트 결과

## 🎓 베스트 프랙티스

✅ **DO**
- data-testid 사용
- 명시적 대기 (waitForSelector)
- 각 테스트 격리
- 에러 핸들링 추가

❌ **DON'T**
- CSS 클래스로 셀렉팅
- waitForTimeout 남용
- 하드코딩된 대기 시간
- try-catch 없이 critical 코드 실행

## 📞 문의

QA 팀에 연락하세요.
