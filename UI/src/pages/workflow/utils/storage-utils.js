/**
 * 로컬 스토리지 관련 유틸리티
 * 워크플로우 데이터의 로컬 저장 및 복원
 */

import { ViewportUtils } from './viewport-utils.js';

export class StorageUtils {
    /**
     * 워크플로우를 로컬 스토리지에 저장
     */
    static saveToLocalStorage(workflowPage, script) {
        if (!script) {
            return;
        }
        
        const nodeManager = workflowPage.getNodeManager();
        const currentNodes = nodeManager ? nodeManager.getAllNodes() : [];
        const currentConnections = nodeManager ? nodeManager.getAllConnections() : [];
        
        const viewportPosition = ViewportUtils.getCurrentViewportPosition();
        
        const workflowData = {
            script: script,
            nodes: currentNodes,
            connections: currentConnections,
            viewport: viewportPosition,
            timestamp: new Date().toISOString()
        };
        
        const savedWorkflows = JSON.parse(localStorage.getItem('workflows') || '[]');
        const scriptId = script.id;
        
        const existingIndex = savedWorkflows.findIndex(w => w.script && w.script.id === scriptId);
        if (existingIndex >= 0) {
            savedWorkflows[existingIndex] = workflowData;
        } else {
            savedWorkflows.push(workflowData);
        }
        
        localStorage.setItem('workflows', JSON.stringify(savedWorkflows));
    }

    /**
     * 현재 워크플로우 자동 저장
     */
    static autoSave(workflowPage) {
        const sidebarManager = workflowPage.getSidebarManager();
        const currentScript = sidebarManager ? sidebarManager.getCurrentScript() : null;
        
        if (!currentScript) {
            return;
        }
        
        const nodeManager = workflowPage.getNodeManager();
        const currentNodes = nodeManager ? nodeManager.getAllNodes() : [];
        
        // 노드가 없으면 저장하지 않음
        if (currentNodes.length === 0) {
            return;
        }
        
        StorageUtils.saveToLocalStorage(workflowPage, currentScript);
    }

    /**
     * 로컬 스토리지 상태 디버깅
     */
    static debugStorageState() {
        const savedWorkflows = JSON.parse(localStorage.getItem('workflows') || '[]');
        
        savedWorkflows.forEach((workflow, index) => {
            console.log(`워크플로우 ${index + 1}:`, {
                scriptName: workflow.script ? workflow.script.name : 'Unknown',
                scriptId: workflow.script ? workflow.script.id : 'Unknown',
                nodeCount: workflow.nodes ? workflow.nodes.length : 0,
                connectionCount: workflow.connections ? workflow.connections.length : 0,
                hasViewport: !!workflow.viewport
            });
        });
    }
}

