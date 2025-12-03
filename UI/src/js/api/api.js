/**
 * API 호출 공통 유틸리티
 * ES6 모듈 방식으로 작성됨
 */

/**
 * 로거 유틸리티 가져오기 (전역 fallback 포함)
 */
const getLogger = () => {
    return {
        log: window.log || (window.Logger ? window.Logger.log.bind(window.Logger) : console.log),
        error: window.logError || (window.Logger ? window.Logger.error.bind(window.Logger) : console.error)
    };
};

/**
 * API 기본 URL 동적 생성
 * window.API_HOST와 window.API_PORT를 사용 (서버에서 주입)
 * 기본값은 localhost:8000 (fallback)
 * 
 * 주의: window.API_HOST, window.API_PORT는 서버에서 HTML에 주입되므로
 * 모듈 로드 시점에는 아직 없을 수 있습니다.
 * 따라서 함수로 만들어서 호출 시점에 동적으로 가져옵니다.
 */
function getApiBaseUrl() {
    if (typeof window === 'undefined') {
        return 'http://localhost:8000'; // 서버 사이드 렌더링 시 기본값
    }
    
    // window.API_HOST와 window.API_PORT가 주입되었는지 확인
    const host = window.API_HOST || 'localhost';
    const port = window.API_PORT || 8000;
    return `http://${host}:${port}`;
}

// 초기값 (나중에 동적으로 업데이트됨)
export let API_BASE_URL = getApiBaseUrl();

/**
 * API 호출 헬퍼 함수
 * 
 * @param {string} endpoint - API 엔드포인트
 * @param {Object} options - 요청 옵션 (method, headers, body 등)
 * @returns {Promise<any>} API 응답 데이터
 */
export async function apiCall(endpoint, options = {}) {
    const logger = getLogger();
    const log = logger.log;
    const logError = logger.error;
    
    // 호출 시점에 동적으로 API URL 가져오기 (window.API_HOST, API_PORT가 주입되었을 수 있음)
    const apiBaseUrl = getApiBaseUrl();
    const url = `${apiBaseUrl}${endpoint}`;
    const method = options.method || 'GET';
    
    log(`[apiCall] 요청 시작: ${method} ${url}`);
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    const config = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {}),
        },
    };
    
    if (options.body) {
        log('[apiCall] 요청 본문:', options.body);
    }
    
    try {
        const startTime = performance.now();
        const response = await fetch(url, config);
        const endTime = performance.now();
        
        log(`[apiCall] 응답 받음: ${response.status} ${response.statusText}`);
        log(`[apiCall] 응답 시간: ${(endTime - startTime).toFixed(2)}ms`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: response.statusText }));
            logError(`[apiCall] ❌ HTTP 에러: ${response.status}`, errorData);
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        log(`[apiCall] ✅ 응답 데이터:`, data);
        
        return data;
    } catch (error) {
        logError(`[apiCall] ❌ API 호출 실패 (${endpoint}):`, error);
        logError('[apiCall] 에러 타입:', error.constructor.name);
        logError('[apiCall] 에러 메시지:', error.message);
        
        // 네트워크 에러인 경우 추가 정보
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            logError('[apiCall] 네트워크 에러 가능성 - 서버가 실행 중인지 확인하세요.');
            logError('[apiCall] 서버 URL:', getApiBaseUrl());
        }
        
        throw error;
    }
}

// 전역 호환성을 위한 설정 (다른 파일과의 호환성 유지)
// TODO: 다른 파일들이 ES6 모듈로 전환되면 제거
if (typeof window !== 'undefined') {
    window.apiCall = apiCall;
    // API_BASE_URL을 함수로 노출하여 동적으로 가져올 수 있도록 함
    window.getApiBaseUrl = getApiBaseUrl;
    // API_BASE_URL을 getter로 노출 (동적 값 반환)
    Object.defineProperty(window, 'API_BASE_URL', {
        get: getApiBaseUrl,
        configurable: true,
        enumerable: true
    });
    
    // 초기화 시점에 한 번 더 업데이트 (window.API_HOST, API_PORT가 주입된 후)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            API_BASE_URL = getApiBaseUrl();
        });
    } else {
        API_BASE_URL = getApiBaseUrl();
    }
}
