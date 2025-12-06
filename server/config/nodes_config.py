"""
노드 설정 파일

서버에서 관리하는 모든 노드의 메타데이터를 정의합니다.
클라이언트는 이 설정을 API를 통해 가져와서 사용합니다.
"""

from typing import Any

# 노드 타입 정의
NODES_CONFIG: dict[str, dict[str, Any]] = {
    # === 경계 노드 (Boundary Nodes) ===
    "start": {
        "label": "시작 노드",
        "title": "시작",
        "description": "워크플로우의 시작점입니다.",
        "script": "node-start.js",
        "is_boundary": True,
        "category": "system",
    },
    "end": {
        "label": "종료 노드",
        "title": "종료",
        "description": "워크플로우의 종료점입니다.",
        "script": "node-end.js",
        "is_boundary": True,
        "category": "system",
    },
    # === 액션 노드 (Action Nodes) ===
    "action": {
        "label": "액션 노드",
        "title": "액션 노드",
        "description": "액션을 수행하는 노드입니다.",
        "script": "node-action.js",  # 클라이언트에서 로드할 JavaScript 파일명 (UI/src/js/components/node/node-action.js)
        "is_boundary": False,
        "category": "action",
    },
    "click": {
        "label": "클릭 노드",
        "title": "클릭",
        "description": "화면의 특정 위치를 클릭하는 노드입니다.",
        "script": "node-action.js",  # node-click.js가 없으므로 node-action.js 사용
        "is_boundary": False,
        "category": "action",
    },
    "image-touch": {
        "label": "이미지 터치 노드",
        "title": "이미지 터치",
        "description": "이미지를 찾아 터치하는 노드입니다.",
        "script": "node-image-touch.js",
        "is_boundary": False,
        "category": "action",
        "requires_folder_path": True,
    },
    "wait": {
        "label": "대기 노드",
        "title": "대기 노드",
        "description": "일정 시간 대기하는 노드입니다.",
        "script": "node-wait.js",
        "is_boundary": False,
        "category": "action",
    },
    "process-focus": {
        "label": "화면 포커스",
        "title": "화면 포커스",
        "description": "선택한 프로세스의 창을 화면 최상단에 포커스합니다.",
        "script": "node-process-focus.js",
        "is_boundary": False,
        "category": "action",
    },
    "battle": {
        "label": "전투 노드",
        "title": "전투",
        "description": "전투 관련 액션을 수행하는 노드입니다.",
        "script": "node-action.js",  # node-battle.js가 없으므로 node-action.js 사용
        "is_boundary": False,
        "category": "action",
    },
    "collect": {
        "label": "수집 노드",
        "title": "수집",
        "description": "아이템 수집 관련 액션을 수행하는 노드입니다.",
        "script": "node-action.js",  # node-collect.js가 없으므로 node-action.js 사용
        "is_boundary": False,
        "category": "action",
    },
    "move": {
        "label": "이동 노드",
        "title": "이동",
        "description": "캐릭터 이동 관련 액션을 수행하는 노드입니다.",
        "script": "node-action.js",  # node-move.js가 없으므로 node-action.js 사용
        "is_boundary": False,
        "category": "action",
    },
    "navigate": {
        "label": "네비게이션 노드",
        "title": "네비게이션",
        "description": "네비게이션 관련 액션을 수행하는 노드입니다.",
        "script": "node-action.js",  # node-navigate.js가 없으므로 node-action.js 사용
        "is_boundary": False,
        "category": "action",
    },
    "http-api-request": {
        "label": "HTTP API 요청",
        "title": "HTTP API 요청",
        "description": "외부 API에 HTTP 요청을 보내는 노드입니다.",
        "script": "node-action.js",  # node-http-api-request.js가 없으므로 node-action.js 사용
        "is_boundary": False,
        "category": "action",
    },
    # === 로직 노드 (Logic Nodes) ===
    "condition": {
        "label": "조건 노드",
        "title": "조건 노드",
        "description": "조건을 확인하는 노드입니다.",
        "script": "node-condition.js",
        "is_boundary": False,
        "category": "logic",
    },
    "loop": {
        "label": "반복 노드",
        "title": "반복 노드",
        "description": "반복 작업을 수행하는 노드입니다.",
        "script": "node-loop.js",
        "is_boundary": False,
        "category": "logic",
    },
}


def get_node_config(node_type: str) -> dict[str, Any] | None:
    """노드 설정 가져오기"""
    return NODES_CONFIG.get(node_type)


def get_all_node_types() -> list[str]:
    """모든 노드 타입 목록 가져오기"""
    return list(NODES_CONFIG.keys())


def get_action_node_types() -> list[str]:
    """액션 노드 타입 목록 가져오기 (검증용)"""
    return [
        node_type
        for node_type, config in NODES_CONFIG.items()
        if config.get("category") == "action" and not config.get("is_boundary", False)
    ]


def is_boundary_node(node_type: str) -> bool:
    """경계 노드인지 확인"""
    config = get_node_config(node_type)
    return config.get("is_boundary", False) if config else False


def get_node_label(node_type: str) -> str:
    """노드 라벨 가져오기"""
    config = get_node_config(node_type)
    return config.get("label", node_type) if config else node_type
