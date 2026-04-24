from fastapi import FastAPI, APIRouter, HTTPException, Response, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import csv
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# Health check at root for production Kubernetes probes
@app.get("/")
async def health_check():
    return {"status": "ok"}


class ISARVGDetails(BaseModel):
    city_tier: str = ""
    rate_per_unit: float = 0
    surgical_complexity: str = ""
    base_units: int = 0
    duration_minutes: int = 0
    time_units: int = 0
    asa_status: bool = False
    asa_units: int = 0
    emergency: bool = False
    case_cancelled: bool = False
    total_units: int = 0
    base_fee: float = 0
    final_fee: float = 0


class DoctorProfile(BaseModel):
    name: str = ""
    degree: str = ""
    registration_no: str = ""
    designation: str = "Consultant Anaesthesiologist"
    city: str = ""
    signature_base64: str = ""


class NameItem(BaseModel):
    name: str


class CaseCreate(BaseModel):
    patient_name: str
    age: int = 0
    gender: str = "Male"
    surgery_name: str
    surgeon_name: str = ""
    hospital: str = ""
    date: str = ""
    anaesthesia_type: str = "General"
    anaesthesia_fees: float = 0
    notes: str = ""
    payment_status: str = "pending"
    mode_of_payment: str = "Cash"
    isa_rvg_details: Optional[ISARVGDetails] = None


class CaseResponse(BaseModel):
    id: str
    patient_name: str
    age: int
    gender: str
    surgery_name: str
    surgeon_name: str
    hospital: str
    date: str
    anaesthesia_type: str
    anaesthesia_fees: float
    notes: str
    payment_status: str = "pending"
    mode_of_payment: str = "Cash"
    receipt_no: str = ""
    isa_rvg_details: Optional[ISARVGDetails] = None
    created_at: str


class PaymentStatusUpdate(BaseModel):
    payment_status: str


# Doctor Profile
@api_router.get("/doctor-profile")
async def get_doctor_profile():
    profile = await db.doctor_profile.find_one({}, {"_id": 0})
    if not profile:
        return {"name": "", "degree": "", "registration_no": "", "designation": "Consultant Anaesthesiologist", "city": "", "signature_base64": ""}
    return profile


@api_router.put("/doctor-profile")
async def save_doctor_profile(profile: DoctorProfile):
    d = profile.dict()
    await db.doctor_profile.update_one({}, {"$set": d}, upsert=True)
    return d


# Hospitals CRUD
@api_router.get("/hospitals")
async def get_hospitals():
    items = await db.hospitals.find({}, {"_id": 0}).sort("name", 1).to_list(500)
    return items


@api_router.post("/hospitals")
async def add_hospital(item: NameItem):
    doc = {"id": str(uuid.uuid4()), "name": item.name.strip()}
    await db.hospitals.insert_one(doc)
    return {"id": doc["id"], "name": doc["name"]}


@api_router.delete("/hospitals/{item_id}")
async def delete_hospital(item_id: str):
    result = await db.hospitals.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Deleted"}


# Surgeons CRUD
@api_router.get("/surgeons")
async def get_surgeons():
    items = await db.surgeons.find({}, {"_id": 0}).sort("name", 1).to_list(500)
    return items


@api_router.post("/surgeons")
async def add_surgeon(item: NameItem):
    doc = {"id": str(uuid.uuid4()), "name": item.name.strip()}
    await db.surgeons.insert_one(doc)
    return {"id": doc["id"], "name": doc["name"]}


@api_router.delete("/surgeons/{item_id}")
async def delete_surgeon(item_id: str):
    result = await db.surgeons.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Deleted"}


@api_router.get("/")
async def root():
    return {"message": "Standard Fee Calculator API"}


@api_router.post("/cases", response_model=CaseResponse)
async def create_case(case_input: CaseCreate):
    case_dict = case_input.dict()
    case_dict["id"] = str(uuid.uuid4())
    case_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    now = datetime.now(timezone.utc)
    count = await db.cases.count_documents({})
    case_dict["receipt_no"] = f"REC-{now.strftime('%d%m')}-{count + 1:03d}"
    await db.cases.insert_one(case_dict)
    return CaseResponse(**{k: v for k, v in case_dict.items() if k != "_id"})


def _filter_cases_by_period(cases, period, year, quarter):
    if period == "quarterly" and year > 0 and 1 <= quarter <= 4:
        q_start = (quarter - 1) * 3 + 1
        q_end = quarter * 3
        filtered = []
        for c in cases:
            try:
                parts = c.get("date", "").split("/")
                if len(parts) == 3:
                    m, y = int(parts[1]), int(parts[2])
                    if y == year and q_start <= m <= q_end:
                        filtered.append(c)
            except (ValueError, IndexError):
                continue
        return filtered
    elif period == "yearly" and year > 0:
        filtered = []
        for c in cases:
            try:
                parts = c.get("date", "").split("/")
                if len(parts) == 3 and int(parts[2]) == year:
                    filtered.append(c)
            except (ValueError, IndexError):
                continue
        return filtered
    return cases


