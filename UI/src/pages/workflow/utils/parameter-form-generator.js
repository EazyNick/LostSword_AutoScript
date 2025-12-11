/**
 * 파라미터 기반 폼 생성 유틸리티
 *
 * nodes_config.py에서 정의한 파라미터 구조를 기반으로
 * 동적으로 HTML 폼을 생성합니다.
 */

import { escapeHtml } from './node-utils.js';

/**
 * 파라미터 정의를 기반으로 HTML 입력 필드 생성
 *
 * @param {string} paramKey - 파라미터 키 (예: "file_path")
 * @param {Object} paramConfig - 파라미터 설정 객체
 * @param {string} prefix - 입력 필드 ID 접두사 (예: "node-", "edit-node-")
 * @param {any} currentValue - 현재 값 (기존 노드 수정 시 사용)
 * @returns {Object} {html: string, buttonId: string|null, paramKey: string} 생성된 HTML과 버튼 정보
 */
export function generateParameterInput(paramKey, paramConfig, prefix = 'node-', currentValue = undefined) {
    const {
        type,
        label,
        description,
        default: defaultValue,
        required = false,
        placeholder = '',
        min,
        max,
        options
    } = paramConfig;

    // 현재 값이 없으면 기본값 사용
    const value = currentValue !== undefined ? currentValue : defaultValue !== undefined ? defaultValue : '';

    // 필드 ID 생성
    const fieldId = `${prefix}${paramKey}`;

    // 필수 표시
    const requiredMark = required ? ' <span style="color: red;">*</span>' : '';
    const requiredAttr = required ? 'required' : '';

    let inputHtml = '';

    switch (type) {
        case 'number':
            inputHtml = `
                <input 
                    type="number" 
                    id="${fieldId}" 
                    value="${escapeHtml(value)}" 
                    ${min !== undefined ? `min="${min}"` : ''} 
                    ${max !== undefined ? `max="${max}"` : ''} 
                    step="${type === 'number' && (min !== undefined || max !== undefined) ? 'any' : '1'}"
                    ${requiredAttr}
                    placeholder="${escapeHtml(placeholder)}"
                    class="node-settings-input"
                    style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            `;
            break;

        case 'string':
        case 'options':
            // options가 있으면 select, 없으면 text input
            if (options && Array.isArray(options)) {
                const optionsHtml = options
                    .map((opt) => {
                        // 옵션이 객체 형태인지 문자열인지 확인
                        const optValue = typeof opt === 'object' && opt !== null ? opt.value : opt;
                        const optLabel = typeof opt === 'object' && opt !== null ? opt.label : opt;
                        const selected = value === optValue ? 'selected' : '';
                        return `<option value="${escapeHtml(optValue)}" ${selected}>${escapeHtml(optLabel)}</option>`;
                    })
                    .join('');
                inputHtml = `
                    <select 
                        id="${fieldId}" 
                        ${requiredAttr}
                        class="node-settings-select"
                        style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        ${optionsHtml}
                    </select>
                `;
            } else {
                // textarea가 필요한 경우 (긴 텍스트)
                const isLongText =
                    paramKey.toLowerCase().includes('body') ||
                    paramKey.toLowerCase().includes('content') ||
                    paramKey.toLowerCase().includes('headers');
                if (isLongText) {
                    inputHtml = `
                            <textarea 
                                id="${fieldId}" 
                                rows="${paramKey.toLowerCase().includes('body') ? '4' : '3'}"
                                ${requiredAttr}
                                placeholder="${escapeHtml(placeholder)}"
                                class="node-settings-textarea"
                                style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; resize: vertical;">${escapeHtml(value)}</textarea>
                        `;
                } else {
                    // folder_path 또는 file_path 파라미터인 경우 파일/폴더 선택 버튼 추가
                    const isPathParameter =
                        paramKey.toLowerCase() === 'folder_path' || paramKey.toLowerCase() === 'file_path';

                    if (isPathParameter) {
                        const buttonText = paramKey.toLowerCase() === 'folder_path' ? '폴더 선택' : '파일 선택';
                        const buttonId = `${fieldId}-browse-btn`;
                        inputHtml = `
                                <div style="display: flex; gap: 8px;">
                                    <input 
                                        type="text" 
                                        id="${fieldId}" 
                                        value="${escapeHtml(value)}" 
                                        ${requiredAttr}
                                        placeholder="${escapeHtml(placeholder)}"
                                        class="node-settings-input"
                                        style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                    <button 
                                        type="button" 
                                        id="${buttonId}" 
                                        class="btn btn-secondary"
                                        style="white-space: nowrap;">
                                        ${buttonText}
                                    </button>
                                </div>
                            `;
                    } else {
                        inputHtml = `
                                <input 
                                    type="text" 
                                    id="${fieldId}" 
                                    value="${escapeHtml(value)}" 
                                    ${requiredAttr}
                                    placeholder="${escapeHtml(placeholder)}"
                                    class="node-settings-input"
                                    style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            `;
                    }
                }
            }
            break;

        case 'boolean':
            // boolean 타입은 label이 input을 감싸므로 외부 label이 필요 없음
            inputHtml = `
                <label style="display: flex; align-items: center; gap: 8px;">
                    <input 
                        type="checkbox" 
                        id="${fieldId}" 
                        ${value ? 'checked' : ''}
                        class="node-settings-checkbox">
                    <span>${escapeHtml(label)}${requiredMark}</span>
                </label>
            `;
            break;

        default:
            // 기본적으로 text input으로 처리
            inputHtml = `
                <input 
                    type="text" 
                    id="${fieldId}" 
                    value="${escapeHtml(value)}" 
                    ${requiredAttr}
                    placeholder="${escapeHtml(placeholder)}"
                    class="node-settings-input"
                    style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            `;
    }

    // folder_path 또는 file_path 파라미터인 경우 버튼 ID 저장 (이벤트 리스너 설정용)
    const buttonId =
        paramKey.toLowerCase() === 'folder_path' || paramKey.toLowerCase() === 'file_path'
            ? `${fieldId}-browse-btn`
            : null;

    // boolean 타입은 label이 input을 감싸므로 외부 label이 필요 없음
    const labelHtml =
        type === 'boolean'
            ? ''
            : `<label for="${fieldId}" class="node-settings-label">${escapeHtml(label)}${requiredMark}:</label>`;

    const html = `
        <div class="form-group node-settings-form-group">
            ${labelHtml}
            ${inputHtml}
            ${description ? `<small class="node-settings-help-text">${escapeHtml(description)}</small>` : ''}
        </div>
    `;

    return {
        html: html,
        buttonId: buttonId,
        paramKey: paramKey
    };
}

