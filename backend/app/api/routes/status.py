import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import decode_token

router = APIRouter()

# Active WebSocket connections
_connections: list[WebSocket] = []


@router.websocket("/ws/status")
async def ws_status(websocket: WebSocket, token: str | None = None) -> None:
    if not token or not decode_token(token):
        await websocket.close(code=1008)  # Policy Violation
        return
    await websocket.accept()
    _connections.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        _connections.remove(websocket)


async def _broadcast(payload: str) -> None:
    for conn in list(_connections):
        try:
            await conn.send_text(payload)
        except Exception:
            _connections.remove(conn)


async def broadcast_status(node_id: str, status: str, checked_at: str, response_time_ms: int | None = None) -> None:
    await _broadcast(json.dumps({
        "type": "status",
        "node_id": node_id,
        "status": status,
        "checked_at": checked_at,
        "response_time_ms": response_time_ms,
    }))


async def broadcast_scan_update(run_id: str, devices_found: int) -> None:
    await _broadcast(json.dumps({
        "type": "scan_device_found",
        "run_id": run_id,
        "devices_found": devices_found,
    }))
