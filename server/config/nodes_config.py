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
        # 상세 노드 타입 정의 (대분류 노드 타입 아래에 하위 카테고리 정의)
        "detail_types": {
            "click": {
                "label": "클릭",
                "description": "화면의 특정 위치를 클릭합니다.",
                "icon": "🖱️",
            },
            "collect": {
                "label": "수집",
                "description": "아이템이나 리소스를 수집합니다.",
                "icon": "📦",
            },
            "move": {
                "label": "이동",
                "description": "캐릭터나 오브젝트를 이동시킵니다.",
                "icon": "🚶",
            },
            "http-api-request": {
                "label": "HTTP API 요청",
                "description": "외부 API에 HTTP 요청을 보냅니다.",
                "icon": "🌐",
            },
        },
    },
    "image-touch": {
        "label": "이미지 터치 노드",
        "title": "이미지 터치",
        "description": "이미지를 찾아 터치하는 노드입니다.",
        "script": "node-image-touch.js",
        "is_boundary": False,
        "category": "action",
        "requires_folder_path": True,
        # 상세 노드 타입 정의
        "detail_types": {},
    },
    "wait": {
        "label": "대기 노드",
        "title": "대기 노드",
        "description": "일정 시간 대기하는 노드입니다.",
        "script": "node-wait.js",
        "is_boundary": False,
        "category": "action",
        # 상세 노드 타입 정의
        "detail_types": {},
    },
    "process-focus": {
        "label": "화면 포커스",
        "title": "화면 포커스",
        "description": "선택한 프로세스의 창을 화면 최상단에 포커스합니다.",
        "script": "node-process-focus.js",
        "is_boundary": False,
        "category": "action",
        # 상세 노드 타입 정의
        "detail_types": {},
    },
    # === 로직 노드 (Logic Nodes) ===
    "condition": {
        "label": "조건 노드",
        "title": "조건 노드",
        "description": "조건을 확인하는 노드입니다.",
        "script": "node-condition.js",
        "is_boundary": False,
        "category": "logic",
        # 상세 노드 타입 정의
        "detail_types": {},
    },
    "loop": {
        "label": "반복 노드",
        "title": "반복 노드",
        "description": "노드 블록을 반복 실행하는 노드입니다.",
        "script": "node-loop.js",
        "is_boundary": False,
        "category": "logic",
        # 상세 노드 타입 정의
        "detail_types": {
            "loop-start": {
                "label": "반복 시작",
                "description": "반복 블록의 시작점입니다. 반복 종료 노드까지의 노드들을 반복 실행합니다.",
                "icon": "▶",
                "parameters": {
                    "loop_count": {
                        "type": "number",
                        "label": "반복 횟수",
                        "description": "반복할 횟수를 설정합니다.",
                        "default": 1,
                        "min": 1,
                        "max": 10000,
                        "required": True,
                    }
                },
            },
            "loop-end": {
                "label": "반복 종료",
                "description": "반복 블록의 종료점입니다. 반복 시작 노드로 돌아가 반복을 계속합니다.",
                "icon": "■",
                "parameters": {
                    "loop_count": {
                        "type": "number",
                        "label": "반복 횟수",
                        "description": "반복할 횟수를 설정합니다. (반복 시작 노드와 동일한 값)",
                        "default": 1,
                        "min": 1,
                        "max": 10000,
                        "required": True,
                    }
                },
            },
        },
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
