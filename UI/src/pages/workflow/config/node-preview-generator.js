/**
 * 노드 스키마 기반 미리보기 생성
 * n8n 스타일로 노드의 입력/출력 스키마를 기반으로 즉시 미리보기를 생성합니다.
 */

/**
 * 스키마를 기반으로 예시 데이터 생성
 * @param {Object} schema - 스키마 정의 (필드명: 필드스키마 형태의 객체)
 * @param {Object} nodeData - 노드 데이터 (파라미터 값 포함, 실제 값이 있으면 우선 사용)
 * @returns {any} 예시 데이터 (객체 또는 null)
 */
export function generatePreviewFromSchema(schema, nodeData = {}) {
    // 스키마가 없거나 객체가 아닌 경우 null 반환
    if (!schema || typeof schema !== 'object') {
        return null;
    }

    // 스키마가 빈 객체인 경우 빈 객체 반환
    if (Object.keys(schema).length === 0) {
        return {};
    }

    // 결과 객체 초기화
    const result = {};

    // 스키마의 각 필드를 순회하며 예시 데이터 생성
    for (const [key, fieldSchema] of Object.entries(schema)) {
        // 필드 스키마가 없거나 객체가 아닌 경우 건너뛰기
        if (!fieldSchema || typeof fieldSchema !== 'object') {
            continue;
        }

        // 필드 타입 추출 (string, number, boolean, array, object, any)
        const fieldType = fieldSchema.type;

        // nodeData에서 실제 값을 가져오거나 스키마 기반 예시 값 생성
        // 실제 값이 있으면 우선 사용, 없으면 예시 값 생성
        let value = nodeData[key];

        // 실제 값이 없는 경우 (undefined 또는 null)
        if (value === undefined || value === null) {
            // 필드명과 타입에 맞는 의미있는 예시 값 생성
            value = generateExampleValue(key, fieldType, fieldSchema);
        }

        // 결과 객체에 필드 추가
        result[key] = value;
    }

    return result;
}

/**
 * 필드명과 타입에 맞는 의미있는 예시 값 생성
 * 필드명 패턴을 분석하여 실제 사용 시나리오에 맞는 예시 값을 생성합니다.
 * @param {string} fieldName - 필드명 (예: "file_path", "success", "execution_id")
 * @param {string} fieldType - 필드 타입 (string, number, boolean, array, object, any)
 * @param {Object} fieldSchema - 필드 스키마 (properties, items 등 포함)
 * @returns {any} 예시 값 (필드명 패턴에 맞는 의미있는 값)
 */
