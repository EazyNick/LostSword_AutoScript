# 성능 최적화 문서

## 개요

캔버스 내 위치 이동 및 노드 드래그 시 발생하던 렉을 해결하기 위해 좌표 계산 로직을 최적화했습니다.

## 브라우저 렌더링 과정 이해하기

### 리플로우(Reflow)와 리페인트(Repaint)

웹 브라우저가 페이지를 화면에 그리는 과정은 다음과 같습니다:

```
1. HTML 파싱 → DOM 트리 생성
2. CSS 파싱 → CSSOM 트리 생성
3. DOM + CSSOM → 렌더 트리(Render Tree) 생성
4. 레이아웃 계산 (Layout/Reflow) ← 여기서 리플로우 발생
5. 페인팅 (Paint/Repaint) ← 여기서 리페인트 발생
6. 합성 (Composite) → 최종 화면 표시
```

#### 리플로우(Reflow)란?

**리플로우(Reflow)**는 브라우저가 **요소의 크기와 위치를 다시 계산**하는 과정입니다.

**리플로우가 발생하는 경우:**
- 요소의 크기 변경 (`width`, `height`)
- 요소의 위치 변경 (`left`, `top`, `margin`, `padding`)
- 요소 추가/제거 (`appendChild`, `removeChild`)
- 레이아웃 정보 읽기 (`offsetWidth`, `offsetHeight`, `getBoundingClientRect()`)
- 폰트 크기 변경
- 윈도우 리사이즈

**리플로우의 비용:**
- 리플로우는 **매우 비용이 큰 작업**입니다
- 한 요소의 리플로우가 발생하면, 그 요소의 **자식 요소들도 모두 다시 계산**됩니다
- DOM 트리가 깊을수록 비용이 기하급수적으로 증가합니다

**예시:**
```javascript
// ❌ 나쁜 예: 매번 리플로우 발생
for (let i = 0; i < 100; i++) {
    element.style.left = i + 'px';  // 리플로우 발생
    const rect = element.getBoundingClientRect();  // 리플로우 발생 (레이아웃 정보 읽기)
}

// ✅ 좋은 예: 리플로우 최소화
// 1. 레이아웃 정보를 먼저 읽기 (한 번만 리플로우)
const rect = element.getBoundingClientRect();
// 2. 모든 스타일 변경을 한 번에 적용
for (let i = 0; i < 100; i++) {
    element.style.left = i + 'px';  // 리플로우 발생 (하지만 배치 가능)
}
// 3. 또는 requestAnimationFrame 사용
```

#### 리페인트(Repaint)란?

**리페인트(Repaint)**는 브라우저가 **요소의 시각적 속성을 다시 그리는** 과정입니다.

**리페인트가 발생하는 경우:**
- 색상 변경 (`color`, `background-color`)
- 투명도 변경 (`opacity`)
- 그림자 변경 (`box-shadow`)
- 배경 이미지 변경 (`background-image`)

**리페인트의 비용:**
- 리페인트는 리플로우보다는 비용이 적지만, 여전히 비용이 듭니다
- 리플로우가 발생하면 자동으로 리페인트도 발생합니다

#### 리플로우를 유발하는 JavaScript API

다음 JavaScript API들은 레이아웃 정보를 읽기 위해 **강제로 리플로우를 발생**시킵니다:

```javascript
// 레이아웃 정보 읽기 → 리플로우 발생
element.offsetWidth
element.offsetHeight
element.offsetTop
element.offsetLeft
element.clientWidth
element.clientHeight
element.scrollWidth
element.scrollHeight
element.getBoundingClientRect()
element.getComputedStyle()
window.getComputedStyle()
```

**왜 문제가 될까?**
- `getBoundingClientRect()`를 호출하면 브라우저는 **즉시 최신 레이아웃 정보를 계산**해야 합니다
- 이전에 예약된 스타일 변경이 있다면 먼저 리플로우를 실행합니다
- 드래그 중에 매 `mousemove`마다 호출하면 **매우 많은 리플로우가 발생**합니다

**최적화 방법:**
```javascript
// ❌ 나쁜 예: 매번 리플로우 발생
element.addEventListener('mousemove', (e) => {
    const rect = element.getBoundingClientRect();  // 리플로우 발생!
    // ...
});

// ✅ 좋은 예: 캐싱으로 리플로우 최소화
let cachedRect = null;
let cacheTime = 0;
const CACHE_DURATION = 100; // 100ms 동안 캐시 유지

element.addEventListener('mousemove', (e) => {
    const now = Date.now();
    if (!cachedRect || (now - cacheTime) > CACHE_DURATION) {
        cachedRect = element.getBoundingClientRect();  // 필요할 때만 리플로우
        cacheTime = now;
    }
    // 캐시된 값 사용
    const rect = cachedRect;
    // ...
});
```

