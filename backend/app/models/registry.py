"""Single import point that registers every ORM model on Base.metadata.

Alembic's env.py and any code that needs ``Base.metadata`` (e.g. ``create_all``
in tests) must import this module rather than individual model files, since
SQLAlchemy only knows about a table once its model class has been imported.
"""

from app.models.analysis import AnalysisResult  # noqa: F401
from app.models.base import Base
from app.models.committee import CommitteeVote, FinalRecommendation, Report  # noqa: F401
from app.models.document import Document  # noqa: F401
from app.models.startup import Startup  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.workflow import WorkflowRun  # noqa: F401

__all__ = ["Base"]
