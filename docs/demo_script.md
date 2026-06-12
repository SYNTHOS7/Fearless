# Project Fearless — Makers Conclave Live Demo Script

This script guides the team through a professional, high-impact, 3-minute live demonstration of the Fearless AI-Powered Safety Bracelet and Companion App.

---

## Pre-Demo Preparation Checklist
- [ ] **Wearable:** Confirm battery is charged (>3.7V). Power on the Seeed XIAO ESP32-S3.
- [ ] **Serial Monitor:** Have a laptop nearby running `pio device monitor --baud 115200` to show real-time IMU sampling (50Hz) and AI jerk calculations on the big screen.
- [ ] **Mobile Device:** Ensure Bluetooth and Location Services are turned ON.
- [ ] **Permissions:** Confirm GPS Location and Audio permissions are granted to the Fearless App.
- [ ] **Contacts:** Have a test phone number ready to receive the emergency SMS.
- [ ] **Fallback Setup:** If Bluetooth interference is high in the Conclave hall, enable **BLE Simulation Mode** in the app settings to demonstrate the software flow seamlessly.

---

## Presentation Timeline (3 Minutes)

### Phase 1: The Problem & Solution (0:00 - 0:45)
**Presenter 1 (Holding the Bracelet):**
*   "Every day, individuals face sudden physical emergencies — medical attacks, falls, or personal safety threats — where reaching for a phone to call for help is physically impossible. Current panic buttons require manual presses, which can be easily blocked or forgotten during a struggle."
*   "We built **Project Fearless** — a low-latency, wearable safety bracelet and companion app that automatically detects physical struggles using motion analysis, validates the threat with phone sensors, and dispatches location alerts without requiring any manual interaction."
*   *(Points to the bracelet)*: "The bracelet is powered by a tiny Seeed XIAO ESP32-S3, an MPU6050 6-axis motion sensor, and a piezo buzzer, all run on a rechargeable LiPo battery."

---

### Phase 2: Pairing & Dashboard (0:45 - 1:30)
**Presenter 2 (Holding the Phone / Screen Mirroring Active):**
*   "Let me walk you through the onboarding. When a user first opens the app, we request GPS and audio permissions, scan for the bracelet via Bluetooth Low Energy, and pair it in one tap."
*   "Once paired, we configure our trusted emergency contacts. Here, we've set up *Jane* as our contact with a custom message note: 'I have a history of asthma, please hurry.'"
*   "Our dashboard provides real-time safety monitoring. You can see the green **Risk Meter** indicating a 0% risk level when static, the bracelet's battery status, and active BLE connection indicators."
*   *(Performs steady wrist movement)*: "As I walk or move my hand normally, our custom jerk filter filters out gravity and keeps the risk meter green, preventing false positives."

---

### Phase 3: Automatic Alert Trigger & Phone Verification (1:30 - 2:30)
**Presenter 1 (Performs rapid erratic shaking / struggle motion on wrist):**
*   "Now, let's simulate an active physical struggle or sudden medical emergency."
*   *(Buzzer on the bracelet begins pulsing rapidly, onboard LED goes solid solid low)*.
*   "Immediately, the bracelet's threshold detection triggers, and it sends a Struggle Status notification to the phone via BLE."
*   "The phone app receives the signal. Before alerting, it runs **Context Verification**: it checks its own accelerometer to see if the phone is also shaking, and records a 2-second ambient audio sample to listen for high-amplitude distress sounds."
*   *(Phone screen displays the pulsing red Alert Countdown Overlay with a 10-second timer. Vibration and warning haptics start).*
*   "A loud warning sounds, and the user gets a haptic countdown. This gives the user a chance to cancel in case of a false alarm. If the user does not tap cancel..."
*   *(Countdown reaches 0, vibration stops, and the Native SMS Composer slides up pre-filled with the contact's number and message).*
*   "The app fetches high-accuracy GPS coordinates, formats a Google Maps URL, appends the personal note, and opens the pre-filled SMS composer. With a single tap, the alert is sent."

---

### Phase 4: Sleep Mode, Ext0 Wake-up, & Conclusion (2:30 - 3:00)
**Presenter 2:**
*   "To maximize battery life for a wearable, the bracelet features an intelligent power state machine."
*   "If the user takes off the bracelet and places it on a table, the firmware detects complete stillness for 2 minutes. It disconnects BLE, turns off the LED, configures the MPU6050 registers for Wake-on-Motion at 5Hz, and puts the ESP32-S3 into **Deep Sleep**, drawing less than 100 microamps."
*   *(Presenter 2 picks up the still bracelet and gives it a light tap)*.
*   "The moment it is moved or picked up, the MPU6050's hardware interrupt fires on GPIO2, waking the microcontroller instantly, re-establishing BLE, and resuming safety monitoring in under 1 second."
*   "Project Fearless is a robust, low-power, and zero-friction safety net that keeps you protected when seconds matter most. Thank you!"

---

## Fallback Plan (If Real BLE Fails)
If RF noise in the conclave hall prevents pairing:
1.  Open **Settings** inside the companion app.
2.  Toggle **BLE Simulation Mode** to **ON**.
3.  Explain to the judges: *"Due to Bluetooth congestion in the exhibition hall, we are running our demonstration on our simulated BLE and sensor engine, which executes the exact same state machine as our physical hardware."*
4.  Return to the Dashboard screen.
5.  Long-press the red **SOS Button** to trigger the 10-second Alert Countdown overlay, show the haptics, and demonstrate the GPS and SMS prefill flow.
