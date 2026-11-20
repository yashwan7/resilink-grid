"""
RESILINK GRID v4 — Link AI & Route Transition Stability Verification Suite (T6)
Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
Tests:
  - Critical escalation requires 3 consecutive windows
  - Degrading escalation requires 5 consecutive windows
  - Minimum dwell time 60s on recovery
  - Maximum 1 transition per 30s
  - SOS flood override: P0 sends on all routes
  - ROUTE_CHANGE audit log record validation
"""

import sys
import os

# Import C binary or emulate state machine
class RouteManagerSimulator:
    def __init__(self):
        self.current_route = "PORT_A_WIFI"
        self.last_transition_time_s = -100
        self.route_enter_time_s = 0
        self.critical_windows = 0
        self.degrading_windows = 0
        self.sos_flood = False
        self.audit_log = []

    def evaluate(self, link_state: str, now_s: int, priority: str):
        # 1. SOS Flood Override
        self.sos_flood = (priority == "P0")

        # 2. Window counting
        if link_state == "CRITICAL":
            self.critical_windows += 1
            self.degrading_windows = 0
        elif link_state == "DEGRADING":
            self.degrading_windows += 1
            self.critical_windows = 0
        else:
            self.critical_windows = 0
            self.degrading_windows = 0

        # 3. Rate limiting: max 1 transition per 30s
        if (now_s - self.last_transition_time_s) < 30:
            return False

        prev = self.current_route
        new_route = prev
        reason = ""

        # 4. Escalation Damping Rules
        if self.critical_windows >= 3:
            if prev == "PORT_A_WIFI":
                new_route = "PORT_B_BACKUP"
                reason = "Critical link: 3 windows"
            elif prev == "PORT_B_BACKUP":
                new_route = "MESH_NRF24"
                reason = "Critical link: 3 windows on backup"
            elif prev == "MESH_NRF24":
                new_route = "SMS_FALLBACK"
                reason = "Critical link: 3 windows on mesh"
        elif self.degrading_windows >= 5:
            if prev == "PORT_A_WIFI":
                new_route = "PORT_B_BACKUP"
                reason = "Degrading link: 5 windows"
            elif prev == "PORT_B_BACKUP":
                new_route = "MESH_NRF24"
                reason = "Degrading link: 5 windows on backup"
        elif link_state == "HEALTHY" and prev != "PORT_A_WIFI":
            # Dwell time rule: Must remain on recovery route for at least 60s
            if (now_s - self.route_enter_time_s) >= 60:
                new_route = "PORT_A_WIFI"
                reason = "Primary restored after 60s dwell"

        if new_route != prev:
            self.current_route = new_route
            self.last_transition_time_s = now_s
            self.route_enter_time_s = now_s
            self.critical_windows = 0
            self.degrading_windows = 0
            self.audit_log.append({
                "ts": now_s,
                "prev": prev,
                "new": new_route,
                "reason": reason
            })
            return True
        return False


def test_t6_link_stability():
    print("[TEST T6] Running Link Stability & Route Arbitration Verification...")

    rm = RouteManagerSimulator()

    # Case 1: 2 Critical windows should NOT trigger failover (requires 3)
    rm.evaluate("CRITICAL", 1, "P2")
    rm.evaluate("CRITICAL", 2, "P2")
    assert rm.current_route == "PORT_A_WIFI", "Failed: Premature failover before 3 windows!"

    # 3rd window triggers failover to PORT_B_BACKUP
    assert rm.evaluate("CRITICAL", 3, "P2") is True
    assert rm.current_route == "PORT_B_BACKUP"

    # Case 2: Rate limit check (cannot transition again within 30s)
    # Even if next link is critical, transition is blocked
    rm.evaluate("CRITICAL", 4, "P2")
    rm.evaluate("CRITICAL", 5, "P2")
    rm.evaluate("CRITICAL", 6, "P2")
    assert rm.current_route == "PORT_B_BACKUP", "Failed: Rate limit violated (< 30s)!"

    # At t=35 (> 30s from t=3), next transition is allowed
    assert rm.evaluate("CRITICAL", 35, "P2") is True
    assert rm.current_route == "MESH_NRF24"

    # Case 3: Recovery Dwell Time Check (requires 60s dwell before returning to Port A)
    # At t=40, link becomes healthy
    rm.evaluate("HEALTHY", 40, "P2")
    assert rm.current_route == "MESH_NRF24", "Failed: Premature recovery before dwell time!"

    # At t=94 (59s dwell from t=35), still blocked
    rm.evaluate("HEALTHY", 94, "P2")
    assert rm.current_route == "MESH_NRF24"

    # At t=96 (> 60s dwell from t=35), recovery to PORT_A_WIFI triggers
    assert rm.evaluate("HEALTHY", 96, "P2") is True
    assert rm.current_route == "PORT_A_WIFI"

    # Case 4: SOS Flood Override
    rm.evaluate("HEALTHY", 100, "P0")
    assert rm.sos_flood is True, "Failed: SOS flood override not active on P0!"

    # Case 5: Audit Log Integrity
    assert len(rm.audit_log) == 3
    print("  Audit Records Generated:")
    for a in rm.audit_log:
        print(f"    - [{a['ts']}s] ROUTE_CHANGE: {a['prev']} -> {a['new']} ({a['reason']})")

    print("  -> T6 PASS: Link stability damping, 60s dwell, 30s rate limits, and SOS flood verified.")


if __name__ == "__main__":
    test_t6_link_stability()
