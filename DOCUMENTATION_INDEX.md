# 📚 통합 QA 테스트 시스템 - 문서 인덱스

## 🎯 역할별 추천 문서

### QA 엔지니어
1. **시작하기**
   - [QUICKSTART_KR.md](./QUICKSTART_KR.md) - 빠른 시작 가이드
   - [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - 빠른 참조 카드

2. **사용 가이드**
   - [README_INTEGRATION.md](./README_INTEGRATION.md) - 통합 테스트 완전 가이드
   - [TEST_RESULTS_2026-02-12.md](./TEST_RESULTS_2026-02-12.md) - 테스트 결과 샘플

### 개발자
1. **기술 문서**
   - [DEVELOPER_GUIDE_KR.md](./DEVELOPER_GUIDE_KR.md) - 개발자 가이드 (필독!)
   - [ARCHITECTURE.md](./ARCHITECTURE.md) - 시스템 아키텍처
   - [CRAWLER_ARCHITECTURE.md](./CRAWLER_ARCHITECTURE.md) - 크롤러 아키텍처 상세 ⭐ NEW

2. **확장 및 커스터마이징**
   - [DEVELOPER_GUIDE_KR.md#커스터마이징](./DEVELOPER_GUIDE_KR.md#커스터마이징)
   - [DEVELOPER_GUIDE_KR.md#확장-가이드](./DEVELOPER_GUIDE_KR.md#확장-가이드)

### DevOps
1. **배포 및 CI/CD**
   - [DEVELOPER_GUIDE_KR.md#cicd-통합](./DEVELOPER_GUIDE_KR.md#cicd-통합)
   - [.github/workflows/qa.yml](./.github/workflows/qa.yml) - GitHub Actions 설정

### 프로젝트 매니저
1. **개요 및 요약**
   - [README.md](./README.md) - 프로젝트 개요
   - [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md) - 구현 완료 보고서

---

## 📖 전체 문서 목록

### 사용자 가이드

| 문서 | 설명 | 대상 | 소요시간 |
|------|------|------|----------|
| [QUICKSTART_KR.md](./QUICKSTART_KR.md) | 빠른 시작 가이드 | QA | 5분 |
| [README_INTEGRATION.md](./README_INTEGRATION.md) | 통합 테스트 완전 가이드 | QA | 15분 |
| [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) | 빠른 참조 카드 | 모두 | 2분 |

### 기술 문서

| 문서 | 설명 | 대상 | 소요시간 |
|------|------|------|----------|
| [DEVELOPER_GUIDE_KR.md](./DEVELOPER_GUIDE_KR.md) | 개발자 완전 가이드 | 개발자 | 30분 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 시스템 아키텍처 | 개발자 | 20분 |
| [CRAWLER_ARCHITECTURE.md](./CRAWLER_ARCHITECTURE.md) | 크롤러 아키텍처 상세 | 개발자 | 15분 |
| [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md) | 구현 완료 보고서 | PM | 10분 |

### 테스트 결과

| 문서 | 설명 | 대상 | 소요시간 |
|------|------|------|----------|
| [TEST_RESULTS_2026-02-12.md](./TEST_RESULTS_2026-02-12.md) | 테스트 실행 결과 | QA, 개발자 | 5분 |
| [test-results/reports/*.csv](./test-results/reports/) | CSV 리포트 파일 | 모두 | - |

### 샘플 및 예제

| 문서 | 설명 | 대상 | 소요시간 |
|------|------|------|----------|
| [examples/sample-test-report.csv](./examples/sample-test-report.csv) | 테스트 리포트 샘플 | QA | 2분 |
| [examples/sample-api-report.csv](./examples/sample-api-report.csv) | API 리포트 샘플 | 개발자 | 2분 |
| [examples/sample-error-report.csv](./examples/sample-error-report.csv) | 에러 리포트 샘플 | QA | 2분 |
| [examples/sample-summary-report.csv](./examples/sample-summary-report.csv) | 요약 리포트 샘플 | PM | 2분 |

---

## 🎓 학습 경로

### 초급 (QA 엔지니어)

**목표:** 테스트 실행 및 리포트 확인

1. [QUICKSTART_KR.md](./QUICKSTART_KR.md) - 5분
2. 실습: `npm run test:smoke` 실행
3. [README_INTEGRATION.md](./README_INTEGRATION.md) - 15분
4. 실습: `npm run test:integration` 실행
5. CSV 리포트 확인 및 분석

**총 소요시간:** 30분 + 실습 시간

### 중급 (개발자)

**목표:** 시스템 이해 및 커스터마이징

1. [DEVELOPER_GUIDE_KR.md](./DEVELOPER_GUIDE_KR.md) - 30분
2. 코드 리뷰: `utils/apiMonitor.ts`, `utils/csvReporter.ts`
3. [DEVELOPER_GUIDE_KR.md#커스터마이징](./DEVELOPER_GUIDE_KR.md#커스터마이징) - 10분
4. 실습: 새로운 페이지 추가
5. 실습: 커스텀 검증 규칙 추가

**총 소요시간:** 1시간 + 실습 시간

### 고급 (시스템 확장)

**목표:** 새로운 기능 추가 및 아키텍처 변경

1. [ARCHITECTURE.md](./ARCHITECTURE.md) - 20분
2. [DEVELOPER_GUIDE_KR.md#확장-가이드](./DEVELOPER_GUIDE_KR.md#확장-가이드) - 15분
3. 전체 코드베이스 리뷰
4. 실습: 새로운 유틸리티 추가 (예: Performance Monitor)
5. 실습: CI/CD 파이프라인 구축

**총 소요시간:** 2시간 + 실습 시간

---

## 🔍 주제별 검색

### API 모니터링 관련
- [DEVELOPER_GUIDE_KR.md#api-monitor](./DEVELOPER_GUIDE_KR.md#핵심-컴포넌트)
- `utils/apiMonitor.ts` (소스 코드)
- [DEVELOPER_GUIDE_KR.md#api-레퍼런스](./DEVELOPER_GUIDE_KR.md#api-레퍼런스)

### CSV 리포팅 관련
- [DEVELOPER_GUIDE_KR.md#csv-reporter](./DEVELOPER_GUIDE_KR.md#핵심-컴포넌트)
- `utils/csvReporter.ts` (소스 코드)
- [README_INTEGRATION.md#리포트-확인](./README_INTEGRATION.md#리포트-확인)

### 테스트 작성 관련
- [DEVELOPER_GUIDE_KR.md#테스트-작성-가이드](./DEVELOPER_GUIDE_KR.md#테스트-작성-가이드)
- `tests/integration/full_integration.spec.ts` (샘플 코드)
- [DEVELOPER_GUIDE_KR.md#베스트-프랙티스](./DEVELOPER_GUIDE_KR.md#베스트-프랙티스)

### 트러블슈팅 관련
- [DEVELOPER_GUIDE_KR.md#트러블슈팅](./DEVELOPER_GUIDE_KR.md#트러블슈팅)
- [QUICK_REFERENCE.md#트러블슈팅](./QUICK_REFERENCE.md#트러블슈팅)

### 성능 최적화 관련
- [DEVELOPER_GUIDE_KR.md#성능-최적화](./DEVELOPER_GUIDE_KR.md#성능-최적화)

---

## 📝 문서 업데이트 가이드

### 새로운 기능 추가 시

1. **코드 작성**
   - 새로운 유틸리티 또는 테스트 추가
   
2. **문서 업데이트**
   - `DEVELOPER_GUIDE_KR.md`에 API 레퍼런스 추가
   - 사용 예시 추가
   - 필요 시 `QUICK_REFERENCE.md` 업데이트
   
3. **샘플 추가**
   - `examples/` 폴더에 샘플 파일 추가

### 버그 수정 시

1. **트러블슈팅 섹션 업데이트**
   - `DEVELOPER_GUIDE_KR.md#트러블슈팅`에 추가
   - 문제, 원인, 해결책 명시

### 테스트 실행 후

1. **결과 문서 생성**
   - `TEST_RESULTS_{date}.md` 파일 생성
   - 주요 발견사항 및 액션 아이템 정리

---

## 🎯 빠른 시작 체크리스트

### 처음 사용하는 경우

- [ ] [QUICKSTART_KR.md](./QUICKSTART_KR.md) 읽기
- [ ] `.env` 파일 설정
- [ ] `npm install` 실행
- [ ] `npm run test:smoke` 실행
- [ ] CSV 리포트 확인

### 개발자 온보딩

- [ ] [DEVELOPER_GUIDE_KR.md](./DEVELOPER_GUIDE_KR.md) 읽기
- [ ] 프로젝트 구조 파악
- [ ] 핵심 컴포넌트 코드 리뷰
- [ ] 테스트 작성 실습
- [ ] PR 제출 전 테스트 실행

### 테스트 추가 시

- [ ] `config/keyPages.ts`에 페이지 추가
- [ ] 테스트 작성
- [ ] `npm run test` 실행
- [ ] CSV 리포트 확인
- [ ] 문서 업데이트 (필요시)

---

## 📧 문의 및 지원

- **QA 팀**: 테스트 실행 및 리포트 관련
- **개발팀**: 코드 수정 및 확장 관련
- **DevOps 팀**: CI/CD 및 배포 관련

---

**마지막 업데이트:** 2026-02-13  
**버전:** 1.1.0
