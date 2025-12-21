"""
노드 실행 컨텍스트 관리
노드 간 데이터 전달을 위한 컨텍스트 클래스
"""

from typing import Any

from log import log_manager

logger = log_manager.logger


class NodeExecutionContext:
    """
    노드 실행 컨텍스트 클래스
    이전 노드들의 실행 결과를 저장하고 관리합니다.
    """

    def __init__(self) -> None:
        """컨텍스트 초기화"""
        # 노드별 실행 결과 저장: {node_id: {result_data}}
        # key: 노드 ID, value: 노드 실행 결과 (표준 형식: {action, status, output})
        self.node_results: dict[str, dict[str, Any]] = {}

        # 노드 이름으로 ID 찾기: {node_name: node_id}
        # key: 노드 이름, value: 노드 ID (이름으로 노드를 찾을 때 사용)
        self.node_name_map: dict[str, str] = {}

        # 실행 순서 저장
        # 노드가 실행된 순서대로 노드 ID를 저장 (이전 노드 찾기용)
        self.execution_order: list[str] = []

        # 현재 실행 중인 노드 ID
        # 현재 실행 중인 노드의 ID (디버깅 및 로깅용)
        self.current_node_id: str | None = None

        # 워크플로우 전체 데이터 (글로벌 변수 등)
        # 워크플로우 전체에서 공유할 데이터 (향후 확장용)
        self.workflow_data: dict[str, Any] = {}

    def add_node_result(self, node_id: str, node_name: str | None, result: dict[str, Any]) -> None:
        """
        노드 실행 결과를 추가합니다.

        Args:
            node_id: 노드 ID
            node_name: 노드 이름 (선택적)
            result: 노드 실행 결과
        """
        # 노드 실행 결과 저장
        self.node_results[node_id] = result

        # 노드 이름이 있으면 이름-ID 매핑 추가
        if node_name:
            self.node_name_map[node_name] = node_id

        # 실행 순서에 노드 ID 추가 (중복 방지)
        if node_id not in self.execution_order:
            self.execution_order.append(node_id)

        logger.debug(f"노드 실행 결과 추가: {node_id} ({node_name})")

    def get_node_result(self, node_id: str | None = None) -> dict[str, Any] | None:
        """
        특정 노드의 실행 결과를 가져옵니다.

        Args:
            node_id: 노드 ID (None이면 현재 노드의 이전 노드 결과 반환)

        Returns:
            노드 실행 결과 또는 None
        """
        # node_id가 None이면 현재 노드의 이전 노드 결과 반환
        if node_id is None:
            # 실행 순서가 있으면 마지막 노드(이전 노드)의 결과 반환
            if len(self.execution_order) > 0:
                # prev_node_id: 이전 노드 ID (실행 순서의 마지막 요소)
                prev_node_id = self.execution_order[-1]
                return self.node_results.get(prev_node_id)
            # 실행 순서가 없으면 None 반환
            return None

        # node_id가 지정되었으면 해당 노드의 결과 반환
        return self.node_results.get(node_id)

    def get_node_result_by_name(self, node_name: str) -> dict[str, Any] | None:
        """
        노드 이름으로 실행 결과를 가져옵니다.

        Args:
            node_name: 노드 이름

        Returns:
            노드 실행 결과 또는 None
        """
        node_id = self.node_name_map.get(node_name)
        if node_id:
            return self.node_results.get(node_id)
        return None

    def get_previous_node_result(self) -> dict[str, Any] | None:
        """
        이전 노드의 실행 결과를 가져옵니다.

        Returns:
            이전 노드의 실행 결과 또는 None
        """
        # 실행 순서가 있으면 마지막 노드(이전 노드)의 결과 반환
        if len(self.execution_order) > 0:
            # prev_node_id: 이전 노드 ID (실행 순서의 마지막 요소)
            prev_node_id = self.execution_order[-1]
            return self.node_results.get(prev_node_id)
        # 실행 순서가 없으면 None 반환
        return None

    def set_current_node(self, node_id: str) -> None:
        """현재 실행 중인 노드 설정"""
        self.current_node_id = node_id

    def get_all_results(self) -> dict[str, dict[str, Any]]:
        """모든 노드의 실행 결과를 반환합니다."""
        return self.node_results.copy()

    def clear(self) -> None:
        """컨텍스트 초기화"""
        self.node_results.clear()
        self.node_name_map.clear()
        self.execution_order.clear()
        self.current_node_id = None
        self.workflow_data.clear()
        logger.debug("노드 실행 컨텍스트 초기화됨")

    def to_dict(self) -> dict[str, Any]:
        """컨텍스트를 딕셔너리로 변환합니다."""
        return {
            "node_results": self.node_results,
            "node_name_map": self.node_name_map,
            "execution_order": self.execution_order,
            "current_node_id": self.current_node_id,
            "workflow_data": self.workflow_data,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "NodeExecutionContext":
        """딕셔너리에서 컨텍스트를 생성합니다."""
        context = cls()
        context.node_results = data.get("node_results", {})
        context.node_name_map = data.get("node_name_map", {})
        context.execution_order = data.get("execution_order", [])
        context.current_node_id = data.get("current_node_id")
        context.workflow_data = data.get("workflow_data", {})
        return context
