# 통합 QA 테스트 시스템 - 개발자 가이드

> **대상:** 개발자, QA 엔지니어, DevOps  
> **난이도:** 중급~고급  
> **최종 업데이트:** 2026-02-13

---

## 📚 목차

1. [시스템 개요](#시스템-개요)
2. [아키텍처](#아키텍처)
3. [프로젝트 구조](#프로젝트-구조)
4. [핵심 컴포넌트](#핵심-컴포넌트)
5. [API 레퍼런스](#api-레퍼런스)
6. [테스트 작성 가이드](#테스트-작성-가이드)
7. [커스터마이징](#커스터마이징)
8. [CI/CD 통합](#cicd-통합)
9. [트러블슈팅](#트러블슈팅)
10. [성능 최적화](#성능-최적화)

---

## 시스템 개요

### 목적
League of Traders 웹사이트의 완전한 자동화 테스트를 제공하여:
- 모든 페이지의 정상 작동 검증
- API 호출 모니터링 및 이슈 감지
- 링크 무결성 검증
- 개발팀에 명확한 리포트 제공

### 기술 스택
```typescript
{
  "framework": "Playwright",
  "language": "TypeScript",
  "runtime": "Node.js",
  "reporting": "CSV + Markdown",
  "ci": "GitHub Actions (optional)"
}
```

### 주요 기능
1. **API 모니터링**: 모든 네트워크 요청 추적 및 분석
2. **중복/누락 감지**: 데이터 품질 검증
3. **CSV 리포팅**: 개발팀 친화적 형식
4. **2단계 크롤링**: 안정적인 페이지 발견 및 병렬 검증 (Discovery & Validation 분리)
5. **Quality Gates**: 콘솔 에러, 네트워크 실패 감지

---

## 아키텍처

### 시스템 다이어그램

```
┌─────────────────────────────────────────────────────────┐
│                    Playwright Test Runner                │
└───────────────────┬─────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼────────┐    ┌────────▼─────────┐
│  Test Suites   │    │  Global Setup    │
│                │    │  (Authentication)│
│ - Smoke        │    └──────────────────┘
│ - Regression   │
│ - Integration  │
│ - Crawler      │
└───────┬────────┘
        │
        │  uses
        │
┌───────▼──────────────────────────────────────────┐
│              Core Utilities                      │
│                                                   │
│  ┌──────────────┐  ┌──────────────┐             │
│  │ apiMonitor   │  │ csvReporter  │             │
│  │              │  │              │             │
│  │ - Track API  │  │ - Generate   │             │
│  │ - Detect     │  │   Reports    │             │
│  │   Issues     │  │ - Statistics │             │
│  └──────────────┘  └──────────────┘             │
│                                                   │
│  ┌──────────────┐  ┌──────────────┐             │
│  │ assertions   │  │ crawler      │             │
│  │              │  │              │             │
│  │ - Quality    │  │ - Discover   │             │
│  │   Gates      │  │   Pages      │             │
│  │ - Validation │  │ - Validate   │             │
│  └──────────────┘  └──────┬───────┘             │
│                            │                     │
│  ┌──────────────┐  ┌──────▼───────┐             │
│  │ interactions │  │ auth         │             │
│  │              │  │              │             │
│  │ - Safe Click │  │ - Login      │             │
│  │ - Navigation │  │ - Session    │             │
│  └──────────────┘  └──────────────┘             │
└───────────────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │   Configuration       │
        │                       │
        │ - keyPages.ts         │
        │ - networkRules.ts     │
        └───────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │   Output              │
        │                       │
        │ - CSV Reports         │
        │ - Screenshots         │
        │ - Videos              │
        │ - Traces              │
        └───────────────────────┘
```

### 데이터 플로우

```
Page Load → API Monitor Setup → Network Tracking
                ↓
        Collect API Calls
                ↓
        Analyze Responses
                ↓
     ┌──────────┴──────────┐
     ▼                     ▼
Detect Issues        Quality Gates
     │                     │
     └──────────┬──────────┘
                ▼
        CSV Reporter
                ▼
    Generate Reports
```

---

## 프로젝트 구조

```
Web test tool/
├── .auth/                      # 인증 상태 저장
│   └── user.json              # 사용자 세션
│
├── .github/
│   └── workflows/
│       └── qa.yml             # GitHub Actions CI/CD
│
├── config/                     # 설정 파일
│   ├── keyPages.ts            # 페이지 정의
│   └── networkRules.ts        # 네트워크 규칙
│
├── tests/                      # 테스트 스위트
│   ├── global.setup.ts        # 전역 설정 (로그인)
│   ├── smoke/                 # 스모크 테스트 (빠름)
│   │   └── critical.spec.ts   # 주요 페이지 검증
│   ├── functional/            # 기능 테스트
│   │   └── buttons.spec.ts    # 버튼 클릭 테스트
│   ├── crawler/               # 크롤러 테스트 ⭐
│   │   ├── discover.spec.ts   # Stage 1: URL 발견
│   │   ├── validate.spec.ts   # Stage 2: 페이지 검증
│   │   └── full_scan.spec.ts  # (Legacy) 전체 사이트 스캔
│   ├── integration/           # 통합 테스트
│   │   └── full_integration.spec.ts
│   └── nightly/               # 야간 테스트
│
├── utils/                      # 핵심 유틸리티
│   ├── apiMonitor.ts          # API 모니터링
│   ├── csvReporter.ts         # CSV 리포트 생성
│   ├── assertions.ts          # Quality Gates
│   ├── crawlerDiscovery.ts    # ⭐ URL 수집 엔진 (Stage 1)
│   ├── crawlerValidation.ts   # ⭐ 병렬 검증 엔진 (Stage 2)
│   ├── crawler.ts             # (Legacy) 크롤링 유틸리티
│   ├── interactions.ts        # 안전한 인터랙션
│   ├── auth.ts                # 인증 헬퍼
│   ├── reportHelper.ts        # 리포트 헬퍼
│   └── SmartReporter.ts       # 커스텀 리포터
│
├── CRAWLER_ARCHITECTURE.md     # ⭐ 크롤러 아키텍처 상세 가이드
│
├── examples/                   # 샘플 리포트
│   ├── sample-test-report.csv
│   ├── sample-api-report.csv
│   └── sample-error-report.csv
│
├── test-results/              # 테스트 결과 (자동 생성)
│   ├── reports/               # CSV 리포트
│   └── [test-name]/           # 스크린샷, 비디오, 트레이스
│
├── playwright.config.ts       # Playwright 설정
├── package.json               # NPM 설정
├── tsconfig.json              # TypeScript 설정
│
└── docs/                      # 문서
    ├── README.md              # 메인 문서
    ├── README_INTEGRATION.md  # 통합 테스트 가이드
    ├── QUICKSTART_KR.md       # 빠른 시작
    ├── DEVELOPER_GUIDE_KR.md  # 이 문서
    └── TEST_RESULTS_*.md      # 테스트 결과
```

---

## 핵심 컴포넌트

### 1. API Monitor (`utils/apiMonitor.ts`)

웹 페이지의 모든 API 호출을 추적하고 분석하는 핵심 유틸리티입니다.

#### 주요 기능

**1.1 Request/Response Interception**
```typescript
// Playwright의 page 이벤트를 활용
page.on('request', (request) => {
  // API 요청 시작 시간 기록
  requestTimestamps.set(request.url(), Date.now());
});

page.on('response', async (response) => {
  // 응답 수신, 분석 시작
  const duration = Date.now() - startTime;
  const responseBody = await response.json();
  // 저장...
});
```

**1.2 중복 호출 감지**
```typescript
// 동일 페이지에서 같은 API가 여러 번 호출되는지 체크
const callCounts = new Map<string, number>();
apiCalls.forEach(call => {
  const key = `${call.method} ${call.url}`;
  callCounts.set(key, (callCounts.get(key) || 0) + 1);
});

// count > 1 이면 중복
```

**1.3 누락 값 감지**
```typescript
function findMissingValues(data: any, apiUrl: string): ValidationIssue[] {
  // Null/undefined 체크
  if (data === null || data === undefined) {
    return [{ type: 'missing', ... }];
  }
  
  // 중요 필드의 빈 값 체크
  if (isImportantField(key) && value === '') {
    return [{ type: 'missing', ... }];
  }
  
  // 재귀적으로 중첩 객체 검사
  // ...
}
```

**1.4 배열 중복 감지**
```typescript
function findDuplicatesInArray(arr: any[]): any[] {
  const seen = new Set();
  const duplicates: any[] = [];
  
  arr.forEach(item => {
    const str = JSON.stringify(item);
    if (seen.has(str)) {
      duplicates.push(item);
    }
    seen.add(str);
  });
  
  return duplicates;
}
```

#### 사용 예시

```typescript
// Setup
const apiMonitor = await setupApiMonitoring(page);

// 페이지 방문
await page.goto('/some-page');

// 결과 가져오기
const results = apiMonitor.getResults();
console.log(`Total API Calls: ${results.stats.totalCalls}`);
console.log(`Duplicates: ${results.stats.duplicateCalls}`);
console.log(`Issues: ${results.issues.length}`);

// 정리
apiMonitor.stop();
```

#### 인터페이스

```typescript
interface ApiCallRecord {
  url: string;              // API URL
  method: string;           // GET, POST, etc.
  status: number;           // HTTP 상태 코드
  requestBody?: any;        // 요청 본문
  responseBody?: any;       // 응답 본문
  timestamp: number;        // 호출 시간
  pageUrl: string;          // 호출한 페이지
  duration: number;         // 소요 시간 (ms)
}

interface ValidationIssue {
  type: 'duplicate' | 'missing' | 'error' | 'warning';
  severity: 'critical' | 'warning' | 'info';
  apiUrl: string;
  description: string;
  details: any;
}
```

---

### 2. CSV Reporter (`utils/csvReporter.ts`)

테스트 결과를 CSV 형식으로 출력하는 리포팅 시스템입니다.

#### 주요 기능

**2.1 5가지 리포트 생성**

1. **Test Report**: 모든 테스트 실행 결과
2. **API Report**: API 호출 상세 내역
3. **Link Report**: 링크 검증 결과
4. **Error Report**: 에러만 필터링
5. **Summary Report**: 전체 통계

**2.2 UTF-8 BOM 처리**
```typescript
// Excel에서 한글이 깨지지 않도록 BOM 추가
fs.writeFileSync(filepath, '\uFEFF' + csvContent, 'utf8');
```

**2.3 CSV 이스케이프**
```typescript
function escapeCsvValue(value: string): string {
  // 쉼표, 따옴표, 개행이 포함된 경우 처리
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
```

**2.4 통계 계산**
```typescript
private calculateStats() {
  const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
  const failedTests = this.testResults.filter(r => r.status === 'FAIL').length;
  const passRate = (passedTests / totalTests) * 100;
  // ...
  return { passedTests, failedTests, passRate, ... };
}
```

#### 사용 예시

```typescript
import { getGlobalCsvReporter } from '../utils/csvReporter';

const csvReporter = getGlobalCsvReporter();

// 테스트 결과 추가
csvReporter.addTestResult({
  timestamp: new Date().toISOString(),
  pageUrl: page.url(),
  pageName: 'Homepage',
  testType: 'page-load',
  testName: 'Load Homepage',
  status: 'PASS',
  duration: Date.now() - startTime,
});

// API 결과 추가
csvReporter.addApiResult({
  timestamp: new Date().toISOString(),
  pageUrl: page.url(),
  apiUrl: '/api/users',
  method: 'GET',
  status: 200,
  duration: 123,
});

// 리포트 생성
const reports = csvReporter.generateReports();
console.log('Reports generated:', reports);
```

#### 싱글톤 패턴

```typescript
// 전역 리포터 인스턴스
let globalReporter: CsvReporter | null = null;

export function getGlobalCsvReporter(): CsvReporter {
  if (!globalReporter) {
    globalReporter = new CsvReporter();
  }
  return globalReporter;
}

export function resetGlobalCsvReporter() {
  globalReporter = new CsvReporter();
}
```

---

### 3. Assertions (`utils/assertions.ts`)

Quality Gates를 구현하는 검증 로직입니다.

#### 주요 검증

**3.1 콘솔 에러 검증**
```typescript
export async function assertNoConsoleErrors(
  page: Page,
  collectedErrors: ConsoleMessage[]
): Promise<void> {
  const significantErrors = collectedErrors.filter(error => {
    // 서드파티 에러 제외
    if (shouldIgnoreErrors(error.text)) return false;
    
    // 허용된 패턴 제외
    const isAllowed = allowedPatterns.some(pattern =>
      error.text.includes(pattern)
    );
    
    return !isAllowed;
  });
  
  if (significantErrors.length > 0) {
    throw new Error(`❌ Console errors detected`);
  }
}
```

**3.2 네트워크 실패 검증**
```typescript
export async function assertNoBadNetworkResponses(
  failedRequests: NetworkRequest[]
): Promise<void> {
  const criticalFailures = failedRequests.filter(req => {
    // 내부 요청만 체크
    if (!isInternalRequest(req.url)) return false;
    
    // 5xx 또는 4xx (404 제외)
    return req.status >= 500 || 
           (req.status >= 400 && req.status !== 404);
  });
  
  if (criticalFailures.length > 0) {
    throw new Error(`❌ Critical network failures`);
  }
}
```

**3.3 페이지 빈 화면 검증**
```typescript
export async function assertPageNotBlank(page: Page): Promise<void> {
  const bodyText = await page.locator('body').textContent();
  
  if (!bodyText || bodyText.trim().length < 50) {
    throw new Error('❌ Page appears to be blank');
  }
}
```

**3.4 네비게이션 존재 검증**
```typescript
export async function assertCoreNavigationWorks(page: Page): Promise<void> {
  const hasNav = await page.locator('nav, [role="navigation"], header').count() > 0;
  const hasContent = await page.locator('main, [role="main"], .content').count() > 0;
  
  if (!hasNav && !hasContent) {
    throw new Error('❌ Page layout broken');
  }
}
```

#### 모니터링 설정

```typescript
export async function setupMonitoring(page: Page): Promise<{
  consoleErrors: ConsoleMessage[];
  failedRequests: NetworkRequest[];
}> {
  const consoleErrors: ConsoleMessage[] = [];
  const failedRequests: NetworkRequest[] = [];
  
  // 콘솔 모니터링
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({
        type: msg.type(),
        text: msg.text(),
      });
    }
  });
  
  // 네트워크 모니터링
  page.on('response', response => {
    if (response.status() >= 400) {
      failedRequests.push({
        url: response.url(),
        status: response.status(),
        method: response.request().method(),
      });
    }
  });
  
  return { consoleErrors, failedRequests };
}
```

---

### 4. 2단계 크롤러 (2-Stage Crawler)

대규모 사이트의 안정성 및 성능 명확성을 위해 **URL 수집(Discovery)**과 **페이지 검증(Validation)**을 분리한 2단계 아키텍처를 채택하고 있습니다. 자세한 기술 명세는 `CRAWLER_ARCHITECTURE.md`를 참고하십시오.

#### 4.1 1단계: URL 수집 (`utils/crawlerDiscovery.ts`)
Sitemap 탐색과 내부 링크 크롤링을 결합하여 사이트의 모든 경로를 발견합니다.

- **재귀적 Sitemap 탐색**: `sitemap.xml`이 인덱스 형태인 경우 하위 Sitemap까지 자동으로 추적하여 모든 경로를 추출합니다.
- **URL 정규화**: 파라미터(`utm_`, `ref`), 해시(`#`), 트레일링 슬래시를 제거하여 중복 방문을 원천 차단합니다.
- **동적 라우팅 샘플링**: `/ko/announce/:id`와 같은 패턴에 대해 설정된 개수(기본 5개)만 수집하여 무한 루프를 방지합니다.
- **Fallback 정책**: 수집 시간이 60초를 초과하면 자동으로 탐색 범위를 축소(Pages -25%, Depth -1)하여 완료를 보장합니다.

#### 4.2 2단계: 페이지 검증 (`utils/crawlerValidation.ts`)
수집된 URL 명단을 바탕으로 병렬 워커를 통해 실제 품질 지표를 검증합니다.

- **병렬 워커 (Parallel Workers)**: `CRAWLER_WORKERS` 환경 변수에 지정된 수만큼 페이지를 동시에 검증합니다. Playwright 워커가 아닌 내부 큐 기반의 병렬 처리를 통해 리소스를 효율적으로 사용합니다.
- **Smart 404 감지**: SPA에서의 Soft 404 및 인증 리다이렉션(예: `/login`으로 이동)을 구분하여 불필요한 실패를 줄입니다.
- **실패 등급 (Severity)**:
   - **CRITICAL**: 5xx 에러, 페이지 크래시, 빈 화면 (즉시 수정 필요)
   - **WARNING**: 404 에러, 타임아웃, 콘솔 에러, 내부 API 실패 (리포트 및 모니터링 대상)

#### 4.3 실행 결과 파일
- `crawl-urls.json`: 수집된 URL 리스트 및 메타데이터
- `crawl-results.json`: 페이지별 검증 결과 상세 (에러 종류,Severity 포함)
- `crawl-validation-summary.json`: 최종 통계 (Pass/Critical/Warning 카운트)

---

## API 레퍼런스

### API Monitor

#### `setupApiMonitoring(page: Page)`

API 모니터링을 시작합니다.

**Parameters:**
- `page`: Playwright Page 객체

**Returns:**
```typescript
{
  getResults: () => ApiMonitoringResult;
  stop: () => void;
}
```

**Example:**
```typescript
const apiMonitor = await setupApiMonitoring(page);
await page.goto('/dashboard');
const results = apiMonitor.getResults();
apiMonitor.stop();
```

---

### CSV Reporter

#### `getGlobalCsvReporter()`

전역 CSV 리포터 인스턴스를 가져옵니다.

**Returns:** `CsvReporter`

#### `CsvReporter.addTestResult(result: TestResult)`

테스트 결과를 추가합니다.

**Parameters:**
```typescript
{
  timestamp: string;
  pageUrl: string;
  pageName: string;
  testType: 'page-load' | 'api-call' | 'link-test' | 'action-test' | 'quality-gate';
  testName: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  duration: number;
  errorMessage?: string;
  details?: string;
}
```

#### `CsvReporter.generateReports(runTimestamp?: string)`

모든 CSV 리포트를 생성합니다.

**Returns:**
```typescript
{
  testReportPath: string;
  apiReportPath: string;
  linkReportPath: string;
  errorReportPath: string;
  summaryReportPath: string;
}
```

---

### Assertions

#### `setupMonitoring(page: Page)`

콘솔 에러 및 네트워크 실패 모니터링을 설정합니다.

**Returns:**
```typescript
{
  consoleErrors: ConsoleMessage[];
  failedRequests: NetworkRequest[];
}
```

#### `runQualityGates(page, consoleErrors, failedRequests)`

모든 Quality Gates를 실행합니다.

**Throws:** 검증 실패 시 에러

---

### Crawler (2-Stage)

#### `discoverURLs(page, baseURL, options?)` ⭐ NEW
Sitemap 재귀 탐색 및 크롤링으로 사이트의 모든 가용 URL을 수집합니다. (1단계)

**Options:**
- `maxPages`: 수집 제한 (기본 100)
- `maxDepth`: 크롤링 깊이 (기본 3)
- `timeout`: Discovery 타임아웃 (기본 60000ms)

**Returns:** `Promise<string[]>`

#### `validateURLsInParallel(browser, urls, options?)` ⭐ NEW
수집된 URL 명단을 병렬 워커를 통해 방문하여 품질을 검증합니다. (2단계)

**Options:**
- `maxConcurrency`: 병렬 워커 수 (기본 5)
- `pageTimeout`: 페이지당 타임아웃 (기본 30000ms)
- `outputFile`: 상세 결과 저장 경로 (`crawl-results.json`)
- `summaryFile`: 요약 통계 저장 경로 (`crawl-validation-summary.json`)

**Returns:** `Promise<ValidationResult[]>`

---

## 테스트 작성 가이드

### 기본 테스트 구조

```typescript
import { test, expect } from '@playwright/test';
import { setupMonitoring, runQualityGates } from '../utils/assertions';
import { setupApiMonitoring } from '../utils/apiMonitor';
import { getGlobalCsvReporter } from '../utils/csvReporter';

test.describe('Feature Name', () => {
  
  test('should test specific functionality', async ({ page }) => {
    const startTime = Date.now();
    const timestamp = new Date().toISO String();
    const csvReporter = getGlobalCsvReporter();
    
    // 1. Setup monitoring
    const { consoleErrors, failedRequests } = await setupMonitoring(page);
    const apiMonitor = await setupApiMonitoring(page);
    
    // 2. Navigate
    await page.goto('/target-page');
    
    // 3. Perform actions
    await page.click('button#submit');
    
    // 4. Run quality gates
    try {
      await runQualityGates(page, consoleErrors, failedRequests);
      
      // 5. Get API results
      const apiResults = apiMonitor.getResults();
      apiMonitor.stop();
      
      // 6. Record results
      csvReporter.addTestResult({
        timestamp,
        pageUrl: page.url(),
        pageName: 'Target Page',
        testType: 'action-test',
        testName: 'Submit Button',
        status: 'PASS',
        duration: Date.now() - startTime,
      });
      
    } catch (error) {
      csvReporter.addTestResult({
        timestamp,
        pageUrl: page.url(),
        pageName: 'Target Page',
        testType: 'action-test',
        testName: 'Submit Button',
        status: 'FAIL',
        duration: Date.now() - startTime,
        errorMessage: error.message,
      });
      throw error;
    }
  });
  
});
```

### 페이지별 테스트 템플릿

```typescript
// config/myPages.ts
export const myPages = [
  { path: '/new-page', name: 'New Page', requiresAuth: false },
];

// tests/my-test.spec.ts
import { myPages } from '../config/myPages';

test.describe('My Pages Test', () => {
  for (const pageConfig of myPages) {
    test(`should load ${pageConfig.name}`, async ({ page }) => {
      const { consoleErrors, failedRequests } = await setupMonitoring(page);
      
      await page.goto(pageConfig.path);
      
      await runQualityGates(page, consoleErrors, failedRequests);
      
      expect(page.url()).toContain(pageConfig.path);
    });
  }
});
```

---

## 커스터마이징

### 1. API 검증 규칙 추가

`utils/apiMonitor.ts`의 `isImportantField()` 함수를 수정:

```typescript
function isImportantField(fieldName: string): boolean {
  const importantPatterns = [
    'id', 'name', 'title', 'email', 'user',
    // 프로젝트별 추가
    'trader', 'balance', 'portfolio', 'pnl'
  ];
  
  const lowerField = fieldName.toLowerCase();
  return importantPatterns.some(pattern => lowerField.includes(pattern));
}
```

### 2. 새로운 페이지 추가

`config/keyPages.ts`:

```typescript
export const criticalPages: PageDefinition[] = [
  // 기존 페이지들...
  { 
    path: '/new-feature', 
    name: 'New Feature', 
    requiresAuth: true, 
    priority: 'critical' 
  },
];
```

### 3. 네트워크 규칙 수정

`config/networkRules.ts`:

```typescript
export const networkRules: NetworkRules = {
  blockedDomains: [
    'googletagmanager.com',
    // 추가 차단 도메인
    'ads.example.com',
  ],
  
  internalDomains: [
    'leagueoftraders.io',
    // 추가 내부 도메인
    'api.leagueoftraders.io',
    'cdn.leagueoftraders.io',
  ],
};
```

### 4. 커스텀 리포트 추가

```typescript
// utils/csvReporter.ts

export class CsvReporter {
  // ...
  
  generateCustomReport(timestamp: string): string {
    const filename = `custom-report-${timestamp}.csv`;
    const filepath = path.join(this.outputDir, filename);
    
    const headers = ['Custom', 'Headers'];
    const rows = this.testResults.map(r => [
      r.customField1,
      r.customField2,
    ]);
    
    this.writeCsv(filepath, headers, rows);
    return filepath;
  }
}
```

---

## CI/CD 통합

### GitHub Actions 예시

`.github/workflows/qa.yml`:

```yaml
name: QA Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * *'  # 매일 오전 2시

jobs:
  smoke-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Install Playwright
        run: npx playwright install --with-deps
        
      - name: Run smoke tests
        run: npm run test:smoke
        env:
          LOT_BASE_URL: ${{ secrets.BASE_URL }}
          LOT_EMAIL: ${{ secrets.TEST_EMAIL }}
          LOT_PASSWORD: ${{ secrets.TEST_PASSWORD }}
          
      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: smoke-test-reports
          path: test-results/reports/
          
  crawler-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install Playwright
        run: npx playwright install --with-deps
        
      - name: Run Discovery (Stage 1)
        run: npm run crawl:discover
        
      - name: Run Validation (Stage 2)
        run: npm run crawl:validate
        continue-on-error: true # 리포트 확인을 위해 Warning은 빌드 실패로 취급하지 않음
        
      - name: Upload Crawler reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: crawler-reports
          path: crawl-*.json
```

### Slack 알림 추가

```yaml
      - name: Send Slack notification
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "QA Tests Failed!",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*QA Tests Failed*\nBranch: ${{ github.ref }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 트러블슈팅

### 문제 1: 타임아웃 에러

**증상:**
Test timeout exceeded (특히 크롤링 시 발생)

**해결:**
1. **2단계 크롤러 사용**: 수집(Discovery)과 검증(Validation)을 분리하여 전체 세션 시간을 단축합니다.
2. **병렬 워커 조정**: `CRAWLER_WORKERS` 환경 변수를 조정하여 리소스 부하를 제어합니다.
3. **타임아웃 설정**: `playwright.config.ts`에서 `crawler-validate` 프로젝트의 `timeout`을 늘립니다. (현재 기본 10분)

### 문제 2: CSV 파일 한글 깨짐

**증상:** Excel에서 CSV 열 때 한글이 깨짐

**해결:** 이미 BOM이 추가되어 있으므로, Excel에서 "데이터 가져오기"로 열기

### 문제 3: API 모니터링이 안 됨

**증상:** API 호출이 0건으로 나옴

**원인:** `isInternalRequest()`가 false 반환

**해결:**
```typescript
// config/networkRules.ts
export const networkRules = {
  internalDomains: [
    'leagueoftraders.io',
    // API 도메인 확인 후 추가
    'api.leagueoftraders.io',
  ],
};
```

### 문제 4: 메모리 부족

**증상:** 큰 사이트 크롤링 시 메모리 에러

**해결:**
```bash
# Node.js 메모리 증가
NODE_OPTIONS=--max-old-space-size=4096 npm run test:integration
```

또는 `maxPages` 줄이기:
```typescript
const urls = await discoverURLs(page, baseURL, {
  maxPages: 30,  // 100 → 30
  maxDepth: 2,   // 3 → 2
});
```

---

## 성능 최적화

### 1. 병렬 실행

```typescript
// playwright.config.ts
export default defineConfig({
  workers: process.env.CI ? 2 : 4,  // CI에서는 2개, 로컬에서는 4개
  fullyParallel: true,
});
```

### 2. 리소스 차단

```typescript
// config/networkRules.ts
export const networkRules = {
  blockedResourceTypes: [
    'image',  // 이미지 차단으로 속도 향상
    'font',   // 폰트 차단
  ],
};
```

### 3. 선택적 크롤링

```typescript
// 깊이 제한 및 샘플링
const urls = await discoverURLs(page, baseURL, {
  maxDepth: 2,  // 깊이 2까지만 수집
  sampleDynamicRoutes: 3,  // 동적 경로는 3개만 샘플링
});
```

### 4. API 모니터링 최적화

```typescript
// 큰 응답은 저장하지 않기
if (contentLength > 1024 * 1024) {  // 1MB 이상
  responseBody = '[Large Response Skipped]';
}
```

---

## 베스트 프랙티스

### 1. 테스트 격리

```typescript
// 각 테스트는 독립적이어야 함
test.beforeEach(async ({ page }) => {
  // 모든 쿠키, 스토리지 초기화
  await page.context().clearCookies();
});
```

### 2. 안정적인 셀렉터

```typescript
// ❌ 나쁜 예
await page.click('.btn-primary');

// ✅ 좋은 예
await page.click('[data-testid="submit-button"]');
await page.click('button:has-text("Submit")');
```

### 3. 명시적 대기

```typescript
// ❌ 나쁜 예
await page.waitForTimeout(3000);

// ✅ 좋은 예
await page.waitForSelector('[data-loaded="true"]');
await page.waitForResponse(resp => resp.url().includes('/api/'));
```

### 4. 에러 핸들링

```typescript
try {
  await runQualityGates(page, consoleErrors, failedRequests);
  csvReporter.addTestResult({ ...success... });
} catch (error) {
  csvReporter.addTestResult({ ...failure... });
  // 스크린샷 캡처
  await page.screenshot({ path: `error-${Date.now()}.png` });
  throw error;
}
```

---

## 확장 가이드

### 새로운 유틸리티 추가

```typescript
// utils/performanceMonitor.ts

export interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
}

export async function measurePerformance(page: Page): Promise<PerformanceMetrics> {
  const performanceTiming = JSON.parse(
    await page.evaluate(() => JSON.stringify(window.performance.timing))
  );
  
  return {
    loadTime: performanceTiming.loadEventEnd - performanceTiming.navigationStart,
    domContentLoaded: performanceTiming.domContentLoadedEventEnd - performanceTiming.navigationStart,
    firstContentfulPaint: await page.evaluate(() => {
      const paint = performance.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint');
      return paint ? paint.startTime : 0;
    }),
  };
}
```

### 새로운 검증 규칙 추가

```typescript
// utils/assertions.ts

export async function assertPerformance(page: Page): Promise<void> {
  const metrics = await measurePerformance(page);
  
  if (metrics.loadTime > 5000) {
    throw new Error(`❌ Page load too slow: ${metrics.loadTime}ms`);
  }
  
  if (metrics.firstContentfulPaint > 2000) {
    throw new Error(`❌ FCP too slow: ${metrics.firstContentfulPaint}ms`);
  }
}
```

### 새로운 테스트 프로젝트 추가

```typescript
// playwright.config.ts
{
  name: 'accessibility',
  testDir: './tests/accessibility',
  use: { ...devices['Desktop Chrome'] },
  timeout: 60 * 1000,
},
```

---

## 참고 자료

### 내부 문서
- [README.md](./README.md) - 프로젝트 개요
- [QUICKSTART_KR.md](./QUICKSTART_KR.md) - 빠른 시작
- [README_INTEGRATION.md](./README_INTEGRATION.md) - 통합 테스트 상세 가이드

### 외부 문서
- [Playwright Documentation](https://playwright.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Node.js CSV Parser](https://csv.js.org/)

---

## 변경 이력

### v1.1.0 (2026-02-13) ⭐ NEW
- ✅ **2단계 크롤러 아키텍처** 도입 (Discovery & Validation 분리)
- ✅ **Sitemap 재귀 탐색** 및 URL 정규화 로직 강화 (중복 제거)
- ✅ **병렬 검증 엔진** 구현 (`CRAWLER_WORKERS` 제어)
- ✅ **Smart 404 감지** 및 실패 등급(Critical/Warning) 시스템 적용
- ✅ **Fallback 정책** 도입 (성능 저하시 자동 범위 축소)

### v1.0.0 (2026-02-12)
- ✅ 초기 릴리스
- ✅ API 모니터링 시스템
- ✅ CSV 리포팅 시스템
- ✅ 통합 테스트 스위트
- ✅ 5가지 테스트 프로젝트 (smoke, regression, crawler, integration, nightly)

---

**문의사항이나 개선 제안이 있으면 QA 팀에 연락해주세요.**
