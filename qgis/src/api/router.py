from fastapi import APIRouter
from src.api.controllers import burn_controller, pet_controller, shadow_controller, wind_controller

api_router = APIRouter()

api_router.include_router(burn_controller.router, prefix="/burn", tags=["Burn"])
api_router.include_router(pet_controller.router, prefix="/pet", tags=["PET"])
api_router.include_router(shadow_controller.router, prefix="/shadow", tags=["Shadow"])
api_router.include_router(wind_controller.router, prefix="/wind", tags=["Wind"])