function generateExampleValue(fieldName, fieldType, fieldSchema) {
    // 필드명을 소문자로 변환하여 패턴 매칭 (대소문자 구분 없이)
    const lowerName = fieldName.toLowerCase();

    // 필드명 기반 예시 값 생성 (우선순위 순서대로 체크)
    // 1. 경로 관련 필드 (path, file, folder)
    if (lowerName.includes('path') || lowerName.includes('file') || lowerName.includes('folder')) {
        // 문자열 타입인 경우에만 파일 경로 예시 반환
        if (fieldType === 'string') {
            return 'C:\\example\\path\\file.ext';
        }
    }
    // 2. URL 필드
    else if (lowerName.includes('url')) {
        // 문자열 타입인 경우에만 URL 예시 반환
        if (fieldType === 'string') {
            return 'https://example.com/api/endpoint';
        }
    }
    // 3. ID 관련 필드 (id, execution)
    else if (lowerName.includes('id') || lowerName.includes('execution')) {
        // 문자열 타입: 실행 ID 형식 (날짜-시간-랜덤문자열)
        if (fieldType === 'string') {
            return '20250101-120000-abc123';
        }
        // 숫자 타입: 일반적인 ID 숫자
        else if (fieldType === 'number') {
            return 12345;
        }
    }
    // 4. 개수/총계 관련 필드 (count, total, number)
    else if (lowerName.includes('count') || lowerName.includes('total') || lowerName.includes('number')) {
        // 숫자 타입인 경우에만 개수 예시 반환
        if (fieldType === 'number') {
            return 10;
        }
    }
    // 5. 시간 관련 필드 (time, wait, elapsed)
    else if (lowerName.includes('time') || lowerName.includes('wait') || lowerName.includes('elapsed')) {
        // 숫자 타입인 경우에만 시간(초) 예시 반환
        if (fieldType === 'number') {
            return 5;
        }
    }
    // 6. 성공/상태 관련 필드 (success, found, touched, focused, completed, written)
    else if (
        lowerName.includes('success') ||
        lowerName.includes('found') ||
        lowerName.includes('touched') ||
        lowerName.includes('focused') ||
        lowerName.includes('completed') ||
        lowerName.includes('written')
    ) {
        // 불린 타입인 경우에만 true 반환 (성공 상태를 나타냄)
        if (fieldType === 'boolean') {
            return true;
        }
    }
    // 7. 이름/프로세스 관련 필드 (name, process)
    else if (lowerName.includes('name') || lowerName.includes('process')) {
        // 문자열 타입인 경우에만 프로세스 이름 예시 반환
        if (fieldType === 'string') {
            return 'example_process.exe';
        }
    }
    // 8. result 필드 (boolean 타입인 경우만 먼저 처리)
    else if (lowerName.includes('result') && fieldType === 'boolean') {
        // 불린 타입인 result 필드는 true 반환
        return true;
    }
    // 9. 내용/텍스트 관련 필드 (content, text, message, result)
    else if (
        lowerName.includes('content') ||
        lowerName.includes('text') ||
        lowerName.includes('message') ||
        lowerName.includes('result')
    ) {
        // 문자열 타입인 경우에만 텍스트 예시 반환
        if (fieldType === 'string') {
            return '예시 내용';
        }
    }
    // 10. 위치/좌표 관련 필드 (position, coord)
    else if (lowerName.includes('position') || lowerName.includes('coord')) {
        // 배열 타입인 경우에만 좌표 배열 예시 반환 [x, y]
        if (fieldType === 'array') {
            return [100, 200];
        }
    }
    // 11. 모드/인코딩/타입 관련 필드 (mode, encoding, type)
    else if (lowerName.includes('mode') || lowerName.includes('encoding') || lowerName.includes('type')) {
        // 문자열 타입인 경우에만 기본값 예시 반환
        if (fieldType === 'string') {
            return 'default';
        }
    }
    // 12. 크기 관련 필드 (bytes, size)
    else if (lowerName.includes('bytes') || lowerName.includes('size')) {
        // 숫자 타입인 경우에만 바이트 크기 예시 반환
        if (fieldType === 'number') {
            return 1024;
        }
    }
    // 13. 조건 관련 필드 (condition)
    else if (lowerName.includes('condition')) {
        // 문자열 타입인 경우에만 조건 표현식 예시 반환
        if (fieldType === 'string') {
            return 'output.value == "test"';
        }
    }
    // 14. 표시/활성화/저장 관련 필드 (visible, enabled, save)
    else if (lowerName.includes('visible') || lowerName.includes('enabled') || lowerName.includes('save')) {
        // 불린 타입인 경우에만 true 반환 (기본적으로 활성화된 상태)
        if (fieldType === 'boolean') {
            return true;
        }
    }
    // 15. 반복/결과 배열 관련 필드 (iterations, results)
    else if (lowerName.includes('iterations') || lowerName.includes('results')) {
        // 배열 타입인 경우
        if (fieldType === 'array') {
            // 배열 아이템 스키마가 있으면 예시 아이템 생성
            if (fieldSchema.items) {
                // 재귀적으로 아이템 예시 값 생성
                const itemExample = generateExampleValue('item', fieldSchema.items.type, fieldSchema.items);
                return [itemExample];
            }
            // 아이템 스키마가 없으면 빈 배열 반환
            return [];
        }
    }

    // 필드명 패턴이 매칭되지 않으면 타입 기반 기본값 생성
    switch (fieldType) {
        case 'string':
            // 문자열 타입: 필드명을 기반으로 더 의미있는 값 생성
            if (lowerName.includes('action')) {
                // action 필드는 노드 타입 예시 반환
                return 'node-type';
            } else if (lowerName.includes('status')) {
                // status 필드는 완료 상태 예시 반환
                return 'completed';
            } else {
                // 그 외의 경우 필드명을 포함한 예시 문자열 반환
                return `예시_${fieldName}`;
            }
        case 'number':
            // 숫자 타입: 기본값 0 반환
            return 0;
        case 'boolean':
            // 불린 타입: 기본값 false 반환
            return false;
        case 'array':
            // 배열 타입: 아이템 스키마가 있으면 예시 아이템 생성
            if (fieldSchema.items) {
                // 재귀적으로 아이템 예시 값 생성
                const itemExample = generateExampleValue('item', fieldSchema.items.type, fieldSchema.items);
                return [itemExample];
            }
            // 아이템 스키마가 없으면 빈 배열 반환
            return [];
        case 'object':
            // 객체 타입: properties가 있으면 재귀적으로 예시 데이터 생성
            if (fieldSchema.properties) {
                return generatePreviewFromSchema(fieldSchema.properties, {});
            }
            // properties가 없으면 빈 객체 반환
            return {};
        case 'any':
            // any 타입: null 반환 (타입이 불명확하므로)
            return null;
        default:
            // 알 수 없는 타입: null 반환
            return null;
    }
}

