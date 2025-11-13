from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
import uvicorn
import os
import re
from api import action_router, script_router, game_router, node_router
from log import log_manager 

# cd server
# python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000

# .env 파일 읽기
def load_env():
    """프로젝트 루트의 .env 파일에서 환경 변수 로드"""
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    env_vars = {}
    
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
    
    return env_vars

# 환경 변수 로드
env_vars = load_env()
DEV_MODE = env_vars.get('DEV', 'false').lower() == 'true'

# 로거 초기화 (싱글톤 패턴)
logger = log_manager.logger
logger.info("=" * 60)
logger.info("서버 시작")
logger.info(f"개발 모드: {DEV_MODE}")

app = FastAPI(
    title="자동화 도구",
    description="자동화를 위한 API 서버",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 환경에서는 모든 오리진 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록
app.include_router(action_router)
app.include_router(script_router)
app.include_router(game_router)
app.include_router(node_router)

# 정적 파일 서빙 설정 (개발 환경)
ui_path = os.path.join(os.path.dirname(__file__), "..", "UI", "src")
if os.path.exists(ui_path):
    app.mount("/static", StaticFiles(directory=ui_path), name="static")
    logger.info(f"정적 파일 서빙 활성화: {ui_path}")
else:
    logger.warning("UI 경로를 찾을 수 없습니다. API만 사용 가능합니다.")

# 기본 라우트 - 웹 UI 제공
@app.get("/")
async def root():
    ui_file = os.path.join(ui_path, "index.html")
    if os.path.exists(ui_file):
        return FileResponse(ui_file)
    return {"message": "로스트소드 자동화 API 서버가 실행 중입니다."}

# HTML 파일에 환경 변수 주입하는 헬퍼 함수
def inject_env_to_html(html_content: str) -> str:
    """HTML 내용에 환경 변수를 주입"""
    # <head> 태그 안에 스크립트 추가
    script_tag = f'''
    <script>
        // 환경 변수 주입 (.env 파일에서 읽은 값)
        window.DEV_MODE = {str(DEV_MODE).lower()};
    </script>
    '''
    
    # </head> 태그 앞에 스크립트 삽입
    if '</head>' in html_content:
        html_content = html_content.replace('</head>', script_tag + '</head>')
    elif '<head>' in html_content:
        html_content = html_content.replace('<head>', '<head>' + script_tag)
    else:
        # head 태그가 없으면 body 앞에 추가
        html_content = html_content.replace('<body>', script_tag + '<body>')
    
    return html_content

# 워크플로우 페이지 라우트
@app.get("/workflow")
async def workflow_page():
    """워크플로우 페이지 제공 (환경 변수 주입)"""
    html_file = os.path.join(ui_path, "pages", "workflow", "workflow.html")
    if os.path.exists(html_file):
        with open(html_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
        html_content = inject_env_to_html(html_content)
        return HTMLResponse(content=html_content)
    return {"error": "워크플로우 페이지를 찾을 수 없습니다."}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "lostsword-automation"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
