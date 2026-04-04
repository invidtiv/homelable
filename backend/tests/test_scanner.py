"""Tests for scanner: two-phase nmap, mDNS discovery, run_scan integration."""
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy import select as sa_select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db.database import Base
from app.db.models import Node, PendingDevice, ScanRun

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_run_id() -> str:
    return str(uuid.uuid4())


@pytest.fixture
async def mem_db():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    yield factory
    await engine.dispose()


def _make_scan_run(run_id: str) -> ScanRun:
    return ScanRun(id=run_id, status="running", ranges=["192.168.1.0/24"])


# ---------------------------------------------------------------------------
# _ping_sweep
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_ping_sweep_returns_alive_hosts():
    from app.services.scanner import _ping_sweep

    async def fake_ping(ip: str) -> str | None:
        return ip if ip in {"192.168.1.1", "192.168.1.2"} else None

    with patch("app.services.scanner._ping_sweep", wraps=None):
        pass  # just ensure import is fine

    # Patch asyncio.create_subprocess_exec to simulate ping responses
    responding = {"192.168.1.1", "192.168.1.2"}

    async def mock_subprocess(*args, **kwargs):
        ip = args[-1]
        proc = MagicMock()
        proc.returncode = 0 if ip in responding else 1
        proc.wait = AsyncMock(return_value=proc.returncode)
        return proc

    with patch("asyncio.create_subprocess_exec", side_effect=mock_subprocess), \
         patch("app.services.scanner._arp_table_hosts", return_value={}), \
         patch("app.services.scanner._resolve_hostname", return_value=None):
        result = await _ping_sweep("192.168.1.0/30")  # .1 .2 only in /30

    assert "192.168.1.1" in result
    assert "192.168.1.2" in result
    for host in result.values():
        assert host["open_ports"] == []


@pytest.mark.asyncio
async def test_ping_sweep_excludes_non_responding():
    from app.services.scanner import _ping_sweep

    async def mock_subprocess(*args, **kwargs):
        ip = args[-1]
        proc = MagicMock()
        proc.returncode = 0 if ip == "192.168.1.1" else 1
        proc.wait = AsyncMock(return_value=proc.returncode)
        return proc

    with patch("asyncio.create_subprocess_exec", side_effect=mock_subprocess), \
         patch("app.services.scanner._arp_table_hosts", return_value={}), \
         patch("app.services.scanner._resolve_hostname", return_value=None):
        result = await _ping_sweep("192.168.1.0/30")

    assert "192.168.1.1" in result
    assert "192.168.1.2" not in result


@pytest.mark.asyncio
async def test_ping_sweep_supplements_with_arp_cache():
    """Devices that block ICMP but appear in ARP cache should still be discovered."""
    from app.services.scanner import _ping_sweep

    async def mock_subprocess(*args, **kwargs):
        proc = MagicMock()
        proc.returncode = 1  # all pings fail
        proc.wait = AsyncMock(return_value=1)
        return proc

    arp_extra = {
        "192.168.1.10": {"ip": "192.168.1.10", "mac": "aa:bb:cc:dd:ee:10", "hostname": None, "os": None, "open_ports": []},
    }

    with patch("asyncio.create_subprocess_exec", side_effect=mock_subprocess), \
         patch("app.services.scanner._arp_table_hosts", return_value=arp_extra), \
         patch("app.services.scanner._resolve_hostname", return_value=None):
        result = await _ping_sweep("192.168.1.0/24")

    assert "192.168.1.10" in result
    assert result["192.168.1.10"]["mac"] == "aa:bb:cc:dd:ee:10"