/**
 * 노드의 입력 미리보기 생성
 * 이전 노드의 출력을 우선 사용하고, 없으면 스키마 기반 예시 데이터를 생성합니다.
 * @param {string} nodeType - 노드 타입 (현재는 사용되지 않지만 향후 확장 가능)
 * @param {Object} nodeConfig - 노드 설정 (input_schema 포함)
 * @param {Object} previousNodeOutput - 이전 노드의 출력 (있는 경우, 우선 사용)
 * @returns {string} JSON 형식의 미리보기 문자열 (들여쓰기 2칸)
 */
export function generateInputPreview(nodeType, nodeConfig, previousNodeOutput = null) {
    // 노드 설정에서 입력 스키마 추출 (없으면 빈 객체)
    const inputSchema = nodeConfig?.input_schema || {};

    // 이전 노드 출력이 있으면 그것을 우선 사용 (실제 데이터가 더 정확함)
    if (previousNodeOutput !== null && previousNodeOutput !== undefined) {
        try {
            // 이전 노드 출력을 JSON 문자열로 직렬화 (들여쓰기 2칸)
            return JSON.stringify(previousNodeOutput, null, 2);
        } catch (e) {
            // 직렬화 실패 시 경고 로그 출력하고 스키마 기반 생성으로 진행
            console.warn('[generateInputPreview] 이전 노드 출력 직렬화 실패:', e);
        }
    }

    // 스키마가 없거나 빈 객체인 경우 빈 객체 JSON 반환
    if (!inputSchema || Object.keys(inputSchema).length === 0) {
        return JSON.stringify({}, null, 2);
    }

    // 스키마 기반 예시 데이터 생성
    // 이전 노드 출력이 있으면 그것을 nodeData로 전달 (실제 값 우선 사용)
    const previewData = generatePreviewFromSchema(inputSchema, previousNodeOutput || {});
    // 생성된 데이터를 JSON 문자열로 직렬화 (들여쓰기 2칸)
    return JSON.stringify(previewData, null, 2);
}

/**
 * 노드의 출력 미리보기 생성
 * output_schema를 기반으로 표준 형식 {action, status, output}의 미리보기를 생성합니다.
 * @param {string} nodeType - 노드 타입 (action 필드에 사용)
 * @param {Object} nodeConfig - 노드 설정 (output_schema 포함)
 * @param {Object} nodeData - 노드 데이터 (파라미터 값 포함, 실제 값 우선 사용)
 * @returns {string} JSON 형식의 미리보기 문자열 (들여쓰기 2칸)
 */
