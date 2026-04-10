

## Plan: Add `.well-known/assetlinks.json` to Public Directory

This will place the uploaded `assetlinks.json` file at `public/.well-known/assetlinks.json` so it's served at `https://shamshadfootwear.lovable.app/.well-known/assetlinks.json` — required for Android TWA (Trusted Web Activity) verification.

### Steps
1. Copy `user-uploads://assetlinks.json` to `public/.well-known/assetlinks.json`

