import cv2
import numpy as np
import pyautogui
from typing import Tuple, Optional
import time

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
    
    def find_template(self, template_path: str, threshold: float = 0.8) -> Optional[Tuple[int, int, int, int]]:
        """
        템플릿 매칭을 통해 특정 이미지를 찾습니다.
        
        Args:
            template_path: 템플릿 이미지 경로
            threshold: 매칭 임계값
        
        Returns:
            찾은 위치 (x, y, width, height) 또는 None
        """
        # 화면 캡처
        screen = self.capture_screen()
        
        # 템플릿 이미지 로드
        template = cv2.imread(template_path)
        if template is None:
            return None
        
        # 템플릿 매칭
        result = cv2.matchTemplate(screen, template, cv2.TM_CCOEFF_NORMED)
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)
        
        if max_val >= threshold:
            h, w = template.shape[:2]
            return (max_loc[0], max_loc[1], w, h)
        
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
            print(f"스크린샷 저장 실패: {e}")
            return False
