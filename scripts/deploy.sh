#!/bin/bash

# Task Manager Deployment Script
# This script handles the deployment process for both frontend and backend

set -e  # Exit on any error

echo "🚀 Starting Task Manager deployment..."

# Configuration
FRONTEND_DIR="frontend"
BACKEND_DIR="backend"
BUILD_DIR="dist"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    print_status "Dependencies check passed ✓"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install backend dependencies
    print_status "Installing backend dependencies..."
    cd $BACKEND_DIR
    npm ci --only=production
    cd ..
    
    # Install frontend dependencies
    print_status "Installing frontend dependencies..."
    cd $FRONTEND_DIR
    npm ci
    cd ..
    
    print_status "Dependencies installed ✓"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    # Run backend tests
    print_status "Running backend tests..."
    cd $BACKEND_DIR
    npm test -- --run
    cd ..
    
    # Run frontend tests
    print_status "Running frontend tests..."
    cd $FRONTEND_DIR
    npm test -- --run
    cd ..
    
    print_status "All tests passed ✓"
}

# Build frontend
build_frontend() {
    print_status "Building frontend for production..."
    
    cd $FRONTEND_DIR
    npm run build
    cd ..
    
    print_status "Frontend build completed ✓"
}

# Database migration
run_migrations() {
    print_status "Running database migrations..."
    
    cd $BACKEND_DIR
    if [ -f "scripts/migrate.js" ]; then
        node scripts/migrate.js
        print_status "Database migrations completed ✓"
    else
        print_warning "No migration script found, skipping..."
    fi
    cd ..
}

# Health check
health_check() {
    print_status "Performing health check..."
    
    # Check if backend is running
    if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
        print_status "Backend health check passed ✓"
    else
        print_warning "Backend health check failed - server may not be running"
    fi
}

# Main deployment process
main() {
    print_status "Starting deployment process..."
    
    check_dependencies
    install_dependencies
    
    # Skip tests in production if SKIP_TESTS is set
    if [ "$SKIP_TESTS" != "true" ]; then
        run_tests
    else
        print_warning "Skipping tests (SKIP_TESTS=true)"
    fi
    
    build_frontend
    run_migrations
    
    print_status "🎉 Deployment completed successfully!"
    print_status "Frontend build available in: $FRONTEND_DIR/$BUILD_DIR"
    print_status "Backend ready to start with: cd $BACKEND_DIR && npm start"
    
    health_check
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "build-only")
        check_dependencies
        cd $FRONTEND_DIR && npm ci && npm run build
        print_status "Build-only completed ✓"
        ;;
    "test-only")
        check_dependencies
        run_tests
        ;;
    "migrate")
        run_migrations
        ;;
    *)
        echo "Usage: $0 [deploy|build-only|test-only|migrate]"
        exit 1
        ;;
esac