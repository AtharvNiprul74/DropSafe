from dataclasses import dataclass, field
from datetime import datetime


@dataclass(slots=True)
class BaseModel:
    """
    Base model inherited by all entities.
    """

    created_at: str = field(
        default_factory=lambda: datetime.now().isoformat(),
        init=False,
    )

    updated_at: str = field(
        default_factory=lambda: datetime.now().isoformat(),
        init=False,
    )

    def touch(self) -> None:
        self.updated_at = datetime.now().isoformat()