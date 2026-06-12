# BLE Communication Protocol — Project Fearless

## Overview
The Fearless bracelet communicates with the companion app via Bluetooth Low Energy (BLE 5.0) using a custom GATT profile.

## Device Information
- **Device Name:** `Fearless`
- **BLE Role:** Peripheral (bracelet) ↔ Central (phone app)
- **Security:** Pairing with bonding

---

## GATT Profile

### 1. Fearless Safety Service
**UUID:** `12345678-1234-5678-1234-56789abcdef0`

| Characteristic | UUID | Properties | Type | Description |
|---|---|---|---|---|
| Struggle Status | `...def1` | Read, Notify | uint8 | 0=Normal, 1=Struggle, 2=Emergency |
| Confidence Level | `...def2` | Read, Notify | uint8 | 0-100 (threat confidence %) |
| Alert Control | `...def3` | Write | uint8 | 0=Cancel, 1=Confirm, 2=Reset |
| Sensitivity Config | `...def4` | Read, Write | uint8 | 1=Low, 2=Medium, 3=High |

### 2. Battery Service (Standard)
**UUID:** `0x180F`

| Characteristic | UUID | Properties | Type | Description |
|---|---|---|---|---|
| Battery Level | `0x2A19` | Read, Notify | uint8 | 0-100% |

### 3. Device Information Service (Standard)
**UUID:** `0x180A`

| Characteristic | UUID | Properties | Type | Description |
|---|---|---|---|---|
| Manufacturer Name | `0x2A29` | Read | string | "Team Fearless" |
| Firmware Revision | `0x2A26` | Read | string | "1.0.0" |
| Model Number | `0x2A24` | Read | string | "Fearless-V1" |

---

## Data Flow

```
Bracelet (Peripheral)                    Phone App (Central)
═══════════════════                      ═══════════════════
                                         
1. Advertise "Fearless"  ──────────────► Scan for "Fearless"
2. Accept connection     ◄──────────────  Connect
3. Expose GATT services  ──────────────► Discover services
4. Subscribe to notify   ◄──────────────  Enable notifications (CCCD)
                                         
5. Detect struggle       ──Notify──────► Receive struggle status (1)
6. Send confidence       ──Notify──────► Receive confidence (85%)
                                         
7. Receive cancel cmd    ◄──Write───────  Write alert control (0=Cancel)
8. Stop buzzer                           
                                         
9. Receive sensitivity   ◄──Write───────  Write sensitivity (1=Low)
10. Update threshold                     
```

---

## Wiring Diagram

```
┌──────────────────────────────────────────┐
│           XIAO ESP32S3                    │
│                                          │
│  3.3V ────────────── VCC (MPU6050)       │
│  GND  ────────────── GND (MPU6050)       │
│  D4 (GPIO5) ──SDA── SDA (MPU6050)       │  ← 4.7kΩ pull-up to 3.3V
│  D5 (GPIO6) ──SCL── SCL (MPU6050)       │  ← 4.7kΩ pull-up to 3.3V
│  D1 (GPIO2) ──INT── INT (MPU6050)       │
│                                          │
│  D0 (GPIO1) ──────── (+) Active Buzzer   │  ← via NPN transistor if 5V
│  GND  ────────────── (-) Active Buzzer   │
│                                          │
│  BAT+ ────────────── OUT+ (TP4056)       │
│  BAT- ────────────── OUT- (TP4056)       │
│                                          │
│  (GPIO21) ────────── Onboard LED         │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│           TP4056 Module                   │
│                                          │
│  B+  ────────────── (+) LiPo Battery     │
│  B-  ────────────── (-) LiPo Battery     │
│  OUT+ ───────────── BAT+ (ESP32S3)       │
│  OUT- ───────────── BAT- (ESP32S3)       │
│  USB ────────────── Micro-USB (charging) │
└──────────────────────────────────────────┘
```
