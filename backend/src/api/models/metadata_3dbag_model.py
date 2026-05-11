from pydantic import BaseModel
from typing import Optional, List

class BAGPolygon(BaseModel):
    type: str
    coordinates: List[List[List[float]]]

class RecordMetadata(BaseModel):
    registration_time: Optional[str] = None
    version: Optional[str] = None
    validity_start_date: Optional[str] = None
    validity_end_date: Optional[str] = None
    inactivity_time: Optional[str] = None

class PandData(BaseModel):
    bag_object_type: str
    bag_id: str
    construction_year: Optional[int] = None
    status: Optional[str] = None
    is_notified_to_bag: Optional[bool] = None
    document_date: Optional[str] = None
    document_number: Optional[str] = None
    record_metadata: RecordMetadata
    geometry: BAGPolygon

class EnergieLabel(BaseModel):
    """
    Energy performance certificate data from EP-Online.
    Fields follow the EP-Online API v5 naming convention (Nederlandstalig).
    """
    energieklasse: Optional[str] = None           # e.g. "A", "B", "A+", "A+++"
    energie_index: Optional[float] = None         # numeric energy performance index
    registratiedatum: Optional[str] = None        # date the certificate was registered
    geldig_tot: Optional[str] = None              # certificate expiry date
    energiebehoefte: Optional[float] = None       # energy demand kWh/m²/year
    primaire_fossiele_energie: Optional[float] = None  # primary fossil energy kWh/m²/year
    aandeel_hernieuwbare_energie: Optional[float] = None  # renewable share %
    warmtebehoefte: Optional[float] = None        # heat demand kWh/m²/year
    gebouwklasse: Optional[str] = None            # "W" = residential, "U" = utility

class VboAdres(BaseModel):
    """Address of an individual unit (VBO) from the expanded heeftAlsHoofdadres."""
    house_number: Optional[int] = None
    house_letter: Optional[str] = None
    house_number_addition: Optional[str] = None
    postcode: Optional[str] = None

class VboData(BaseModel):
    bag_object_type: str
    bag_id: str
    usage_function: Optional[List[str]] = None
    surface_area_m2: Optional[int] = None
    status: str
    adres: Optional[VboAdres] = None       # unit address (for apartments)
    energie_label: Optional[EnergieLabel] = None  # enriched from EP-Online

class AddressData(BaseModel):
    """Primary address of the building from the LVBAG /adressen endpoint."""
    street: Optional[str] = None           # openbareRuimteNaam
    house_number: Optional[int] = None     # huisnummer
    house_letter: Optional[str] = None     # huisletter
    house_number_addition: Optional[str] = None  # huisnummertoevoeging
    postcode: Optional[str] = None         # postcode
    city: Optional[str] = None             # woonplaatsNaam

class PandEnergieData(BaseModel):
    """Pand-level energy fields from EP-Online (same for all VBOs in the building)."""
    energieklasse: Optional[str] = None        # Pand_energieklasse
    gebouwklasse: Optional[str] = None         # Pand_gebouwklasse ("W" / "U")
    gebouwtype: Optional[str] = None           # Pand_gebouwtype
    projectnaam: Optional[str] = None          # Pand_projectnaam
    energiebehoefte: Optional[float] = None    # Pand_energiebehoefte kWh/m²
    eis_energiebehoefte: Optional[float] = None  # Pand_eis_energiebehoefte kWh/m²

class AggregatedBagResponse(BaseModel):
    bag_id: str
    address: Optional[AddressData] = None
    pand_energie_data: Optional[PandEnergieData] = None
    pand_data: PandData
    verblijfsobject_data: List[VboData]
