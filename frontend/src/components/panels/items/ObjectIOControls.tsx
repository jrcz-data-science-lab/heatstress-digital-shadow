import React, { useRef, useState, useEffect } from "react";
import type {
  MeasureType,
  ObjectInstance,
} from "../../../features/objects/lib/objectLayer";
import {
  generateExportString,
  parseImportFile,
} from "../../../features/objects/lib/fileIOUtils";

interface Props {
  objects: ObjectInstance[];
  objectTypes: MeasureType[];
  onImportFinished: (newObjects: ObjectInstance[]) => void;
  disabled?: boolean;
}

export function ObjectIOControls({
  objects = [],
  objectTypes,
  onImportFinished,
  disabled,
}: Props) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }
    if (showExportMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showExportMenu]);

  const handleExport = (format: "geojson" | "json") => {
    setShowExportMenu(false);

    if (objects.length === 0) {
      alert("No objects to export.");
      return;
    }

    const { data, filename } = generateExportString(objects, format);

    const blob = new Blob([data], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const newObjects = await parseImportFile(file, objectTypes);
      onImportFinished(newObjects);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to parse file.";
      alert(message);
    } finally {
      e.target.value = "";
    }
  };

  // STYLE
  const btnStyle: React.CSSProperties = {
    padding: "8px 15px",
    border: "solid 1px #d1d1d1ff",
    cursor: disabled ? "not-allowed" : "pointer",
    flex: 1,
  };

  const containerStyle: React.CSSProperties = {
    display: "flex",
    gap: 8,
    marginTop: "1rem",
    borderTop: "1px solid #e0e0e0",
    paddingTop: "1rem",
    position: "relative",
  };

  const popupStyle: React.CSSProperties = {
    position: "absolute",
    top: "100%",
    width: "48%",
    right: 0,
    marginTop: "5px",
    backgroundColor: "white",
    border: "1px solid #ccc",
    borderRadius: "2px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
    zIndex: 1000,
    minWidth: "140px",
  };

  const menuItemStyle: React.CSSProperties = {
    padding: "10px",
    border: "none",
    background: "transparent",
    textAlign: "left" as const,
    cursor: "pointer",
    fontSize: "13px",
    width: "100%",
    boxSizing: "border-box",
    borderRadius: "0",
  };

  return (
    <div style={containerStyle}>
      {/* IMPORT BUTTON */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        style={btnStyle}
      >
        Import
      </button>

      {/* EXPORT BUTTON */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setShowExportMenu(!showExportMenu);
        }}
        disabled={disabled}
        style={btnStyle}
      >
        Export ▾
      </button>

      {/* POPUP MENU */}
      {showExportMenu && (
        <div style={popupStyle} ref={menuRef}>
          <button
            type="button"
            style={{ ...menuItemStyle, borderBottom: "1px solid #eee" }}
            onClick={() => handleExport("geojson")}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#f5f5f5")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            Export GeoJSON
          </button>
          <button
            type="button"
            style={menuItemStyle}
            onClick={() => handleExport("json")}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#f5f5f5")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            Export Raw JSON
          </button>
        </div>
      )}

      {/* HIDDEN INPUT */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept=".json,.geojson"
        onChange={handleFileSelect}
      />
    </div>
  );
}
