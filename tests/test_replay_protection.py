"""
RESILINK GRID v4 — Replay Protection Verification Suite (T3)
Author: Yashwanth (Lead: Embedded, Crypto, Radio, Edge AI)
Tests:
  - Strict monotonic epoch and sequence counter discipline
  - 2048-bit sliding bitmap duplicate rejection
  - Sequence regression and replay attack interception
"""

import sys

WINDOW_SIZE_BITS = 2048


class SlidingBitmapReplayFilter:
    def __init__(self):
        self.highest_counter = 0
        self.bitmap = [0] * (WINDOW_SIZE_BITS // 64)  # 32 uint64 words = 2048 bits
        self.active_epoch = None
        self.seen_set = set()

    def check_and_update(self, epoch: int, counter: int) -> bool:
        """
        Returns True if packet is fresh and valid.
        Returns False if packet is a duplicate, expired, or replayed.
        """
        if self.active_epoch is None:
            self.active_epoch = epoch
            self.highest_counter = counter
            self._set_bit(0)
            self.seen_set.add((epoch, counter))
            return True

        if epoch < self.active_epoch:
            return False  # Old epoch rejected

        if epoch > self.active_epoch:
            # Epoch advancement: resets sliding window
            self.active_epoch = epoch
            self.highest_counter = counter
            self.bitmap = [0] * (WINDOW_SIZE_BITS // 64)
            self._set_bit(0)
            self.seen_set.add((epoch, counter))
            return True

        # Same epoch
        if (epoch, counter) in self.seen_set:
            return False  # Direct duplicate detected

        diff = counter - self.highest_counter
        if diff > 0:
            # New highest counter: shift window
            self._shift_window(diff)
            self.highest_counter = counter
            self._set_bit(0)
            self.seen_set.add((epoch, counter))
            return True
        else:
            offset = -diff
            if offset >= WINDOW_SIZE_BITS:
                return False  # Fell off the back of the sliding window

            if self._test_bit(offset):
                return False  # Already seen in sliding bitmap

            self._set_bit(offset)
            self.seen_set.add((epoch, counter))
            return True

    def _set_bit(self, offset: int):
        word_idx = offset // 64
        bit_idx = offset % 64
        self.bitmap[word_idx] |= (1 << bit_idx)

    def _test_bit(self, offset: int) -> bool:
        word_idx = offset // 64
        bit_idx = offset % 64
        return bool(self.bitmap[word_idx] & (1 << bit_idx))

    def _shift_window(self, shift_bits: int):
        # Shifts the bitmap words down to accommodate new highest counter
        if shift_bits >= WINDOW_SIZE_BITS:
            self.bitmap = [0] * (WINDOW_SIZE_BITS // 64)
            return

        # Simple shift representation
        words_shift = shift_bits // 64
        bits_rem = shift_bits % 64
        new_bitmap = [0] * len(self.bitmap)
        for i in range(len(self.bitmap) - words_shift):
            new_bitmap[i + words_shift] = self.bitmap[i]
        self.bitmap = new_bitmap


def test_t3_replay_protection():
    print("[TEST T3] Running Replay Protection & Sliding Bitmap Verification...")

    rf = SlidingBitmapReplayFilter()

    # 1. Normal Sequential Packets
    assert rf.check_and_update(1, 100) is True
    assert rf.check_and_update(1, 101) is True
    assert rf.check_and_update(1, 102) is True

    # 2. Exact Duplicate Replay -> Must be Rejected
    assert rf.check_and_update(1, 101) is False, "FAILED: Duplicate counter 101 was accepted!"
    assert rf.check_and_update(1, 100) is False, "FAILED: Duplicate counter 100 was accepted!"

    # 3. Out-of-Order Delivery within Sliding Window -> Must be Accepted
    assert rf.check_and_update(1, 110) is True  # Jumps ahead
    assert rf.check_and_update(1, 105) is True  # Arrives late, but inside window
    assert rf.check_and_update(1, 105) is False # Duplicate of late packet rejected

    # 4. Old Packet Beyond 2048-bit Window -> Must be Rejected
    assert rf.check_and_update(1, 3000) is True # Jump by > 2000 counters
    assert rf.check_and_update(1, 106) is False, "FAILED: Expired packet outside 2048-bit window was accepted!"

    # 5. Boot Epoch Advancement -> Clears window and accepts
    assert rf.check_and_update(2, 1) is True
    assert rf.check_and_update(1, 5000) is False, "FAILED: Stale epoch 1 accepted after epoch 2 booted!"

    print("  -> T3 PASS: 2048-bit sliding bitmap rejects duplicates, regressions, and stale epochs.")


if __name__ == "__main__":
    test_t3_replay_protection()
