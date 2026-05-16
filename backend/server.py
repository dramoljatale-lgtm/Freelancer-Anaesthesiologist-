from fastapi import FastAPI

app = FastAPI()


@app.get("/")
async def health_check():
    return {"status": "ok"}


@app.get("/api/")
async def api_root():
    return {"message": "FAFT - Offline App. All data stored locally on device."}
