"""
게임 액션 처리 서비스
"""


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
            "image-touch": self.handle_image_touch_action
        }
    
    async def process_game_action(self, action_type: str, parameters: dict):
        """
        게임 액션을 처리하는 함수
        """
        print(f"[DEBUG] process_game_action 호출됨 - 액션 타입: {action_type}, 파라미터: {parameters}")
        
        try:
            print(f"[DEBUG] 사용 가능한 핸들러: {list(self.action_handlers.keys())}")
            
            handler = self.action_handlers.get(action_type)
            if not handler:
                print(f"[ERROR] 지원하지 않는 액션 타입: {action_type}")
                raise ValueError(f"지원하지 않는 액션 타입: {action_type}")
            
            print(f"[DEBUG] 핸들러 실행 중: {handler.__name__}")
            result = await handler(parameters)
            print(f"[DEBUG] 핸들러 실행 완료: {result}")
            
            return result
        except Exception as e:
            print(f"[ERROR] process_game_action 에러: {e}")
            import traceback
            print(f"[ERROR] process_game_action 스택 트레이스: {traceback.format_exc()}")
            raise e
    
    async def process_node(self, node: dict):
        """
        개별 노드를 처리하는 함수
        """
        print(f"[DEBUG] process_node 호출됨 - 노드: {node}")
        
        try:
            node_type = node.get("type")
            node_data = node.get("data", {})
            
            print(f"[DEBUG] 노드 타입: {node_type}")
            print(f"[DEBUG] 노드 데이터: {node_data}")
            
            result = await self.process_game_action(node_type, node_data)
            print(f"[DEBUG] process_game_action 결과: {result}")
            
            return result
        except Exception as e:
            print(f"[ERROR] process_node 에러: {e}")
            import traceback
            print(f"[ERROR] process_node 스택 트레이스: {traceback.format_exc()}")
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
        from game_automation.screen_capture import ScreenCapture
        from game_automation.input_handler import InputHandler
        
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
                # 이미지 찾기
                location = screen_capture.find_template(image_path, threshold=0.8)
                
                if location:
                    x, y, w, h = location
                    # 이미지 중심점 클릭
                    center_x = x + w // 2
                    center_y = y + h // 2
                    
                    # 터치 (클릭)
                    success = input_handler.click(center_x, center_y)
                    
                    results.append({
                        "image": os.path.basename(image_path),
                        "found": True,
                        "position": (center_x, center_y),
                        "touched": success
                    })
                else:
                    results.append({
                        "image": os.path.basename(image_path),
                        "found": False,
                        "message": "화면에서 이미지를 찾을 수 없습니다."
                    })
                    
            except Exception as e:
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
