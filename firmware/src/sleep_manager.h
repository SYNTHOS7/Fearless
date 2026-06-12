/**
 * @file sleep_manager.h
 * @brief Deep sleep and power management for Fearless bracelet
 */

#ifndef SLEEP_MANAGER_H
#define SLEEP_MANAGER_H

#include <Arduino.h>
#include <MPU6050.h>

/**
 * Initialize the sleep manager
 */
void sleepInit();

/**
 * Update the inactivity timer based on motion and connection status.
 * If inactivity exceeds timeout, triggers deep sleep.
 * @param accelMag Current accelerometer magnitude (g)
 * @param gyroMag Current gyroscope magnitude (dps)
 * @param isConnected True if BLE client is connected
 * @param mpu Reference to MPU6050 driver for sleep register configuration
 */
void sleepUpdate(float accelMag, float gyroMag, bool isConnected, MPU6050& mpu);

/**
 * Put device into deep sleep, configuring MPU6050 interrupt as wake source.
 */
void enterDeepSleep(MPU6050& mpu);

#endif // SLEEP_MANAGER_H