@pytest.mark.asyncio
async def test_ping_sweep_enriches_mac_from_arp_cache():
    """Ping-alive hosts with no ARP entry get their MAC from the ARP cache."""
    from app.services.scanner import _ping_sweep

    async def mock_subprocess(*args, **kwargs):
        ip = args[-1]
        proc = MagicMock()
        proc.returncode = 0 if ip == "192.168.1.1" else 1
        proc.wait = AsyncMock(return_value=proc.returncode)
        return proc

    arp_extra = {
        "192.168.1.1": {"ip": "192.168.1.1", "mac": "de:ad:be:ef:00:01", "hostname": None, "os": None, "open_ports": []},
    }

    with patch("asyncio.create_subprocess_exec", side_effect=mock_subprocess), \
         patch("app.services.scanner._arp_table_hosts", return_value=arp_extra), \
         patch("app.services.scanner._resolve_hostname", return_value=None):
        result = await _ping_sweep("192.168.1.0/30")

    assert result["192.168.1.1"]["mac"] == "de:ad:be:ef:00:01"


# ---------------------------------------------------------------------------
# _arp_table_hosts
# ---------------------------------------------------------------------------

def test_arp_table_hosts_parses_proc_net_arp():
    import io  # noqa: PLC0415

    from app.services.scanner import _arp_table_hosts

    arp_content = (
        "IP address       HW type     Flags       HW address            Mask     Device\n"
        "192.168.1.1      0x1         0x2         aa:bb:cc:dd:ee:01     *        eth0\n"
        "192.168.1.50     0x1         0x2         aa:bb:cc:dd:ee:02     *        eth0\n"
        "10.0.0.1         0x1         0x2         aa:bb:cc:dd:ee:03     *        eth0\n"  # outside subnet
        "192.168.1.99     0x1         0x2         00:00:00:00:00:00     *        eth0\n"  # incomplete
    )

    mock_file = MagicMock()
    mock_file.__enter__ = MagicMock(return_value=io.StringIO(arp_content))
    mock_file.__exit__ = MagicMock(return_value=False)

    with patch("builtins.open", return_value=mock_file), \
         patch("app.services.scanner._resolve_hostname", return_value=None):
        result = _arp_table_hosts("192.168.1.0/24")

    assert "192.168.1.1" in result
    assert "192.168.1.50" in result
    assert "10.0.0.1" not in result   # outside target subnet
    assert "192.168.1.99" not in result  # zero MAC skipped


def test_arp_table_hosts_parses_macos_arp_output():
    from app.services.scanner import _arp_table_hosts

    arp_output = (
        "router.lan (192.168.1.1) at aa:bb:cc:dd:ee:01 on en0 ifscope [ethernet]\n"
        "device.lan (192.168.1.20) at aa:bb:cc:dd:ee:02 on en0 ifscope [ethernet]\n"
        "? (192.168.1.99) at (incomplete) on en0 ifscope [ethernet]\n"
        "? (10.0.0.1) at aa:bb:cc:dd:ee:04 on en0 ifscope [ethernet]\n"  # outside subnet
    )

    mock_result = MagicMock()
    mock_result.stdout = arp_output

    with patch("builtins.open", side_effect=FileNotFoundError), \
         patch("subprocess.run", return_value=mock_result), \
         patch("app.services.scanner._resolve_hostname", return_value=None):
        result = _arp_table_hosts("192.168.1.0/24")

    assert "192.168.1.1" in result
    assert "192.168.1.20" in result
    assert "192.168.1.99" not in result   # incomplete MAC
    assert "10.0.0.1" not in result       # outside subnet


# ---------------------------------------------------------------------------
# _nmap_scan_single (Phase 2 per-IP worker)
# ---------------------------------------------------------------------------

def test_nmap_scan_single_detects_open_ports():
    from app.services.scanner import _nmap_scan_single

    host = {"ip": "192.168.1.10", "hostname": None, "mac": None, "os": None, "open_ports": []}

    # Build a realistic host entry: protocols → ports → port info
    port_info = {80: {"state": "open", "product": "nginx", "version": "1.24"}}
    mock_host = MagicMock()
    mock_host.all_protocols.return_value = ["tcp"]
    mock_host.__getitem__ = MagicMock(return_value=port_info)
    mock_host.get.return_value = {}

    mock_nm = MagicMock()
    mock_nm.all_hosts.return_value = ["192.168.1.10"]
    mock_nm.__getitem__ = MagicMock(return_value=mock_host)

    with patch("app.services.scanner.nmap.PortScanner", return_value=mock_nm), \
         patch("app.services.scanner._extract_os", return_value=None):
        result = _nmap_scan_single(host)

    assert len(result["open_ports"]) == 1
    assert result["open_ports"][0]["port"] == 80
    assert result["open_ports"][0]["banner"] == "nginx 1.24"


