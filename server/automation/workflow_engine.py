import asyncio
from enum import Enum
import time
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from collections.abc import Callable


class NodeType(Enum):
    """노드 타입 열거형"""

    CLICK = "click"
    MOVE = "move"
    COLLECT = "collect"
    BATTLE = "battle"
    NAVIGATE = "navigate"
    WAIT = "wait"
    CONDITION = "condition"
    LOOP = "loop"
    CUSTOM = "custom"


class ExecutionMode(Enum):
    """실행 모드 열거형"""

    SEQUENTIAL = "sequential"
    PARALLEL = "parallel"
    CONDITIONAL = "conditional"


class NodeStatus(Enum):
    """노드 상태 열거형"""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class WorkflowNode:
    """워크플로우 노드 클래스"""

    def __init__(self, node_id: str, node_type: NodeType, data: dict[str, Any]) -> None:
        self.id = node_id
        self.type = node_type
        self.data = data
        self.status = NodeStatus.PENDING
        self.start_time: float | None = None
        self.end_time: float | None = None
        self.error_message: str | None = None
        self.result: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        """노드를 딕셔너리로 변환합니다."""
        return {
            "id": self.id,
            "type": self.type.value,
            "data": self.data,
            "status": self.status.value,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "error_message": self.error_message,
            "result": self.result,
        }


