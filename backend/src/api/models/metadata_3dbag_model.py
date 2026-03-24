from pydantic import BaseModel
from typing import Optional, List

class BAGPolygon(BaseModel):
    type: str
    coordinates: List[List[List[float]]]

class RecordMetadata(BaseModel):
    registration_time: Optional[str]
    version: Optional[str]
    validity_start_date: Optional[str]
    validity_end_date: Optional[str]
    inactivity_time: Optional[str]

class PandData(BaseModel):
    bag_object_type: str
    bag_id: str
    construction_year: Optional[int]
    status: Optional[str]
    is_notified_to_bag: Optional[bool]
    document_date: Optional[str]
    document_number: Optional[str]
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

class VboData(BaseModel):
    bag_object_type: str
    bag_id: str
    usage_function: Optional[List[str]]
    surface_area_m2: Optional[int]
    status: str
    energie_label: Optional[EnergieLabel] = None  # enriched from EP-Online

class AddressData(BaseModel):
    """Primary address of the building from the LVBAG /adressen endpoint."""
    street: Optional[str] = None           # openbareRuimteNaam
    house_number: Optional[int] = None     # huisnummer
    house_letter: Optional[str] = None     # huisletter
    house_number_addition: Optional[str] = None  # huisnummertoevoeging
    postcode: Optional[str] = None         # postcode
    city: Optional[str] = None             # woonplaatsNaam

class AggregatedBagResponse(BaseModel):
    bag_id: str
    address: Optional[AddressData] = None
    pand_data: PandData
    verblijfsobject_data: List[VboData]
