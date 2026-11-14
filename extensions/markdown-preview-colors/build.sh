#!/usr/bin/env bash
# Package the extension as a .vsix without vsce.
#
# A .vsix is a zip (Open Packaging Conventions) holding:
#   [Content_Types].xml      MIME type per file extension
#   extension.vsixmanifest   identity + engine, read by the installer
#   extension/...            the extension files themselves
#
# Usage: ./build.sh            -> dist/markdown-preview-colors-<version>.vsix
#        ./build.sh --install  -> also installs it into VS Code (--force)
set -euo pipefail

cd "$(dirname "$0")"

NAME=markdown-preview-colors
PUBLISHER=local
VERSION=$(sed -n 's/^  "version": "\(.*\)",$/\1/p' package.json)
ENGINE=$(sed -n 's/^    "vscode": "\(.*\)"$/\1/p' package.json)
OUT="dist/$NAME-$VERSION.vsix"

STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT

mkdir -p "$STAGE/extension/generated"
cp package.json extension.js README.md "$STAGE/extension/"
cp generated/preview.css "$STAGE/extension/generated/"

cat > "$STAGE/[Content_Types].xml" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension=".json" ContentType="application/json"/>
  <Default Extension=".js" ContentType="application/javascript"/>
  <Default Extension=".css" ContentType="text/css"/>
  <Default Extension=".md" ContentType="text/markdown"/>
  <Default Extension=".vsixmanifest" ContentType="text/xml"/>
</Types>
XML

cat > "$STAGE/extension.vsixmanifest" <<XML
<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="$NAME" Version="$VERSION" Publisher="$PUBLISHER"/>
    <DisplayName>Markdown Preview Colors</DisplayName>
    <Description xml:space="preserve">Colors bold text and headings in the markdown preview to match the active theme.</Description>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="$ENGINE"/>
    </Properties>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code"/>
  </Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/>
  </Assets>
</PackageManifest>
XML

mkdir -p dist
rm -f "$OUT"
(cd "$STAGE" && zip -qrX - .) > "$OUT"
echo "Built $OUT"

if [[ "${1:-}" == "--install" ]]; then
  if [[ -z "${CODE:-}" ]]; then
    MAC_CODE="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
    if command -v code >/dev/null; then CODE=code
    elif [[ -x "$MAC_CODE" ]]; then CODE="$MAC_CODE"
    else echo "VS Code CLI not found; set CODE=/path/to/code" >&2; exit 1
    fi
  fi
  "$CODE" --install-extension "$OUT" --force
  echo "Installed. Run 'Developer: Reload Window' in VS Code."
fi
