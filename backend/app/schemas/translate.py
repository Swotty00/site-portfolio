from __future__ import annotations

from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from app.schemas.common import LocaleCode

_MAX_TOTAL_CHARS = 24_000


class TranslateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source: LocaleCode = "pt-BR"
    target: LocaleCode
    texts: list[Annotated[str, StringConstraints(max_length=5000)]] = Field(
        min_length=1, max_length=80
    )

    @model_validator(mode="after")
    def _check(self) -> TranslateRequest:
        if self.source == self.target:
            raise ValueError("source and target languages must differ")
        if sum(len(t) for t in self.texts) > _MAX_TOTAL_CHARS:
            raise ValueError(f"Too much text in one request (max {_MAX_TOTAL_CHARS} characters)")
        return self


class TranslateResponse(BaseModel):
    texts: list[str]
    model: str
