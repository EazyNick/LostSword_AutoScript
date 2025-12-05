"""
폴더 경로 관련 모델들
이미지 터치 노드 등에서 사용하는 폴더 경로 파라미터 검증 모델
"""

import os

from pydantic import BaseModel, Field, field_validator


class FolderPathParams(BaseModel):
    """폴더 경로 파라미터 모델"""

    folder_path: str = Field(..., min_length=1, max_length=500)

    @field_validator("folder_path")
    @classmethod
    def validate_folder_path(cls, v: str) -> str:
        """경로 조작 공격 방지"""
        # 절대 경로만 허용
        if not os.path.isabs(v):
            raise ValueError("절대 경로만 허용됩니다")

        # 위험한 경로 패턴 차단
        dangerous_patterns = ["..", "~", "$HOME", "%USERPROFILE%"]
        normalized_path = os.path.normpath(v)
        for pattern in dangerous_patterns:
            if pattern in v:
                raise ValueError(f"위험한 경로 패턴이 감지되었습니다: {pattern}")

        # 경로 정규화 후 다시 확인 (../ 제거 시도 차단)
        if ".." in normalized_path or normalized_path != os.path.abspath(v):
            raise ValueError("경로 조작 시도가 감지되었습니다")

        # 존재하는 경로인지 확인
        if not os.path.exists(v):
            raise ValueError("경로가 존재하지 않습니다")

        # 디렉토리인지 확인
        if not os.path.isdir(v):
            raise ValueError("경로가 디렉토리가 아닙니다")

        return v
