/**
 * @file motion_detect.h
 * @brief Wake-on-Motion configuration for MPU6050 sensor
 * 
 * Configures the MPU6050 registers to generate an interrupt signal
 * on its INT pin when motion exceeds a specified threshold.
 */

#ifndef MOTION_DETECT_H
#define MOTION_DETECT_H

#include <MPU6050.h>

/**
 * Configure the MPU6050 to enter a low-power state and generate
 * an interrupt signal on the INT pin when motion is detected.
 * @param mpu Reference to the initialized MPU6050 driver instance.
 */
void configureWakeOnMotion(MPU6050& mpu);

#endif // MOTION_DETECT_H
