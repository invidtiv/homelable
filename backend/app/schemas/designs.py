from datetime import datetime

from pydantic import BaseModel


class DesignCreate(BaseModel):
    name: str
    icon: str = "dashboard"
    # Vestigial: kept for backward compatibility. The UI no longer branches on it;
    # the chosen icon now drives presentation. Defaults to a generic canvas.
    design_type: str = "network"


class DesignUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None


class DesignCopy(BaseModel):
    """Create a new design by deep-copying an existing one's canvas."""

    name: str
    icon: str = "dashboard"


class DesignResponse(BaseModel):
    id: str
    name: str
    design_type: str
    icon: str | None = None
    created_at: datetime
    updated_at: datetime
    # Populated by list_designs so the "copy from existing" picker can show what
    # each canvas holds. None on create/update/copy responses (not computed there).
    node_count: int | None = None
    group_count: int | None = None
    text_count: int | None = None

    model_config = {"from_attributes": True}
