"""
노드 모듈
다양한 노드 타입의 기능을 모아둔 폴더입니다.

새로운 노드를 추가할 때:
1. 적절한 서브모듈 폴더에 노드 클래스를 생성하세요 (예: actionnodes/, waitnodes/ 등)
2. 끝! 모든 것이 자동으로 감지되고 등록됩니다.
   - 서브모듈의 __init__.py는 자동으로 노드를 감지하여 로드합니다
   - 이 파일(nodes/__init__.py)은 자동으로 모든 노드를 감지하여 export합니다
   - action_service.py는 자동으로 모든 노드 핸들러를 등록합니다
"""

import importlib
import pkgutil
from typing import Any

# NodeExecutor는 노드가 아니므로 별도로 import
from .node_executor_wrapper import NodeExecutor

# 자동으로 모든 서브모듈에서 노드들을 import
_imported_nodes: dict[str, Any] = {}
_current_package = __package__ or "server.nodes"

# 현재 패키지의 모든 서브모듈을 순회
# 타입 스텁 문제: pkgutil.iter_modules의 타입 스텁(type stub)이 완벽하지 않아 mypy가 타입 체크 시 에러를 발생시킵니다.
# 타입 스텁은 Python의 타입 힌팅을 위한 .pyi 파일로, 표준 라이브러리 함수의 타입 정보를 제공합니다.
# 이 경우 실제 코드는 정상 동작하지만, 타입 체커가 반환값의 타입을 정확히 추론하지 못합니다.
# 따라서 pyproject.toml의 disable_error_code에 "assignment"를 추가하여 전역적으로 무시하도록 설정했습니다.
for _, module_name, _ in pkgutil.iter_modules(__path__, f"{_current_package}."):
    try:
        # 서브모듈 import (예: server.nodes.actionnodes)
        module = importlib.import_module(module_name)

        # __all__이 있으면 그 안의 모든 항목을 import
        if hasattr(module, "__all__"):
            for item_name in module.__all__:
                if hasattr(module, item_name):
                    item = getattr(module, item_name)
                    _imported_nodes[item_name] = item
                    # 전역 네임스페이스에 추가하여 from nodes import NodeName 형태로 사용 가능하게 함
                    globals()[item_name] = item
    except Exception as e:
        # 특정 모듈 import 실패 시 경고만 출력하고 계속 진행
        import warnings

        # stacklevel=2: 경고 메시지의 스택 트레이스 위치를 조정합니다.
        # - stacklevel=1 (기본값): warnings.warn이 호출된 위치(__init__.py의 이 줄)를 가리킴
        # - stacklevel=2: warnings.warn을 호출한 상위 레벨(이 루프를 실행한 코드)을 가리킴
        #   이렇게 하면 경고가 실제로 문제가 발생한 모듈 로드 위치를 정확히 표시합니다.
        warnings.warn(f"노드 모듈 '{module_name}' 로드 실패: {e}", ImportWarning, stacklevel=2)

# __all__에 NodeExecutor와 자동으로 발견된 모든 노드들을 포함
__all__ = ["NodeExecutor", *sorted(_imported_nodes.keys())]
