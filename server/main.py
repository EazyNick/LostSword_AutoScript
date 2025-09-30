from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
import os
from api import action_router, script_router, game_router

# cd server
# python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000

app = FastAPI(
    title="로스트소드 자동화 API",
    description="로스트소드 게임 자동화를 위한 API 서버",
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

# 정적 파일 서빙 설정 (개발 환경)
ui_path = os.path.join(os.path.dirname(__file__), "..", "UI", "src")
if os.path.exists(ui_path):
    app.mount("/static", StaticFiles(directory=ui_path), name="static")
    print(f"정적 파일 서빙 활성화: {ui_path}")
else:
    print("UI 경로를 찾을 수 없습니다. API만 사용 가능합니다.")

# 기본 라우트 - 웹 UI 제공
@app.get("/")
async def root():
    ui_file = os.path.join(ui_path, "index.html")
    if os.path.exists(ui_file):
        return FileResponse(ui_file)
    return {"message": "로스트소드 자동화 API 서버가 실행 중입니다."}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "lostsword-automation"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
