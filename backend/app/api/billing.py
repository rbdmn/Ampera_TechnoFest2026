from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.billing import BillingGenerateRequest, BillingRecordOut
from app.services.billing_service import generate_billing_for_period

router = APIRouter()


@router.post("/generate", response_model=list[BillingRecordOut])
def generate(payload: BillingGenerateRequest, db: Session = Depends(get_db)) -> list[BillingRecordOut]:
    return generate_billing_for_period(db, payload.period)
