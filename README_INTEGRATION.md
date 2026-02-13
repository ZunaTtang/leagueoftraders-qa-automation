# 통합 QA 테스트 시스템

## 🎯 개요

이 시스템은 웹사이트의 완전한 자동화 테스트를 제공합니다:
- ✅ 모든 페이지 로드 테스트
- 🔗 모든 링크 검증
- 📡 API 호출 모니터링 (중복/누락 감지)
- 🎯 인터랙티브 요소 테스트
- 📊 CSV 형식의 상세한 리포트

## 📦 새로운 기능

### 1. API 모니터링 (`utils/apiMonitor.ts`)

모든 API 호출을 자동으로 추적하고 분석합니다:

**감지하는 문제:**
- 🔄 중복 API 호출
- ❌ 실패한 API 요청 (4xx, 5xx)
- 📭 누락된 필수 필드
- 🚫 빈 값 (null, undefined, 빈 문자열)
- 📦 빈 배열
- 🔁 배열 내 중복 데이터

**사용 예시:**
```typescript
const apiMonitor = await setupApiMonitoring(page);
await page.goto('/some-page');
const results = apiMonitor.getResults();
apiMonitor.stop();
```

### 2. CSV 리포터 (`utils/csvReporter.ts`)

테스트 결과를 CSV 파일로 출력하여 개발팀과 공유 가능:

**생성되는 리포트:**
1. **test-report-{timestamp}.csv** - 모든 테스트 결과
2. **api-report-{timestamp}.csv** - API 호출 상세 내역
3. **link-report-{timestamp}.csv** - 링크 검증 결과
4. **error-report-{timestamp}.csv** - 에러만 모은 리포트
5. **summary-report-{timestamp}.csv** - 요약 통계

**리포트 위치:** `test-results/reports/`

### 3. 통합 테스트 스위트 (`tests/integration/full_integration.spec.ts`)

모든 기능을 통합한 완전한 QA 테스트:

**테스트 항목:**
- ✅ Critical 페이지 검증
- 🕷️ 2단계 크롤링 (Discovery → Parallel Validation)
- 🔗 모든 내부/외부 링크 검증
- 🎯 인터랙티브 요소 테스트

## 🚀 사용법

### 통합 테스트 실행

```powershell
# 전체 통합 테스트 실행
npm run test:integration

# Headed 모드로 실행 (브라우저 보이게)
npm run test:integration -- --headed

# 특정 테스트만 실행
npx playwright test tests/integration/full_integration.spec.ts --grep "validate all critical pages"
```

### API 테스트 실행

```powershell
# API 관련 테스트만 실행
npm run test:api
```

### 기존 테스트 실행

```powershell
# Smoke 테스트 (빠름, ~2분)
npm run test:smoke

# Regression 테스트
npm run test:regression

# Crawler 테스트 (2단계 분리형)
npm run crawl:full

# 모든 테스트
npm run test:all
```

## 📊 리포트 확인

### 테스트 실행 후

1. 콘솔에 리포트 파일 경로가 출력됩니다:
```
📊 CSV Reports Generated:
  - Test Report: test-results/reports/test-report-2026-02-12T13-00-00.csv
  - API Report: test-results/reports/api-report-2026-02-12T13-00-00.csv
  - Link Report: test-results/reports/link-report-2026-02-12T13-00-00.csv
  - Error Report: test-results/reports/error-report-2026-02-12T13-00-00.csv
  - Summary Report: test-results/reports/summary-report-2026-02-12T13-00-00.csv
```

2. Excel이나 Google Sheets로 CSV 파일을 열어 확인
3. 에러 리포트를 먼저 확인하여 문제 우선순위 파악
4. API 리포트로 중복 호출 및 누락 필드 확인

### 리포트 내용

#### Test Report (테스트 결과)
| Timestamp | Page URL | Page Name | Test Type | Test Name | Status | Duration | Error Message | Details |
|-----------|----------|-----------|-----------|-----------|--------|----------|---------------|---------|
| 2026-02-12... | /login | Login Page | page-load | Load Login Page | PASS | 1523 | | API Calls: 3, Issues: 0 |

#### API Report (API 호출 내역)
| Timestamp | Page URL | API URL | Method | HTTP Status | Duration | Issue Type | Issue Severity | Issue Description |
|-----------|----------|---------|--------|-------------|----------|------------|----------------|-------------------|
| 2026-02-12... | /dashboard | /api/user | GET | 200 | 234 | | | |
| 2026-02-12... | /markets | /api/markets | GET | 200 | 456 | duplicate | warning | API called 3 times on same page |

#### Error Report (에러 모음)
| Timestamp | Error Type | Page URL | Test Name | Status | Error Message | Details |
|-----------|------------|----------|-----------|--------|---------------|---------|
| 2026-02-12... | API Error | /profile | /api/profile | CRITICAL | API call failed with status 500 | GET 500 |

## 🎯 개발팀 보고 프로세스

### 1. 테스트 실행
```powershell
npm run test:integration
```

### 2. 리포트 검토

**우선순위:**
1. **Summary Report** - 전체 통계 확인
2. **Error Report** - Critical 이슈 확인
3. **API Report** - API 문제 확인
4. **Link Report** - 깨진 링크 확인

### 3. 이슈 정리

개발팀에 전달할 때:
- Error Report 첨부
- Critical / Warning 이슈 요약
- 재현 방법 명시
- 스크린샷 (test-results 폴더에 자동 저장)

### 4. 주기적 실행

**권장 스케줄:**
- **Smoke 테스트**: 모든 PR마다 실행
- **Integration 테스트**: 매일 1회 실행
- **Full 테스트**: 주 1회 실행

## 🔧 커스터마이징

### API 검증 규칙 추가

현재는 범용 규칙을 사용하지만, 프로젝트에 맞게 커스터마이징 가능:

`utils/apiMonitor.ts`의 `isImportantField()` 함수 수정:
```typescript
function isImportantField(fieldName: string): boolean {
    const importantPatterns = [
        'id', 'name', 'title', 'email', 'user',
        // 프로젝트별 중요 필드 추가
        'trader', 'balance', 'portfolio'
    ];
    ...
}
```

### 테스트 범위 조정

`tests/integration/full_integration.spec.ts`:
```typescript
// 크롤링 최대 페이지 수 조정
maxPages: 50,  // 기본값

// 크롤링 깊이 조정
maxDepth: 3,   // 기본값
```

## 📝 주의사항

1. **실행 시간**: 통합 테스트는 10-20분 소요될 수 있습니다
2. **네트워크**: 모든 페이지를 실제로 방문하므로 네트워크 사용량 주의
3. **Rate Limiting**: 서버 부하 고려하여 throttle 설정 가능
4. **인증**: `.env` 파일에 테스트 계정 정보 필요 (인증 페이지 테스트 시)

## 🐛 문제 해결

### 테스트 실패 시

1. **타임아웃 에러**: 2단계 크롤링 아키텍처 사용 및 `CRAWLER_WORKERS` 조정
2. **네트워크 에러**: `.env`의 `LOT_BASE_URL` 확인
3. **빈 리포트**: 테스트가 정상 완료되었는지 확인

### 리포트 생성 안 됨

- `test-results/reports` 폴더 권한 확인
- 테스트가 `afterAll` 훅까지 완료되었는지 확인

## 📞 문의

테스트 시스템 관련 문의사항은 QA팀에 연락해주세요.
