# Wiring Diagram — Project Fearless Safety Bracelet

This document details the physical hardware connections and schematic details for the Fearless safety bracelet.

## Component List
1.  **Microcontroller:** Seeed Studio XIAO ESP32S3 (Compact dual-core MCU with built-in antenna and battery charging pads)
2.  **IMU Sensor:** MPU6050 (6-axis accelerometer + gyroscope)
3.  **Alert Indicator:** 5V Active Piezo Buzzer (high-pitch sound)
4.  **Battery Management:** TP4056 charging module with protection
5.  **Power Source:** 3.7V 250mAh LiPo rechargeable battery
6.  **Transistor:** PN2222 NPN Transistor (acts as a switch for the 5V buzzer load)
7.  **Resistors:** 
    *   2 × 4.7kΩ resistors (I2C pull-up resistors)
    *   1 × 1kΩ resistor (Transistor base current limiter)

---

## Connection Table

| Source Device (XIAO ESP32S3) | Target Device | Pin Name | Description |
|---|---|---|---|
| **3.3V** | MPU6050 | VCC | Sensor VCC power (3.3V) |
| **GND** | MPU6050 | GND | Ground connection |
| **D4 (GPIO5)** | MPU6050 | SDA | I2C Serial Data (needs 4.7kΩ pull-up to 3.3V) |
| **D5 (GPIO6)** | MPU6050 | SCL | I2C Serial Clock (needs 4.7kΩ pull-up to 3.3V) |
| **D1 (GPIO2)** | MPU6050 | INT | Sensor Interrupt (WOM wake signal; RTC-capable) |
| **D0 (GPIO1)** | Transistor Base | B | Buzzer trigger (outputs high to sound buzzer, via 1kΩ resistor) |
| **GND** | Transistor Emitter | E | Buzzer ground switch |
| **5V / VEXT** | Active Buzzer (+) | (+) | High-voltage supply for loud beep |
| **Transistor Collector** | Active Buzzer (-) | (-) | Switched ground connection to complete circuit |
| **BAT+ (back pad)** | TP4056 / Battery | OUT+ | Positive battery connection |
| **BAT- (back pad)** | TP4056 / Battery | OUT- | Negative battery ground connection |

---

## Schematic Schemas

### 1. MPU6050 I2C Connections
```
                     3.3V
                      │
                     ┌┴┐ 4.7kΩ (Pull-up)
                     │ │
                     └┬┘
  XIAO D4 (SDA) ──────┼────────── SDA (MPU6050)
                      │
                     ┌┴┐ 4.7kΩ (Pull-up)
                     │ │
                     └┬┘
  XIAO D5 (SCL) ──────┼────────── SCL (MPU6050)
```

### 2. Buzzer Driver Circuit (NPN Transistor Switch)
Since the ESP32-S3 GPIO outputs 3.3V and up to 20mA, driving a 5V buzzer directly can draw too much current and sound weak. We use a PN2222 NPN transistor as a low-side switch.
```
  XIAO D0 (GPIO1) ───[ 1kΩ Resistor ]─── Base (PN2222)
                                          │
                               Collect ───┴─── Buzzer (-) ─────── [ 5V / VCC ]
                                          │
                                 Emit ────┬─── Ground (GND)
```

### 3. TP4056 Battery Charging
```
  [ USB Type-C ] ──────────────► TP4056 charging module
                                   ├── B+ ───────────► (+) LiPo Battery
                                   ├── B- ───────────► (-) LiPo Battery
                                   ├── OUT+ ─────────► BAT+ (XIAO battery pad)
                                   └── OUT- ─────────► BAT- (XIAO battery pad)
```
*Note: The Seeed XIAO ESP32S3 features built-in battery charger pads on the underside. Connecting the battery directly to the BAT+ and BAT- pads allows charging directly via the XIAO USB port without an external TP4056, making it ideal for compact wearable builds.*
