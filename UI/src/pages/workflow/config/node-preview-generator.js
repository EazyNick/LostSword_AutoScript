/**
 * 노드 스키마 기반 미리보기 생성
 * n8n 스타일로 노드의 입력/출력 스키마를 기반으로 즉시 미리보기를 생성합니다.
 */

/**
 * 스키마를 기반으로 예시 데이터 생성
 * @param {Object} schema - 스키마 정의
 * @param {Object} nodeData - 노드 데이터 (파라미터 값 포함)
 * @returns {any} 예시 데이터
 */
export function generatePreviewFromSchema(schema, nodeData = {}) {
    if (!schema || typeof schema !== 'object') {
        return null;
    }

    // 스키마가 빈 객체인 경우
    if (Object.keys(schema).length === 0) {
        return {};
    }

    const result = {};

    for (const [key, fieldSchema] of Object.entries(schema)) {
        if (!fieldSchema || typeof fieldSchema !== 'object') {
            continue;
        }

        const fieldType = fieldSchema.type;
        const description = fieldSchema.description || '';

        // nodeData에서 실제 값을 가져오거나 스키마 기반 예시 값 생성
        let value = nodeData[key];

        if (value === undefined || value === null) {
            // 스키마 타입에 따라 기본값 생성
            switch (fieldType) {
                case 'string':
                    value = description || '예시 문자열';
                    break;
                case 'number':
                    value = 0;
                    break;
                case 'boolean':
                    value = true;
                    break;
                case 'array':
                    if (fieldSchema.items) {
                        // 배열 아이템 스키마가 있으면 예시 아이템 생성
                        value = [generatePreviewFromSchema({ item: fieldSchema.items }, {})['item']];
                    } else {
                        value = [];
                    }
                    break;
                case 'object':
                    if (fieldSchema.properties) {
                        value = generatePreviewFromSchema(fieldSchema.properties, nodeData);
                    } else {
                        value = {};
                    }
                    break;
                case 'any':
                    value = '예시 값';
                    break;
                default:
                    value = null;
            }
        }

        result[key] = value;
    }

    return result;
}

/**
 * 노드의 입력 미리보기 생성
 * @param {string} nodeType - 노드 타입
 * @param {Object} nodeConfig - 노드 설정 (스키마 포함)
 * @param {Object} previousNodeOutput - 이전 노드의 출력 (있는 경우)
 * @returns {string} JSON 형식의 미리보기 문자열
 */
export function generateInputPreview(nodeType, nodeConfig, previousNodeOutput = null) {
    const inputSchema = nodeConfig?.input_schema || {};

    // 이전 노드 출력이 있으면 그것을 사용
    if (previousNodeOutput !== null && previousNodeOutput !== undefined) {
        try {
            return JSON.stringify(previousNodeOutput, null, 2);
        } catch (e) {
            console.warn('[generateInputPreview] 이전 노드 출력 직렬화 실패:', e);
        }
    }

    // 스키마가 없으면 빈 객체
    if (!inputSchema || Object.keys(inputSchema).length === 0) {
        return JSON.stringify({}, null, 2);
    }

    // 스키마 기반 예시 데이터 생성
    const previewData = generatePreviewFromSchema(inputSchema, previousNodeOutput || {});
    return JSON.stringify(previewData, null, 2);
}

/**
 * 노드의 출력 미리보기 생성
 * @param {string} nodeType - 노드 타입
 * @param {Object} nodeConfig - 노드 설정 (스키마 포함)
 * @param {Object} nodeData - 노드 데이터 (파라미터 값 포함)
 * @returns {string} JSON 형식의 미리보기 문자열
 */
export function generateOutputPreview(nodeType, nodeConfig, nodeData = {}) {
    const outputSchema = nodeConfig?.output_schema || {};

    // 스키마가 없으면 기본 형식
    if (!outputSchema || Object.keys(outputSchema).length === 0) {
        return JSON.stringify(
            {
                action: nodeType,
                status: 'completed',
                output: '정상 실행 시 출력 예시'
            },
            null,
            2
        );
    }

    // 기본 구조 생성
    const previewData = {
        action: nodeType,
        status: 'completed'
    };

    // output 필드 처리
    if (outputSchema.output) {
        if (outputSchema.output.type === 'object' && outputSchema.output.properties) {
            // output이 객체인 경우
            previewData.output = generatePreviewFromSchema(outputSchema.output.properties, nodeData);
        } else if (outputSchema.output.type === 'array' && outputSchema.output.items) {
            // output이 배열인 경우
            const itemSchema = outputSchema.output.items;
            if (itemSchema.type === 'object' && itemSchema.properties) {
                previewData.output = [generatePreviewFromSchema(itemSchema.properties, nodeData)];
            } else {
                previewData.output = [generatePreviewFromSchema({ item: itemSchema }, {})['item']];
            }
        } else {
            // output이 단순 타입인 경우
            previewData.output = generatePreviewFromSchema({ output: outputSchema.output }, nodeData).output;
        }
    } else {
        // output_schema가 직접 필드들을 정의한 경우
        previewData.output = generatePreviewFromSchema(outputSchema, nodeData);
    }

    return JSON.stringify(previewData, null, 2);
}

/**
 * 이전 노드 체인에서 출력 스키마 수집
 * @param {Array} previousNodes - 이전 노드 목록
 * @param {Function} getNodeConfig - 노드 설정 가져오기 함수
 * @returns {Object} 최종 출력 데이터
 */
export async function collectPreviousNodeOutput(previousNodes, getNodeConfig) {
    if (!previousNodes || previousNodes.length === 0) {
        return null;
    }

    // 마지막 노드의 출력 스키마 사용
    const lastNode = previousNodes[previousNodes.length - 1];
    const lastNodeType = lastNode.type || lastNode.nodeType;
    const lastNodeConfig = await getNodeConfig(lastNodeType);

    if (!lastNodeConfig) {
        return null;
    }

    const outputSchema = lastNodeConfig.output_schema || {};

    // output_schema는 표준 형식: {action, status, output: {type: "object", properties: {...}}}
    // output_schema.output.properties를 사용 (표준 형식)
    if (outputSchema.output && outputSchema.output.properties) {
        return generatePreviewFromSchema(outputSchema.output.properties, lastNode.data || {});
    } else {
        // 하위 호환성: output_schema가 직접 properties를 정의한 경우
        return generatePreviewFromSchema(outputSchema, lastNode.data || {});
    }
}
