"""
게임 액션 처리 서비스
"""

from log import log_manager

logger = log_manager.logger


class ActionService:
    """게임 액션을 처리하는 서비스 클래스"""
    
    def __init__(self):
        self.action_handlers = {
            "click": self.handle_click_action,
            "move": self.handle_move_action,
            "collect": self.handle_collect_action,
            "battle": self.handle_battle_action,
            "navigate": self.handle_navigate_action,
            "condition": self.handle_condition_action,
            "action": self.handle_action_action,
            "image-touch": self.handle_image_touch_action,
            "process-focus": self.handle_process_focus_action,
            "wait": self.handle_wait_action
        }
    
    async def process_game_action(self, action_type: str, parameters: dict):
        """
        게임 액션을 처리하는 함수
        """
        logger.debug(f"process_game_action 호출됨 - 액션 타입: {action_type}, 파라미터: {parameters}")
        
        try:
            logger.debug(f"사용 가능한 핸들러: {list(self.action_handlers.keys())}")
            
            handler = self.action_handlers.get(action_type)
            if not handler:
                logger.error(f"지원하지 않는 액션 타입: {action_type}")
                raise ValueError(f"지원하지 않는 액션 타입: {action_type}")
            
            logger.debug(f"핸들러 실행 중: {handler.__name__}")
            result = await handler(parameters)
            logger.debug(f"핸들러 실행 완료: {result}")
            
            return result
        except Exception as e:
            logger.error(f"process_game_action 에러: {e}")
            import traceback
            logger.error(f"process_game_action 스택 트레이스: {traceback.format_exc()}")
            raise e
    
    async def process_node(self, node: dict):
        """
        개별 노드를 처리하는 함수
        """
        logger.debug(f"process_node 호출됨 - 노드: {node}")
        
        try:
            node_type = node.get("type")
            node_data = node.get("data", {})
            
            logger.debug(f"노드 타입: {node_type}")
            logger.debug(f"노드 데이터: {node_data}")
            
            result = await self.process_game_action(node_type, node_data)
            logger.debug(f"process_game_action 결과: {result}")
            
            return result
        except Exception as e:
            logger.error(f"process_node 에러: {e}")
            import traceback
            logger.error(f"process_node 스택 트레이스: {traceback.format_exc()}")
            raise e
    
    # 액션 핸들러들
    async def handle_click_action(self, parameters: dict):
        """클릭 액션 처리"""
        x = parameters.get("x", 0)
        y = parameters.get("y", 0)
        return {"action": "click", "coordinates": (x, y), "timestamp": "2024-01-01T00:00:00"}
    
    async def handle_move_action(self, parameters: dict):
        """이동 액션 처리"""
        direction = parameters.get("direction", "forward")
        distance = parameters.get("distance", 1)
        return {"action": "move", "direction": direction, "distance": distance}
    
    async def handle_collect_action(self, parameters: dict):
        """수집 액션 처리"""
        item_type = parameters.get("item_type", "unknown")
        return {"action": "collect", "item_type": item_type}
    
    async def handle_battle_action(self, parameters: dict):
        """전투 액션 처리"""
        enemy_type = parameters.get("enemy_type", "unknown")
        strategy = parameters.get("strategy", "auto")
        return {"action": "battle", "enemy_type": enemy_type, "strategy": strategy}
    
    async def handle_navigate_action(self, parameters: dict):
        """네비게이션 액션 처리"""
        destination = parameters.get("destination", "unknown")
        return {"action": "navigate", "destination": destination}
    
    async def handle_condition_action(self, parameters: dict):
        """조건 액션 처리"""
        condition = parameters.get("condition", "unknown")
        return {"action": "condition", "condition": condition, "result": True}
    
    async def handle_action_action(self, parameters: dict):
        """기본 액션 처리"""
        action_name = parameters.get("action", "unknown")
        return {"action": "action", "name": action_name, "status": "completed"}
    
    async def handle_image_touch_action(self, parameters: dict):
        """이미지 터치 액션 처리"""
        import os
        from automation.screen_capture import ScreenCapture
        from automation.input_handler import InputHandler
        
        folder_path = parameters.get("folder_path", "")
        if not folder_path:
            raise ValueError("폴더 경로가 필요합니다.")
        
        if not os.path.exists(folder_path):
            raise ValueError(f"폴더를 찾을 수 없습니다: {folder_path}")
        
        # 지원하는 이미지 확장자
        image_extensions = {'.png', '.jpg', '.jpeg', '.bmp', '.gif', '.tiff', '.webp'}
        
        # 이미지 파일 목록 가져오기 (이름 순서대로)
        image_files = []
        for filename in os.listdir(folder_path):
            file_path = os.path.join(folder_path, filename)
            if os.path.isfile(file_path):
                _, ext = os.path.splitext(filename.lower())
                if ext in image_extensions:
                    image_files.append(file_path)
        
        # 파일 이름 순서대로 정렬
        image_files.sort()
        
        if not image_files:
            return {
                "action": "image-touch",
                "status": "no_images",
                "message": "이미지 파일이 없습니다."
            }
        
        # 화면 캡처 및 입력 핸들러 초기화
        screen_capture = ScreenCapture()
        input_handler = InputHandler()
        
        results = []
        for i, image_path in enumerate(image_files):
            try:
                logger.debug(f"이미지 찾기 시도 {i+1}/{len(image_files)}: {os.path.basename(image_path)}")
                
                # 이미지 찾기 (threshold를 0.7로 낮춤, 필요시 더 낮출 수 있음)
                location = screen_capture.find_template(image_path, threshold=0.7)
                
                if location:
                    x, y, w, h = location
                    # 이미지 중심점 클릭
                    center_x = x + w // 2
                    center_y = y + h // 2
                    
                    logger.debug(f"이미지 찾기 성공! 클릭 위치: ({center_x}, {center_y})")
                    
                    # 터치 (클릭)
                    success = input_handler.click(center_x, center_y)
                    
                    results.append({
                        "image": os.path.basename(image_path),
                        "found": True,
                        "position": (center_x, center_y),
                        "touched": success
                    })
                else:
                    logger.debug(f"이미지 찾기 실패: {os.path.basename(image_path)}")
                    results.append({
                        "image": os.path.basename(image_path),
                        "found": False,
                        "message": "화면에서 이미지를 찾을 수 없습니다."
                    })
                    
            except Exception as e:
                logger.error(f"이미지 처리 중 오류 발생 ({os.path.basename(image_path)}): {e}")
                import traceback
                logger.error(f"스택 트레이스: {traceback.format_exc()}")
                results.append({
                    "image": os.path.basename(image_path),
                    "error": str(e)
                })
        
        return {
            "action": "image-touch",
            "folder_path": folder_path,
            "total_images": len(image_files),
            "results": results,
            "status": "completed"
        }
    
    def _force_foreground_window(self, hwnd):
        """
        강제로 창을 포그라운드로 가져오는 헬퍼 함수
        AttachThreadInput을 사용하여 Windows 보안 제한을 우회합니다.
        """
        import win32gui
        import win32con
        import win32process
        import ctypes
        import time
        
        try:
            # 현재 포그라운드 창의 스레드 ID 가져오기
            foreground_hwnd = win32gui.GetForegroundWindow()
            if foreground_hwnd:
                foreground_thread_id = win32process.GetWindowThreadProcessId(foreground_hwnd)[0]
            else:
                foreground_thread_id = None
            
            # 대상 창의 스레드 ID 가져오기
            target_thread_id = win32process.GetWindowThreadProcessId(hwnd)[0]
            
            # 스레드 입력 연결 (AttachThreadInput)
            if foreground_thread_id and foreground_thread_id != target_thread_id:
                ctypes.windll.user32.AttachThreadInput(foreground_thread_id, target_thread_id, True)
            
            # 창 복원 및 표시
            if win32gui.IsIconic(hwnd):
                win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
                time.sleep(0.1)
            
            # 여러 방법으로 창 활성화 시도
            win32gui.ShowWindow(hwnd, win32con.SW_SHOW)
            win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
            win32gui.SetWindowPos(hwnd, win32con.HWND_TOP, 0, 0, 0, 0, 
                                 win32con.SWP_NOMOVE | win32con.SWP_NOSIZE)
            win32gui.BringWindowToTop(hwnd)
            
            # AllowSetForegroundWindow 권한 부여
            ctypes.windll.user32.AllowSetForegroundWindow(-1)
            time.sleep(0.05)
            
            # SetForegroundWindow 시도
            try:
                win32gui.SetForegroundWindow(hwnd)
                win32gui.SetActiveWindow(hwnd)
            except Exception as e:
                logger.warning(f"SetForegroundWindow 실패: {e}")
            
            # 스레드 입력 연결 해제
            if foreground_thread_id and foreground_thread_id != target_thread_id:
                ctypes.windll.user32.AttachThreadInput(foreground_thread_id, target_thread_id, False)
            
            return True
        except Exception as e:
            logger.warning(f"_force_foreground_window 실패: {e}")
            # 실패해도 기본 방법 시도
            try:
                if win32gui.IsIconic(hwnd):
                    win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
                win32gui.ShowWindow(hwnd, win32con.SW_SHOW)
                win32gui.SetWindowPos(hwnd, win32con.HWND_TOP, 0, 0, 0, 0, 
                                     win32con.SWP_NOMOVE | win32con.SWP_NOSIZE)
                win32gui.BringWindowToTop(hwnd)
            except:
                pass
            return False
    
    async def handle_process_focus_action(self, parameters: dict):
        """프로세스 포커스 액션 처리"""
        import pygetwindow as gw
        import win32gui
        import win32con
        import win32process
        import time
        
        process_id = parameters.get("process_id")
        hwnd = parameters.get("hwnd")
        window_title = parameters.get("window_title", "")
        process_name = parameters.get("process_name", "")
        
        if not process_id and not hwnd:
            raise ValueError("process_id 또는 hwnd가 필요합니다.")
        
        # pygetwindow를 사용하여 창 찾기 (가장 안정적인 방법)
        target_window = None
        
        # 방법 1: window_title로 찾기 (가장 정확)
        if window_title:
            try:
                windows = gw.getWindowsWithTitle(window_title)
                if windows:
                    target_window = windows[0]
                    logger.debug(f"window_title로 창 찾기 성공: {window_title}")
            except Exception as e:
                logger.warning(f"window_title로 창 찾기 실패: {e}")
        
        # 방법 2: process_name으로 찾기
        if not target_window and process_name:
            try:
                windows = gw.getWindowsWithTitle(process_name)
                if windows:
                    # 정확한 창 제목이 있으면 매칭
                    if window_title:
                        for win in windows:
                            if win.title == window_title:
                                target_window = win
                                break
                    if not target_window:
                        target_window = windows[0]
                    logger.debug(f"process_name으로 창 찾기 성공: {process_name}")
            except Exception as e:
                logger.warning(f"process_name으로 창 찾기 실패: {e}")
        
        # 방법 3: hwnd로 직접 찾기
        if not target_window and hwnd:
            try:
                target_hwnd = int(hwnd)
                # 모든 창을 열거하여 hwnd로 찾기
                all_windows = gw.getAllWindows()
                for win in all_windows:
                    if hasattr(win, '_hWnd') and win._hWnd == target_hwnd:
                        target_window = win
                        logger.debug(f"hwnd로 창 찾기 성공: {hwnd}")
                        break
            except Exception as e:
                logger.warning(f"hwnd로 창 찾기 실패: {e}")
        
        # 방법 4: win32gui로 직접 처리 (최후의 수단)
        if not target_window:
            if hwnd:
                target_hwnd = int(hwnd)
            else:
                # process_id로 창 핸들 찾기
                target_hwnd = None
                
                def find_window_callback(hwnd, extra):
                    nonlocal target_hwnd
                    if win32gui.IsWindowVisible(hwnd):
                        _, pid = win32process.GetWindowThreadProcessId(hwnd)
                        if pid == process_id:
                            target_hwnd = hwnd
                            return False
                    return True
                
                win32gui.EnumWindows(find_window_callback, None)
                
                if not target_hwnd:
                    raise ValueError(f"프로세스 ID {process_id}에 해당하는 창을 찾을 수 없습니다.")
            
            # win32gui로 직접 처리 (강제 포커스 방법 사용)
            try:
                self._force_foreground_window(target_hwnd)
                
                return {
                    "action": "process-focus",
                    "process_id": process_id,
                    "hwnd": target_hwnd,
                    "status": "completed",
                    "message": "프로세스에 포커스를 주었습니다."
                }
            except Exception as e:
                # 기본 작업 실패 시 에러 발생
                raise ValueError(f"창 포커스 실패: {e}")
        
        # pygetwindow로 창 포커스 시도 (실패 시 win32gui로 대체)
        if target_window:
            try:
                # 창이 최소화되어 있으면 복원
                if target_window.isMinimized:
                    target_window.restore()
                    time.sleep(0.1)
                
                # 창 활성화 및 포커스 시도
                try:
                    target_window.activate()
                    time.sleep(0.05)
                    target_window.restore()  # 다시 복원하여 최상단으로
                    logger.debug(f"pygetwindow로 창 포커스 성공: {target_window.title}")
                    
                    return {
                        "action": "process-focus",
                        "process_id": process_id,
                        "hwnd": target_window._hWnd if hasattr(target_window, '_hWnd') else None,
                        "status": "completed",
                        "message": f"프로세스 '{target_window.title}'에 포커스를 주었습니다."
                    }
                except Exception as activate_error:
                    logger.warning(f"pygetwindow.activate() 실패, win32gui로 대체: {activate_error}")
                    # pygetwindow 실패 시 win32gui로 대체
                    target_hwnd = target_window._hWnd if hasattr(target_window, '_hWnd') else None
                    if not target_hwnd:
                        raise ValueError("창 핸들을 가져올 수 없습니다.")
                    
                    # win32gui로 직접 처리 (강제 포커스 방법 사용)
                    self._force_foreground_window(target_hwnd)
                    
                    logger.debug(f"win32gui로 창 포커스 성공: {target_window.title}")
                    
                    return {
                        "action": "process-focus",
                        "process_id": process_id,
                        "hwnd": target_hwnd,
                        "status": "completed",
                        "message": f"프로세스 '{target_window.title}'에 포커스를 주었습니다."
                    }
            except Exception as e:
                logger.warning(f"pygetwindow 처리 실패: {e}")
                # 최후의 수단: win32gui로 직접 처리
                target_hwnd = target_window._hWnd if hasattr(target_window, '_hWnd') else None
                if not target_hwnd and hwnd:
                    target_hwnd = int(hwnd)
                
                if not target_hwnd:
                    raise ValueError(f"창 핸들을 가져올 수 없습니다: {e}")
                
                # win32gui로 직접 처리 (강제 포커스 방법 사용)
                self._force_foreground_window(target_hwnd)
                
                logger.debug(f"win32gui로 창 포커스 완료 (대체 방법)")
                
                return {
                    "action": "process-focus",
                    "process_id": process_id,
                    "hwnd": target_hwnd,
                    "status": "completed",
                    "message": "프로세스에 포커스를 주었습니다."
                }
        
        raise ValueError("창을 찾을 수 없습니다.")
        
        return {
            "action": "process-focus",
            "process_id": process_id,
            "hwnd": target_hwnd,
            "status": "completed",
            "message": "프로세스에 포커스를 주었습니다."
        }
    
    async def handle_wait_action(self, parameters: dict):
        """대기 액션 처리"""
        import asyncio
        
        wait_time = parameters.get("wait_time", 1)
        
        # wait_time이 숫자가 아니면 기본값 1초 사용
        try:
            wait_time = float(wait_time)
            if wait_time < 0:
                wait_time = 0
        except (ValueError, TypeError):
            wait_time = 1
        
        # 비동기 대기
        await asyncio.sleep(wait_time)
        
        return {
            "action": "wait",
            "wait_time": wait_time,
            "status": "completed",
            "message": f"{wait_time}초 대기 완료"
        }
