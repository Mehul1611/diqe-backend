import logging
import os
import shutil
from functools import lru_cache
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client, create_client

from backend.auth import get_current_user
from backend.schemas import ModelCardCreate, ModelCardResponse, ModelCardUpdate
from backend.storage import StorageService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/user/models", tags=["models"])

REPO_ROOT = Path(__file__).resolve().parents[2]


@lru_cache(maxsize=1)
def _get_supabase() -> Client:
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    return create_client(url, key)


@router.get("", response_model=list[ModelCardResponse])
async def list_models(user_id: str = Depends(get_current_user)):
    try:
        sb = _get_supabase()
        result = (
            sb.table("model_cards")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data or []
    except Exception as exc:
        logger.error("Failed to list models for user %s: %s", user_id, exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("", response_model=ModelCardResponse, status_code=status.HTTP_201_CREATED)
async def create_model(body: ModelCardCreate, user_id: str = Depends(get_current_user)):
    try:
        sb = _get_supabase()
        model_id = str(uuid4())
        payload = {
            "id": model_id,
            "user_id": user_id,
            "name": body.name,
            "description": body.description,
            "doc_count": 0,
            "status": "pending",
        }
        result = sb.table("model_cards").insert(payload).execute()
        logger.info("Created model card %s for user %s", model_id, user_id)
        return result.data[0]
    except Exception as exc:
        logger.error("Failed to create model for user %s: %s", user_id, exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.patch("/{model_id}", response_model=ModelCardResponse)
async def update_model(
    model_id: str,
    body: ModelCardUpdate,
    user_id: str = Depends(get_current_user),
):
    try:
        sb = _get_supabase()
        allowed_fields = ("name", "description", "doc_count", "status")
        updates = {
            k: v
            for k, v in body.model_dump(exclude_none=True).items()
            if k in allowed_fields
        }
        if not updates:
            raise HTTPException(status_code=400, detail="No valid fields to update")

        result = (
            sb.table("model_cards")
            .update(updates)
            .eq("id", model_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Model not found")
        logger.info("Updated model card %s: %s", model_id, updates)
        return result.data[0]
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to update model %s: %s", model_id, exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_model(model_id: str, user_id: str = Depends(get_current_user)):
    try:
        sb = _get_supabase()

        check = (
            sb.table("model_cards")
            .select("id")
            .eq("id", model_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not check.data:
            raise HTTPException(status_code=404, detail="Model not found")

        storage = StorageService(user_id)
        storage.delete_model(model_id)

        for base in ("models", "output"):
            local_path = REPO_ROOT / base / user_id / model_id
            if local_path.exists():
                shutil.rmtree(local_path)
                logger.info("Deleted local cache: %s", local_path)

        sb.table("model_cards").delete().eq("id", model_id).eq("user_id", user_id).execute()
        logger.info("Deleted model card %s for user %s", model_id, user_id)

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to delete model %s: %s", model_id, exc)
        raise HTTPException(status_code=500, detail=str(exc))
