import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, field_validator

from auth import get_current_user
from supabase_client import get_supabase_client

router = APIRouter(prefix="/api/cases", tags=["Case Management"])


# ============================================================================
# Enums and Pydantic Models
# ============================================================================

class CaseStatus(str, Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    CLOSED = "Closed"


class CasePriority(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class CaseCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Case title (required)")
    description: Optional[str] = Field(None, max_length=2000, description="Optional case description")
    case_type: Optional[str] = Field("General", max_length=100, description="Investigation type or classification")
    status: Optional[CaseStatus] = Field(CaseStatus.OPEN, description="Initial case status")
    priority: Optional[CasePriority] = Field(CasePriority.MEDIUM, description="Case priority level")

    @field_validator("title")
    @classmethod
    def validate_title_not_empty(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Case title cannot be empty or whitespace.")
        return trimmed


class CaseUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255, description="Updated case title")
    description: Optional[str] = Field(None, max_length=2000, description="Updated case description")
    case_type: Optional[str] = Field(None, max_length=100, description="Updated case type")
    status: Optional[CaseStatus] = Field(None, description="Updated status (Open, In Progress, Closed)")
    priority: Optional[CasePriority] = Field(None, description="Updated priority (Low, Medium, High)")

    @field_validator("title")
    @classmethod
    def validate_title_not_empty(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            trimmed = value.strip()
            if not trimmed:
                raise ValueError("Case title cannot be empty or whitespace.")
            return trimmed
        return value


class CaseResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    case_type: Optional[str] = None
    status: str
    priority: str
    created_by: str
    created_at: str
    updated_at: str


# ============================================================================
# API Endpoints
# ============================================================================

@router.get("", response_model=list[CaseResponse])
def list_cases(
    status_filter: Optional[CaseStatus] = Query(None, alias="status", description="Filter by case status"),
    priority_filter: Optional[CasePriority] = Query(None, alias="priority", description="Filter by priority"),
    search: Optional[str] = Query(None, max_length=100, description="Search cases by title"),
    current_user: dict = Depends(get_current_user),
):
    """
    Returns only cases the authenticated user is authorized to view:
    - Cases created by the user.
    - Cases where the user is an assigned member in case_members.
    """
    user_id = current_user["id"]
    client = get_supabase_client()

    try:
        # Step 1: Check if user is a member of any cases
        members_res = client.table("case_members").select("case_id").eq("user_id", user_id).execute()
        member_case_ids = [row["case_id"] for row in (members_res.data or []) if "case_id" in row]

        # Step 2: Build query for cases created by user or where user is a member
        if member_case_ids:
            # Query either created_by or id in member_case_ids
            case_ids_filter = ",".join(member_case_ids)
            query = client.table("cases").select("*").or_(f"created_by.eq.{user_id},id.in.({case_ids_filter})")
        else:
            query = client.table("cases").select("*").eq("created_by", user_id)

        # Apply safe filters
        if status_filter:
            query = query.eq("status", status_filter.value)
        if priority_filter:
            query = query.eq("priority", priority_filter.value)
        if search and search.strip():
            query = query.ilike("title", f"%{search.strip()}%")

        # Sort with newest cases first
        response = query.order("created_at", desc=True).execute()
        return response.data or []

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve cases from the database.",
        )


@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
def create_case(
    case_input: CaseCreate,
    current_user: dict = Depends(get_current_user),
):
    """
    Creates a new investigation case.
    The created_by field is set strictly from the verified authenticated user's ID.
    Never accepts ownership or privileged fields from the request body.
    """
    user_id = current_user["id"]
    client = get_supabase_client()

    payload = {
        "title": case_input.title.strip(),
        "description": case_input.description.strip() if case_input.description else None,
        "case_type": case_input.case_type.strip() if case_input.case_type else "General",
        "status": case_input.status.value if case_input.status else CaseStatus.OPEN.value,
        "priority": case_input.priority.value if case_input.priority else CasePriority.MEDIUM.value,
        "created_by": user_id,
    }

    try:
        response = client.table("cases").insert(payload).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create case in the database.",
            )
        return response.data[0]

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error while creating case.",
        )


