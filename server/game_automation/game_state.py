from typing import Dict, Any, Optional
import time
import json

class GameState:
    """게임 상태 관리 클래스"""
    
    def __init__(self):
        self.state = {
            "game_running": False,
            "current_scene": "unknown",
            "player_level": 1,
            "player_hp": 100,
            "player_mp": 100,
            "inventory_count": 0,
            "gold": 0,
            "experience": 0,
            "current_map": "unknown",
            "coordinates": {"x": 0, "y": 0},
            "last_action": None,
            "last_action_time": None,
            "session_start_time": time.time(),
            "actions_performed": 0,
            "errors_count": 0
        }
        
        self.scene_templates = {
            "main_menu": "templates/main_menu.png",
            "character_select": "templates/character_select.png",
            "game_world": "templates/game_world.png",
            "inventory": "templates/inventory.png",
            "shop": "templates/shop.png",
            "battle": "templates/battle.png"
        }
    
    def update_state(self, key: str, value: Any) -> None:
        """게임 상태를 업데이트합니다."""
        self.state[key] = value
        self.state["last_action_time"] = time.time()
    
    def get_state(self, key: Optional[str] = None) -> Any:
        """게임 상태를 반환합니다."""
        if key:
            return self.state.get(key)
        return self.state.copy()
    
    def set_scene(self, scene: str) -> None:
        """현재 씬을 설정합니다."""
        self.update_state("current_scene", scene)
    
    def get_scene(self) -> str:
        """현재 씬을 반환합니다."""
        return self.state.get("current_scene", "unknown")
    
    def set_player_stats(self, level: int = None, hp: int = None, mp: int = None) -> None:
        """플레이어 스탯을 설정합니다."""
        if level is not None:
            self.update_state("player_level", level)
        if hp is not None:
            self.update_state("player_hp", hp)
        if mp is not None:
            self.update_state("player_mp", mp)
    
    def get_player_stats(self) -> Dict[str, int]:
        """플레이어 스탯을 반환합니다."""
        return {
            "level": self.state.get("player_level", 1),
            "hp": self.state.get("player_hp", 100),
            "mp": self.state.get("player_mp", 100)
        }
    
    def set_inventory(self, count: int) -> None:
        """인벤토리 아이템 수를 설정합니다."""
        self.update_state("inventory_count", count)
    
    def get_inventory_count(self) -> int:
        """인벤토리 아이템 수를 반환합니다."""
        return self.state.get("inventory_count", 0)
    
    def set_currency(self, gold: int = None, exp: int = None) -> None:
        """화폐를 설정합니다."""
        if gold is not None:
            self.update_state("gold", gold)
        if exp is not None:
            self.update_state("experience", exp)
    
    def get_currency(self) -> Dict[str, int]:
        """화폐를 반환합니다."""
        return {
            "gold": self.state.get("gold", 0),
            "experience": self.state.get("experience", 0)
        }
    
    def set_position(self, x: int, y: int) -> None:
        """플레이어 위치를 설정합니다."""
        self.update_state("coordinates", {"x": x, "y": y})
    
    def get_position(self) -> Dict[str, int]:
        """플레이어 위치를 반환합니다."""
        return self.state.get("coordinates", {"x": 0, "y": 0})
    
    def set_map(self, map_name: str) -> None:
        """현재 맵을 설정합니다."""
        self.update_state("current_map", map_name)
    
    def get_map(self) -> str:
        """현재 맵을 반환합니다."""
        return self.state.get("current_map", "unknown")
    
    def record_action(self, action: str, success: bool = True) -> None:
        """수행된 액션을 기록합니다."""
        self.update_state("last_action", action)
        self.update_state("actions_performed", self.state.get("actions_performed", 0) + 1)
        
        if not success:
            self.update_state("errors_count", self.state.get("errors_count", 0) + 1)
    
    def get_session_stats(self) -> Dict[str, Any]:
        """세션 통계를 반환합니다."""
        session_duration = time.time() - self.state.get("session_start_time", time.time())
        
        return {
            "session_duration": session_duration,
            "actions_performed": self.state.get("actions_performed", 0),
            "errors_count": self.state.get("errors_count", 0),
            "success_rate": self._calculate_success_rate(),
            "actions_per_minute": self._calculate_actions_per_minute(session_duration)
        }
    
    def _calculate_success_rate(self) -> float:
        """성공률을 계산합니다."""
        total_actions = self.state.get("actions_performed", 0)
        errors = self.state.get("errors_count", 0)
        
        if total_actions == 0:
            return 100.0
        
        return ((total_actions - errors) / total_actions) * 100
    
    def _calculate_actions_per_minute(self, session_duration: float) -> float:
        """분당 액션 수를 계산합니다."""
        if session_duration == 0:
            return 0.0
        
        actions = self.state.get("actions_performed", 0)
        return (actions / session_duration) * 60
    
    def reset_session(self) -> None:
        """세션을 리셋합니다."""
        self.state.update({
            "session_start_time": time.time(),
            "actions_performed": 0,
            "errors_count": 0,
            "last_action": None,
            "last_action_time": None
        })
    
    def save_state_to_file(self, filename: str) -> bool:
        """게임 상태를 파일로 저장합니다."""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(self.state, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"상태 저장 실패: {e}")
            return False
    
    def load_state_from_file(self, filename: str) -> bool:
        """파일에서 게임 상태를 로드합니다."""
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                loaded_state = json.load(f)
                self.state.update(loaded_state)
            return True
        except Exception as e:
            print(f"상태 로드 실패: {e}")
            return False
    
    def is_game_running(self) -> bool:
        """게임이 실행 중인지 확인합니다."""
        return self.state.get("game_running", False)
    
    def set_game_running(self, running: bool) -> None:
        """게임 실행 상태를 설정합니다."""
        self.update_state("game_running", running)
