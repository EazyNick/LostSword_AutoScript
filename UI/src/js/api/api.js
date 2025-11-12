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

export const API_BASE_URL = 'http://localhost:8000';

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
    
    const url = `${API_BASE_URL}${endpoint}`;
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
            logError('[apiCall] 서버 URL:', API_BASE_URL);
        }
        
        throw error;
    }
}

// 전역 호환성을 위한 설정 (다른 파일과의 호환성 유지)
// TODO: 다른 파일들이 ES6 모듈로 전환되면 제거
if (typeof window !== 'undefined') {
    window.apiCall = apiCall;
    window.API_BASE_URL = API_BASE_URL;
}