@router.get("/{case_id}", response_model=CaseResponse)
def get_case(
    case_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Returns a single case by ID only if the authenticated user is authorized to view it.
    Returns 404 Not Found if the case does not exist or if the user lacks access,
    preserving privacy without leaking whether another user's private case exists.
    """
    # Validate UUID format
    try:
        valid_uuid = str(uuid.UUID(case_id))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid case ID format. Must be a valid UUID.",
        )

    user_id = current_user["id"]
    client = get_supabase_client()

    try:
        # Fetch the case
        response = client.table("cases").select("*").eq("id", valid_uuid).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Case not found.",
            )

        case_record = response.data[0]

        # Check authorization: user is creator
        if case_record.get("created_by") == user_id:
            return case_record

        # Check authorization: user is an assigned member
        member_res = client.table("case_members").select("role").eq("case_id", valid_uuid).eq("user_id", user_id).execute()
        if member_res.data:
            return case_record

        # Privacy-preserving 404: user is neither creator nor member
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found.",
        )

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error while retrieving case details.",
        )


@router.patch("/{case_id}", response_model=CaseResponse)
def update_case(
    case_id: str,
    case_update: CaseUpdate,
    current_user: dict = Depends(get_current_user),
):
    """
    Updates an existing case.
    - Only permitted fields (title, description, case_type, status, priority) may be changed.
    - Rejects empty updates.
    - Never permits changes to id, created_by, or protected metadata.
    - Enforces case ownership or member permissions (Viewers are rejected with 403 Forbidden).
    - Returns 404 for nonexistent or unauthorized cases.
    """
    # Validate UUID format
    try:
        valid_uuid = str(uuid.UUID(case_id))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid case ID format. Must be a valid UUID.",
        )

    # Check that at least one field was provided in the update request
    update_data = case_update.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one field (title, description, case_type, status, priority) must be provided for update.",
        )

    user_id = current_user["id"]
    client = get_supabase_client()

    try:
        # Step 1: Fetch the case to verify existence and check permissions
        case_res = client.table("cases").select("*").eq("id", valid_uuid).execute()
        if not case_res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Case not found.",
            )

        case_record = case_res.data[0]

        # Step 2: Enforce authorization
        if case_record.get("created_by") == user_id:
            can_update = True
        else:
            # Check membership
            member_res = client.table("case_members").select("role").eq("case_id", valid_uuid).eq("user_id", user_id).execute()
            if not member_res.data:
                # Privacy-preserving 404: user is not associated with this case
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Case not found.",
                )

            member_role = member_res.data[0].get("role")
            if member_role == "Viewer":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: Case members with the 'Viewer' role do not have permission to modify this case.",
                )
            elif member_role in ["Admin", "Investigator", "Analyst"]:
                can_update = True
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: You do not have permission to modify this case.",
                )

        # Step 3: Prepare safe update payload
        payload = {}
        if "title" in update_data and update_data["title"] is not None:
            payload["title"] = update_data["title"].strip()
        if "description" in update_data:
            payload["description"] = update_data["description"].strip() if update_data["description"] else None
        if "case_type" in update_data and update_data["case_type"] is not None:
            payload["case_type"] = update_data["case_type"].strip()
        if "status" in update_data and update_data["status"] is not None:
            payload["status"] = update_data["status"].value if hasattr(update_data["status"], "value") else str(update_data["status"])
        if "priority" in update_data and update_data["priority"] is not None:
            payload["priority"] = update_data["priority"].value if hasattr(update_data["priority"], "value") else str(update_data["priority"])

        # Protect against empty effective payload
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one valid field value must be provided for update.",
            )

        # Update timestamp
        payload["updated_at"] = datetime.now(timezone.utc).isoformat()

        # Step 4: Execute database update
        update_res = client.table("cases").update(payload).eq("id", valid_uuid).execute()
        if not update_res.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update case in the database.",
            )

        return update_res.data[0]

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error while updating case.",
        )
