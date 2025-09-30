import pyautogui
import time
from typing import Tuple, Optional
from pynput import mouse, keyboard
from pynput.mouse import Button, Listener as MouseListener
from pynput.keyboard import Key, Listener as KeyboardListener

class InputHandler:
    """게임 입력 처리 클래스"""
    
    def __init__(self):
        # PyAutoGUI 설정
        pyautogui.FAILSAFE = True
        pyautogui.PAUSE = 0.1
        
        # 마우스/키보드 리스너
        self.mouse_listener = None
        self.keyboard_listener = None
        self.last_click_position = None
        self.last_key_press = None
    
    def click(self, x: int, y: int, button: str = 'left', clicks: int = 1, interval: float = 0.1) -> bool:
        """
        마우스 클릭을 수행합니다.
        
        Args:
            x, y: 클릭할 좌표
            button: 클릭할 버튼 ('left', 'right', 'middle')
            clicks: 클릭 횟수
            interval: 클릭 간격
        
        Returns:
            클릭 성공 여부
        """
        try:
            pyautogui.click(x, y, clicks=clicks, interval=interval, button=button)
            self.last_click_position = (x, y)
            return True
        except Exception as e:
            print(f"클릭 실패: {e}")
            return False
    
    def double_click(self, x: int, y: int) -> bool:
        """더블 클릭을 수행합니다."""
        return self.click(x, y, clicks=2)
    
    def right_click(self, x: int, y: int) -> bool:
        """우클릭을 수행합니다."""
        return self.click(x, y, button='right')
    
    def drag(self, start_x: int, start_y: int, end_x: int, end_y: int, duration: float = 1.0) -> bool:
        """
        드래그 액션을 수행합니다.
        
        Args:
            start_x, start_y: 시작 좌표
            end_x, end_y: 끝 좌표
            duration: 드래그 시간
        
        Returns:
            드래그 성공 여부
        """
        try:
            pyautogui.drag(end_x - start_x, end_y - start_y, duration=duration, button='left')
            return True
        except Exception as e:
            print(f"드래그 실패: {e}")
            return False
    
    def type_text(self, text: str, interval: float = 0.1) -> bool:
        """
        텍스트를 입력합니다.
        
        Args:
            text: 입력할 텍스트
            interval: 입력 간격
        
        Returns:
            입력 성공 여부
        """
        try:
            pyautogui.typewrite(text, interval=interval)
            return True
        except Exception as e:
            print(f"텍스트 입력 실패: {e}")
            return False
    
    def press_key(self, key: str, presses: int = 1, interval: float = 0.1) -> bool:
        """
        키를 누릅니다.
        
        Args:
            key: 누를 키
            presses: 누를 횟수
            interval: 누름 간격
        
        Returns:
            키 입력 성공 여부
        """
        try:
            pyautogui.press(key, presses=presses, interval=interval)
            self.last_key_press = key
            return True
        except Exception as e:
            print(f"키 입력 실패: {e}")
            return False
    
    def key_combination(self, *keys) -> bool:
        """
        키 조합을 입력합니다.
        
        Args:
            *keys: 조합할 키들
        
        Returns:
            키 조합 입력 성공 여부
        """
        try:
            pyautogui.hotkey(*keys)
            return True
        except Exception as e:
            print(f"키 조합 입력 실패: {e}")
            return False
    
    def scroll(self, x: int, y: int, clicks: int = 3, direction: str = 'up') -> bool:
        """
        스크롤을 수행합니다.
        
        Args:
            x, y: 스크롤할 위치
            clicks: 스크롤 클릭 수
            direction: 스크롤 방향 ('up', 'down')
        
        Returns:
            스크롤 성공 여부
        """
        try:
            scroll_direction = 1 if direction == 'up' else -1
            pyautogui.scroll(scroll_direction * clicks, x=x, y=y)
            return True
        except Exception as e:
            print(f"스크롤 실패: {e}")
            return False
    
    def move_mouse(self, x: int, y: int, duration: float = 0.5) -> bool:
        """
        마우스를 이동시킵니다.
        
        Args:
            x, y: 이동할 좌표
            duration: 이동 시간
        
        Returns:
            이동 성공 여부
        """
        try:
            pyautogui.moveTo(x, y, duration=duration)
            return True
        except Exception as e:
            print(f"마우스 이동 실패: {e}")
            return False
    
    def get_mouse_position(self) -> Tuple[int, int]:
        """현재 마우스 위치를 반환합니다."""
        return pyautogui.position()
    
    def start_input_monitoring(self):
        """입력 모니터링을 시작합니다."""
        def on_click(x, y, button, pressed):
            if pressed:
                print(f"마우스 클릭 감지: ({x}, {y}) - {button}")
        
        def on_press(key):
            try:
                print(f"키 입력 감지: {key.char}")
            except AttributeError:
                print(f"특수 키 입력 감지: {key}")
        
        self.mouse_listener = MouseListener(on_click=on_click)
        self.keyboard_listener = KeyboardListener(on_press=on_press)
        
        self.mouse_listener.start()
        self.keyboard_listener.start()
    
    def stop_input_monitoring(self):
        """입력 모니터링을 중지합니다."""
        if self.mouse_listener:
            self.mouse_listener.stop()
        if self.keyboard_listener:
            self.keyboard_listener.stop()
    
    def wait_for_click(self, timeout: float = 10.0) -> Optional[Tuple[int, int]]:
        """
        클릭을 기다립니다.
        
        Args:
            timeout: 대기 시간 (초)
        
        Returns:
            클릭된 좌표 또는 None
        """
        start_time = time.time()
        while time.time() - start_time < timeout:
            current_pos = self.get_mouse_position()
            # 여기에 클릭 감지 로직 구현
            time.sleep(0.1)
        return None