### 우리 프로젝트에서의 리플로우 문제

**문제 상황:**
- 노드 드래그 중 매 `mousemove`마다 `getBoundingClientRect()` 호출
- 이는 매번 리플로우를 유발하여 성능 저하 발생
- 드래그가 부드럽지 않고 렉이 발생

**해결 방법:**
- `getBoundingClientRect()` 결과를 캐시하여 재사용
- 100ms 동안 캐시 유지 (캔버스 크기가 자주 변경되지 않으므로 충분)
- 리사이즈 이벤트 시에만 캐시 무효화

이렇게 하면 리플로우 발생 횟수를 **수백 배에서 수십 배로 줄일 수 있습니다**.

## 주요 최적화 사항

### 1. 노드 드래그 최적화 (`node-drag.js`)

#### 1.1 `getBoundingClientRect()` 캐싱

**문제점:**
- 매 `mousemove` 이벤트마다 `getBoundingClientRect()` 호출
- 이 함수는 브라우저 리플로우를 유발하여 성능 저하

**해결책:**
- 캔버스 바운딩 박스를 캐시하여 재사용
- 100ms 동안 캐시 유지 (캔버스 크기가 자주 변경되지 않으므로 충분)
- 리사이즈 이벤트 시에만 캐시 무효화

**캐싱하는 것:**
- **캔버스의 바운딩 박스 (DOMRect 객체)**
  - `left`: 캔버스의 왼쪽 가장자리가 화면에서 떨어진 거리
  - `top`: 캔버스의 위쪽 가장자리가 화면에서 떨어진 거리
  - `width`: 캔버스의 너비
  - `height`: 캔버스의 높이
  - `right`, `bottom`: 오른쪽/아래쪽 좌표

**캐시 동작 방식:**
```javascript
getCanvasRect() {
    const now = Date.now();
    
    // 캐시가 없거나 만료되었으면 새로 계산
    // 만료 조건: 마지막 캐시 시간으로부터 100ms 이상 지났을 때
    if (!this.cachedCanvasRect || (now - this.canvasRectCacheTime) > this.CANVAS_RECT_CACHE_DURATION) {
        // getBoundingClientRect() 호출 → 리플로우 발생 (비용 큰 작업)
        this.cachedCanvasRect = this.nodeManager.canvas.getBoundingClientRect();
        this.canvasRectCacheTime = now; // 캐시 시간 기록
    }
    
    // 캐시된 값 반환 (리플로우 없음, 매우 빠름)
    return this.cachedCanvasRect;
}
```

**캐시 유지 시간 (100ms)의 의미:**
- "0.1초마다 갱신"이 아니라 **"0.1초 동안 유지"**를 의미합니다
- 즉, 캐시를 만든 후 **100ms가 지나기 전까지는 같은 값을 재사용**합니다
- 100ms가 지나면 다음 호출 시 새로운 값을 계산합니다

**예시 시나리오:**
```
시간 0ms:   getCanvasRect() 호출 → getBoundingClientRect() 실행 (리플로우 발생)
           캐시 저장: { left: 100, top: 200, width: 800, height: 600 }
           캐시 시간: 0ms

시간 10ms:  getCanvasRect() 호출 → 캐시 사용 (리플로우 없음, 매우 빠름)
           반환: { left: 100, top: 200, width: 800, height: 600 }

시간 50ms:  getCanvasRect() 호출 → 캐시 사용 (리플로우 없음)
           반환: { left: 100, top: 200, width: 800, height: 600 }

시간 100ms: getCanvasRect() 호출 → 캐시 만료 (100ms 지남)
           getBoundingClientRect() 실행 (리플로우 발생)
           캐시 갱신: { left: 100, top: 200, width: 800, height: 600 }
           캐시 시간: 100ms

시간 150ms: getCanvasRect() 호출 → 캐시 사용 (50ms만 지남, 아직 유효)
           반환: { left: 100, top: 200, width: 800, height: 600 }
```

**왜 100ms인가?**
- 캔버스 크기는 드래그 중에 거의 변경되지 않습니다
- 100ms는 충분히 짧아서 정확성을 유지하면서도 충분히 길어서 성능을 향상시킵니다
- 일반적인 드래그 속도에서는 100ms 동안 캔버스 위치가 변하지 않습니다
- 리사이즈 이벤트가 발생하면 즉시 캐시를 무효화하므로 안전합니다

