"""
액션 처리 서비스
"""

from typing import Optional
from log import log_manager
from services.node_execution_context import NodeExecutionContext
from services.expression_parser import ExpressionParser

# 노드 모듈 import
from nodes.actionnodes import (
    HttpApiRequestNode,
    ClickNode,
    MoveNode,
    CollectNode,
    BattleNode,
    NavigateNode,
    ActionNode,
    ProcessFocusNode
)
from nodes.conditionnodes import ConditionNode
from nodes.waitnodes import WaitNode
from nodes.imagenodes import ImageTouchNode

# config 모듈은 직접 import (같은 레벨에 있으므로)
try:
    from config.action_node_types import get_action_node_config
except ImportError:
    # config 모듈이 없으면 빈 함수로 대체
    def get_action_node_config(node_type, action_node_type):
        return None

logger = log_manager.logger


class ActionService:
    """게임 액션을 처리하는 서비스 클래스"""
    
    def __init__(self):
        # 노드 타입별 핸들러 매핑
        self.node_handlers = {
            # 액션 노드들
            "click": ClickNode.execute,
            "move": MoveNode.execute,
            "collect": CollectNode.execute,
            "battle": BattleNode.execute,
            "navigate": NavigateNode.execute,
            "action": ActionNode.execute,
            "image-touch": ImageTouchNode.execute,
            "process-focus": ProcessFocusNode.execute,
            # 조건 노드들
            "condition": ConditionNode.execute,
            # 대기 노드들
            "wait": WaitNode.execute,
        }
        
        # 실제 노드 종류 핸들러 매핑 (action_node_type 사용)
        self.action_node_handlers = {
            "http-api-request": HttpApiRequestNode.execute
        }
    
    async def process_game_action(self, action_type: str, parameters: dict, action_node_type: Optional[str] = None):
        """
        게임 액션을 처리하는 함수
        
        Args:
            action_type: 액션 타입 (노드 타입, 예: "action")
            parameters: 파라미터 딕셔너리 (None이거나 비어있어도 처리)
            action_node_type: 실제 노드 종류 (예: "http-api-request", 선택)
        
        Returns:
            항상 dict를 반환 (None이면 기본값 반환)
        """
        # parameters가 None이면 빈 dict로 변환
        if parameters is None:
            parameters = {}
        
        logger.debug(f"process_game_action 호출됨 - 액션 타입: {action_type}, 실제 노드 종류: {action_node_type}, 파라미터: {parameters}")
        
        try:
            # 실제 노드 종류가 지정된 경우 해당 핸들러 사용
            if action_node_type:
                handler = self.action_node_handlers.get(action_node_type)
                if handler:
                    logger.debug(f"실제 노드 종류 핸들러 실행 중: {action_node_type}")
                    result = await handler(parameters)
                    logger.debug(f"실제 노드 종류 핸들러 실행 완료: {result}")
                    
                    # 결과가 None이면 기본값 반환
                    if result is None:
                        result = {
                            "action": action_node_type,
                            "status": "completed",
                            "output": None
                        }
                    
                    # 결과가 dict가 아니면 dict로 변환
                    if not isinstance(result, dict):
                        result = {
                            "action": action_node_type,
                            "status": "completed",
                            "output": result
                        }
                    
                    return result
            
            # 노드 핸들러 사용
            logger.debug(f"사용 가능한 핸들러: {list(self.node_handlers.keys())}")
            
            handler = self.node_handlers.get(action_type)
            if not handler:
                logger.error(f"지원하지 않는 액션 타입: {action_type}")
                raise ValueError(f"지원하지 않는 액션 타입: {action_type}")
            
            logger.debug(f"핸들러 실행 중: {handler.__name__}")
            result = await handler(parameters)
            logger.debug(f"핸들러 실행 완료: {result}")
            
            # 결과가 None이면 기본값 반환
            if result is None:
                result = {
                    "action": action_type,
                    "status": "completed",
                    "output": None
                }
            
            # 결과가 dict가 아니면 dict로 변환
            if not isinstance(result, dict):
                result = {
                    "action": action_type,
                    "status": "completed",
                    "output": result
                }
            
            return result
        except Exception as e:
            logger.error(f"process_game_action 에러: {e}")
            import traceback
            logger.error(f"process_game_action 스택 트레이스: {traceback.format_exc()}")
            raise e
    
    async def process_node(self, node: dict, context: Optional[NodeExecutionContext] = None):
        """
        개별 노드를 처리하는 함수
        
        모든 노드는 입력을 받고 출력을 반환해야 합니다.
        입력이 없으면 None을 받고, 출력이 없으면 None을 반환합니다.
        
        Args:
            node: 노드 데이터
            context: 노드 실행 컨텍스트 (데이터 전달용)
        
        Returns:
            항상 dict를 반환 (None이면 기본값 반환)
        """
        logger.debug(f"process_node 호출됨 - 노드: {node}")
        
        try:
            node_type = node.get("type")
            node_data = node.get("data")
            node_id = node.get("id", "")
            
            # node_data가 None이면 빈 dict로 변환
            if node_data is None:
                node_data = {}
            
            node_name = node_data.get("title") or node_data.get("name")
            
            logger.debug(f"노드 타입: {node_type}")
            logger.debug(f"노드 데이터: {node_data}")
            
            # 컨텍스트가 있으면 현재 노드 설정
            if context:
                context.set_current_node(node_id)
                
                # 파라미터에 표현식이 있으면 파싱
                node_data = ExpressionParser.parse_parameters(node_data, context)
                logger.debug(f"파싱된 노드 데이터: {node_data}")
            
            # 실제 노드 종류 가져오기
            action_node_type = node_data.get("action_node_type")
            
            # 액션 실행 (입력이 없어도 처리)
            result = await self.process_game_action(node_type, node_data, action_node_type)
            logger.debug(f"process_game_action 결과: {result}")
            
            # 결과가 None이면 기본값으로 변환
            if result is None:
                result = {
                    "action": node_type,
                    "status": "completed",
                    "output": None
                }
            
            # 결과가 dict가 아니면 dict로 변환
            if not isinstance(result, dict):
                result = {
                    "action": node_type,
                    "status": "completed",
                    "output": result
                }
            
            # 컨텍스트에 항상 결과 저장 (None이어도)
            if context:
                context.add_node_result(node_id, node_name, result)
            
            return result
        except Exception as e:
            logger.error(f"process_node 에러: {e}")
            import traceback
            logger.error(f"process_node 스택 트레이스: {traceback.format_exc()}")
            
            # 에러 발생 시에도 결과 반환
            error_result = {
                "action": node.get("type", "unknown"),
                "status": "failed",
                "error": str(e),
                "output": None
            }
            
            # 컨텍스트에 에러 결과도 저장
            if context:
                node_id = node.get("id", "")
                node_name = node.get("data", {}).get("title") or node.get("data", {}).get("name")
                context.add_node_result(node_id, node_name, error_result)
            
            raise e
