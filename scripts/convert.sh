#!/usr/bin/env bash
# convert.sh — OS Screen Explorer OAP converter (Mac/Linux)
#
# Prerequisites:
#   - .NET 6+ installed  (https://dotnet.microsoft.com/download)
#   - OmlUtilities tool: dotnet tool install --global OmlUtilities
#
# NOTE: OmlUtilities is primarily developed for Windows. On Linux/macOS,
# ensure you have .NET 6+ installed and the tool path is on your $PATH
# (usually ~/.dotnet/tools/). If oml-utilities has Windows-only limitations,
# see the project README: https://github.com/silviogarbes/oml-utilities
#
# Usage:
#   ./convert.sh -f /path/to/SCMS.oap  [-o ./xml-output]
#   ./convert.sh -d /path/to/oap-dir   [-o ./xml-output]

set -euo pipefail

OAP_FILE=""
OAP_DIR=""
OUT_DIR="./xml-output"

usage() {
    echo "Usage:"
    echo "  $0 -f <file.oap>  [-o <out-dir>]"
    echo "  $0 -d <oap-dir>   [-o <out-dir>]"
    exit 1
}

while getopts "f:d:o:h" opt; do
    case $opt in
        f) OAP_FILE="$OPTARG" ;;
        d) OAP_DIR="$OPTARG" ;;
        o) OUT_DIR="$OPTARG" ;;
        h) usage ;;
        *) usage ;;
    esac
done

# Check oml-utilities
if ! command -v oml &>/dev/null; then
    echo "oml-utilities not found. Attempting to install..."
    dotnet tool install --global OmlUtilities
    # Add dotnet tools to PATH for this session
    export PATH="$PATH:$HOME/.dotnet/tools"
    if ! command -v oml &>/dev/null; then
        echo "ERROR: 'oml' still not found after install."
        echo "Add ~/.dotnet/tools to your PATH: export PATH=\"\$PATH:\$HOME/.dotnet/tools\""
        exit 1
    fi
    echo "OmlUtilities installed."
fi

# Resolve OAP files
oaps=()
if [[ -n "$OAP_FILE" ]]; then
    [[ -f "$OAP_FILE" ]] || { echo "File not found: $OAP_FILE"; exit 1; }
    oaps=("$OAP_FILE")
elif [[ -n "$OAP_DIR" ]]; then
    [[ -d "$OAP_DIR" ]] || { echo "Directory not found: $OAP_DIR"; exit 1; }
    while IFS= read -r -d '' f; do oaps+=("$f"); done < <(find "$OAP_DIR" -name "*.oap" -print0)
    [[ ${#oaps[@]} -gt 0 ]] || { echo "No .oap files found in $OAP_DIR"; exit 1; }
else
    usage
fi

mkdir -p "$OUT_DIR"
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

converted=0
failed=0
index_modules="[]"

infer_type() {
    local name="$1"
    if [[ "$name" =~ _Web$ ]]; then echo "End User"
    elif [[ "$name" =~ _Lib$ ]]; then echo "Foundation"
    elif [[ "$name" =~ (_BL|_CS|_IS|_API)$ ]]; then echo "Core"
    else echo "End User"
    fi
}

for oap in "${oaps[@]}"; do
    app_name=$(basename "$oap" .oap)
    echo ""
    echo "Processing ${app_name}.oap..."

    extract_dir="$TEMP_DIR/${app_name}_extracted"
    mkdir -p "$extract_dir"
    unzip -q "$oap" -d "$extract_dir"

    # Copy application.xml
    if [[ -f "$extract_dir/application.xml" ]]; then
        cp "$extract_dir/application.xml" "$OUT_DIR/${app_name}_application.xml"
        echo "  Copied application.xml"
    fi

    # Convert each .oml
    while IFS= read -r -d '' oml_file; do
        mod_name=$(basename "$oml_file" .oml)
        out_xml="$OUT_DIR/${mod_name}.xml"
        printf "  Converting %s..." "$mod_name"

        if oml manipulate "$oml_file" "$out_xml" 2>/dev/null; then
            echo " OK"
            mod_type=$(infer_type "$mod_name")
            entry="{\"name\":\"${mod_name}\",\"xml_file\":\"${mod_name}.xml\",\"type\":\"${mod_type}\"}"
            if [[ "$index_modules" == "[]" ]]; then
                index_modules="[${entry}]"
            else
                index_modules="${index_modules%]},${entry}]"
            fi
            ((converted++)) || true
        else
            echo " FAILED"
            echo "    Possible cause: OML version mismatch."
            echo "    See: https://github.com/silviogarbes/oml-utilities"
            ((failed++)) || true
        fi
    done < <(find "$extract_dir" -name "*.oml" -print0)
done

# Write modules_index.json
first_app=$(basename "${oaps[0]}" .oap)
exported_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
cat > "$OUT_DIR/modules_index.json" <<EOF
{
  "application": "${first_app}",
  "exported_at": "${exported_at}",
  "modules": ${index_modules}
}
EOF

echo ""
echo "────────────────────────────────────────"
echo "Converted : ${converted} module(s)"
[[ $failed -gt 0 ]] && echo "Failed    : ${failed} module(s)"
echo "Output    : $(cd "$OUT_DIR" && pwd)"
echo ""
echo "Next steps:"
echo "  1. Open OS Screen Explorer in your browser"
echo "  2. Go to 'Drop XML / JSON' tab"
echo "  3. Drag the .xml files from: $(cd "$OUT_DIR" && pwd)"
