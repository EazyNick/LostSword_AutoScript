"""
액션 처리 서비스
"""

import inspect
from typing import Any

from log import log_manager

# 노드 모듈 import (자동으로 모든 노드가 import됨)
import nodes
from services.condition_service import ConditionService
from services.node_execution_context import NodeExecutionContext

# config 모듈은 직접 import (같은 레벨에 있으므로)
try:
    from config.action_node_types import ACTION_NODE_TYPES, get_action_node_config
except ImportError:
    # config 모듈이 없으면 빈 딕셔너리와 함수로 대체
    ACTION_NODE_TYPES = {}

    def get_action_node_config(node_type: str, action_node_type: str) -> dict[str, Any] | None:
        return None


logger = log_manager.logger


class ActionService:
    """액션을 처리하는 서비스 클래스"""

    def __init__(self) -> None:
        # 노드 타입별 핸들러 매핑 (자동으로 등록됨)
        self.node_handlers: dict[str, Any] = {}
        # 실제 노드 종류 핸들러 매핑 (action_node_type 사용, 자동으로 등록됨)
        self.action_node_handlers: dict[str, Any] = {}

        # 모든 노드 클래스를 자동으로 스캔하여 핸들러 등록
        self._register_node_handlers()

    def _register_node_handlers(self) -> None:
        """
        모든 노드 클래스를 자동으로 스캔하여 핸들러를 등록합니다.
        """
        # nodes 모듈에서 BaseNode를 상속받은 모든 클래스를 찾음
        from nodes.base_node import BaseNode

        # nodes 모듈의 모든 속성을 순회
        logger.info(
            f"[ActionService] 노드 핸들러 등록 시작 - nodes 모듈 속성 개수: {len([x for x in dir(nodes) if not x.startswith('_')])}"
        )
        for _name, obj in inspect.getmembers(nodes):
            # 클래스이고 BaseNode를 상속받았으며, execute 메서드가 있는 경우
            if inspect.isclass(obj) and issubclass(obj, BaseNode) and obj is not BaseNode and hasattr(obj, "execute"):
                execute_method = obj.execute
                # execute 메서드에 action_name 속성이 있는지 확인 (NodeExecutor 데코레이터가 추가함)
                if hasattr(execute_method, "action_name"):
                    action_name = execute_method.action_name
                    # node_handlers에 등록
                    self.node_handlers[action_name] = execute_method
                    logger.info(f"[ActionService] 노드 핸들러 자동 등록: {action_name} -> {obj.__name__}.execute")
                else:
                    logger.warning(
                        f"[ActionService] 노드 클래스 {obj.__name__}의 execute 메서드에 action_name 속성이 없습니다."
                    )

        logger.info(
            f"[ActionService] 노드 핸들러 등록 완료 - 총 {len(self.node_handlers)}개 핸들러 등록됨: {list(self.node_handlers.keys())}"
        )

        # action_node_types.py의 handler와 매칭하여 action_node_handlers에 등록
        for _node_type, action_nodes in ACTION_NODE_TYPES.items():
            for action_node_type, config in action_nodes.items():
                handler_name = config.get("handler")
                if handler_name and handler_name in self.node_handlers:
                    self.action_node_handlers[action_node_type] = self.node_handlers[handler_name]
                    logger.debug(f"액션 노드 핸들러 자동 등록: {action_node_type} -> {handler_name}")

    async def process_action(
        self, action_type: str, parameters: dict[str, Any], action_node_type: str | None = None
    ) -> dict[str, Any]:
        """
        액션을 처리하는 함수

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

            logger.info(
                f"[process_action] 호출됨 - 액션 타입: {action_type}, 실제 노드 종류: {action_node_type}, 파라미터: {parameters}"
            )

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
                        result = {"action": action_node_type, "status": "completed", "output": None}

                    # 결과가 dict가 아니면 dict로 변환
                    if not isinstance(result, dict):
                        result = {"action": action_node_type, "status": "completed", "output": result}

                    return result

            # 노드 핸들러 사용
            logger.info(f"[process_action] 사용 가능한 핸들러: {list(self.node_handlers.keys())}")
            logger.info(f"[process_action] 요청된 액션 타입: {action_type}")

            handler = self.node_handlers.get(action_type)
            if not handler:
                logger.error(
                    f"[process_action] 지원하지 않는 액션 타입: {action_type} (등록된 핸들러: {list(self.node_handlers.keys())})"
                )
                raise ValueError(f"지원하지 않는 액션 타입: {action_type}")

            logger.info(f"[process_action] 핸들러 찾음: {handler} (action_type: {action_type})")

            logger.debug(f"핸들러 실행 중: {handler.__name__}")
            result = await handler(parameters)
            logger.debug(f"핸들러 실행 완료: {result}")

            # 결과가 None이면 기본값 반환
            if result is None:
                result = {"action": action_type, "status": "completed", "output": None}

            # 결과가 dict가 아니면 dict로 변환
            if not isinstance(result, dict):
                result = {"action": action_type, "status": "completed", "output": result}

            return result
        except Exception as e:
            logger.error(f"process_action 에러: {e}")
            import traceback

            logger.error(f"process_action 스택 트레이스: {traceback.format_exc()}")
            raise e

    async def process_node(
        self,
        node: dict[str, Any],
        context: NodeExecutionContext | None = None,
        execution_id: str | None = None,
        script_id: int | None = None,
    ) -> dict[str, Any]:
        """
        개별 노드를 처리하는 함수

        모든 노드는 입력을 받고 출력을 반환해야 합니다.
        입력이 없으면 None을 받고, 출력이 없으면 None을 반환합니다.

        Args:
            node: 노드 데이터
            context: 노드 실행 컨텍스트 (데이터 전달용)
            execution_id: 워크플로우 실행 ID (로그 추적용)
            script_id: 스크립트 ID (로그 추적용)

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

            # parameters를 node_data에 병합 (parameters가 우선순위가 높음)
            # DB에서 불러온 노드는 parameters 필드에 파라미터가 저장되어 있음
            node_parameters = node.get("parameters")
            if node_parameters and isinstance(node_parameters, dict):
                # node_data에 parameters를 병합 (parameters가 우선)
                node_data = {**node_data, **node_parameters}
                logger.debug(f"[process_node] parameters 병합 완료: {list(node_parameters.keys())}")

            node_name = node_data.get("title") or node_data.get("name")

            # 로그 추적을 위한 메타데이터를 node_data에 추가 (내부 메타데이터는 _ 접두사 사용)
            if execution_id is not None:
                node_data["_execution_id"] = execution_id
            if script_id is not None:
                node_data["_script_id"] = script_id
            node_data["_node_id"] = node_id
            if node_name:
                node_data["_node_name"] = node_name

            logger.info(f"[process_node] 노드 타입: {node_type}")
            logger.info(f"[process_node] 노드 데이터: {node_data}")
            logger.info(f"[process_node] 노드 데이터 키 목록: {list(node_data.keys()) if node_data else []}")

            # folder_path 파라미터 확인 (image-touch 노드용)
            if node_type == "image-touch":
                folder_path = node_data.get("folder_path")
                logger.info(f"[process_node][image-touch] folder_path 값: {folder_path}")
                if not folder_path:
                    logger.warning(f"[process_node][image-touch] ⚠️ folder_path가 없습니다! node_data 전체: {node_data}")

            # 컨텍스트가 있으면 현재 노드 설정
            if context:
                context.set_current_node(node_id)

                # 조건 노드인 경우 조건 서비스를 통해 데이터 준비
                if node_type == "condition":
                    node_data = ConditionService.prepare_condition_node_data(node_data, context)

                # 엑셀 닫기 노드인 경우 이전 노드의 출력에서 execution_id 가져오기
                if node_type == "excel-close":
                    prev_result = context.get_previous_node_result()
                    if prev_result and isinstance(prev_result, dict):
                        prev_output = prev_result.get("output")
                        if isinstance(prev_output, dict) and "execution_id" in prev_output:
                            # 이전 노드의 출력에서 execution_id를 가져와서 node_data에 추가
                            node_data["_execution_id_from_prev"] = prev_output.get("execution_id")
                            logger.info(
                                f"[process_node][excel-close] 이전 노드 출력에서 execution_id 가져옴: {prev_output.get('execution_id')}"
                            )

                logger.debug(f"준비된 노드 데이터: {node_data}")

            # 실제 노드 종류 가져오기
            action_node_type = node_data.get("action_node_type")

            # 출력 오버라이드가 있으면 그것을 사용, 없으면 노드 실행
            output_override = node_data.get("output_override")
            if output_override is not None:
                # 출력 오버라이드가 있으면 그것을 결과로 사용
                result = {"action": node_type, "status": "completed", "output": output_override}
                logger.debug(f"출력 오버라이드 사용: {output_override}")
            else:
                # 액션 실행 (입력이 없어도 처리)
                node_type_str = str(node_type) if node_type else "unknown"
                result = await self.process_action(node_type_str, node_data, action_node_type)
                logger.debug(f"process_action 결과: {result}")

            # 결과가 None이면 기본값으로 변환
            if result is None:
                result = {"action": node_type, "status": "completed", "output": None}

            # 결과가 dict가 아니면 dict로 변환
            if not isinstance(result, dict):
                result = {"action": node_type, "status": "completed", "output": result}

            # output 필드가 없으면 추가
            if "output" not in result:
                result["output"] = None

            # 컨텍스트에 항상 결과 저장 (None이어도)
            if context:
                context.add_node_result(node_id, node_name, result)

            logger.debug(f"process_node 최종 결과: {result}")
            return result
        except Exception as e:
            logger.error(f"process_node 에러: {e}")
            import traceback

            logger.error(f"process_node 스택 트레이스: {traceback.format_exc()}")

            # 에러 발생 시에도 결과 반환
            error_result = {"action": node.get("type", "unknown"), "status": "failed", "error": str(e), "output": None}

            # 컨텍스트에 에러 결과도 저장
            if context:
                node_id = node.get("id", "")
                node_name = node.get("data", {}).get("title") or node.get("data", {}).get("name")
                context.add_node_result(node_id, node_name, error_result)

            raise e
