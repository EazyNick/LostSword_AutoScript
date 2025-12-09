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
    # "action" 노드는 제거되었습니다.
    "image-touch": {
        "label": "이미지 터치 노드",
        "title": "이미지 터치",
        "description": "이미지를 찾아 터치하는 노드입니다.",
        "script": "node-image-touch.js",
        "is_boundary": False,
        "category": "action",
        "requires_folder_path": True,
        # 노드 레벨 파라미터 (모든 상세 타입에 공통으로 사용되는 파라미터)
        "parameters": {
            "folder_path": {
                "type": "string",
                "label": "이미지 폴더 경로",
                "description": "이미지 파일이 있는 폴더 경로를 입력하세요.",
                "default": "",
                "required": True,
                "placeholder": "예: C:\\images\\touch",
            },
            "timeout": {
                "type": "number",
                "label": "타임아웃 (초)",
                "description": "이미지를 찾을 때까지 대기할 최대 시간입니다.",
                "default": 30,
                "min": 1,
                "max": 300,
                "required": False,
            },
        },
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
        # 노드 레벨 파라미터
        "parameters": {
            "wait_time": {
                "type": "number",
                "label": "대기 시간 (초)",
                "description": "대기할 시간을 초 단위로 입력하세요.",
                "default": 1,
                "min": 0,
                "max": 3600,
                "required": True,
            },
        },
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
        # 노드 레벨 파라미터
        "parameters": {
            "condition": {
                "type": "string",
                "label": "조건식",
                "description": "평가할 조건식을 입력하세요. (예: ${variable} > 10)",
                "default": "",
                "required": True,
                "placeholder": "조건식을 입력하세요",
            },
        },
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
    # === 예시 노드: 파일 읽기 ===
    "file-read": {
        "label": "파일 읽기 노드",
        "title": "파일 읽기",
        "description": "파일의 내용을 읽어오는 노드입니다.",
        "script": "node-file-read.js",
        "is_boundary": False,
        "category": "action",
        # 노드 레벨 파라미터
        "parameters": {
            "file_path": {
                "type": "string",
                "label": "파일 경로",
                "description": "읽을 파일의 경로를 입력하세요.",
                "default": "",
                "required": True,
                "placeholder": "예: C:\\data\\file.txt",
            },
            "encoding": {
                "type": "string",
                "label": "인코딩",
                "description": "파일 인코딩을 선택하세요.",
                "default": "utf-8",
                "required": False,
                "options": ["utf-8", "utf-16", "ascii", "latin-1"],
            },
        },
        # 상세 노드 타입 정의
        "detail_types": {},
    },
    # === 예시 노드: 파일 쓰기 ===
    "file-write": {
        "label": "파일 쓰기 노드",
        "title": "파일 쓰기",
        "description": "파일에 내용을 작성하는 노드입니다.",
        "script": "node-file-write.js",
        "is_boundary": False,
        "category": "action",
        # 노드 레벨 파라미터
        "parameters": {
            "file_path": {
                "type": "string",
                "label": "파일 경로",
                "description": "작성할 파일의 경로를 입력하세요.",
                "default": "",
                "required": True,
                "placeholder": "예: C:\\data\\output.txt",
            },
            "content": {
                "type": "string",
                "label": "내용",
                "description": "파일에 작성할 내용을 입력하세요.",
                "default": "",
                "required": True,
                "placeholder": "작성할 내용을 입력하세요",
            },
            "mode": {
                "type": "string",
                "label": "작성 모드",
                "description": "파일 작성 모드를 선택하세요.",
                "default": "write",
                "required": False,
                "options": ["write", "append"],
            },
            "encoding": {
                "type": "string",
                "label": "인코딩",
                "description": "파일 인코딩을 선택하세요.",
                "default": "utf-8",
                "required": False,
                "options": ["utf-8", "utf-16", "ascii", "latin-1"],
            },
        },
        # 상세 노드 타입 정의
        "detail_types": {},
    },
    # === 테스트 노드 (Test Node) ===
    "test": {
        "label": "테스트 노드",
        "title": "테스트",
        "description": "nodes_config.py에만 정의된 테스트 노드입니다.",
        "script": "node-test.js",  # 이 파일은 실제로 존재하지 않아도 됨
        "is_boundary": False,
        "category": "action",
        "parameters": {
            "test_value": {
                "type": "string",
                "label": "테스트 값",
                "description": "테스트용 값을 입력하세요.",
                "default": "기본값",
                "required": True,
                "placeholder": "테스트 값을 입력하세요",
            },
            "test_number": {
                "type": "number",
                "label": "테스트 숫자",
                "description": "테스트용 숫자를 입력하세요.",
                "default": 10,
                "required": False,
                "min": 0,
                "max": 100,
            },
            "test_boolean": {
                "type": "boolean",
                "label": "테스트 옵션",
                "description": "테스트용 옵션입니다.",
                "default": True,
                "required": False,
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