def test_nmap_scan_single_returns_host_unchanged_on_error():
    from app.services.scanner import _nmap_scan_single

    host = {"ip": "192.168.1.20", "hostname": None, "mac": None, "os": None, "open_ports": []}
    mock_nm = MagicMock()
    mock_nm.scan.side_effect = Exception("nmap error")

    with patch("app.services.scanner.nmap.PortScanner", return_value=mock_nm):
        result = _nmap_scan_single(host)

    assert result["ip"] == "192.168.1.20"
    assert result["open_ports"] == []


def test_nmap_scan_single_returns_host_unchanged_when_no_results():
    """Host confirmed alive in Phase 1 but all ports filtered — keep it with empty ports."""
    from app.services.scanner import _nmap_scan_single

    host = {"ip": "192.168.1.30", "hostname": "shelly1.lan", "mac": "34:94:54:aa:bb:cc", "os": None, "open_ports": []}
    mock_nm = MagicMock()
    mock_nm.all_hosts.return_value = []  # no results

    with patch("app.services.scanner.nmap.PortScanner", return_value=mock_nm):
        result = _nmap_scan_single(host)

    assert result["ip"] == "192.168.1.30"
    assert result["open_ports"] == []
    assert result["mac"] == "34:94:54:aa:bb:cc"  # preserved from Phase 1


# ---------------------------------------------------------------------------
# _nmap_scan
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_nmap_scan_uses_mock_when_nmap_unavailable():
    from app.services.scanner import _nmap_scan

    with patch("app.services.scanner._NMAP_AVAILABLE", False):
        result = await _nmap_scan("192.168.1.0/24")

    assert len(result) == 1
    assert result[0]["ip"] == "192.168.1.99"


@pytest.mark.asyncio
async def test_nmap_scan_raises_on_sweep_error():
    from app.services.scanner import _nmap_scan

    with patch("app.services.scanner._ping_sweep", side_effect=Exception("ping sweep failed")), \
         pytest.raises(RuntimeError, match="ping sweep failed"):
        await _nmap_scan("192.168.1.0/24")


# ---------------------------------------------------------------------------
# _mdns_discover
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_mdns_discover_returns_empty_when_zeroconf_unavailable():
    from app.services.scanner import _mdns_discover

    with patch("app.services.scanner._ZEROCONF_AVAILABLE", False):
        result = await _mdns_discover()

    assert result == []


@pytest.mark.asyncio
async def test_mdns_discover_returns_devices():
    from app.services.scanner import _mdns_discover

    mock_info = MagicMock()
    mock_info.addresses = [b"\xc0\xa8\x01\x50"]  # 192.168.1.80
    mock_info.server = "shelly1.local."
    mock_info.port = 80
    mock_info.async_request = AsyncMock(return_value=True)

    mock_browser = AsyncMock()
    mock_browser.async_cancel = AsyncMock()

    # Simulate a service being found during the sleep
    captured_handler: list = []

    def fake_browser(zc, types, handlers):
        captured_handler.extend(handlers)
        return mock_browser

    from zeroconf import ServiceStateChange

    async def fake_sleep(t):
        # Fire the handler as if a device was discovered
        for h in captured_handler:
            h(None, "_shelly._tcp.local.", "Shelly1._shelly._tcp.local.", ServiceStateChange.Added)

    mock_azc = AsyncMock()
    mock_azc.__aenter__ = AsyncMock(return_value=mock_azc)
    mock_azc.__aexit__ = AsyncMock(return_value=None)
    mock_azc.zeroconf = MagicMock()

    with patch("app.services.scanner._ZEROCONF_AVAILABLE", True), \
         patch("app.services.scanner.AsyncZeroconf", return_value=mock_azc), \
         patch("app.services.scanner.AsyncServiceBrowser", side_effect=fake_browser), \
         patch("app.services.scanner.AsyncServiceInfo", return_value=mock_info), \
         patch("asyncio.sleep", side_effect=fake_sleep):
        result = await _mdns_discover(timeout=0.01)

    assert len(result) == 1
    assert result[0]["ip"] == "192.168.1.80"
    assert result[0]["hostname"] == "shelly1.local."


