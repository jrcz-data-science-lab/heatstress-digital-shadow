import copy
import os
import shutil
import tempfile
import uuid
import zipfile
import xml.etree.ElementTree as ET

_SOURCE_LAYER_NAME = "pet-version-1"
_NEW_LAYER_NAME = "pet-session-updated"


def update_pet_layer_in_project(
    project_path: str,
    new_raster_path: str,
    base_name: str,
    style_path: str = "/data/server/styles/new-default.qml",
) -> None:
    """
    Add (or replace) a 'pet-session-updated' layer in the QGIS project (.qgz)
    by directly manipulating the zip/XML — fully thread-safe, no QgsProject
    singleton involved.

    Strategy:
      1. Clone the existing 'pet-version-1' maplayer entry (inherits CRS,
         renderer/style, WMS publication flags, etc.)
      2. Swap its id, layername and datasource for the new raster.
      3. Mirror the same change in <layer-tree-group> and <custom-order>.
      4. Atomically replace the .qgz on disk.
    """
    new_layer_id = f"pet_session_updated_{uuid.uuid4().hex[:8]}"

    # ── 1. Read .qgz ─────────────────────────────────────────────────────────
    with zipfile.ZipFile(project_path, "r") as z:
        all_names = z.namelist()
        
        try:
            qgs_name = next(n for n in all_names if n.endswith(".qgs"))
        except StopIteration:
            raise RuntimeError(
                f"No .qgs file found inside {project_path!r}; "

                "ensure this is a valid QGIS .qgz project."
            )
        
        qgs_bytes = z.read(qgs_name)
        other_files = {n: z.read(n) for n in all_names if n != qgs_name}

    root = ET.fromstring(qgs_bytes.decode("utf-8"))

    # ── 2. projectlayers: remove old pet-session-updated, clone pet-version-1 ─
    project_layers = root.find("projectlayers")
    if project_layers is None:
        raise RuntimeError("No <projectlayers> element found in project XML")

    # Remove any previous session-updated layer
    for ml in list(project_layers.findall("maplayer")):
        ln = ml.find("layername")
        if ln is not None and ln.text == _NEW_LAYER_NAME:
            project_layers.remove(ml)

    # Find the source layer to clone
    source_ml = None
    for ml in project_layers.findall("maplayer"):
        ln = ml.find("layername")
        if ln is not None and ln.text == _SOURCE_LAYER_NAME:
            source_ml = ml
            break

    if source_ml is None:
        raise RuntimeError(
            f"Source layer '{_SOURCE_LAYER_NAME}' not found in project — "
            "cannot create session-updated layer."
        )

    new_ml = copy.deepcopy(source_ml)

    # Patch id
    id_el = new_ml.find("id")
    if id_el is not None:
        id_el.text = new_layer_id

    # Patch layername
    ln_el = new_ml.find("layername")
    if ln_el is not None:
        ln_el.text = _NEW_LAYER_NAME

    # Patch datasource — store as a relative path so QGIS Server can resolve
    # it regardless of which mount prefix it uses (/data vs /io/data).
    # The filled raster lives in the same directory as map.qgz, so the
    # relative path is simply "./pet_<timestamp>_filled.tif".
    project_dir = os.path.dirname(os.path.abspath(project_path))
    rel_path = "./" + os.path.relpath(new_raster_path, project_dir)
    ds_el = new_ml.find("datasource")
    if ds_el is not None:
        ds_el.text = rel_path

    project_layers.append(new_ml)

    # ── 3. layer-tree-group: remove old, insert clone after source ───────────
    layer_tree_group = root.find("layer-tree-group")
    if layer_tree_group is not None:
        _remove_tree_layer(layer_tree_group, _NEW_LAYER_NAME)
        result = _find_tree_layer(layer_tree_group, _SOURCE_LAYER_NAME)
        if result:
            source_tl, parent = result
            new_tl = copy.deepcopy(source_tl)
            new_tl.set("id", new_layer_id)
            new_tl.set("name", _NEW_LAYER_NAME)
            children = list(parent)
            parent.insert(children.index(source_tl) + 1, new_tl)

    # ── 4. custom-order (if present): append new id after source id ──────────
    custom_order = layer_tree_group.find("custom-order") if layer_tree_group is not None else None
    if custom_order is not None:
        valid_ids = {
            ml.findtext("id")
            for ml in project_layers.findall("maplayer")
        }
        # Remove any stale ids that no longer exist in projectlayers
        for el in list(custom_order.findall("item")):
            if el.text not in valid_ids:
                custom_order.remove(el)
        # Insert new id after source id
        source_id = _find_layer_id(root, _SOURCE_LAYER_NAME)
        source_item = next(
            (el for el in custom_order.findall("item") if el.text == source_id),
            None,
        )
        if source_item is not None:
            items = list(custom_order.findall("item"))
            new_item = ET.Element("item")
            new_item.text = new_layer_id
            custom_order.insert(items.index(source_item) + 1, new_item)

    # ── 5. Write .qgz atomically ─────────────────────────────────────────────
    qgs_output = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        + ET.tostring(root, encoding="unicode")
    )

    tmp_fd, tmp_path = tempfile.mkstemp(suffix=".qgz", dir=os.path.dirname(project_path))
    try:
        os.close(tmp_fd)
        with zipfile.ZipFile(tmp_path, "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr(qgs_name, qgs_output.encode("utf-8"))
            for name, data in other_files.items():
                z.writestr(name, data)
        shutil.move(tmp_path, project_path)
    except Exception:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise


# ── Helpers ───────────────────────────────────────────────────────────────────

def _remove_tree_layer(group: ET.Element, name: str) -> None:
    for child in list(group):
        if child.tag == "layer-tree-layer" and child.get("name") == name:
            group.remove(child)
        elif child.tag == "layer-tree-group":
            _remove_tree_layer(child, name)


def _find_tree_layer(group: ET.Element, name: str):
    """Return (element, parent) or None."""
    for child in group:
        if child.tag == "layer-tree-layer" and child.get("name") == name:
            return child, group
        elif child.tag == "layer-tree-group":
            result = _find_tree_layer(child, name)
            if result:
                return result
    return None


def _find_layer_id(root: ET.Element, layer_name: str) -> str | None:
    """Return the <id> text for the first maplayer with the given layername."""
    pl = root.find("projectlayers")
    if pl is None:
        return None
    for ml in pl.findall("maplayer"):
        ln = ml.find("layername")
        if ln is not None and ln.text == layer_name:
            id_el = ml.find("id")
            return id_el.text if id_el is not None else None
    return None
