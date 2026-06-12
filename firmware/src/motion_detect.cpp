/**
 * @file motion_detect.cpp
 * @brief Wake-on-Motion configuration for MPU6050 sensor
 */

#include "motion_detect.h"

void configureWakeOnMotion(MPU6050& mpu) {
    Serial.println("[MPU] Configuring low-power Wake-on-Motion...");

    // 1. Disable sleep mode so we can write registers
    mpu.setSleepEnabled(false);
    delay(10);

    // 2. Put all gyroscopes in standby mode to conserve battery
    mpu.setStandbyGyroXEnabled(true);
    mpu.setStandbyGyroYEnabled(true);
    mpu.setStandbyGyroZEnabled(true);
    delay(10);

    // 3. Set Accelerometer High Pass Filter (HPF)
    // Mode 1: 5Hz cutoff (filters out gravity offset)
    mpu.setDHPFMode(1); 
    delay(10);

    // 4. Set Motion Detection Threshold (1 LSB = 32mg)
    // 20 LSB = 640mg threshold
    mpu.setMotionDetectionThreshold(20);
    delay(5);

    // 5. Set Motion Detection Duration (1 LSB = 1ms)
    // 40ms duration
    mpu.setMotionDetectionDuration(40);
    delay(5);

    // 6. Enable motion detection interrupt
    mpu.setIntMotionEnabled(true);
    delay(5);

    // 7. Configure INT pin behavior:
    // Active-high (0), Push-pull (0), Latched (1), Clear on status read (0)
    mpu.setInterruptMode(0);
    mpu.setInterruptDrive(0);
    mpu.setInterruptLatch(1);
    mpu.setInterruptLatchClear(0);
    delay(5);

    // 8. Clear interrupt status by reading it once
    mpu.getIntMotionStatus();

    // 9. Enable low power cycle mode (cycles sleep/wake for accel measures)
    // Wake cycle frequency: 1 = 5Hz (low power consumption, fast response)
    mpu.setWakeFrequency(1);
    mpu.setWakeCycleEnabled(true);

    Serial.println("[MPU] Wake-on-Motion successfully configured");
}