# ---------------------------------------------------------------------------
# _nmap_port_scan (Phase 2 concurrency)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_nmap_port_scan_returns_empty_when_no_alive_hosts():
    from app.services.scanner import _nmap_port_scan

    result = await _nmap_port_scan({})
    assert result == []


@pytest.mark.asyncio
async def test_nmap_port_scan_tolerates_single_host_exception():
    """A single per-host failure should not abort the entire Phase 2 gather."""
    from app.services.scanner import _nmap_port_scan

    hosts = {
        "192.168.1.1": {"ip": "192.168.1.1", "hostname": None, "mac": None, "os": None, "open_ports": []},
        "192.168.1.2": {"ip": "192.168.1.2", "hostname": None, "mac": None, "os": None, "open_ports": []},
    }

    call_count = 0

    def _flaky_scan(host_dict):
        nonlocal call_count
        call_count += 1
        if host_dict["ip"] == "192.168.1.1":
            raise RuntimeError("simulated nmap crash")
        return host_dict

    with patch("app.services.scanner._nmap_scan_single", side_effect=_flaky_scan), \
         patch("app.services.scanner._NMAP_AVAILABLE", True):
        result = await _nmap_port_scan(hosts)

    assert call_count == 2
    # The crashing host is dropped; the healthy one survives
    assert len(result) == 1
    assert result[0]["ip"] == "192.168.1.2"


# ---------------------------------------------------------------------------
# run_scan integration
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_run_scan_adds_nmap_devices_as_pending(mem_db):
    from app.services.scanner import run_scan

    run_id = _make_run_id()
    async with mem_db() as session:
        session.add(_make_scan_run(run_id))
        await session.commit()

    nmap_hosts = [{"ip": "192.168.1.5", "hostname": "device.lan", "mac": None, "os": None, "open_ports": []}]

    async with mem_db() as session:
        with patch("app.services.scanner._nmap_scan", return_value=nmap_hosts), \
             patch("app.services.scanner._mdns_discover", new_callable=AsyncMock, return_value=[]), \
             patch("app.api.routes.status.broadcast_scan_update", new_callable=AsyncMock):
            await run_scan(["192.168.1.0/24"], session, run_id)

    async with mem_db() as session:
        result = await session.execute(sa_select(PendingDevice))
        devices = result.scalars().all()

    assert any(d.ip == "192.168.1.5" for d in devices)


@pytest.mark.asyncio
async def test_run_scan_mdns_only_device_added(mem_db):
    """Devices found only by mDNS (not nmap) should appear in pending_devices."""
    from app.services.scanner import run_scan

    run_id = _make_run_id()
    async with mem_db() as session:
        session.add(_make_scan_run(run_id))
        await session.commit()

    mdns_hosts = [{"ip": "192.168.1.80", "hostname": "shelly1.local.", "mac": None, "os": None, "open_ports": [{"port": 80, "protocol": "tcp", "banner": ""}]}]

    async with mem_db() as session:
        with patch("app.services.scanner._nmap_scan", return_value=[]), \
             patch("app.services.scanner._mdns_discover", new_callable=AsyncMock, return_value=mdns_hosts), \
             patch("app.api.routes.status.broadcast_scan_update", new_callable=AsyncMock):
            await run_scan(["192.168.1.0/24"], session, run_id)

    async with mem_db() as session:
        result = await session.execute(sa_select(PendingDevice).where(PendingDevice.ip == "192.168.1.80"))
        device = result.scalar_one_or_none()

    assert device is not None
    assert device.status == "pending"
    assert device.discovery_source == "mdns"


