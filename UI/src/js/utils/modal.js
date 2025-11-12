/**
 * 모달 유틸리티 클래스
 * ES6 모듈 방식으로 작성됨
 */

/**
 * ModalManager 클래스
 * 모달 창을 관리하는 유틸리티 클래스입니다.
 */
export class ModalManager {
    constructor() {
        this.modal = document.getElementById('modal');
        this.modalBody = document.getElementById('modal-body');
        this.closeBtn = document.querySelector('.close');
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // 모달 닫기 버튼
        this.closeBtn.addEventListener('click', () => {
            this.close();
        });
        
        // ESC 키로 모달 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) {
                this.close();
            }
        });
        
        // 모달 배경 클릭으로 닫기
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
    }
    
    show(content) {
        this.modalBody.innerHTML = content;
        this.modal.style.display = 'block';
        this.modal.classList.add('show');
        
        // 포커스 관리
        const firstInput = this.modalBody.querySelector('input, select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
    
    close() {
        this.modal.classList.remove('show');
        this.modal.classList.add('hide');
        
        setTimeout(() => {
            this.modal.style.display = 'none';
            this.modal.classList.remove('hide');
        }, 300);
    }
    
    isOpen() {
        return this.modal.style.display === 'block';
    }
    
    // 일반적인 모달 템플릿들
    showConfirm(title, message, onConfirm, onCancel = null) {
        const content = `
            <h3>${title}</h3>
            <p>${message}</p>
            <div class="form-actions">
                <button id="confirm-btn" class="btn btn-primary">확인</button>
                <button id="cancel-btn" class="btn btn-secondary">취소</button>
            </div>
        `;
        
        this.show(content);
        
        document.getElementById('confirm-btn').addEventListener('click', () => {
            onConfirm();
            this.close();
        });
        
        document.getElementById('cancel-btn').addEventListener('click', () => {
            if (onCancel) onCancel();
            this.close();
        });
    }
    
    showAlert(title, message, onOk = null) {
        const content = `
            <h3>${title}</h3>
            <p>${message}</p>
            <div class="form-actions">
                <button id="ok-btn" class="btn btn-primary">확인</button>
            </div>
        `;
        
        this.show(content);
        
        document.getElementById('ok-btn').addEventListener('click', () => {
            if (onOk) onOk();
            this.close();
        });
    }
    
    showInput(title, label, placeholder = '', defaultValue = '') {
        return new Promise((resolve, reject) => {
            const content = `
                <h3>${title}</h3>
                <div class="form-group">
                    <label for="input-field">${label}:</label>
                    <input type="text" id="input-field" placeholder="${placeholder}" value="${defaultValue}">
                </div>
                <div class="form-actions">
                    <button id="submit-btn" class="btn btn-primary">확인</button>
                    <button id="cancel-btn" class="btn btn-secondary">취소</button>
                </div>
            `;
            
            this.show(content);
            
            document.getElementById('submit-btn').addEventListener('click', () => {
                const value = document.getElementById('input-field').value;
                resolve(value);
                this.close();
            });
            
            document.getElementById('cancel-btn').addEventListener('click', () => {
                reject(new Error('사용자가 취소했습니다.'));
                this.close();
            });
        });
    }
}

/**
 * ModalManager 인스턴스 생성 및 export
 * 싱글톤 패턴으로 하나의 인스턴스만 사용
 */
let modalManagerInstance = null;

/**
 * ModalManager 인스턴스 가져오기
 * ES6 모듈에서 명시적으로 인스턴스를 가져올 수 있도록 제공
 * 
 * @returns {ModalManager} ModalManager 인스턴스
 */
export function getModalManagerInstance() {
    if (!modalManagerInstance) {
        modalManagerInstance = new ModalManager();
    }
    return modalManagerInstance;
}

// 전역 호환성을 위한 설정 (다른 파일과의 호환성 유지)
// TODO: 다른 파일들이 ES6 모듈로 전환되면 제거
if (typeof window !== 'undefined') {
    window.modalManager = getModalManagerInstance();
}