export function generateOutputPreview(nodeType, nodeConfig, nodeData = {}) {
    // 노드 설정에서 출력 스키마 추출 (없으면 빈 객체)
    const outputSchema = nodeConfig?.output_schema || {};

    // 스키마가 없거나 빈 객체인 경우 기본 형식 반환
    if (!outputSchema || Object.keys(outputSchema).length === 0) {
        return JSON.stringify(
            {
                action: nodeType, // 노드 타입
                status: 'completed', // 실행 상태
                output: '정상 실행 시 출력 예시' // 기본 출력 메시지
            },
            null,
            2 // 들여쓰기 2칸
        );
    }

    // 표준 출력 형식의 기본 구조 생성
    const previewData = {
        action: nodeType, // 노드 타입
        status: 'completed' // 실행 상태 (성공 가정)
    };

    // output 필드 처리 (output_schema.output이 있는 경우)
    if (outputSchema.output) {
        // output이 객체 타입이고 properties가 있는 경우
        if (outputSchema.output.type === 'object' && outputSchema.output.properties) {
            // properties를 기반으로 예시 데이터 생성 (nodeData의 실제 값 우선 사용)
            previewData.output = generatePreviewFromSchema(outputSchema.output.properties, nodeData);
        }
        // output이 배열 타입이고 items가 있는 경우
        else if (outputSchema.output.type === 'array' && outputSchema.output.items) {
            // 배열 아이템 스키마 추출
            const itemSchema = outputSchema.output.items;
            // 아이템이 객체 타입이고 properties가 있는 경우
            if (itemSchema.type === 'object' && itemSchema.properties) {
                // properties를 기반으로 예시 아이템 생성하여 배열로 래핑
                previewData.output = [generatePreviewFromSchema(itemSchema.properties, nodeData)];
            } else {
                // 아이템이 단순 타입인 경우 임시 객체로 래핑하여 예시 생성
                previewData.output = [generatePreviewFromSchema({ item: itemSchema }, {})['item']];
            }
        }
        // output이 단순 타입인 경우 (string, number, boolean 등)
        else {
            // 단순 타입을 임시 객체로 래핑하여 예시 생성 후 output 필드 추출
            previewData.output = generatePreviewFromSchema({ output: outputSchema.output }, nodeData).output;
        }
    }
    // output_schema에 output 필드가 없는 경우 (직접 필드들을 정의한 경우)
    else {
        // output_schema 전체를 properties로 간주하여 예시 데이터 생성
        previewData.output = generatePreviewFromSchema(outputSchema, nodeData);
    }

    // 생성된 미리보기 데이터를 JSON 문자열로 직렬화 (들여쓰기 2칸)
    return JSON.stringify(previewData, null, 2);
}

/**
 * 이전 노드 체인에서 출력 스키마 수집
 * 이전 노드들의 출력 스키마를 수집하여 현재 노드의 입력 미리보기용 데이터를 생성합니다.
 * @param {Array} previousNodes - 이전 노드 목록 (워크플로우에서 현재 노드 앞에 있는 노드들)
 * @param {Function} getNodeConfig - 노드 설정 가져오기 함수 (비동기, 노드 타입을 받아 설정 반환)
 * @returns {Object|null} 최종 출력 데이터 (마지막 노드의 출력 스키마 기반) 또는 null
 */
export async function collectPreviousNodeOutput(previousNodes, getNodeConfig) {
    // 이전 노드가 없거나 빈 배열인 경우 null 반환
    if (!previousNodes || previousNodes.length === 0) {
        return null;
    }

    // 마지막 노드의 출력 스키마 사용 (체인의 마지막 노드가 최종 출력을 결정)
    const lastNode = previousNodes[previousNodes.length - 1];
    // 노드 타입 추출 (type 또는 nodeType 필드 사용, 하위 호환성 고려)
    const lastNodeType = lastNode.type || lastNode.nodeType;
    // 노드 설정 비동기 로드
    const lastNodeConfig = await getNodeConfig(lastNodeType);

    // 노드 설정을 찾을 수 없는 경우 null 반환
    if (!lastNodeConfig) {
        return null;
    }

    // 노드 설정에서 출력 스키마 추출 (없으면 빈 객체)
    const outputSchema = lastNodeConfig.output_schema || {};

    // output_schema는 표준 형식: {action, status, output: {type: "object", properties: {...}}}
    // output_schema.output.properties를 사용 (표준 형식)
    if (outputSchema.output && outputSchema.output.properties) {
        // 표준 형식: output.properties를 기반으로 예시 데이터 생성
        // lastNode.data의 실제 값 우선 사용
        return generatePreviewFromSchema(outputSchema.output.properties, lastNode.data || {});
    } else {
        // 하위 호환성: output_schema가 직접 properties를 정의한 경우
        // output_schema 전체를 properties로 간주하여 예시 데이터 생성
        return generatePreviewFromSchema(outputSchema, lastNode.data || {});
    }
}
