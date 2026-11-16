#!/bin/bash
# Package release/Alfred.app (already Developer ID signed) as a DMG and a ZIP, notarized and stapled.
# Needs MAC_SIGN_IDENTITY and NOTARY_KEY_P8 (key contents), NOTARY_KEY_ID, NOTARY_ISSUER_ID.
set -euo pipefail
cd "$(dirname "$0")/../release"
key="$(mktemp -t notary).p8"; trap 'rm -f "$key"' EXIT
printf '%s\n' "$NOTARY_KEY_P8" > "$key"
notary=(--key "$key" --key-id "$NOTARY_KEY_ID" --issuer "$NOTARY_ISSUER_ID")

rm -rf dmg Alfred-mac-arm64.dmg Alfred-mac-arm64.zip
mkdir dmg && ditto Alfred.app dmg/Alfred.app && ln -s /Applications dmg/Applications
hdiutil create -volname Alfred -srcfolder dmg -ov -format UDZO Alfred-mac-arm64.dmg
rm -rf dmg
codesign --timestamp --sign "$MAC_SIGN_IDENTITY" Alfred-mac-arm64.dmg

# Notarizing the DMG also notarizes the app inside it, so both can be stapled.
result=$(xcrun notarytool submit Alfred-mac-arm64.dmg "${notary[@]}" --wait --timeout 40m --output-format json)
echo "$result"
id=$(echo "$result" | /usr/bin/python3 -c 'import json,sys;print(json.load(sys.stdin)["id"])')
status=$(echo "$result" | /usr/bin/python3 -c 'import json,sys;print(json.load(sys.stdin)["status"])')
if [ "$status" != "Accepted" ]; then xcrun notarytool log "$id" "${notary[@]}"; exit 1; fi

xcrun stapler staple Alfred-mac-arm64.dmg
xcrun stapler staple Alfred.app
spctl --assess --type open --context context:primary-signature -v Alfred-mac-arm64.dmg
spctl --assess --type execute -v Alfred.app

ditto -c -k --keepParent Alfred.app Alfred-mac-arm64.zip
shasum -a 256 Alfred-mac-arm64.dmg > Alfred-mac-arm64.dmg.sha256
shasum -a 256 Alfred-mac-arm64.zip > Alfred-mac-arm64.zip.sha256