#### 1.2 `requestAnimationFrame`을 사용한 업데이트 스로틀링

**문제점:**
- 매 `mousemove` 이벤트마다 즉시 업데이트
- 이벤트 발생 빈도가 브라우저 렌더링 주기(약 60fps)보다 훨씬 높음
- 불필요한 업데이트로 인한 성능 저하

**해결책:**
- `requestAnimationFrame`을 사용하여 브라우저 렌더링 주기에 맞춰 업데이트
- 마우스 위치를 `pendingPosition`에 저장하고, 다음 프레임에 업데이트
- 한 프레임에 한 번만 업데이트되도록 보장

```javascript
bindGlobalEvents() {
    document.addEventListener('mousemove', (e) => {
        if (this.isDragging) {
            // 마우스 위치를 즉시 저장
            this.pendingPosition = { x: e.clientX, y: e.clientY };
            
            // requestAnimationFrame이 이미 예약되지 않았을 때만 예약
            if (this.rafId === null) {
                this.rafId = requestAnimationFrame(() => {
                    this.handleDrag();
                    this.rafId = null;
                });
            }
        }
    });
}
```

#### 1.3 연결선 업데이트 스로틀링

**문제점:**
- 드래그 중 매 프레임마다 연결선 업데이트
- 연결선 계산은 비용이 큰 작업 (노드 위치 계산, 커넥터 위치 계산, SVG 경로 생성)

**해결책:**
- 연결선 업데이트를 16ms(약 60fps) 간격으로 제한
- 드래그 중에는 최소한의 업데이트만 수행
- 드래그 종료 시에만 완전한 업데이트 수행

```javascript
updateRelatedComponentsThrottled(node) {
    const now = Date.now();
    
    // 마지막 업데이트로부터 일정 시간이 지났을 때만 업데이트
    if (now - this.lastConnectionUpdateTime >= this.CONNECTION_UPDATE_INTERVAL) {
        // 연결선 업데이트
        this.nodeManager.connectionManager.updateNodeConnectionsImmediately(nodeId);
        this.lastConnectionUpdateTime = now;
    }
}
```

### 2. 캔버스 패닝/줌 최적화 (`node-canvas.js`)

#### 2.1 `canvasTransform` 객체 활용

**문제점:**
- 매번 DOM에서 `transform` 스타일을 읽고 정규식으로 파싱
- 정규식 파싱은 비용이 큰 작업

**해결책:**
- `canvasTransform` 객체를 메모리에 유지
- DOM 파싱 대신 메모리 객체를 직접 사용
- DOM 업데이트 시에만 메모리 객체 동기화

```javascript
// 이전 방식 (매번 DOM 파싱)
const currentTransform = canvasContent.style.transform;
const translateMatch = currentTransform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
const currentX = parseFloat(translateMatch[1]) || -50000;

// 최적화된 방식 (메모리 객체 사용)
const currentX = this.canvasTransform.x;
```

#### 2.2 패닝 업데이트 스로틀링

**문제점:**
- 매 `mousemove` 이벤트마다 즉시 transform 업데이트
- 불필요한 업데이트로 인한 성능 저하

**해결책:**
- `requestAnimationFrame`을 사용하여 브라우저 렌더링 주기에 맞춰 업데이트
- 마우스 위치를 `pendingPanPosition`에 저장하고, 다음 프레임에 업데이트

```javascript
const handleMove = (moveEvent) => {
    if (this.isPanning) {
        // 마우스 위치를 저장하고 requestAnimationFrame으로 업데이트
        this.pendingPanPosition = { x: moveEvent.clientX, y: moveEvent.clientY };
        
        if (this.panRafId === null) {
            this.panRafId = requestAnimationFrame(() => {
                this.handlePan();
                this.panRafId = null;
            });
        }
    }
};
```

#### 2.3 연결선 업데이트 스로틀링

**문제점:**
- 패닝 중 매 프레임마다 연결선 업데이트
- 연결선 계산은 비용이 큰 작업

**해결책:**
- 연결선 업데이트를 16ms(약 60fps) 간격으로 제한
- 패닝 중에는 최소한의 업데이트만 수행

```javascript
updateCanvasTransform(x, y, scale = 1) {
    // ... transform 업데이트 ...
    
    // 연결선 업데이트 스로틀링
    if (window.connectionManager && !this.nodeManager.isDragging) {
        const now = Date.now();
        if (now - this.lastConnectionUpdateTime >= this.CONNECTION_UPDATE_INTERVAL) {
            window.connectionManager.updateConnections();
            this.lastConnectionUpdateTime = now;
        }
    }
}
```

