"""Exceptions métier HTTP standardisées."""

from fastapi import HTTPException, status


class NotFoundError(HTTPException):
    def __init__(self, entity: str, entity_id: object) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{entity} {entity_id} introuvable",
        )


class ConflictError(HTTPException):
    def __init__(self, detail: str) -> None:
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)


class ForbiddenError(HTTPException):
    def __init__(self, detail: str) -> None:
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class InvalidStateTransitionError(ConflictError):
    def __init__(self, from_status: str, to_status: str) -> None:
        super().__init__(
            f"Transition impossible : {from_status!r} → {to_status!r}"
        )