@pytest.mark.asyncio
async def test_run_scan_mdns_skipped_if_already_in_nmap(mem_db):
    """If nmap and mDNS both find the same IP, it should not be double-counted."""
    from app.services.scanner import run_scan

    run_id = _make_run_id()
    async with mem_db() as session:
        session.add(_make_scan_run(run_id))
        await session.commit()

    shared_host = {"ip": "192.168.1.10", "hostname": "device.lan", "mac": None, "os": None, "open_ports": []}

    async with mem_db() as session:
        with patch("app.services.scanner._nmap_scan", return_value=[shared_host]), \
             patch("app.services.scanner._mdns_discover", new_callable=AsyncMock, return_value=[shared_host]), \
             patch("app.api.routes.status.broadcast_scan_update", new_callable=AsyncMock):
            await run_scan(["192.168.1.0/24"], session, run_id)

    async with mem_db() as session:
        result = await session.execute(sa_select(PendingDevice).where(PendingDevice.ip == "192.168.1.10"))
        devices = result.scalars().all()

    assert len(devices) == 1  # not duplicated


@pytest.mark.asyncio
async def test_run_scan_skips_canvas_nodes(mem_db):
    """Hosts already approved onto the canvas must be skipped."""
    from app.services.scanner import run_scan

    run_id = _make_run_id()
    async with mem_db() as session:
        session.add(_make_scan_run(run_id))
        canvas_node = Node(
            id=str(uuid.uuid4()), label="PVE", type="proxmox",
            ip="192.168.1.100", status="online",
        )
        session.add(canvas_node)
        await session.commit()

    nmap_hosts = [{"ip": "192.168.1.100", "hostname": "pve.lan", "mac": None, "os": None, "open_ports": []}]

    async with mem_db() as session:
        with patch("app.services.scanner._nmap_scan", return_value=nmap_hosts), \
             patch("app.services.scanner._mdns_discover", new_callable=AsyncMock, return_value=[]), \
             patch("app.api.routes.status.broadcast_scan_update", new_callable=AsyncMock):
            await run_scan(["192.168.1.0/24"], session, run_id)

    async with mem_db() as session:
        result = await session.execute(sa_select(PendingDevice).where(PendingDevice.ip == "192.168.1.100"))
        assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_run_scan_skips_hidden_devices(mem_db):
    """Hosts hidden by the user must not re-appear in pending."""
    from app.services.scanner import run_scan

    run_id = _make_run_id()
    async with mem_db() as session:
        session.add(_make_scan_run(run_id))
        hidden = PendingDevice(ip="192.168.1.55", status="hidden")
        session.add(hidden)
        await session.commit()

    nmap_hosts = [{"ip": "192.168.1.55", "hostname": None, "mac": None, "os": None, "open_ports": []}]

    async with mem_db() as session:
        with patch("app.services.scanner._nmap_scan", return_value=nmap_hosts), \
             patch("app.services.scanner._mdns_discover", new_callable=AsyncMock, return_value=[]), \
             patch("app.api.routes.status.broadcast_scan_update", new_callable=AsyncMock):
            await run_scan(["192.168.1.0/24"], session, run_id)

    async with mem_db() as session:
        result = await session.execute(
            sa_select(PendingDevice).where(PendingDevice.ip == "192.168.1.55", PendingDevice.status == "pending")
        )
        assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_run_scan_cancelled_marks_status_cancelled(mem_db):
    """Cancelling a running scan sets the ScanRun status to 'cancelled'."""
    from app.services.scanner import request_cancel, run_scan

    run_id = _make_run_id()
    async with mem_db() as session:
        session.add(_make_scan_run(run_id))
        await session.commit()

    request_cancel(run_id)

    async with mem_db() as session:
        with patch("app.services.scanner._nmap_scan", return_value=[]), \
             patch("app.services.scanner._mdns_discover", new_callable=AsyncMock, return_value=[]), \
             patch("app.api.routes.status.broadcast_scan_update", new_callable=AsyncMock):
            await run_scan(["192.168.1.0/24"], session, run_id)

    async with mem_db() as session:
        run = await session.get(ScanRun, run_id)
        assert run is not None
        assert run.status == "cancelled"
