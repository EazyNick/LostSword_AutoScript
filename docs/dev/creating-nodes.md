**최신 수정일자: 2025.12.00**

# 노드 추가 가이드

새로운 노드를 추가하는 방법은 두 가지가 있습니다:

1. **Python fastapi에서 실제 동작이 이뤄지는 방법**: 서버 측에서 실행되는 노드 (파일 시스템, 데이터베이스 접근 등)
2. **JavaScript에 직접 구현하는 방법**: 클라이언트 측에서 실행되는 노드 (브라우저 API, DOM 조작 등)

## 선택 가이드

- **Python 구현 노드가 필요한 경우**: [Python 노드 생성 가이드](creating-nodes-python.md) 참고
- **JavaScript 구현 노드가 필요한 경우**: [JavaScript 노드 생성 가이드](creating-nodes-javascript.md) 참고

## 공통 사항

모든 노드는 다음 단계를 거칩니다:

1. **노드 설정 추가**: `server/config/nodes_config.py`에 노드 정보 추가
2. **노드 구현**: Python 또는 JavaScript로 노드 로직 구현
3. **예시 출력 추가** (선택): `UI/src/pages/workflow/config/node-preview-outputs.js`에 예시 출력 함수 추가

> **참고**: 노드 설정은 Python 서버에서 중앙 관리되며, 클라이언트는 `/api/config/nodes` API를 통해 자동으로 가져옵니다.

## 노드 타입별 특징

### Python 노드
- 서버 측 리소스 접근 가능 (파일 시스템, 데이터베이스 등)
- 보안이 중요한 작업에 적합
- 복잡한 비즈니스 로직 처리

### JavaScript 노드
- 브라우저 API 직접 사용 가능
- 서버 부하 없이 빠른 응답
- 클라이언트 측 리소스만 필요한 경우

## 빠른 비교

| 항목 | Python 노드 | JavaScript 노드 |
|------|------------|----------------|
| 실행 위치 | 서버 | 클라이언트 |
| 파일 시스템 접근 | ✅ | ❌ |
| 데이터베이스 접근 | ✅ | ❌ |
| 브라우저 API | ❌ | ✅ |
| DOM 조작 | ❌ | ✅ |
| 네트워크 요청 | ✅ | ✅ |
| 보안 | 높음 | 낮음 |

## 다음 단계

- Python 노드를 만들고 싶다면 → [Python 노드 생성 가이드](creating-nodes-python.md)
- JavaScript 노드를 만들고 싶다면 → [JavaScript 노드 생성 가이드](creating-nodes-javascript.md)