@api_router.get("/cases/export/csv")
async def export_cases_csv(
    period: str = Query("all"),
    year: int = Query(0),
    quarter: int = Query(0),
):
    cases = await db.cases.find({}, {"_id": 0}).sort("created_at", -1).to_list(10000)
    cases = _filter_cases_by_period(cases, period, year, quarter)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Receipt No", "Date", "Patient Name", "Age", "Gender", "Surgery",
        "Surgeon", "Hospital", "Anaesthesia Type", "Fees",
        "Payment Status", "Mode of Payment", "Notes"
    ])
    for c in cases:
        writer.writerow([
            c.get("receipt_no", ""), c.get("date", ""),
            c.get("patient_name", ""), c.get("age", ""),
            c.get("gender", ""), c.get("surgery_name", ""),
            c.get("surgeon_name", ""), c.get("hospital", ""),
            c.get("anaesthesia_type", ""), c.get("anaesthesia_fees", ""),
            c.get("payment_status", "pending"), c.get("mode_of_payment", "Cash"),
            c.get("notes", "")
        ])

    label = "all"
    if period == "quarterly":
        label = f"Q{quarter}_{year}"
    elif period == "yearly":
        label = str(year)

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=cases_{label}.csv"}
    )


@api_router.get("/cases", response_model=List[CaseResponse])
async def get_cases():
    cases = await db.cases.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [CaseResponse(**c) for c in cases]


@api_router.get("/cases/{case_id}", response_model=CaseResponse)
async def get_case(case_id: str):
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return CaseResponse(**case)


@api_router.delete("/cases/{case_id}")
async def delete_case(case_id: str):
    result = await db.cases.delete_one({"id": case_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    return {"message": "Case deleted"}


@api_router.patch("/cases/{case_id}/payment-status")
async def update_payment_status(case_id: str, update: PaymentStatusUpdate):
    if update.payment_status not in ["paid", "pending"]:
        raise HTTPException(status_code=400, detail="Status must be 'paid' or 'pending'")
    result = await db.cases.update_one(
        {"id": case_id}, {"$set": {"payment_status": update.payment_status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    return {"message": "Status updated", "payment_status": update.payment_status}


@api_router.get("/analytics")
async def get_analytics():
    cases = await db.cases.find({}, {"_id": 0}).to_list(10000)
    now = datetime.now(timezone.utc)
    current_month = now.month
    current_year = now.year
    monthly = {}
    for c in cases:
        try:
            parts = c.get("date", "").split("/")
            if len(parts) == 3:
                month, year = int(parts[1]), int(parts[2])
            else:
                continue
        except (ValueError, IndexError):
            continue
        key = f"{year}-{month:02d}"
        if key not in monthly:
            monthly[key] = {"month": key, "total_cases": 0, "total_fees": 0, "received": 0, "pending": 0}
        fees = c.get("anaesthesia_fees", 0)
        status = c.get("payment_status", "pending")
        monthly[key]["total_cases"] += 1
        monthly[key]["total_fees"] += fees
        if status == "paid":
            monthly[key]["received"] += fees
        else:
            monthly[key]["pending"] += fees
    cm_key = f"{current_year}-{current_month:02d}"
    current_month_stats = monthly.get(cm_key, {"month": cm_key, "total_cases": 0, "total_fees": 0, "received": 0, "pending": 0})
    year_stats = {"total_cases": 0, "total_fees": 0, "received": 0, "pending": 0}
    for key, val in monthly.items():
        if key.startswith(str(current_year)):
            for f in ["total_cases", "total_fees", "received", "pending"]:
                year_stats[f] += val[f]
    sorted_monthly = sorted(monthly.values(), key=lambda x: x["month"], reverse=True)
    return {
        "current_month": current_month_stats,
        "current_year": year_stats,
        "monthly_breakdown": sorted_monthly,
    }


@api_router.delete("/reset-all-data")
async def reset_all_data():
    r1 = await db.cases.delete_many({})
    r2 = await db.doctor_profile.delete_many({})
    r3 = await db.hospitals.delete_many({})
    r4 = await db.surgeons.delete_many({})
    return {
        "message": "All data cleared",
        "deleted": {
            "cases": r1.deleted_count,
            "profiles": r2.deleted_count,
            "hospitals": r3.deleted_count,
            "surgeons": r4.deleted_count,
        }
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
