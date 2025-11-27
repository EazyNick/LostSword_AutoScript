from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
import uvicorn
import os
import re
from api import action_router, script_router, game_router, node_router, config_router
from log import log_manager
from db.database import db_manager 

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
logger.info(f"환경 변수: {env_vars}")
if 'DEV' in env_vars:
    logger.info(f"DEV 환경 변수 값: '{env_vars['DEV']}' (타입: {type(env_vars['DEV'])})")
else:
    logger.warning("⚠️ .env 파일에 DEV 변수가 없습니다. 기본값 'false' 사용")

# 데이터베이스 초기화 및 기본 데이터 생성
def initialize_database():
    """데이터베이스가 없으면 생성하고 기본 데이터 삽입"""
    db_path = db_manager.connection.db_path
    
    # 데이터베이스 파일이 존재하는지 확인
    if not os.path.exists(db_path):
        logger.info(f"데이터베이스 파일이 없습니다. 생성 중... ({db_path})")
        try:
            # 데이터베이스 초기화 (테이블 생성)
            db_manager.init_database()
            logger.info("✅ 데이터베이스 테이블 생성 완료")
            
            # 기본 데이터 삽입 (logger 전달)
            db_manager.seed_example_data(logger=logger)
            logger.info("✅ 기본 데이터 삽입 완료")
        except Exception as e:
            logger.error(f"❌ 데이터베이스 초기화 실패: {e}")
            raise e
    else:
        logger.info(f"기존 데이터베이스 파일 발견: {db_path}")
        # 기존 데이터베이스는 그대로 사용 (마이그레이션은 자동으로 처리됨)

app = FastAPI(
    title="자동화 도구",
    description="자동화를 위한 API 서버",
    version="1.0.0"
)

# 서버 시작 시 데이터베이스 초기화
@app.on_event("startup")
async def startup_event():
    """서버 시작 시 실행되는 이벤트 핸들러"""
    logger.info("서버 시작 이벤트 실행 중...")
    initialize_database()
    logger.info("서버 시작 이벤트 완료")

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
app.include_router(config_router)

# 정적 파일 서빙 설정 (개발 환경)
ui_path = os.path.join(os.path.dirname(__file__), "..", "UI", "src")
if os.path.exists(ui_path):
    app.mount("/static", StaticFiles(directory=ui_path), name="static")
    logger.info(f"정적 파일 서빙 활성화: {ui_path}")
else:
    logger.warning("UI 경로를 찾을 수 없습니다. API만 사용 가능합니다.")

# HTML 파일에 환경 변수 주입하는 헬퍼 함수
def inject_env_to_html(html_content: str) -> str:
    """HTML 내용에 환경 변수를 주입"""
    # <head> 태그 안에 스크립트 추가
    # DEV_MODE를 boolean으로 주입 (true/false)
    dev_mode_value = 'true' if DEV_MODE else 'false'
    script_tag = f'''
    <script>
        // 환경 변수 주입 (.env 파일에서 읽은 값)
        window.DEV_MODE = {dev_mode_value};
        console.log('[Server] DEV_MODE 주입됨:', window.DEV_MODE, '(타입:', typeof window.DEV_MODE, ')');
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
    
    logger.debug(f"HTML에 DEV_MODE 주입 완료: {dev_mode_value}")
    return html_content

# 기본 라우트 - 웹 UI 제공 (환경 변수 주입)
@app.get("/")
async def root():
    ui_file = os.path.join(ui_path, "index.html")
    if os.path.exists(ui_file):
        with open(ui_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
        html_content = inject_env_to_html(html_content)
        return HTMLResponse(content=html_content)
    return {"message": "로스트소드 자동화 API 서버가 실행 중입니다."}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "lostsword-automation"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