/**
 * 파라미터 객체를 기반으로 전체 폼 HTML 생성
 *
 * @param {Object} parameters - 파라미터 정의 객체 (key: paramKey, value: paramConfig)
 * @param {string} prefix - 입력 필드 ID 접두사
 * @param {Object} currentValues - 현재 값 객체 (기존 노드 수정 시 사용)
 * @returns {Object} {html: string, buttons: Array<{buttonId: string, paramKey: string, type: 'folder'|'file'}>} 생성된 HTML과 버튼 정보
 */
export function generateParameterForm(parameters, prefix = 'node-', currentValues = {}) {
    if (!parameters || Object.keys(parameters).length === 0) {
        return { html: '', buttons: [] };
    }

    const buttons = [];
    const formGroups = Object.entries(parameters).map(([paramKey, paramConfig]) => {
        const currentValue = currentValues[paramKey];
        const result = generateParameterInput(paramKey, paramConfig, prefix, currentValue);

        // 버튼이 있는 경우 정보 저장
        if (result.buttonId) {
            const isFolder = paramKey.toLowerCase() === 'folder_path';
            buttons.push({
                buttonId: result.buttonId,
                fieldId: `${prefix}${paramKey}`,
                paramKey: paramKey,
                type: isFolder ? 'folder' : 'file'
            });
        }

        return result.html;
    });

    return {
        html: formGroups.join(''),
        buttons: buttons
    };
}

/**
 * 폼에서 파라미터 값 추출
 *
 * @param {Object} parameters - 파라미터 정의 객체
 * @param {string} prefix - 입력 필드 ID 접두사
 * @returns {Object} 추출된 파라미터 값 객체
 */
export function extractParameterValues(parameters, prefix = 'node-') {
    if (!parameters || Object.keys(parameters).length === 0) {
        console.log('[extractParameterValues] 파라미터 없음');
        return {};
    }

    console.log('[extractParameterValues] 파라미터 추출 시작:', {
        parameters: Object.keys(parameters),
        prefix
    });

    const values = {};
    for (const [paramKey, paramConfig] of Object.entries(parameters)) {
        const fieldId = `${prefix}${paramKey}`;
        const fieldElement = document.getElementById(fieldId);

        if (!fieldElement) {
            console.warn(`[extractParameterValues] 필드 요소를 찾을 수 없음: ${fieldId}`);
            continue;
        }

        const { type } = paramConfig;
        let value;

        switch (type) {
            case 'number':
                value = fieldElement.value ? parseFloat(fieldElement.value) : paramConfig.default || 0;
                break;
            case 'boolean':
                value = fieldElement.checked;
                break;
            case 'string':
                if (fieldElement.tagName === 'SELECT') {
                    value = fieldElement.value;
                } else if (fieldElement.tagName === 'TEXTAREA') {
                    value = fieldElement.value;
                } else {
                    value = fieldElement.value;
                }
                break;
            default:
                value = fieldElement.value;
        }

        // 기본값이 있고 값이 비어있으면 기본값 사용
        if ((value === '' || value === null || value === undefined) && paramConfig.default !== undefined) {
            value = paramConfig.default;
        }

        console.log(`[extractParameterValues] ${paramKey}:`, {
            fieldId,
            value,
            elementType: fieldElement.tagName,
            elementValue: fieldElement.value
        });

        values[paramKey] = value;
    }

    console.log('[extractParameterValues] 추출된 값:', values);
    return values;
}
