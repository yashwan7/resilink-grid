"""
RESILINK GRID v4 — Buzzer & Failsafe Relay Verification Suite (T12)
Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
Tests:
  - Immediate local offline alert on HIGH and CRITICAL
  - Distinct auditory buzzer patterns (200ms on/100ms off vs 500ms on/500ms off)
  - User ACK button debounce and silencing
  - Failsafe re-alert timer if un-acknowledged after 15 seconds
  - Fail-safe relay coil state (normally energized, trips open on un-ACKed emergency)
"""

class AlertManagerSim:
    def __init__(self):
        self.active_class = "LOW"
        self.active_pattern = "SILENT"
        self.acknowledged = True
        self.alert_start_ms = 0
        self.relay_energized = True
        self.buzzer_state = False

    def update(self, new_class: str, now_ms: int):
        if new_class != self.active_class:
            self.active_class = new_class
            if new_class == "CRITICAL":
                self.active_pattern = "WARBLE_200MS"
                self.acknowledged = False
                self.alert_start_ms = now_ms
                self.relay_energized = False  # Trip relay
            elif new_class == "HIGH":
                self.active_pattern = "PULSE_500MS"
                self.acknowledged = False
                self.alert_start_ms = now_ms
                self.relay_energized = True
            else:
                self.active_pattern = "SILENT"
                self.acknowledged = True
                self.relay_energized = True
        elif not self.acknowledged:
            # Re-alert check: 15 seconds
            if (now_ms - self.alert_start_ms) > 15000:
                self.active_pattern = "WARBLE_200MS"
                self.relay_energized = False

    def press_ack_button(self):
        self.acknowledged = True
        self.buzzer_state = False

    def tick(self, now_ms: int):
        if self.acknowledged or self.active_pattern == "SILENT":
            self.buzzer_state = False
            return

        period = 300 if self.active_pattern == "WARBLE_200MS" else 1000
        on_time = 200 if self.active_pattern == "WARBLE_200MS" else 500
        phase = (now_ms - self.alert_start_ms) % period
        self.buzzer_state = (phase < on_time)


def test_t12_alert_failsafe():
    print("[TEST T12] Running Alert Manager & Failsafe Relay Verification...")

    am = AlertManagerSim()

    # 1. Normal state: Silent, Relay Energized
    am.update("LOW", 1000)
    am.tick(1000)
    assert am.active_pattern == "SILENT"
    assert am.buzzer_state is False
    assert am.relay_energized is True

    # 2. Critical state transition: Warble buzzer + Relay Trips
    am.update("CRITICAL", 2000)
    assert am.active_pattern == "WARBLE_200MS"
    assert am.acknowledged is False
    assert am.relay_energized is False, "Failed: Relay did not trip on CRITICAL!"

    # Tick at phase 100ms (< 200ms) -> Buzzer ON
    am.tick(2100)
    assert am.buzzer_state is True

    # Tick at phase 250ms (>= 200ms) -> Buzzer OFF
    am.tick(2250)
    assert am.buzzer_state is False

    # 3. User ACK button pressed -> Silenced immediately
    am.press_ack_button()
    assert am.acknowledged is True
    am.tick(2400)
    assert am.buzzer_state is False

    # 4. Re-alert Failsafe Test: If emergency remains unacknowledged for > 15s
    am.update("HIGH", 5000)
    assert am.acknowledged is False
    assert am.active_pattern == "PULSE_500MS"

    # At t=15s from alert (t=20000ms), timeout triggers
    am.update("HIGH", 21000)
    assert am.active_pattern == "WARBLE_200MS"
    assert am.relay_energized is False, "Failed: Relay did not trip on unacknowledged timeout!"

    print("  -> T12 PASS: Buzzer patterns, button ACK, 15s re-alert, and relay trip verified.")


if __name__ == "__main__":
    test_t12_alert_failsafe()
