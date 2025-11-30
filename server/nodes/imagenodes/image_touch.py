"""
이미지 터치 노드
화면에서 이미지를 찾아 터치하는 노드입니다.
"""

import os
from typing import Dict, Any
from automation.screen_capture import ScreenCapture
from automation.input_handler import InputHandler
from log import log_manager

logger = log_manager.logger


class ImageTouchNode:
    """이미지 터치 노드 클래스"""
    
    @staticmethod
    async def execute(parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        화면에서 이미지를 찾아 터치합니다.
        
        Args:
            parameters: 노드 파라미터
                - folder_path: 이미지 폴더 경로 (필수)
        
        Returns:
            실행 결과 딕셔너리
        """
        if parameters is None:
            parameters = {}
        
        folder_path = parameters.get("folder_path", "")
        if not folder_path:
            # 폴더 경로가 없으면 실패로 반환
            return {
                "action": "image-touch",
                "status": "failed",
                "message": "폴더 경로가 제공되지 않았습니다.",
                "output": {
                    "success": False,
                    "reason": "no_folder"
                }
            }
        
        if not os.path.exists(folder_path):
            raise ValueError(f"폴더를 찾을 수 없습니다: {folder_path}")
        
        # 지원하는 이미지 확장자
        image_extensions = {'.png', '.jpg', '.jpeg', '.bmp', '.gif', '.tiff', '.webp'}
        
        # 이미지 파일 목록 가져오기 (이름 순서대로)
        image_files = []
        for filename in os.listdir(folder_path):
            file_path = os.path.join(folder_path, filename)
            if os.path.isfile(file_path):
                _, ext = os.path.splitext(filename.lower())
                if ext in image_extensions:
                    image_files.append(file_path)
        
        # 파일 이름 순서대로 정렬
        image_files.sort()
        
        if not image_files:
            return {
                "action": "image-touch",
                "status": "failed",
                "message": "이미지 파일이 없습니다.",
                "output": {
                    "success": False,
                    "reason": "no_images"
                }
            }
        
        # 화면 캡처 및 입력 핸들러 초기화
        screen_capture = ScreenCapture()
        input_handler = InputHandler()
        
        results = []
        for i, image_path in enumerate(image_files):
            try:
                logger.debug(f"이미지 찾기 시도 {i+1}/{len(image_files)}: {os.path.basename(image_path)}")
                
                # 이미지 찾기 (threshold를 0.7로 낮춤, 필요시 더 낮출 수 있음)
                location = screen_capture.find_template(image_path, threshold=0.7)
                
                if location:
                    x, y, w, h = location
                    # 이미지 중심점 클릭
                    center_x = x + w // 2
                    center_y = y + h // 2
                    
                    logger.debug(f"이미지 찾기 성공! 클릭 위치: ({center_x}, {center_y})")
                    
                    # 터치 (클릭)
                    success = input_handler.click(center_x, center_y)
                    
                    results.append({
                        "image": os.path.basename(image_path),
                        "found": True,
                        "position": (center_x, center_y),
                        "touched": success
                    })
                else:
                    logger.debug(f"이미지 찾기 실패: {os.path.basename(image_path)}")
                    results.append({
                        "image": os.path.basename(image_path),
                        "found": False,
                        "message": "화면에서 이미지를 찾을 수 없습니다."
                    })
                    
            except Exception as e:
                logger.error(f"이미지 처리 중 오류 발생 ({os.path.basename(image_path)}): {e}")
                import traceback
                logger.error(f"스택 트레이스: {traceback.format_exc()}")
                results.append({
                    "image": os.path.basename(image_path),
                    "error": str(e)
                })
        
        # 성공 여부 판단: 하나라도 이미지를 찾아서 터치했으면 성공
        success = any(r.get("found", False) and r.get("touched", False) for r in results)
        
        return {
            "action": "image-touch",
            "status": "completed" if success else "failed",
            "output": {
                "success": success,
                "folder_path": folder_path,
                "total_images": len(image_files),
                "results": results
            }
        }