class WorkflowEngine:
    """워크플로우 실행 엔진"""

    def __init__(self) -> None:
        self.nodes: list[WorkflowNode] = []
        self.execution_mode = ExecutionMode.SEQUENTIAL
        self.current_node_index = 0
        self.is_running = False
        self.start_time: float | None = None
        self.end_time: float | None = None
        self.results: list[dict[str, Any]] = []

        # 노드 핸들러 등록
        self.node_handlers: dict[NodeType, Callable] = {
            NodeType.CLICK: self._handle_click_node,
            NodeType.MOVE: self._handle_move_node,
            NodeType.COLLECT: self._handle_collect_node,
            NodeType.BATTLE: self._handle_battle_node,
            NodeType.NAVIGATE: self._handle_navigate_node,
            NodeType.WAIT: self._handle_wait_node,
            NodeType.CONDITION: self._handle_condition_node,
            NodeType.LOOP: self._handle_loop_node,
            NodeType.CUSTOM: self._handle_custom_node,
        }

    def add_node(self, node: WorkflowNode) -> None:
        """노드를 추가합니다."""
        self.nodes.append(node)

    def add_nodes_from_dict(self, nodes_data: list[dict[str, Any]]) -> None:
        """딕셔너리 리스트에서 노드들을 추가합니다."""
        for node_data in nodes_data:
            node = WorkflowNode(
                node_id=node_data.get("id", f"node_{len(self.nodes)}"),
                node_type=NodeType(node_data.get("type", "click")),
                data=node_data.get("data", {}),
            )
            self.add_node(node)

    def set_execution_mode(self, mode: ExecutionMode) -> None:
        """실행 모드를 설정합니다."""
        self.execution_mode = mode

    async def execute_workflow(self) -> dict[str, Any]:
        """워크플로우를 실행합니다."""
        self.is_running = True
        self.start_time = time.time()
        self.current_node_index = 0
        self.results = []

        try:
            if self.execution_mode == ExecutionMode.SEQUENTIAL:
                await self._execute_sequential()
            elif self.execution_mode == ExecutionMode.PARALLEL:
                await self._execute_parallel()
            elif self.execution_mode == ExecutionMode.CONDITIONAL:
                await self._execute_conditional()

            self.end_time = time.time()
            return self._get_execution_summary()

        except Exception as e:
            self.end_time = time.time()
            return {
                "success": False,
                "error": str(e),
                "execution_time": self.end_time - self.start_time,
                "results": self.results,
            }
        finally:
            self.is_running = False

    async def _execute_sequential(self) -> None:
        """순차 실행"""
        for i, node in enumerate(self.nodes):
            self.current_node_index = i
            result = await self._execute_node(node)
            self.results.append(result)

            # 실패한 경우 중단 여부 확인
            if node.status == NodeStatus.FAILED and node.data.get("stop_on_failure", True):
                break

    async def _execute_parallel(self) -> None:
        """병렬 실행"""
        tasks = []
        for node in self.nodes:
            task = asyncio.create_task(self._execute_node(node))
            tasks.append(task)

        results = await asyncio.gather(*tasks, return_exceptions=True)

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                self.nodes[i].status = NodeStatus.FAILED
                self.nodes[i].error_message = str(result)
                self.results.append(self.nodes[i].to_dict())
            elif isinstance(result, dict):
                self.results.append(result)

    async def _execute_conditional(self) -> None:
        """조건부 실행"""
        for i, node in enumerate(self.nodes):
            self.current_node_index = i

            # 조건 노드인 경우 조건 확인
            if node.type == NodeType.CONDITION:
                condition_result = await self._evaluate_condition(node)
                if not condition_result:
                    node.status = NodeStatus.SKIPPED
                    self.results.append(node.to_dict())
                    continue

            result = await self._execute_node(node)
            self.results.append(result)

    async def _execute_node(self, node: WorkflowNode) -> dict[str, Any]:
        """개별 노드를 실행합니다."""
        node.status = NodeStatus.RUNNING
        node.start_time = time.time()

        try:
            handler = self.node_handlers.get(node.type)
            if not handler:
                raise ValueError(f"지원하지 않는 노드 타입: {node.type}")

            result = await handler(node)
            node.status = NodeStatus.COMPLETED
            node.result = result

        except Exception as e:
            node.status = NodeStatus.FAILED
            node.error_message = str(e)
            result = {"error": str(e)}

        finally:
            node.end_time = time.time()

        return node.to_dict()

    async def _handle_click_node(self, node: WorkflowNode) -> dict[str, Any]:
        """클릭 노드 처리"""
        x = node.data.get("x", 0)
        y = node.data.get("y", 0)
        button = node.data.get("button", "left")
        clicks = node.data.get("clicks", 1)

        # 실제 클릭 로직 구현
        await asyncio.sleep(0.1)  # 시뮬레이션

        return {"action": "click", "coordinates": (x, y), "button": button, "clicks": clicks, "success": True}

    async def _handle_move_node(self, node: WorkflowNode) -> dict[str, Any]:
        """이동 노드 처리"""
        direction = node.data.get("direction", "forward")
        distance = node.data.get("distance", 1)

        await asyncio.sleep(0.5)  # 시뮬레이션

        return {"action": "move", "direction": direction, "distance": distance, "success": True}

    async def _handle_collect_node(self, node: WorkflowNode) -> dict[str, Any]:
        """수집 노드 처리"""
        item_type = node.data.get("item_type", "unknown")

        await asyncio.sleep(0.3)  # 시뮬레이션

        return {"action": "collect", "item_type": item_type, "success": True}

    async def _handle_battle_node(self, node: WorkflowNode) -> dict[str, Any]:
        """전투 노드 처리"""
        enemy_type = node.data.get("enemy_type", "unknown")
        strategy = node.data.get("strategy", "auto")

        await asyncio.sleep(2.0)  # 시뮬레이션

        return {"action": "battle", "enemy_type": enemy_type, "strategy": strategy, "success": True}

    async def _handle_navigate_node(self, node: WorkflowNode) -> dict[str, Any]:
        """네비게이션 노드 처리"""
        destination = node.data.get("destination", "unknown")

        await asyncio.sleep(1.0)  # 시뮬레이션

        return {"action": "navigate", "destination": destination, "success": True}

    async def _handle_wait_node(self, node: WorkflowNode) -> dict[str, Any]:
        """대기 노드 처리"""
        duration = node.data.get("duration", 1.0)

        await asyncio.sleep(duration)

        return {"action": "wait", "duration": duration, "success": True}

    async def _handle_condition_node(self, node: WorkflowNode) -> dict[str, Any]:
        """조건 노드 처리"""
        condition_type = node.data.get("condition_type", "always_true")

        # 조건 평가 로직 구현
        result = await self._evaluate_condition(node)

        return {"action": "condition", "condition_type": condition_type, "result": result, "success": True}

    async def _handle_loop_node(self, node: WorkflowNode) -> dict[str, Any]:
        """루프 노드 처리"""
        loop_count = node.data.get("loop_count", 1)
        loop_nodes = node.data.get("nodes", [])

        results = []
        for i in range(loop_count):
            # 루프 내부 노드들 실행
            for loop_node_data in loop_nodes:
                loop_node = WorkflowNode(
                    node_id=f"{node.id}_loop_{i}_{loop_node_data.get('id', 'unknown')}",
                    node_type=NodeType(loop_node_data.get("type", "click")),
                    data=loop_node_data.get("data", {}),
                )
                result = await self._execute_node(loop_node)
                results.append(result)

        return {"action": "loop", "loop_count": loop_count, "results": results, "success": True}

    async def _handle_custom_node(self, node: WorkflowNode) -> dict[str, Any]:
        """커스텀 노드 처리"""
        custom_action = node.data.get("custom_action", "unknown")

        # 커스텀 액션 로직 구현
        await asyncio.sleep(0.5)  # 시뮬레이션

        return {"action": "custom", "custom_action": custom_action, "success": True}

    async def _evaluate_condition(self, node: WorkflowNode) -> bool:
        """조건을 평가합니다."""
        condition_type = node.data.get("condition_type", "always_true")

        if condition_type == "always_true":
            return True
        if condition_type == "always_false":
            return False
        if condition_type == "random":
            import random

            return random.choice([True, False])

        return True

    def _get_execution_summary(self) -> dict[str, Any]:
        """실행 요약을 반환합니다."""
        total_nodes = len(self.nodes)
        completed_nodes = len([n for n in self.nodes if n.status == NodeStatus.COMPLETED])
        failed_nodes = len([n for n in self.nodes if n.status == NodeStatus.FAILED])
        skipped_nodes = len([n for n in self.nodes if n.status == NodeStatus.SKIPPED])

        execution_time = self.end_time - self.start_time if self.end_time and self.start_time else 0

        return {
            "success": failed_nodes == 0,
            "execution_time": execution_time,
            "total_nodes": total_nodes,
            "completed_nodes": completed_nodes,
            "failed_nodes": failed_nodes,
            "skipped_nodes": skipped_nodes,
            "success_rate": (completed_nodes / total_nodes * 100) if total_nodes > 0 else 0,
            "results": self.results,
        }

    def stop_execution(self) -> None:
        """실행을 중지합니다."""
        self.is_running = False

    def get_current_status(self) -> dict[str, Any]:
        """현재 상태를 반환합니다."""
        return {
            "is_running": self.is_running,
            "current_node_index": self.current_node_index,
            "total_nodes": len(self.nodes),
            "execution_mode": self.execution_mode.value,
            "start_time": self.start_time,
            "current_time": time.time(),
        }
