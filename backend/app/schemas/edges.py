from datetime import datetime

from pydantic import BaseModel


class EdgeBase(BaseModel):
    source: str
    target: str
    type: str = "ethernet"
    label: str | None = None
    vlan_id: int | None = None
    speed: str | None = None
    custom_color: str | None = None
    path_style: str | None = None
    animated: bool = False
    source_handle: str | None = None
    target_handle: str | None = None


class EdgeCreate(EdgeBase):
    pass


class EdgeUpdate(BaseModel):
    type: str | None = None
    label: str | None = None
    vlan_id: int | None = None
    speed: str | None = None
    custom_color: str | None = None
    path_style: str | None = None
    animated: bool | None = None
    source_handle: str | None = None
    target_handle: str | None = None


class EdgeResponse(EdgeBase):
    id: str
    created_at: datetime

    model_config = {"from_attributes": True}
