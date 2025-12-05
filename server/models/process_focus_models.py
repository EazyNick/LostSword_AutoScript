"""
프로세스 포커스 노드 관련 모델들
"""

from pydantic import BaseModel, Field, model_validator


class ProcessFocusParams(BaseModel):
    """프로세스 포커스 파라미터 모델"""

    process_id: int | None = Field(None, ge=1)
    hwnd: int | None = Field(None, ge=1)

    @model_validator(mode="after")
    def validate_at_least_one(self) -> "ProcessFocusParams":
        """process_id 또는 hwnd 중 하나는 필수"""
        if not self.process_id and not self.hwnd:
            raise ValueError("process_id 또는 hwnd 중 하나는 필수입니다")
        return self
