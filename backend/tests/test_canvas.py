import uuid
from unittest.mock import patch

import pytest
from httpx import AsyncClient

TOKEN_HASH = "$2b$12$o/LWyvmBc978CNpSsHxcveXN0WqjAGW/gBR0.U.HURWbaYD3GCDqS"


@pytest.fixture
async def headers(client: AsyncClient):
    with patch("app.api.routes.auth._load_credentials", return_value=("admin", TOKEN_HASH)):
        res = await client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin"})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def node_payload(**kwargs):
    return {"id": str(uuid.uuid4()), "type": "server", "label": "N", "status": "unknown", "pos_x": 0, "pos_y": 0, **kwargs}


def edge_payload(src, tgt, **kwargs):
    return {"id": str(uuid.uuid4()), "source": src, "target": tgt, "type": "ethernet", **kwargs}


# ── load_canvas ───────────────────────────────────────────────────────────────

async def test_load_canvas_empty(client: AsyncClient, headers: dict):
    res = await client.get("/api/v1/canvas", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["nodes"] == []
    assert data["edges"] == []
    assert data["viewport"] == {"x": 0, "y": 0, "zoom": 1}


async def test_load_canvas_requires_auth(client: AsyncClient):
    res = await client.get("/api/v1/canvas")
    assert res.status_code == 403


# ── save_canvas ───────────────────────────────────────────────────────────────

async def test_save_canvas_creates_nodes_and_edges(client: AsyncClient, headers: dict):
    n1 = node_payload(label="Router", type="router")
    n2 = node_payload(label="Switch", type="switch")
    e1 = edge_payload(n1["id"], n2["id"])

    res = await client.post("/api/v1/canvas/save", json={"nodes": [n1, n2], "edges": [e1], "viewport": {"x": 1, "y": 2, "zoom": 1.5}}, headers=headers)
    assert res.status_code == 200
    assert res.json() == {"saved": True}

    canvas = (await client.get("/api/v1/canvas", headers=headers)).json()
    assert len(canvas["nodes"]) == 2
    assert len(canvas["edges"]) == 1
    assert canvas["viewport"] == {"x": 1, "y": 2, "zoom": 1.5}


async def test_save_canvas_updates_existing_node(client: AsyncClient, headers: dict):
    n1 = node_payload(label="Old Label")
    await client.post("/api/v1/canvas/save", json={"nodes": [n1], "edges": [], "viewport": {}}, headers=headers)

    n1_updated = {**n1, "label": "New Label", "ip": "10.0.0.1"}
    await client.post("/api/v1/canvas/save", json={"nodes": [n1_updated], "edges": [], "viewport": {}}, headers=headers)

    canvas = (await client.get("/api/v1/canvas", headers=headers)).json()
    assert len(canvas["nodes"]) == 1
    assert canvas["nodes"][0]["label"] == "New Label"
    assert canvas["nodes"][0]["ip"] == "10.0.0.1"


async def test_save_canvas_deletes_removed_nodes(client: AsyncClient, headers: dict):
    n1 = node_payload(label="Keep")
    n2 = node_payload(label="Remove")
    await client.post("/api/v1/canvas/save", json={"nodes": [n1, n2], "edges": [], "viewport": {}}, headers=headers)

    await client.post("/api/v1/canvas/save", json={"nodes": [n1], "edges": [], "viewport": {}}, headers=headers)

    canvas = (await client.get("/api/v1/canvas", headers=headers)).json()
    assert len(canvas["nodes"]) == 1
    assert canvas["nodes"][0]["label"] == "Keep"


async def test_save_canvas_deletes_removed_edges(client: AsyncClient, headers: dict):
    n1 = node_payload()
    n2 = node_payload()
    e1 = edge_payload(n1["id"], n2["id"])
    await client.post("/api/v1/canvas/save", json={"nodes": [n1, n2], "edges": [e1], "viewport": {}}, headers=headers)

    await client.post("/api/v1/canvas/save", json={"nodes": [n1, n2], "edges": [], "viewport": {}}, headers=headers)

    canvas = (await client.get("/api/v1/canvas", headers=headers)).json()
    assert canvas["edges"] == []


async def test_save_canvas_persists_viewport_on_update(client: AsyncClient, headers: dict):
    await client.post("/api/v1/canvas/save", json={"nodes": [], "edges": [], "viewport": {"x": 10, "y": 20, "zoom": 2}}, headers=headers)
    await client.post("/api/v1/canvas/save", json={"nodes": [], "edges": [], "viewport": {"x": 5, "y": 5, "zoom": 0.5}}, headers=headers)

    canvas = (await client.get("/api/v1/canvas", headers=headers)).json()
    assert canvas["viewport"] == {"x": 5, "y": 5, "zoom": 0.5}


async def test_save_canvas_persists_custom_colors(client: AsyncClient, headers: dict):
    n1 = node_payload(custom_colors={"border": "#ff0000", "icon": "#00ff00"})
    await client.post("/api/v1/canvas/save", json={"nodes": [n1], "edges": [], "viewport": {}}, headers=headers)

    canvas = (await client.get("/api/v1/canvas", headers=headers)).json()
    assert canvas["nodes"][0]["custom_colors"] == {"border": "#ff0000", "icon": "#00ff00"}


async def test_save_canvas_persists_edge_custom_color_and_path_style(client: AsyncClient, headers: dict):
    n1 = node_payload()
    n2 = node_payload()
    e1 = edge_payload(n1["id"], n2["id"], custom_color="#a855f7", path_style="smooth")
    await client.post("/api/v1/canvas/save", json={"nodes": [n1, n2], "edges": [e1], "viewport": {}}, headers=headers)

    canvas = (await client.get("/api/v1/canvas", headers=headers)).json()
    edge = canvas["edges"][0]
    assert edge["custom_color"] == "#a855f7"
    assert edge["path_style"] == "smooth"


async def test_save_canvas_requires_auth(client: AsyncClient):
    res = await client.post("/api/v1/canvas/save", json={"nodes": [], "edges": [], "viewport": {}})
    assert res.status_code == 403
