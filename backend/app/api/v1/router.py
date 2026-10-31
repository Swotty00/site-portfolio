from fastapi import APIRouter, Depends

from app.api.v1.endpoints import admin, analytics, auth, health, public
from app.core.rate_limit import default_limiter

api_router = APIRouter(dependencies=[Depends(default_limiter)])
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(public.router)
api_router.include_router(analytics.router)
api_router.include_router(admin.router)