## 동작 방식 상세 설명

### 노드 드래그 동작 흐름

1. **드래그 시작 (`startDrag`)**
   - 사용자가 노드를 클릭하고 드래그 시작
   - `calculateDragOffset` 호출하여 드래그 오프셋 계산
   - 이때 `getBoundingClientRect()` 호출하여 캐시에 저장

2. **드래그 중 (`handleDrag`)**
   - `mousemove` 이벤트 발생 시 마우스 위치를 `pendingPosition`에 저장
   - `requestAnimationFrame`을 통해 다음 프레임에 `handleDrag` 호출
   - `calculateNewPosition`에서 캐시된 `canvasRect` 사용하여 새 위치 계산
   - 노드 위치 업데이트 (`updateNodePosition`)
   - 연결선 업데이트 (`updateRelatedComponentsThrottled`) - 스로틀링 적용

3. **드래그 종료 (`endDrag`)**
   - `mouseup` 이벤트 발생 시 드래그 종료
   - 최종 위치 저장 (`saveFinalPosition`)
   - 연결선 완전 업데이트 (스로틀링 없이)

### 캔버스 패닝 동작 흐름

1. **패닝 시작 (`startPan`)**
   - 중간 버튼 클릭 또는 휠 이벤트로 패닝 시작
   - `syncCanvasTransformFromDOM` 호출하여 메모리 객체 동기화 (필요 시)
   - 패닝 시작 위치 저장 (`panScrollStart`)

2. **패닝 중 (`handlePan`)**
   - `mousemove` 이벤트 발생 시 마우스 위치를 `pendingPanPosition`에 저장
   - `requestAnimationFrame`을 통해 다음 프레임에 `handlePan` 호출
   - 메모리의 `canvasTransform` 객체 사용하여 새 위치 계산
   - `updateCanvasTransform` 호출하여 DOM 업데이트
   - 연결선 업데이트 (스로틀링 적용)

3. **패닝 종료 (`endPan`)**
   - `mouseup` 이벤트 발생 시 패닝 종료
   - `requestAnimationFrame` 취소
   - 연결선 완전 업데이트

### 캔버스 줌 동작 흐름

1. **줌 시작 (`handleCanvasZoom`)**
   - Ctrl + 휠 이벤트 발생
   - 메모리의 `canvasTransform` 객체 사용하여 현재 상태 확인
   - 마우스 위치를 중심으로 줌 계산
   - `updateCanvasTransform` 호출하여 DOM 업데이트
   - 메모리 객체도 함께 업데이트

## 성능 개선 효과

### 최적화 전
- 매 `mousemove`마다 `getBoundingClientRect()` 호출 → 리플로우 발생
- 매 `mousemove`마다 DOM 파싱 (정규식) → CPU 사용량 증가
- 매 프레임마다 연결선 업데이트 → 렌더링 비용 증가
- **결과**: 드래그/패닝 시 렉 발생, 프레임 드롭

### 최적화 후
- `getBoundingClientRect()` 캐싱 → 리플로우 최소화
- 메모리 객체 사용 → DOM 파싱 제거
- `requestAnimationFrame` 사용 → 불필요한 업데이트 제거
- 연결선 업데이트 스로틀링 → 렌더링 비용 감소
- **결과**: 부드러운 드래그/패닝, 프레임 드롭 없음

## 주의사항

1. **캐시 무효화**
   - 리사이즈 이벤트 시 캐시를 무효화하여 정확한 좌표 계산 보장
   - 드래그 종료 시에도 캐시를 무효화하여 다음 드래그 시 정확한 좌표 보장

2. **메모리 객체 동기화**
   - 패닝 시작 시에만 DOM에서 동기화 (필요 시)
   - 이후에는 메모리 객체를 사용하여 성능 향상

3. **requestAnimationFrame 취소**
   - 드래그/패닝 종료 시 `requestAnimationFrame`을 취소하여 메모리 누수 방지

## 추가 최적화 가능 영역

1. **연결선 계산 최적화**
   - 연결선 계산 로직 자체를 최적화 (현재는 스로틀링만 적용)
   - 가시 영역 밖의 연결선은 업데이트하지 않도록 개선

2. **가상 스크롤**
   - 노드가 많을 경우 가상 스크롤 적용
   - 화면에 보이는 노드만 렌더링

3. **Web Workers 활용**
   - 복잡한 계산을 Web Worker로 이동하여 메인 스레드 부하 감소

