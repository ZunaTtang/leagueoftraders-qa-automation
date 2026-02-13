# QA 자동화 빠른 시작 가이드

## 🚀 빠른 실행

```powershell
# 1. 통합 테스트 (모든 기능 포함)
npm run test:integration

# 2. 빠른 검증 (2분)
npm run test:smoke

# 3. 크롤러 테스트 (2단계 분리형)
npm run crawl:full
```

## 📊 리포트 확인

테스트 완료 후:
```
test-results/reports/
├── test-report-{timestamp}.csv      ← 모든 테스트 결과
├── api-report-{timestamp}.csv       ← API 호출 상세
├── link-report-{timestamp}.csv      ← 링크 검증
├── error-report-{timestamp}.csv     ← 에러만 모음 (이것부터 확인!)
└── summary-report-{timestamp}.csv   ← 요약 통계
```

## 🎯 개발팀 보고 시

1. **Summary Report** 열기 → Pass Rate 확인
2. **Error Report** 열기 → Critical 이슈 확인
3. **API Report** 열기 → 중복/누락 API 확인
4. **Screenshots** 첨부 (`test-results/` 폴더)

## 🔧 주요 명령어

| 명령어 | 설명 | 소요시간 |
|--------|------|----------|
| `npm run test:integration` | 완전한 통합 테스트 | 10-20분 |
| `npm run test:smoke` | 주요 페이지 빠른 검증 | 1-2분 |
| `npm run test:api` | API 테스트만 | 5-10분 |
| `npm run crawl:full` | 2단계 크롤링 (수집+검증) | 1-2분 |
| `npm run test:all` | 모든 테스트 실행 | 20-30분 |

## 📝 테스트 결과 예시

### Console Output
```
🔍 Testing Critical Pages...

  Testing: Homepage (/)
    ✅ Quality Gates: PASS
    📡 API Calls: 12 (8 unique)
    ⚠️  Duplicate Calls: 2
    ✅ Page Load: PASS (3245ms)

  Testing: Login Page (/login)
    ✅ Quality Gates: PASS
    📡 API Calls: 3 (3 unique)
    ✅ Page Load: PASS (1523ms)

📝 Generating CSV Reports...
📊 CSV Reports Generated:
  - Test Report: test-results/reports/test-report-2026-02-12.csv
  - API Report: test-results/reports/api-report-2026-02-12.csv
  - Error Report: test-results/reports/error-report-2026-02-12.csv
```

### CSV Report (에러 예시)
| Error Type | Page URL | Error Message | Status |
|------------|----------|---------------|--------|
| API Error | /dashboard | API call failed with status 500 | CRITICAL |
| Test Error | /profile | Missing navigation element | FAIL |
| Link Error | /about | Broken link to /terms | FAIL |

## 💡 팁

**브라우저 보면서 테스트:**
```powershell
npm run test:integration -- --headed
```

**특정 테스트만 실행:**
```powershell
npx playwright test --grep "validate all critical pages"
```

**크롤링 병렬성 조절:**
```powershell
# 워커 10개로 빠르게 검증
$env:CRAWLER_WORKERS=10; npm run crawl:full
```

**디버그 모드:**
```powershell
npm run test:debug
```

## ⚠️ 주의사항

- 테스트는 실제 서버에 요청을 보냅니다
- 인증이 필요한 테스트는 `.env` 파일 설정 필요
- Error Report의 502/503 에러는 서버 상태 확인 필요

## 📖 상세 문서

더 자세한 정보는 다음 문서를 참고하세요:
- [README_INTEGRATION.md](./README_INTEGRATION.md) - 통합 테스트 완전 가이드
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 시스템 아키텍처
- [README.md](./README.md) - 전체 프로젝트 문서
