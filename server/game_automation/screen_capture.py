import cv2
import numpy as np
import pyautogui
from typing import Tuple, Optional
import time
from log import log_manager

logger = log_manager.logger

class ScreenCapture:
    """게임 화면 캡처 및 이미지 처리 클래스"""
    
    def __init__(self):
        self.screen_width = pyautogui.size().width
        self.screen_height = pyautogui.size().height
    
    def capture_screen(self, region: Optional[Tuple[int, int, int, int]] = None) -> np.ndarray:
        """
        화면을 캡처합니다.
        
        Args:
            region: 캡처할 영역 (x, y, width, height)
        
        Returns:
            캡처된 이미지 (numpy array)
        """
        if region:
            screenshot = pyautogui.screenshot(region=region)
        else:
            screenshot = pyautogui.screenshot()
        
        # PIL Image를 OpenCV 형식으로 변환
        img = cv2.cvtColor(np.array(screenshot), cv2.COLOR_RGB2BGR)
        return img
    
    def find_template(self, template_path: str, threshold: float = 0.7, max_attempts: int = 5, delay: float = 0.5) -> Optional[Tuple[int, int, int, int]]:
        """
        템플릿 매칭을 통해 특정 이미지를 찾습니다.
        여러 번 시도하여 이미지를 찾습니다.
        
        Args:
            template_path: 템플릿 이미지 경로
            threshold: 매칭 임계값 (기본값 0.7, 0.8에서 낮춤)
            max_attempts: 최대 시도 횟수 (기본값 5)
            delay: 각 시도 간 딜레이 (초, 기본값 0.5)
        
        Returns:
            찾은 위치 (x, y, width, height) 또는 None
        """
        import os
        
        # 경로 정규화 (Windows 경로 문제 해결)
        template_path = os.path.normpath(template_path)
        
        # 템플릿 이미지 로드 (한글 경로 지원)
        if not os.path.exists(template_path):
            logger.error(f"이미지 파일을 찾을 수 없습니다: {template_path}")
            return None
        
        # OpenCV의 cv2.imread()는 한글 경로를 제대로 처리하지 못하므로
        # numpy와 cv2.imdecode()를 사용하여 한글 경로 지원
        try:
            # 바이너리 모드로 파일 읽기 (한글 경로 지원)
            with open(template_path, 'rb') as f:
                image_data = f.read()
            
            # numpy 배열로 변환
            image_array = np.frombuffer(image_data, np.uint8)
            
            # OpenCV로 디코딩
            template = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
            
            if template is None:
                logger.error(f"이미지를 디코딩할 수 없습니다: {template_path}")
                return None
        except Exception as e:
            logger.error(f"이미지 로드 중 오류 발생: {template_path}, 에러: {e}")
            return None
        
        logger.debug(f"이미지 로드 성공: {template_path}, 크기: {template.shape}")
        
        # 여러 번 시도하여 이미지 찾기
        for attempt in range(1, max_attempts + 1):
            logger.debug(f"이미지 찾기 시도 {attempt}/{max_attempts}")
            
            # 화면 캡처
            screen = self.capture_screen()
            logger.debug(f"화면 캡처 완료, 크기: {screen.shape}")
            
            # 템플릿이 화면보다 큰 경우 처리
            if template.shape[0] > screen.shape[0] or template.shape[1] > screen.shape[1]:
                logger.warning(f"템플릿 이미지가 화면보다 큽니다. 템플릿: {template.shape}, 화면: {screen.shape}")
                return None
            
            # 템플릿 매칭
            result = cv2.matchTemplate(screen, template, cv2.TM_CCOEFF_NORMED)
            min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)
            
            logger.debug(f"이미지 매칭 점수: {max_val:.4f} (임계값: {threshold})")
            
            if max_val >= threshold:
                h, w = template.shape[:2]
                logger.debug(f"이미지 찾기 성공! 위치: ({max_loc[0]}, {max_loc[1]}), 크기: {w}x{h}, 시도 횟수: {attempt}")
                return (max_loc[0], max_loc[1], w, h)
            else:
                logger.debug(f"이미지 찾기 실패 (시도 {attempt}/{max_attempts}): 매칭 점수 {max_val:.4f}가 임계값 {threshold}보다 낮습니다.")
            
            # 마지막 시도가 아니면 딜레이
            if attempt < max_attempts:
                logger.debug(f"{delay}초 대기 후 재시도...")
                time.sleep(delay)
        
        logger.debug(f"모든 시도 실패: {max_attempts}번 시도했지만 이미지를 찾을 수 없습니다.")
        return None
    
    def find_color_region(self, color: Tuple[int, int, int], tolerance: int = 10) -> list:
        """
        특정 색상 영역을 찾습니다.
        
        Args:
            color: 찾을 색상 (B, G, R)
            tolerance: 색상 허용 오차
        
        Returns:
            찾은 영역들의 리스트
        """
        screen = self.capture_screen()
        
        # 색상 범위 설정
        lower = np.array([max(0, c - tolerance) for c in color])
        upper = np.array([min(255, c + tolerance) for c in color])
        
        # 마스크 생성
        mask = cv2.inRange(screen, lower, upper)
        
        # 컨투어 찾기
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        regions = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            if w > 10 and h > 10:  # 최소 크기 필터링
                regions.append((x, y, w, h))
        
        return regions
    
    def save_screenshot(self, filename: str, region: Optional[Tuple[int, int, int, int]] = None) -> bool:
        """
        스크린샷을 파일로 저장합니다.
        
        Args:
            filename: 저장할 파일명
            region: 캡처할 영역
        
        Returns:
            저장 성공 여부
        """
        try:
            screenshot = self.capture_screen(region)
            cv2.imwrite(filename, screenshot)
            return True
        except Exception as e:
            logger.error(f"스크린샷 저장 실패: {e}")
            return False
