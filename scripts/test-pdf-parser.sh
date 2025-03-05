#!/bin/bash

# Script to test PDF parsing in SalesPal
# Usage: ./test-pdf-parser.sh [pdf_file]

# Default directory for test files
UPLOADS_DIR="../uploads"

# Check if the backend server is running
check_server() {
  if ! curl -s http://localhost:5001/api/health > /dev/null; then
    echo "Error: SalesPal backend server is not running!"
    echo "Please start the server with 'cd ../backend && npm start' first."
    exit 1
  fi
}

# Function to test a specific PDF file
test_pdf() {
  local pdf_file="$1"
  
  echo "======================================"
  echo "Testing PDF parsing for: $(basename "$pdf_file")"
  echo "======================================"
  
  # Use the pdf-test.js script to test parsing
  node pdf-test.js "$pdf_file"
  
  echo "======================================"
  echo "Test completed for: $(basename "$pdf_file")"
  echo "======================================"
  echo
}

# Main script
echo "SalesPal PDF Parser Tester"
echo "=========================="

# Check if server is running
check_server

# If a file is specified, test only that file
if [ $# -eq 1 ]; then
  if [ -f "$1" ]; then
    test_pdf "$1"
  else
    echo "Error: File not found: $1"
    exit 1
  fi
else
  # No file specified, test all PDFs in the uploads directory
  echo "Testing all PDFs in uploads directory..."
  echo
  
  # Find all PDF files in the uploads directory
  pdf_files=$(find "$UPLOADS_DIR" -type f -name "*.pdf")
  
  # If no PDF files found, exit
  if [ -z "$pdf_files" ]; then
    echo "No PDF files found in $UPLOADS_DIR"
    exit 1
  fi
  
  # Test each PDF file
  for pdf_file in $pdf_files; do
    test_pdf "$pdf_file"
    
    # Ask if user wants to continue testing
    read -p "Press Enter to continue to next file or Ctrl+C to exit..."
  done
fi

echo "All tests completed!"