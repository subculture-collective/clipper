#!/bin/bash

# Script to generate RSA key pair for JWT signing

set -e

echo "Generating RSA key pair for JWT signing..."

# Generate private key
openssl genrsa -out private.pem 2048 2>/dev/null

# Generate public key from private key
openssl rsa -in private.pem -pubout -out public.pem 2>/dev/null

echo ""
echo "Keys generated successfully!"
echo ""
echo "Add the following to your .env file:"
echo ""
echo "JWT_PRIVATE_KEY="
cat private.pem
echo ""
echo "JWT_PUBLIC_KEY="
cat public.pem
echo ""

# Clean up
rm -f private.pem public.pem

echo "Note: The keys above have been displayed and deleted from disk."
echo "Copy them to your .env file now!"
