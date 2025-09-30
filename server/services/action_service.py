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
            "action": self.handle_action_action
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
