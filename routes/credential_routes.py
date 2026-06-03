import logging
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from core.database import get_db, Credential
from src.auth_helpers import get_current_user

router = APIRouter(prefix="/api/credentials", tags=["credentials"])
logger = logging.getLogger(__name__)

@router.get("")
async def list_credentials(
    owner: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all credentials for the current user. Plaintext values are NOT returned."""
    creds = db.query(Credential).filter(Credential.owner == owner).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None
        }
        for c in creds
    ]

@router.post("")
async def create_credential(
    request: Request,
    owner: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new encrypted credential."""
    data = await request.json()
    name = data.get("name")
    value = data.get("value")
    description = data.get("description", "")

    if not name or not value:
        raise HTTPException(status_code=400, detail="Name and value are required")

    # Check for duplicate name
    existing = db.query(Credential).filter(
        Credential.owner == owner,
        Credential.name == name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Credential '{name}' already exists")

    new_cred = Credential(
        id=uuid.uuid4().hex,
        owner=owner,
        name=name,
        value=value,
        description=description
    )
    db.add(new_cred)
    db.commit()

    return {"id": new_cred.id, "name": new_cred.name}

@router.put("/{cred_id}")
async def update_credential(
    cred_id: str,
    request: Request,
    owner: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing credential. Name and value are optional."""
    data = await request.json()
    cred = db.query(Credential).filter(
        Credential.id == cred_id,
        Credential.owner == owner
    ).first()

    if not cred:
        raise HTTPException(status_code=404, detail="Credential not found")

    if "name" in data:
        # Check for duplicate name if renamed
        new_name = data["name"]
        if new_name != cred.name:
            dup = db.query(Credential).filter(
                Credential.owner == owner,
                Credential.name == new_name
            ).first()
            if dup:
                raise HTTPException(status_code=400, detail=f"Credential '{new_name}' already exists")
        cred.name = new_name

    if "value" in data:
        cred.value = data["value"]

    if "description" in data:
        cred.description = data["description"]

    cred.updated_at = datetime.utcnow()
    db.commit()

    return {"status": "ok"}

@router.delete("/{cred_id}")
async def delete_credential(
    cred_id: str,
    owner: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a credential."""
    cred = db.query(Credential).filter(
        Credential.id == cred_id,
        Credential.owner == owner
    ).first()

    if not cred:
        raise HTTPException(status_code=404, detail="Credential not found")

    db.delete(cred)
    db.commit()

    return {"status": "ok"}
