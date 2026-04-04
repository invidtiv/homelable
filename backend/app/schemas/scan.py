from datetime import datetime
from typing import Any

from pydantic import BaseModel


class PendingDeviceResponse(BaseModel):
    id: str
    ip: str
    mac: str | None
    hostname: str | None
    os: str | None
    services: list[Any]
    suggested_type: str | None
    status: str
    discovery_source: str | None
    discovered_at: datetime

    model_config = {"from_attributes": True}


class ScanRunResponse(BaseModel):
    id: str
    status: str
    ranges: list[str]
    devices_found: int
    started_at: datetime
    finished_at: datetime | None
    error: str | None

    model_config = {"from_attributes": True}
