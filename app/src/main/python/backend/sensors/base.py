"""
backend/sensors/base.py
Abstract sensor contract. v2: magnetometer + sensor fusion.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class SensorReading:
    # Jamming
    jam_score:    int            = 0
    cn0:          Optional[float] = None
    agc:          Optional[float] = None
    # Spoofing
    spoof_score:  int   = 0
    time_delta:   float = 0.0
    coord_jump_m: float = 0.0
    # Probe
    probe_score:  int   = 0
    probe_count:  int   = 0
    # Magnetometer
    emf_confidence:  int             = 0
    emf_source:      str             = "NONE"
    magnitude_ut:    Optional[float] = None
    peak_ut:         Optional[float] = None
    variance_ut2:    Optional[float] = None

    @property
    def fused_jam_score(self) -> int:
        if self.jam_score == 0:
            return 0
        # Military jammers operate at distance (5+ km) — no measurable EMF at
        # the handset. When jamming is extreme (satellite lock fully lost, score
        # at max), bypassing the EMF gate is correct. Close-range threats still
        # benefit from EMF confirmation at lower scores.
        if self.jam_score >= 80:
            return self.jam_score
        emf_c = self.emf_confidence
        if emf_c >= 40:
            return self.jam_score
        elif emf_c >= 15:
            return int(self.jam_score * (0.4 + 0.6 * (emf_c / 40)))
        else:
            return self.jam_score // 2

    @property
    def status(self) -> str:
        fj = self.fused_jam_score
        if self.spoof_score >= 50 or self.probe_score >= 70:
            return "CRITICAL"
        if fj >= 70:
            return "CRITICAL"
        if fj >= 40 or self.spoof_score >= 20 or self.probe_score >= 40:
            return "DISTURBED"
        return "CLEAR"

    @property
    def alerts(self) -> list:
        out = []
        fj = self.fused_jam_score
        # Alert on confirmed jamming OR documented passive loss
        if fj >= 40 or (self.jam_score >= 40 and self.emf_source == "PASSIVE_LOSS"):
            cn0_str = f"{self.cn0:.1f}" if self.cn0 is not None else "?"
            if self.emf_source == "ACTIVE_SUPPRESSION":
                out.append(f"RF JAMMING + EMF — Active suppression confirmed ({cn0_str} dBHz)")
            elif self.emf_source == "PASSIVE_LOSS":
                out.append(f"SIGNAL LOSS — Passive (tunnel/building) ({cn0_str} dBHz)")
            else:
                out.append(f"RF JAMMING — C/N0 suppressed ({cn0_str} dBHz)")
        if self.emf_confidence >= 60 and fj < 40:
            ut = f"{self.magnitude_ut:.0f}" if self.magnitude_ut else "?"
            out.append(f"EMF ANOMALY — High-field source nearby ({ut} uT)")
        if self.coord_jump_m > 500:
            out.append(f"TELEPORT — {self.coord_jump_m:.0f}m jump detected")
        if self.probe_score >= 70:
            out.append("PROBE FLOOD — Possible drone surveillance")
        return out

    def to_dict(self) -> dict:
        return {
            "status":          self.status,
            "jam_score":       self.jam_score,
            "fused_jam_score": self.fused_jam_score,
            "spoof_score":     self.spoof_score,
            "probe_score":     self.probe_score,
            "emf_confidence":  self.emf_confidence,
            "emf_source":      self.emf_source,
            "magnitude_ut":    round(self.magnitude_ut, 1) if self.magnitude_ut is not None else None,
            "peak_ut":         round(self.peak_ut, 1)      if self.peak_ut      is not None else None,
            "variance_ut2":    round(self.variance_ut2, 1) if self.variance_ut2 is not None else None,
            "cn0":             round(self.cn0, 1)          if self.cn0          is not None else None,
            "agc":             round(self.agc, 1)          if self.agc          is not None else None,
            "time_delta":      round(self.time_delta, 3),
            "coord_jump_m":    round(self.coord_jump_m, 1),
            "probe_count":     self.probe_count,
            "alerts":          self.alerts,
        }


class BaseSensor(ABC):
    @abstractmethod
    def read(self) -> SensorReading:
        ...
    def close(self) -> None:
        pass
