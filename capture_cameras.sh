#!/bin/bash

# Script to check CSI cameras and capture photos
# Usage: ./capture_cameras.sh

set -e

# SSH connection details
SSH_USER="proksi"
SSH_HOST="192.168.1.110"
SSH_PASS="Proksi123!"

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
    echo "⚠ Warning: sshpass not found. Install it with: brew install sshpass"
    echo "Attempting connection without sshpass (may prompt for password)..."
    SSH_CMD="ssh"
else
    SSH_CMD="sshpass -p ${SSH_PASS} ssh -o StrictHostKeyChecking=no"
fi

echo "Connecting to Raspberry Pi at ${SSH_USER}@${SSH_HOST}..."
echo "Checking for CSI cameras and capturing photos..."
echo "----------------------------------------"

# SSH and capture photos from available cameras
${SSH_CMD} "${SSH_USER}@${SSH_HOST}" << 'ENDSSH'
    # Check for video devices
    VIDEO_DEVICES=$(ls /dev/video* 2>/dev/null || true)
    
    if [ -z "$VIDEO_DEVICES" ]; then
        echo "✗ ERROR: No video devices found"
        echo "✗ CSI cameras are not detected"
        exit 1
    fi
    
    echo "Found video devices:"
    ls -l /dev/video*
    echo ""
    
    # Create directory for captures if it doesn't exist
    mkdir -p ~/camera_captures
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    
    # Capture from each camera
    for VIDEO_DEV in $VIDEO_DEVICES; do
        DEVICE_NUM=$(basename "$VIDEO_DEV" | sed 's/video//')
        OUTPUT_FILE=~/camera_captures/camera_${DEVICE_NUM}_${TIMESTAMP}.jpg
        
        echo "Capturing from $VIDEO_DEV..."
        
        # Use libcamera-still for Raspberry Pi cameras
        if command -v libcamera-still &> /dev/null; then
            libcamera-still -o "$OUTPUT_FILE" --camera "$DEVICE_NUM" --timeout 2000 --nopreview 2>/dev/null || \
            libcamera-jpeg -o "$OUTPUT_FILE" --camera "$DEVICE_NUM" --timeout 2000 2>/dev/null || \
            echo "⚠ Failed to capture from camera $DEVICE_NUM using libcamera"
        # Fallback to fswebcam
        elif command -v fswebcam &> /dev/null; then
            fswebcam -d "$VIDEO_DEV" -r 1280x720 --no-banner "$OUTPUT_FILE" 2>/dev/null || \
            echo "⚠ Failed to capture from $VIDEO_DEV using fswebcam"
        # Fallback to raspistill for older Raspberry Pi OS
        elif command -v raspistill &> /dev/null; then
            raspistill -o "$OUTPUT_FILE" -t 1 -cs "$DEVICE_NUM" 2>/dev/null || \
            echo "⚠ Failed to capture from camera $DEVICE_NUM using raspistill"
        else
            echo "✗ ERROR: No camera capture tool found (libcamera-still, fswebcam, or raspistill)"
            exit 1
        fi
        
        if [ -f "$OUTPUT_FILE" ]; then
            echo "✓ Successfully captured: $OUTPUT_FILE"
        fi
    done
    
    echo ""
    echo "Summary of captured images:"
    ls -lh ~/camera_captures/*${TIMESTAMP}*.jpg 2>/dev/null || echo "No images captured"
ENDSSH

EXIT_STATUS=$?

echo "----------------------------------------"
if [ $EXIT_STATUS -eq 0 ]; then
    echo "Camera capture completed!"
    echo "Images saved on Raspberry Pi at ~/camera_captures/"
else
    echo "Camera capture failed. Check the output above for errors."
fi

exit $EXIT_STATUS
