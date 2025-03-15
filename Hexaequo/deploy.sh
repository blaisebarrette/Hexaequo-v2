#!/bin/bash

# Hexaequo Deployment Script
# This script helps deploy the Hexaequo game to a web server

# Display banner
echo "====================================="
echo "  Hexaequo Deployment Script"
echo "====================================="
echo ""

# Check if destination is provided
if [ -z "$1" ]; then
    echo "Usage: ./deploy.sh <destination_directory>"
    echo "Example: ./deploy.sh /var/www/html/hexaequo"
    exit 1
fi

DEST_DIR="$1"

# Check if destination directory exists
if [ ! -d "$DEST_DIR" ]; then
    echo "Destination directory does not exist. Creating it..."
    mkdir -p "$DEST_DIR"
    
    if [ $? -ne 0 ]; then
        echo "Error: Failed to create destination directory. Check permissions."
        exit 1
    fi
fi

# Copy all files to destination
echo "Copying files to $DEST_DIR..."
cp -R ./* "$DEST_DIR"

if [ $? -ne 0 ]; then
    echo "Error: Failed to copy files. Check permissions."
    exit 1
fi

# Set proper permissions
echo "Setting permissions..."
find "$DEST_DIR" -type d -exec chmod 755 {} \;
find "$DEST_DIR" -type f -exec chmod 644 {} \;

# Make this script executable
chmod 755 "$DEST_DIR/deploy.sh"

echo ""
echo "Deployment completed successfully!"
echo "Your Hexaequo game is now available at: $DEST_DIR"
echo ""
echo "If you're using Apache, make sure the directory is properly configured."
echo "For Nginx, ensure your server block points to this directory."
echo ""
echo "Thank you for using Hexaequo!"
echo "=====================================" 